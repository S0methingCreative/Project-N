import express from "express";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize server-side Firestore client so Squad Co-Op rooms persist across Cloud Run instances & restarts
let serverDb: ReturnType<typeof getFirestore> | null = null;
try {
  const configPath = path.join(__dirname, "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    serverDb = firebaseConfig.firestoreDatabaseId
      ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(fbApp);
  }
} catch (err) {
  console.warn("[Squad Server] Firestore initialization warning:", err);
}

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// --- SQUAD CO-OP SERVER ENGINE (HYBRID IN-MEMORY + FIRESTORE MULTI-INSTANCE PERSISTENCE) ---

interface ServerTeamPilot {
  id: string;
  initials: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
  integrity: number;
  isKnocked: boolean;
  knockedAt?: number;
  knockedUntil?: number;
  x: number;
  polarity: -1 | 0 | 1;
  readyToContinue?: boolean;
  lastHeartbeat: number;
  slotIndex?: number;
  joinedAt?: number;
  runPulses?: number;
}

interface ServerSharedSpeedrunState {
  speedrunTime: number;
  runNumber: number;
  act1Bits: number;
  act1Resolution: number;
  act1SubPart: 1 | 2;
  totalHz: number;
  totalV: number;
  totalBaud: number;
  boss1Hp: number;
  boss2Hp: number;
  maxBoss1Hp: number;
  maxBoss2Hp: number;
  isBossActive: boolean;
  runPulses?: number;
  lastAction?: string;
}

interface ServerSpeedrunRoom {
  id: string;
  code: string;
  hostPilotId: string;
  status: "lobby" | "active" | "completed" | "wiped" | "paused";
  pilots: Record<string, ServerTeamPilot>;
  sharedState: ServerSharedSpeedrunState;
  lastWipeAt?: number;
  lastContinueAt?: number;
  createdAt: string;
  updatedAt: string;
}

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours retention
const squadRooms = new Map<string, ServerSpeedrunRoom>();
const roomSubscriptions = new Map<string, Set<WebSocket>>();
const lastFirestorePersistByRoom = new Map<string, number>();

function sanitizeRoom<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

async function persistRoomToFirestore(room: ServerSpeedrunRoom, immediate = true): Promise<void> {
  if (!serverDb || !room?.code) return;
  const code = room.code.toUpperCase();
  const now = Date.now();
  if (!immediate) {
    const lastWrite = lastFirestorePersistByRoom.get(code) || 0;
    if (now - lastWrite < 1500) return;
  }
  lastFirestorePersistByRoom.set(code, now);
  try {
    const cleanRoom = sanitizeRoom(room);
    await setDoc(doc(serverDb, "speedrun_rooms", code), cleanRoom, { merge: true });
  } catch {}
}

