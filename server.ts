import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// --- SQUAD CO-OP IN-MEMORY SERVER ENGINE (24-HOUR RETENTION, ZERO FIRESTORE QUOTA) ---

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

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours retention in server memory
const squadRooms = new Map<string, ServerSpeedrunRoom>();
const roomSubscriptions = new Map<string, Set<WebSocket>>();

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

// Periodic 24-hour TTL garbage collection (runs every 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of squadRooms.entries()) {
    const updatedTime = new Date(room.updatedAt).getTime() || now;
    if (now - updatedTime > ROOM_TTL_MS) {
      squadRooms.delete(code);
      roomSubscriptions.delete(code);
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
app.post("/api/squad/rooms", (req, res) => {
  const { pilotId, initials, color, preferredCode } = req.body || {};
  const hostId = String(pilotId || "pilot_host");
  const hostInitials = String(initials || "PIL").toUpperCase().slice(0, 3);
  const hostColor = String(color || "green");

  const roomCode =
    preferredCode && typeof preferredCode === "string" && !squadRooms.has(preferredCode.toUpperCase())
      ? preferredCode.toUpperCase()
      : generateUniqueRoomCode();

  const now = Date.now();
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
  broadcastToRoom(roomCode, { type: "ROOM_UPDATE", room: roomData });
  res.json({ success: true, room: roomData });
});

// Fetch an existing Squad Co-Op Room by 4-char code
app.get("/api/squad/rooms/:code", (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const room = squadRooms.get(code);
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
app.post("/api/squad/rooms/:code/join", (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const { pilotId, initials, color } = req.body || {};

  if (code.length < 3 || code.length > 6) {
    res.status(400).json({
      success: false,
      error: "Invalid room code format (must be 4 characters).",
    });
    return;
  }

  const room = squadRooms.get(code);
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

  broadcastToRoom(code, { type: "ROOM_UPDATE", room });
  res.json({ success: true, room });
});

// Perform an atomic Squad Co-Op room action
app.post("/api/squad/rooms/:code/action", (req, res) => {
  const code = String(req.params.code || "").trim().toUpperCase();
  const { type, pilotId, payload, fallbackRoom } = req.body || {};

  let room = squadRooms.get(code);
  // If server restarted while squad had an active session cached, seamlessly re-hydrate room
  if (!room && fallbackRoom && typeof fallbackRoom === "object" && fallbackRoom.code === code) {
    room = fallbackRoom as ServerSpeedrunRoom;
    squadRooms.set(code, room);
  }

  if (!room) {
    res.status(404).json({
      success: false,
      error: `Squad Room [${code}] not found.`,
    });
    return;
  }

  const result = applyRoomAction(room, String(type || ""), String(pilotId || ""), payload);
  if (result.broadcastType === "ROOM_UPDATE") {
    broadcastToRoom(code, { type: "ROOM_UPDATE", room });
  } else if (result.broadcastType === "TELEMETRY" && result.extra) {
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

    const subscribeSocketToRoom = (codeInput: string) => {
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

      const existingRoom = squadRooms.get(code);
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
        subscribeSocketToRoom(initialRoom);
      }
    } catch {}

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "SUBSCRIBE" && typeof msg.roomCode === "string") {
          const code = msg.roomCode.trim().toUpperCase();
          // Rehydrate server room if client provides a cached room after server restart
          if (!squadRooms.has(code) && msg.fallbackRoom && msg.fallbackRoom.code === code) {
            squadRooms.set(code, msg.fallbackRoom);
          }
          subscribeSocketToRoom(code);
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
          let room = squadRooms.get(code);
          if (!room && msg.fallbackRoom && msg.fallbackRoom.code === code) {
            room = msg.fallbackRoom as ServerSpeedrunRoom;
            squadRooms.set(code, room);
          }
          if (!room) return;
          const result = applyRoomAction(
            room,
            String(msg.actionType || ""),
            String(msg.pilotId || ""),
            msg.payload || {}
          );
          if (result.broadcastType === "ROOM_UPDATE") {
            broadcastToRoom(code, { type: "ROOM_UPDATE", room });
          } else if (result.broadcastType === "TELEMETRY" && result.extra) {
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