async function loadRoomWithFirestoreFallback(
  codeInput: string,
  fallbackRoom?: any
): Promise<ServerSpeedrunRoom | undefined> {
  const code = String(codeInput || "").trim().toUpperCase();
  if (!code) return undefined;

  let room = squadRooms.get(code);

  // Always check Firestore if room is not in local instance memory, or if in lobby so multi-instance joins are never missed
  if ((!room || room.status === "lobby") && serverDb) {
    try {
      const snap = await getDoc(doc(serverDb, "speedrun_rooms", code));
      if (snap.exists()) {
        const fsRoom = snap.data() as ServerSpeedrunRoom;
        if (!room) {
          room = fsRoom;
          squadRooms.set(code, room);
        } else {
          // Merge any pilots that joined on another Cloud Run instance via Firestore
          room.pilots = {
            ...(fsRoom.pilots || {}),
            ...(room.pilots || {}),
          };
          for (const [pid, fsPilot] of Object.entries(fsRoom.pilots || {})) {
            const memPilot = room.pilots[pid];
            if (!memPilot || (fsPilot.lastHeartbeat || 0) >= (memPilot.lastHeartbeat || 0)) {
              room.pilots[pid] = fsPilot;
            }
          }
          if ((new Date(fsRoom.updatedAt || 0).getTime() || 0) > (new Date(room.updatedAt || 0).getTime() || 0)) {
            room.status = fsRoom.status;
            room.sharedState = { ...room.sharedState, ...(fsRoom.sharedState || {}) };
            if (fsRoom.lastContinueAt) room.lastContinueAt = fsRoom.lastContinueAt;
            if (fsRoom.lastWipeAt) room.lastWipeAt = fsRoom.lastWipeAt;
          }
          squadRooms.set(code, room);
        }
      }
    } catch {}
  }

  if (!room && fallbackRoom && typeof fallbackRoom === "object" && String(fallbackRoom.code || "").toUpperCase() === code) {
    room = sanitizeRoom(fallbackRoom) as ServerSpeedrunRoom;
    squadRooms.set(code, room);
    void persistRoomToFirestore(room, true);
  } else if (room && fallbackRoom && typeof fallbackRoom === "object" && fallbackRoom.pilots) {
    // Ensure any pilot present in fallbackRoom is preserved
    for (const [pid, fbPilot] of Object.entries(fallbackRoom.pilots as Record<string, ServerTeamPilot>)) {
      if (!room.pilots[pid]) {
        room.pilots[pid] = fbPilot;
      }
    }
  }

  return room;
}

function getTeamBossMaxHp(pilotCount: number): number {
  const clamped = Math.min(4, Math.max(1, pilotCount));
  return Math.round(100 * (1 + 0.5 * (clamped - 1)));
}

function generateUniqueRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 20; attempt++) {
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!squadRooms.has(result)) {
      return result;
    }
  }
  return "SQ" + Math.floor(10 + Math.random() * 89);
}

function broadcastToRoom(roomCode: string, payload: unknown, excludeWs?: WebSocket): void {
  const code = roomCode.toUpperCase();
  const subs = roomSubscriptions.get(code);
  if (!subs || subs.size === 0) return;
  const serialized = JSON.stringify(payload);
  for (const client of subs) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(serialized);
      } catch {}
    }
  }
}

// Rate limiting for Squad Co-Op room creation: max 10 rooms per 5 minutes per IP address
const roomCreationRateMap = new Map<string, number[]>();
const ROOM_CREATION_RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_ROOM_CREATIONS_PER_WINDOW = 10;

// Periodic 24-hour TTL garbage collection & rate limiter cleanup (runs every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of squadRooms.entries()) {
    const updatedTime = new Date(room.updatedAt).getTime() || now;
    if (now - updatedTime > ROOM_TTL_MS) {
      squadRooms.delete(code);
      roomSubscriptions.delete(code);
      lastFirestorePersistByRoom.delete(code);
    }
  }

  // Cleanup stale IP rate limiting entries
  for (const [ip, timestamps] of roomCreationRateMap.entries()) {
    const active = timestamps.filter(t => now - t < ROOM_CREATION_RATE_WINDOW_MS);
    if (active.length === 0) {
      roomCreationRateMap.delete(ip);
    } else {
      roomCreationRateMap.set(ip, active);
    }
  }
}, 15 * 60 * 1000);

function applyRoomAction(
  room: ServerSpeedrunRoom,
  type: string,
  pilotId: string,
  payload: any = {}
): { broadcastType: "ROOM_UPDATE" | "TELEMETRY" | "NONE"; extra?: any } {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  switch (type) {
    case "ready": {
      if (room.pilots[pilotId]) {
        room.pilots[pilotId].isReady = Boolean(payload.isReady);
        room.pilots[pilotId].lastHeartbeat = now;
        room.updatedAt = nowIso;
      }
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "launch": {
      // Security check: Only the designated room host may launch the squad run
      if (room.hostPilotId && pilotId !== room.hostPilotId) {
        console.warn(`[Squad Room ${room.code}] Unauthorized launch attempt by pilot '${pilotId}' (Host is '${room.hostPilotId}').`);
        return {
          broadcastType: "NONE",
          extra: { error: "Only the squad host can launch the run." },
        };
      }

      const pilotCount = Math.max(1, Object.keys(room.pilots).length);
      const maxHp = getTeamBossMaxHp(pilotCount);
      room.status = "active";
      room.lastContinueAt = now;
      room.sharedState = {
        ...room.sharedState,
        speedrunTime: 0,
        runNumber: 1,
        act1Bits: 0,
        act1Resolution: 0,
        act1SubPart: 1,
        totalHz: 0,
        totalV: 0,
        totalBaud: 0,
        boss1Hp: maxHp,
        boss2Hp: maxHp,
        maxBoss1Hp: maxHp,
        maxBoss2Hp: maxHp,
        isBossActive: false,
        runPulses: 0,
        lastAction: "Squad run launched!",
      };
      for (const p of Object.values(room.pilots)) {
        p.integrity = 100;
        p.isKnocked = false;
        p.readyToContinue = false;
        p.runPulses = 0;
        delete p.knockedAt;
        delete p.knockedUntil;
      }
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "leave": {
      if (room.pilots[pilotId]) {
        delete room.pilots[pilotId];
        const remainingIds = Object.keys(room.pilots);
        if (remainingIds.length > 0) {
          if (room.hostPilotId === pilotId) {
            room.hostPilotId = remainingIds[0];
            if (room.pilots[room.hostPilotId]) {
              room.pilots[room.hostPilotId].isHost = true;
              room.pilots[room.hostPilotId].slotIndex = 0;
            }
          }
          const maxHp = getTeamBossMaxHp(remainingIds.length);
          room.sharedState.maxBoss1Hp = maxHp;
          room.sharedState.maxBoss2Hp = maxHp;
        }
        room.updatedAt = nowIso;
      }
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "telemetry": {
      const data = payload.data || {};
      if (room.pilots[pilotId]) {
        room.pilots[pilotId] = {
          ...room.pilots[pilotId],
          ...data,
          lastHeartbeat: now,
        };
        const isCurrentRun =
          room.status === "active" &&
          (data.runNumber === undefined || Number(data.runNumber) === (room.sharedState.runNumber || 1)) &&
          (data.continueAt === undefined || Number(data.continueAt) === (room.lastContinueAt || 0)) &&
          now - (room.lastContinueAt || 0) > 300 &&
          now - (room.lastWipeAt || 0) > 300;

        if (isCurrentRun && typeof data.runPulses === "number" && data.runPulses >= 0) {
          room.sharedState.runPulses = Math.max(room.sharedState.runPulses || 0, data.runPulses);
        }
        room.updatedAt = nowIso;

        // If all pilots in an active room are now knocked out simultaneously, automatically transition to wiped
        if (room.status === "active" && data.isKnocked) {
          const allPilots = Object.values(room.pilots);
          if (allPilots.length > 0 && allPilots.every((p) => p.isKnocked)) {
            return applyRoomAction(room, "wipe", pilotId, {
              currentRunNumber: room.sharedState.runNumber || 1,
            });
          }
        }
      }
      return {
        broadcastType: "TELEMETRY",
        extra: {
          type: "TELEMETRY",
          roomCode: room.code,
          pilotId,
          data,
          sharedState: room.sharedState,
          status: room.status,
          lastContinueAt: room.lastContinueAt,
          lastWipeAt: room.lastWipeAt,
          time: now,
        },
      };
    }

    case "damageBoss": {
      const bossNum = payload.bossNum === 2 ? 2 : 1;
      const damage = Number(payload.damage) || 0;
      const hpKey = bossNum === 1 ? "boss1Hp" : "boss2Hp";
      const maxKey = bossNum === 1 ? "maxBoss1Hp" : "maxBoss2Hp";
      const currentHp =
        typeof room.sharedState[hpKey] === "number"
          ? room.sharedState[hpKey]
          : room.sharedState[maxKey] || 100;
      room.sharedState[hpKey] = Math.max(0, currentHp - damage);
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "contribute": {
      const res = payload.res || {};
      room.sharedState.totalHz = (room.sharedState.totalHz || 0) + (Number(res.hz) || 0);
      room.sharedState.totalV = (room.sharedState.totalV || 0) + (Number(res.volts) || 0);
      room.sharedState.totalBaud = (room.sharedState.totalBaud || 0) + (Number(res.baud) || 0);
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "compile": {
      const data = payload.data || {};
      const compileType = payload.compileType || "bit";

      // Idempotency guard: prevent duplicate compilations from double-deducting resources
      if (compileType === "bit" && data.newBits !== undefined) {
        const targetB = Number(data.newBits);
        if (targetB <= (room.sharedState.act1Bits || 0)) {
          return { broadcastType: "ROOM_UPDATE" };
        }
      } else if (compileType === "subpart2") {
        if (room.sharedState.act1SubPart === 2) {
          return { broadcastType: "ROOM_UPDATE" };
        }
      } else if (compileType === "resolution" && data.newResolution !== undefined) {
        const targetR = Number(data.newResolution);
        if (targetR <= (room.sharedState.act1Resolution || 0)) {
          return { broadcastType: "ROOM_UPDATE" };
        }
      }

      const currentHz = room.sharedState.totalHz || 0;
      const currentV = room.sharedState.totalV || 0;
      const currentBaud = room.sharedState.totalBaud || 0;

      room.sharedState.totalHz = Math.max(0, currentHz - (Number(data.costHz) || 0));
      room.sharedState.totalV = Math.max(0, currentV - (Number(data.costV) || 0));
      room.sharedState.totalBaud = Math.max(0, currentBaud - (Number(data.costBaud) || 0));
      room.sharedState.lastAction = data.actionMsg || `Squad compiled upgrade: ${compileType}`;

      if (data.newBits !== undefined) {
        room.sharedState.act1Bits = Number(data.newBits);
        if (room.sharedState.act1Bits >= 9) {
          room.sharedState.isBossActive = true;
          room.sharedState.runPulses = 0;
        }
      }
      if (data.newResolution !== undefined) {
        room.sharedState.act1Resolution = Number(data.newResolution);
        if (room.sharedState.act1Resolution >= 9) {
          room.sharedState.isBossActive = true;
          room.sharedState.runPulses = 0;
        }
      }
      if (data.newSubPart !== undefined) {
        room.sharedState.act1SubPart = data.newSubPart === 2 ? 2 : 1;
        if (room.sharedState.act1SubPart === 2) {
          room.sharedState.isBossActive = false;
          room.sharedState.runPulses = 0;
        }
      }
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "syncProgress": {
      if (payload.updates && typeof payload.updates === "object") {
        Object.assign(room.sharedState, payload.updates);
        room.updatedAt = nowIso;
      }
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "wipe": {
      if (room.status === "wiped" && now - (room.lastWipeAt || 0) < 1000) {
        return { broadcastType: "ROOM_UPDATE" };
      }
      const currentRunNumber = Number(payload.currentRunNumber) || room.sharedState.runNumber || 1;
      const pilotCount = Math.max(1, Object.keys(room.pilots).length);
      const maxHp = getTeamBossMaxHp(pilotCount);
      room.status = "wiped";
      room.lastWipeAt = now;
      room.sharedState.runNumber = currentRunNumber + 1;
      room.sharedState.runPulses = 0;
      room.sharedState.boss1Hp = maxHp;
      room.sharedState.boss2Hp = maxHp;
      room.sharedState.maxBoss1Hp = maxHp;
      room.sharedState.maxBoss2Hp = maxHp;
      room.sharedState.lastAction = `SIMULTANEOUS SQUAD WIPE! Progress saved. Retrying segment (Run #${currentRunNumber + 1})`;
      if (payload.checkpoint && typeof payload.checkpoint === "object") {
        Object.assign(room.sharedState, payload.checkpoint);
        room.sharedState.runPulses = 0;
        room.sharedState.runNumber = Math.max(currentRunNumber + 1, Number(payload.checkpoint.runNumber) || 1);
      }
      for (const p of Object.values(room.pilots)) {
        p.readyToContinue = false;
        p.isKnocked = true;
        p.runPulses = 0;
      }
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "continue": {
      const pilotCount = Math.max(1, Object.keys(room.pilots).length);
      const maxHp = getTeamBossMaxHp(pilotCount);
      room.status = "active";
      room.lastContinueAt = now;
      room.sharedState.runPulses = 0;
      room.sharedState.boss1Hp = maxHp;
      room.sharedState.boss2Hp = maxHp;
      room.sharedState.maxBoss1Hp = maxHp;
      room.sharedState.maxBoss2Hp = maxHp;
      room.sharedState.lastAction = "Squad run resumed from checkpoint!";
      for (const p of Object.values(room.pilots)) {
        p.integrity = 100;
        p.isKnocked = false;
        p.readyToContinue = false;
        p.runPulses = 0;
        delete p.knockedAt;
        delete p.knockedUntil;
      }
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "voteContinue": {
      const ready = payload.ready !== undefined ? Boolean(payload.ready) : true;
      if (room.pilots[pilotId]) {
        room.pilots[pilotId].readyToContinue = ready;
      }
      const pilotIds = Object.keys(room.pilots);
      const totalCount = Math.max(1, pilotIds.length);
      let readyCount = 0;
      for (const id of pilotIds) {
        if (room.pilots[id]?.readyToContinue) readyCount++;
      }
      const allReady = readyCount >= totalCount;
      if (allReady) {
        applyRoomAction(room, "continue", pilotId, {});
      } else {
        room.updatedAt = nowIso;
      }
      return {
        broadcastType: "ROOM_UPDATE",
        extra: { allReady, readyCount, totalCount },
      };
    }

    case "pause": {
      room.status = "paused";
      room.sharedState.runPulses = 0;
      room.sharedState.lastAction = "Squad progress saved. Session paused.";
      if (payload.checkpoint && typeof payload.checkpoint === "object") {
        Object.assign(room.sharedState, payload.checkpoint);
        room.sharedState.runPulses = 0;
      }
      for (const p of Object.values(room.pilots)) {
        p.runPulses = 0;
      }
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "resume": {
      const pilotCount = Math.max(1, Object.keys(room.pilots).length);
      const maxHp = getTeamBossMaxHp(pilotCount);
      room.status = "active";
      room.lastContinueAt = now;
      room.sharedState.runPulses = 0;
      room.sharedState.boss1Hp = maxHp;
      room.sharedState.boss2Hp = maxHp;
      room.sharedState.maxBoss1Hp = maxHp;
      room.sharedState.maxBoss2Hp = maxHp;
      room.sharedState.lastAction = "Squad resumed run from saved checkpoint.";
      for (const p of Object.values(room.pilots)) {
        p.integrity = 100;
        p.isKnocked = false;
        p.readyToContinue = false;
        p.runPulses = 0;
        delete p.knockedAt;
        delete p.knockedUntil;
      }
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    case "returnToLobby": {
      room.status = "lobby";
      room.sharedState.runPulses = 0;
      room.sharedState.lastAction = "Squad returned to pilot room lobby.";
      if (payload.checkpoint && typeof payload.checkpoint === "object") {
        Object.assign(room.sharedState, payload.checkpoint);
        room.sharedState.runPulses = 0;
      }
      for (const p of Object.values(room.pilots)) {
        p.readyToContinue = false;
        p.integrity = 100;
        p.isKnocked = false;
        p.runPulses = 0;
        delete p.knockedAt;
        delete p.knockedUntil;
      }
      room.updatedAt = nowIso;
      return { broadcastType: "ROOM_UPDATE" };
    }

    default:
      return { broadcastType: "NONE" };
  }
}

// API health endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    game: "Project N Standalone",
    activeSquadRooms: squadRooms.size,
  });
});

// Create a new Squad Co-Op Room
app.post("/api/squad/rooms", async (req, res) => {
  // IP-based sliding-window rate limiting to prevent spam and room flooding
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const clientIp = (Array.isArray(rawIp) ? rawIp[0] : String(rawIp)).split(",")[0].trim();
  const now = Date.now();
  const recentCreations = (roomCreationRateMap.get(clientIp) || []).filter(
    (timestamp) => now - timestamp < ROOM_CREATION_RATE_WINDOW_MS
  );

  if (recentCreations.length >= MAX_ROOM_CREATIONS_PER_WINDOW) {
    res.status(429).json({
      success: false,
      error: "Too many squad rooms created recently. Please wait a few minutes before creating a new one.",
    });
    return;
  }
  recentCreations.push(now);
  roomCreationRateMap.set(clientIp, recentCreations);

  const { pilotId, initials, color, preferredCode } = req.body || {};
  const hostId = String(pilotId || "pilot_host");
  const hostInitials = String(initials || "PIL").toUpperCase().slice(0, 3);
  const hostColor = String(color || "green");

  const roomCode =
    preferredCode && typeof preferredCode === "string" && !squadRooms.has(preferredCode.toUpperCase())
      ? preferredCode.toUpperCase()
      : generateUniqueRoomCode();

  const nowIso = new Date(now).toISOString();

  const hostPilot: ServerTeamPilot = {
    id: hostId,
    initials: hostInitials,
    color: hostColor,
    isHost: true,
    isReady: true,
    integrity: 100,
    isKnocked: false,
    x: 0.5,
    polarity: 0,
    lastHeartbeat: now,
    slotIndex: 0,
    joinedAt: now,
  };

  const roomData: ServerSpeedrunRoom = {
    id: roomCode,
    code: roomCode,
    hostPilotId: hostId,
    status: "lobby",
    pilots: {
      [hostId]: hostPilot,
    },
    sharedState: {
      speedrunTime: 0,
      runNumber: 1,
      act1Bits: 0,
      act1Resolution: 0,
      act1SubPart: 1,
      totalHz: 0,
      totalV: 0,
      totalBaud: 0,
      boss1Hp: 100,
      boss2Hp: 100,
      maxBoss1Hp: 100,
      maxBoss2Hp: 100,
      isBossActive: false,
      lastAction: `Room initialized by host ${hostInitials}`,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  squadRooms.set(roomCode, roomData);
  await persistRoomToFirestore(roomData, true);
  broadcastToRoom(roomCode, { type: "ROOM_UPDATE", room: roomData });
  res.json({ success: true, room: roomData });
});

// Fetch an existing Squad Co-Op Room by 4-char code
app.get("/api/squad/rooms/:code", async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const room = await loadRoomWithFirestoreFallback(code);
  if (!room) {
    res.status(404).json({
      success: false,
      error: `Squad Room [${code}] not found. Check code or create a new room.`,
    });
    return;
  }
  res.json({ success: true, room });
});

// Join an existing Squad Co-Op Room
app.post("/api/squad/rooms/:code/join", async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const { pilotId, initials, color, fallbackRoom } = req.body || {};

  if (code.length < 3 || code.length > 6) {
    res.status(400).json({
      success: false,
      error: "Invalid room code format (must be 4 characters).",
    });
    return;
  }

  const room = await loadRoomWithFirestoreFallback(code, fallbackRoom);
  if (!room) {
    res.status(404).json({
      success: false,
      error: `Squad Room [${code}] not found. Check code or create a new room.`,
    });
    return;
  }

  const pId = String(pilotId || "pilot_guest");
  const pInitials = String(initials || "PIL").toUpperCase().slice(0, 3);
  const pColor = String(color || "green");
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const currentPilots = room.pilots || {};
  const pilotKeys = Object.keys(currentPilots);

  // If pilot is already in room, refresh details while preserving slotIndex & joinedAt
  if (currentPilots[pId]) {
    const existing = currentPilots[pId];
    currentPilots[pId] = {
      ...existing,
      initials: pInitials,
      color: pColor,
      lastHeartbeat: now,
      slotIndex: typeof existing.slotIndex === "number" ? existing.slotIndex : existing.isHost ? 0 : 1,
      joinedAt: existing.joinedAt || now,
    };
    room.updatedAt = nowIso;
    await persistRoomToFirestore(room, true);
    broadcastToRoom(code, { type: "ROOM_UPDATE", room });
    res.json({ success: true, room });
    return;
  }

  if (pilotKeys.length >= 4) {
    res.status(400).json({
      success: false,
      error: `Squad [${code}] is full (maximum 4 pilots reached).`,
    });
    return;
  }

  const isFirstPilot = pilotKeys.length === 0;
  const occupiedSlots = new Set(
    Object.values(currentPilots)
      .map((p) => p.slotIndex)
      .filter((s): s is number => typeof s === "number")
  );

  let assignedSlot = isFirstPilot ? 0 : 1;
  if (!isFirstPilot) {
    for (let s = 1; s < 4; s++) {
      if (!occupiedSlots.has(s)) {
        assignedSlot = s;
        break;
      }
    }
  }

  if (isFirstPilot) {
    room.hostPilotId = pId;
  }

  const newPilot: ServerTeamPilot = {
    id: pId,
    initials: pInitials,
    color: pColor,
    isHost: isFirstPilot || room.hostPilotId === pId,
    isReady: true,
    integrity: 100,
    isKnocked: false,
    x: 0.5,
    polarity: 0,
    lastHeartbeat: now,
    slotIndex: assignedSlot,
    joinedAt: now,
  };

  currentPilots[pId] = newPilot;
  const nextCount = Object.keys(currentPilots).length;
  room.sharedState.maxBoss1Hp = getTeamBossMaxHp(nextCount);
  room.sharedState.maxBoss2Hp = getTeamBossMaxHp(nextCount);
  if (!room.sharedState.isBossActive) {
    room.sharedState.boss1Hp = room.sharedState.maxBoss1Hp;
    room.sharedState.boss2Hp = room.sharedState.maxBoss2Hp;
  }
  room.updatedAt = nowIso;

  await persistRoomToFirestore(room, true);
  broadcastToRoom(code, { type: "ROOM_UPDATE", room });
  res.json({ success: true, room });
});

// Perform an atomic Squad Co-Op room action
app.post("/api/squad/rooms/:code/action", async (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const { type, pilotId, payload, fallbackRoom } = req.body || {};

  const room = await loadRoomWithFirestoreFallback(code, fallbackRoom);

  if (!room) {
    res.status(404).json({
      success: false,
      error: `Squad Room [${code}] not found.`,
    });
    return;
  }

  const actionType = String(type || "");
  const result = applyRoomAction(room, actionType, String(pilotId || ""), payload);
  if (result.broadcastType === "NONE" && result.extra?.error) {
    res.status(403).json({
      success: false,
      error: result.extra.error,
      room,
    });
    return;
  }
  if (result.broadcastType === "ROOM_UPDATE") {
    await persistRoomToFirestore(room, true);
    broadcastToRoom(code, { type: "ROOM_UPDATE", room });
  } else if (result.broadcastType === "TELEMETRY" && result.extra) {
    void persistRoomToFirestore(room, false);
    broadcastToRoom(code, result.extra);
  }

  res.json({
    success: true,
    room,
    ...(result.extra ? { extra: result.extra } : {}),
  });
});

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  const httpServer = http.createServer(app);

  // Attach WebSocket Server for real-time Squad Co-Op sync on /ws/squad
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const host = request.headers.host || "localhost:3000";
      const parsedUrl = new URL(request.url || "/", `http://${host}`);
      if (parsedUrl.pathname === "/ws/squad") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    } catch {}
  });

  wss.on("connection", (ws, request) => {
    let subscribedRoomCode: string | null = null;

    const subscribeSocketToRoom = async (codeInput: string, fallbackRoom?: any) => {
      const code = codeInput.trim().toUpperCase();
      if (!code) return;
      if (subscribedRoomCode && subscribedRoomCode !== code) {
        roomSubscriptions.get(subscribedRoomCode)?.delete(ws);
      }
      subscribedRoomCode = code;
      if (!roomSubscriptions.has(code)) {
        roomSubscriptions.set(code, new Set());
      }
      roomSubscriptions.get(code)!.add(ws);

      const existingRoom = await loadRoomWithFirestoreFallback(code, fallbackRoom);
      if (existingRoom && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "ROOM_UPDATE", room: existingRoom }));
        } catch {}
      }
    };

    try {
      const host = request.headers.host || "localhost:3000";
      const parsedUrl = new URL(request.url || "/", `http://${host}`);
      const initialRoom = parsedUrl.searchParams.get("room");
      if (initialRoom) {
        void subscribeSocketToRoom(initialRoom);
      }
    } catch {}

    ws.on("message", async (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "SUBSCRIBE" && typeof msg.roomCode === "string") {
          const code = msg.roomCode.trim().toUpperCase();
          await subscribeSocketToRoom(code, msg.fallbackRoom);
          return;
        }

        if (msg.type === "TELEMETRY" && typeof msg.roomCode === "string") {
          const code = msg.roomCode.trim().toUpperCase();
          const room = squadRooms.get(code);
          const data = msg.data || {};
          if (room && msg.pilotId && room.pilots[msg.pilotId]) {
            room.pilots[msg.pilotId] = {
              ...room.pilots[msg.pilotId],
              ...data,
              lastHeartbeat: Date.now(),
            };
            if (typeof data.runPulses === "number" && data.runPulses >= 0) {
              room.sharedState.runPulses = Math.max(room.sharedState.runPulses || 0, data.runPulses);
            }
            room.updatedAt = new Date().toISOString();
            void persistRoomToFirestore(room, false);
          }
          broadcastToRoom(
            code,
            {
              type: "TELEMETRY",
              roomCode: code,
              pilotId: msg.pilotId,
              data,
              sharedState: room?.sharedState,
              time: Date.now(),
            },
            ws
          );
          return;
        }

        if (msg.type === "ACTION" && typeof msg.roomCode === "string") {
          const code = msg.roomCode.trim().toUpperCase();
          const room = await loadRoomWithFirestoreFallback(code, msg.fallbackRoom);
          if (!room) return;
          const result = applyRoomAction(
            room,
            String(msg.actionType || ""),
            String(msg.pilotId || ""),
            msg.payload || {}
          );
          if (result.broadcastType === "ROOM_UPDATE") {
            await persistRoomToFirestore(room, true);
            broadcastToRoom(code, { type: "ROOM_UPDATE", room });
          } else if (result.broadcastType === "TELEMETRY" && result.extra) {
            void persistRoomToFirestore(room, false);
            broadcastToRoom(code, result.extra, ws);
          }
        }
      } catch {}
    });

    ws.on("close", () => {
      if (subscribedRoomCode) {
        roomSubscriptions.get(subscribedRoomCode)?.delete(ws);
      }
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(port, () => {
    console.log(`[Project N Engine + Squad WebSocket Hub] Running on port ${port}`);
  });
}

startServer();
