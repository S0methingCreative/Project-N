import { PilotBeamColor, getPilotBeamColor, getPlayerCode } from '../utils/pilotProfile';
import {
  isFirestoreQuotaExhausted,
  markFirestoreQuotaExhausted,
  isQuotaError,
  getFirestoreUpgradeUrl,
} from './firestoreQuotaService';

export {
  isFirestoreQuotaExhausted,
  markFirestoreQuotaExhausted,
  isQuotaError,
  getFirestoreUpgradeUrl,
};

export interface TeamPilot {
  id: string;
  initials: string;
  color: PilotBeamColor;
  isHost: boolean;
  isReady: boolean;
  integrity: number; // 0 to 100
  isKnocked: boolean;
  knockedAt?: number;
  knockedUntil?: number;
  x: number; // 0 to 1 normalized coordinate along axis
  polarity: -1 | 0 | 1;
  readyToContinue?: boolean; // Voted ready on Death Screen
  lastHeartbeat: number;
  slotIndex?: number; // 0 (host), 1, 2, 3 - fixed slot in pilot room
  joinedAt?: number; // timestamp when pilot entered room
  runPulses?: number;
}

export interface SharedSpeedrunState {
  speedrunTime: number; // seconds
  runNumber: number; // 1, 2, 3...
  act1Bits: number; // 0 to 9
  act1Resolution: number; // 0 to 9
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

export interface SpeedrunRoom {
  id: string; // 4-char code
  code: string;
  hostPilotId: string;
  status: 'lobby' | 'active' | 'completed' | 'wiped' | 'paused';
  pilots: Record<string, TeamPilot>;
  sharedState: SharedSpeedrunState;
  lastWipeAt?: number;
  lastContinueAt?: number;
  createdAt: string;
  updatedAt: string;
}

// Lazy-loaded Firestore SDK singleton so Main Menu boot stays instant while Squad Co-Op gets full Cloud Firestore sync
let firestoreSdkPromise: Promise<{
  db: any;
  doc: typeof import('firebase/firestore').doc;
  getDoc: typeof import('firebase/firestore').getDoc;
  getDocFromServer: typeof import('firebase/firestore').getDocFromServer;
  setDoc: typeof import('firebase/firestore').setDoc;
  updateDoc: typeof import('firebase/firestore').updateDoc;
  onSnapshot: typeof import('firebase/firestore').onSnapshot;
  increment: typeof import('firebase/firestore').increment;
  deleteField: typeof import('firebase/firestore').deleteField;
}> | null = null;

function getFirestoreSdk() {
  if (!firestoreSdkPromise) {
    firestoreSdkPromise = Promise.all([
      import('../firebase'),
      import('firebase/firestore'),
    ]).then(([fb, fs]) => ({
      db: fb.db,
      doc: fs.doc,
      getDoc: fs.getDoc,
      getDocFromServer: fs.getDocFromServer,
      setDoc: fs.setDoc,
      updateDoc: fs.updateDoc,
      onSnapshot: fs.onSnapshot,
      increment: fs.increment,
      deleteField: fs.deleteField,
    }));
  }
  return firestoreSdkPromise;
}

function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

async function fetchRoomFromFirestore(codeInput: string): Promise<SpeedrunRoom | null> {
  const code = codeInput.trim().toUpperCase();
  if (!code) return null;
  try {
    const { db, doc, getDoc, getDocFromServer } = await getFirestoreSdk();
    const roomRef = doc(db, 'speedrun_rooms', code);
    try {
      const serverSnap = await getDocFromServer(roomRef);
      if (serverSnap.exists()) {
        return serverSnap.data() as SpeedrunRoom;
      }
    } catch {
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        return snap.data() as SpeedrunRoom;
      }
    }
  } catch (err) {
    if (isQuotaError(err)) markFirestoreQuotaExhausted();
  }
  return null;
}

async function saveRoomToFirestore(room: SpeedrunRoom, merge = true): Promise<boolean> {
  if (!room?.code) return false;
  const code = room.code.toUpperCase();
  try {
    const { db, doc, setDoc } = await getFirestoreSdk();
    const clean = sanitizeForFirestore(room);
    await setDoc(doc(db, 'speedrun_rooms', code), clean, { merge });
    return true;
  } catch (err) {
    if (isQuotaError(err)) markFirestoreQuotaExhausted();
    return false;
  }
}

async function updateRoomFieldsInFirestore(
  codeInput: string,
  fields: Record<string, any>
): Promise<boolean> {
  const code = codeInput.trim().toUpperCase();
  if (!code) return false;
  try {
    const { db, doc, updateDoc } = await getFirestoreSdk();
    await updateDoc(doc(db, 'speedrun_rooms', code), fields);
    return true;
  } catch (err) {
    if (isQuotaError(err)) markFirestoreQuotaExhausted();
    return false;
  }
}

// LocalStorage optimistic cache + BroadcastChannel for instant zero-latency local sync
const LOCAL_ROOMS_KEY = 'speedrun_local_rooms_cache';

function loadLocalRooms(): Record<string, SpeedrunRoom> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Canonical in-memory room cache & in-tab subscriber bus so same-tab listeners update immediately
const latestRoomByCode = new Map<string, SpeedrunRoom>();
const inTabListeners = new Map<string, Set<(msg: any) => void>>();

function notifyInTabListeners(code: string, msg: any): void {
  const listeners = inTabListeners.get(code.toUpperCase());
  if (!listeners) return;
  for (const fn of listeners) {
    try {
      fn(msg);
    } catch {}
  }
}

export function saveLocalRoom(room: SpeedrunRoom): void {
  if (typeof window === 'undefined' || !room?.code) return;
  const code = room.code.toUpperCase();
  latestRoomByCode.set(code, room);
  try {
    const rooms = loadLocalRooms();
    rooms[code] = room;
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  } catch {}
}

export function getLocalRoom(code: string): SpeedrunRoom | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  const inMem = latestRoomByCode.get(upper);
  if (inMem) return inMem;
  const rooms = loadLocalRooms();
  const stored = rooms[upper] || null;
  if (stored) latestRoomByCode.set(upper, stored);
  return stored;
}

const squadChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('speedrun_squad_sync')
    : null;

// Active WebSocket connection shared across current tab for the active room
let activeSocket: WebSocket | null = null;
let activeSocketRoomCode: string | null = null;

function broadcastRoomUpdate(room: SpeedrunRoom): void {
  if (!room?.code) return;
  saveLocalRoom(room);
  const eventPayload = { type: 'ROOM_UPDATE', room };
  notifyInTabListeners(room.code, eventPayload);
  try {
    squadChannel?.postMessage(eventPayload);
  } catch {}
}

/**
 * Intelligently merges an incoming room snapshot (from Firestore or Server) with local state
 * so remote pilot joins, ready states, resource contributions, and wipe/continue transitions
 * are applied immediately without regressing active local telemetry or upgrades.
 */
function mergeRoomSnapshot(
  current: SpeedrunRoom | null,
  incoming: SpeedrunRoom,
  localPilotId: string
): SpeedrunRoom {
  if (!current) return incoming;

  const incomingContinueAt = incoming.lastContinueAt || 0;
  const currentContinueAt = current.lastContinueAt || 0;
  const incomingWipeAt = incoming.lastWipeAt || 0;
  const currentWipeAt = current.lastWipeAt || 0;

  const isNewLifecycleTransition =
    incomingContinueAt > currentContinueAt ||
    incomingWipeAt > currentWipeAt ||
    incoming.status !== current.status ||
    (incoming.sharedState?.runNumber || 1) > (current.sharedState?.runNumber || 1);

  if (isNewLifecycleTransition) {
    return incoming;
  }

  // Merge pilots: take all incoming pilots; if room is actively playing, preserve fresher local pilot telemetry
  const mergedPilots: Record<string, TeamPilot> = {
    ...(incoming.pilots || {}),
  };

  if (
    incoming.status === 'active' &&
    current.status === 'active' &&
    current.pilots?.[localPilotId] &&
    mergedPilots[localPilotId]
  ) {
    const localP = current.pilots[localPilotId];
    const incP = mergedPilots[localPilotId];
    if ((localP.lastHeartbeat || 0) >= (incP.lastHeartbeat || 0)) {
      mergedPilots[localPilotId] = {
        ...incP,
        x: localP.x,
        polarity: localP.polarity,
        integrity: localP.integrity,
        isKnocked: localP.isKnocked,
        knockedAt: localP.knockedAt,
        knockedUntil: localP.knockedUntil,
        runPulses: localP.runPulses,
        lastHeartbeat: localP.lastHeartbeat,
      };
    }
  }

  const sameRun =
    (incoming.sharedState?.runNumber || 1) === (current.sharedState?.runNumber || 1) &&
    incoming.status === 'active' &&
    current.status === 'active';

  const mergedShared: SharedSpeedrunState = sameRun
    ? {
        ...current.sharedState,
        ...incoming.sharedState,
        act1SubPart: Math.max(
          current.sharedState?.act1SubPart || 1,
          incoming.sharedState?.act1SubPart || 1
        ) as 1 | 2,
        act1Bits:
          (incoming.sharedState?.act1SubPart || 1) > (current.sharedState?.act1SubPart || 1)
            ? incoming.sharedState.act1Bits
            : Math.max(
                current.sharedState?.act1Bits || 0,
                incoming.sharedState?.act1Bits || 0
              ),
        act1Resolution:
          (incoming.sharedState?.act1SubPart || 1) === 2
            ? Math.max(
                current.sharedState?.act1Resolution || 0,
                incoming.sharedState?.act1Resolution || 0
              )
            : current.sharedState?.act1Resolution || 0,
        runPulses: Math.max(
          current.sharedState?.runPulses || 0,
          incoming.sharedState?.runPulses || 0
        ),
      }
    : incoming.sharedState;

  return {
    ...current,
    ...incoming,
    pilots: mergedPilots,
    sharedState: mergedShared,
  };
}

let lastFirestoreTelemetryWrite = 0;
let lastFirestoreKnockedState: boolean | undefined = undefined;

export function broadcastTelemetry(
  roomCode: string,
  pilotId: string,
  data: Partial<TeamPilot>
): void {
  const code = roomCode.toUpperCase();
  const now = Date.now();
  const telemetryEvent = {
    type: 'TELEMETRY',
    roomCode: code,
    pilotId,
    data,
    time: now,
  };
  notifyInTabListeners(code, telemetryEvent);
  try {
    squadChannel?.postMessage(telemetryEvent);
  } catch {}

  // Throttled Firestore telemetry sync (every 1200ms, or immediately when knocked status changes)
  // Ensures cross-instance mobile devices see live pilot position, health, ghost state, and pulse pacing
  const knockedChanged =
    data.isKnocked !== undefined && data.isKnocked !== lastFirestoreKnockedState;
  if (knockedChanged || now - lastFirestoreTelemetryWrite > 1200) {
    lastFirestoreTelemetryWrite = now;
    if (data.isKnocked !== undefined) {
      lastFirestoreKnockedState = data.isKnocked;
    }
    const local = getLocalRoom(code);
    const pilotObj = local?.pilots?.[pilotId];
    if (pilotObj) {
      const updatedPilot: TeamPilot = sanitizeForFirestore({
        ...pilotObj,
        ...data,
        lastHeartbeat: now,
      });
      const fsFields: Record<string, any> = {
        [`pilots.${pilotId}`]: updatedPilot,
        updatedAt: new Date(now).toISOString(),
      };
      if (
        local?.status === 'active' &&
        typeof data.runPulses === 'number' &&
        data.runPulses > (local.sharedState?.runPulses || 0)
      ) {
        fsFields['sharedState.runPulses'] = data.runPulses;
      }
      void updateRoomFieldsInFirestore(code, fsFields);
    }
  }

  // Send over live WebSocket if open for sub-50ms same-instance sync
  if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
    try {
      activeSocket.send(
        JSON.stringify({
          type: 'TELEMETRY',
          roomCode: code,
          pilotId,
          data,
        })
      );
      return;
    } catch {}
  }

  // Fallback to non-blocking HTTP action if WebSocket is still connecting
  void sendServerRoomAction(code, 'telemetry', pilotId, { data });
}

async function sendServerRoomAction(
  roomCode: string,
  type: string,
  pilotId: string,
  payload: Record<string, unknown> = {}
): Promise<{ success: boolean; room?: SpeedrunRoom; extra?: any }> {
  const code = roomCode.toUpperCase();
  const fallbackRoom = getLocalRoom(code);

  try {
    const res = await fetch(`/api/squad/rooms/${encodeURIComponent(code)}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        pilotId,
        payload,
        fallbackRoom,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.room) {
        broadcastRoomUpdate(json.room);
      }
      return { success: true, room: json.room, extra: json.extra };
    }
  } catch {}

  // Fallback to WebSocket action only if HTTP fetch failed
  if (
    activeSocket &&
    activeSocket.readyState === WebSocket.OPEN &&
    type !== 'voteContinue'
  ) {
    try {
      activeSocket.send(
        JSON.stringify({
          type: 'ACTION',
          roomCode: code,
          actionType: type,
          pilotId,
          payload,
          fallbackRoom,
        })
      );
      return { success: true };
    } catch {}
  }

  return { success: false };
}

const LOCAL_PILOT_ID_KEY = 'speedrun_local_pilot_id';
let memoryPilotId: string | null = null;

export function getLocalPilotId(): string {
  if (memoryPilotId) return memoryPilotId;
  if (typeof window === 'undefined') return 'pilot_local';
  try {
    let id =
      localStorage.getItem(LOCAL_PILOT_ID_KEY) ||
      sessionStorage.getItem(LOCAL_PILOT_ID_KEY);
    if (!id) {
      id = 'p_' + Math.random().toString(36).substring(2, 9);
      try {
        localStorage.setItem(LOCAL_PILOT_ID_KEY, id);
      } catch {}
      try {
        sessionStorage.setItem(LOCAL_PILOT_ID_KEY, id);
      } catch {}
    }
    memoryPilotId = id;
    return id;
  } catch {
    if (!memoryPilotId) {
      memoryPilotId = 'p_' + Math.random().toString(36).substring(2, 9);
    }
    return memoryPilotId;
  }
}

/**
 * Generate crisp 4-character uppercase code without ambiguous letters (e.g. no 0/O, 1/I)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Stably sorts pilots so their position never jumps or bounces around in the pilot room or HUD.
 */
export function getSortedPilots(
  pilotsMap?: Record<string, TeamPilot> | null,
  hostPilotId?: string
): TeamPilot[] {
  if (!pilotsMap) return [];
  const pilots = Object.values(pilotsMap);
  return pilots.sort((a, b) => {
    const aIsHost = (hostPilotId && a.id === hostPilotId) || Boolean(a.isHost);
    const bIsHost = (hostPilotId && b.id === hostPilotId) || Boolean(b.isHost);
    if (aIsHost && !bIsHost) return -1;
    if (!aIsHost && bIsHost) return 1;

    const aSlot = typeof a.slotIndex === 'number' ? a.slotIndex : 99;
    const bSlot = typeof b.slotIndex === 'number' ? b.slotIndex : 99;
    if (aSlot !== bSlot) return aSlot - bSlot;

    const aTime = a.joinedAt || 0;
    const bTime = b.joinedAt || 0;
    if (aTime !== bTime) return aTime - bTime;

    return a.id.localeCompare(b.id);
  });
}

/**
 * Calculate team resource scaling factor (Linear: 1p=1x, 2p=2x, 3p=3x, 4p=4x)
 */
export function getTeamResourceScale(pilotCount: number): number {
  return Math.min(4, Math.max(1, pilotCount));
}

/**
 * Calculate Boss HP proportional scaling (+50% HP per added pilot: 100 / 150 / 200 / 250)
 */
export function getTeamBossMaxHp(pilotCount: number): number {
  const clamped = Math.min(4, Math.max(1, pilotCount));
  return Math.round(100 * (1 + 0.5 * (clamped - 1)));
}

/**
 * Construct shareable direct join link
 */
export function getShareableJoinUrl(roomCode: string): string {
  if (typeof window === 'undefined') return `?speedrunRoom=${roomCode}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?speedrunRoom=${roomCode.toUpperCase()}`;
}

/**
 * Look for ?speedrunRoom= or ?room= in current URL
 */
export function getUrlRoomCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('speedrunRoom') || params.get('room');
    if (code && code.trim().length >= 3 && code.trim().length <= 6) {
      return code.trim().toUpperCase();
    }
  } catch {}
  return '';
}

/**
 * Remove ?speedrunRoom= param from URL without reload
 */
export function clearUrlRoomParam(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('speedrunRoom');
    url.searchParams.delete('room');
    window.history.replaceState({}, document.title, url.toString());
  } catch {}
}

/**
 * Create a new Squad Co-Op Room persisted in BOTH Cloud Firestore (speedrun_rooms/{code})
 * and the Express + WebSocket Server so any mobile phone on any network or Cloud Run instance can join.
 */
export async function createSpeedrunRoom(
  initials?: string,
  color?: PilotBeamColor
): Promise<SpeedrunRoom> {
  const pilotId = getLocalPilotId();
  const pilotInitials = (initials || getPlayerCode() || 'PIL').toUpperCase();
  const pilotColor = color || getPilotBeamColor();
  const preferredCode = generateRoomCode();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const hostPilot: TeamPilot = {
    id: pilotId,
    initials: pilotInitials,
    color: pilotColor,
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

  let roomData: SpeedrunRoom = {
    id: preferredCode,
    code: preferredCode,
    hostPilotId: pilotId,
    status: 'lobby',
    pilots: {
      [pilotId]: hostPilot,
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
      lastAction: 'Room initialized by host ' + pilotInitials,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Register on Express server if available
  try {
    const res = await fetch('/api/squad/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pilotId,
        initials: pilotInitials,
        color: pilotColor,
        preferredCode,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.room) {
        roomData = data.room as SpeedrunRoom;
      }
    }
  } catch {}

  // 2. Always persist to Cloud Firestore so other phones on live / other Cloud Run instances find it immediately
  await saveRoomToFirestore(roomData, false);

  saveLastSpeedrunRoomCode(roomData.code);
  broadcastRoomUpdate(roomData);
  return roomData;
}

/**
 * Join an existing Squad Co-Op Room via Cloud Firestore + Express/WebSocket Server
 */
export async function joinSpeedrunRoom(
  roomCodeInput: string,
  initials?: string,
  color?: PilotBeamColor
): Promise<{ success: boolean; room?: SpeedrunRoom; error?: string }> {
  const code = roomCodeInput.trim().toUpperCase();
  if (code.length < 3 || code.length > 6) {
    return {
      success: false,
      error: 'Invalid room code format (must be 4 characters).',
    };
  }

  const pilotId = getLocalPilotId();
  const pilotInitials = (initials || getPlayerCode() || 'PIL').toUpperCase();
  const pilotColor = color || getPilotBeamColor();

  // 1. Fetch room from Cloud Firestore first so we have the authoritative cross-instance room state
  const firestoreRoom = await fetchRoomFromFirestore(code);
  const fallbackCandidate = firestoreRoom || getLocalRoom(code);

  // 2. Attempt Express server join (passing fallbackCandidate so any Cloud Run instance is immediately hydrated)
  let serverJoinedRoom: SpeedrunRoom | null = null;
  let serverError: string | undefined;
  try {
    const res = await fetch(`/api/squad/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pilotId,
        initials: pilotInitials,
        color: pilotColor,
        fallbackRoom: fallbackCandidate,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.room) {
      serverJoinedRoom = data.room as SpeedrunRoom;
    } else if (data?.error) {
      serverError = data.error;
    }
  } catch {}

  const baseRoom = serverJoinedRoom || firestoreRoom || getLocalRoom(code);
  if (!baseRoom) {
    return {
      success: false,
      error: serverError || `Squad Room [${code}] not found. Check code or create a new room.`,
    };
  }

  // Merge any pilots from firestoreRoom so no pilot is ever lost across instances
  const currentPilots: Record<string, TeamPilot> = {
    ...(firestoreRoom?.pilots || {}),
    ...(baseRoom.pilots || {}),
  };
  const pilotKeys = Object.keys(currentPilots);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  if (currentPilots[pilotId]) {
    const existing = currentPilots[pilotId];
    const updatedPilot: TeamPilot = {
      ...existing,
      initials: pilotInitials,
      color: pilotColor,
      lastHeartbeat: now,
      slotIndex: typeof existing.slotIndex === 'number' ? existing.slotIndex : existing.isHost ? 0 : 1,
      joinedAt: existing.joinedAt || now,
    };
    const nextCount = Object.keys(currentPilots).length;
    const maxBoss1Hp = getTeamBossMaxHp(nextCount);
    const maxBoss2Hp = getTeamBossMaxHp(nextCount);

    const updatedRoom: SpeedrunRoom = {
      ...baseRoom,
      pilots: { ...currentPilots, [pilotId]: updatedPilot },
      sharedState: {
        ...baseRoom.sharedState,
        maxBoss1Hp,
        maxBoss2Hp,
      },
      updatedAt: nowIso,
    };

    await updateRoomFieldsInFirestore(code, {
      [`pilots.${pilotId}`]: sanitizeForFirestore(updatedPilot),
      'sharedState.maxBoss1Hp': maxBoss1Hp,
      'sharedState.maxBoss2Hp': maxBoss2Hp,
      updatedAt: nowIso,
    });
    saveLastSpeedrunRoomCode(code);
    broadcastRoomUpdate(updatedRoom);
    return { success: true, room: updatedRoom };
  }

  if (pilotKeys.length >= 4) {
    return {
      success: false,
      error: `Squad [${code}] is full (maximum 4 pilots reached).`,
    };
  }

  const occupiedSlots = new Set(
    Object.values(currentPilots)
      .map((p) => p.slotIndex)
      .filter((s) => typeof s === 'number')
  );
  let assignedSlot = 1;
  for (let s = 1; s < 4; s++) {
    if (!occupiedSlots.has(s)) {
      assignedSlot = s;
      break;
    }
  }

  const newPilot: TeamPilot = {
    id: pilotId,
    initials: pilotInitials,
    color: pilotColor,
    isHost: false,
    isReady: true,
    integrity: 100,
    isKnocked: false,
    x: 0.5,
    polarity: 0,
    lastHeartbeat: now,
    slotIndex: assignedSlot,
    joinedAt: now,
  };

  const nextCount = pilotKeys.length + 1;
  const maxBoss1Hp = getTeamBossMaxHp(nextCount);
  const maxBoss2Hp = getTeamBossMaxHp(nextCount);

  const updatedRoom: SpeedrunRoom = {
    ...baseRoom,
    pilots: { ...currentPilots, [pilotId]: newPilot },
    sharedState: {
      ...baseRoom.sharedState,
      maxBoss1Hp,
      maxBoss2Hp,
      ...(baseRoom.sharedState?.isBossActive
        ? {}
        : { boss1Hp: maxBoss1Hp, boss2Hp: maxBoss2Hp }),
    },
    updatedAt: nowIso,
  };

  // Persist pilot join directly to Cloud Firestore so host phone receives real-time onSnapshot update
  const updatedOk = await updateRoomFieldsInFirestore(code, {
    [`pilots.${pilotId}`]: sanitizeForFirestore(newPilot),
    'sharedState.maxBoss1Hp': maxBoss1Hp,
    'sharedState.maxBoss2Hp': maxBoss2Hp,
    ...(baseRoom.sharedState?.isBossActive
      ? {}
      : { 'sharedState.boss1Hp': maxBoss1Hp, 'sharedState.boss2Hp': maxBoss2Hp }),
    updatedAt: nowIso,
  });
  if (!updatedOk) {
    await saveRoomToFirestore(updatedRoom, true);
  }

  saveLastSpeedrunRoomCode(code);
  broadcastRoomUpdate(updatedRoom);
  return { success: true, room: updatedRoom };
}

/**
 * Leave a room or disconnect
 */
export async function leaveSpeedrunRoom(
  roomCode: string,
  pilotId: string
): Promise<void> {
  const code = roomCode.toUpperCase();
  const local = getLocalRoom(code);
  if (local && local.pilots) {
    const pilots = { ...local.pilots };
    delete pilots[pilotId];
    local.pilots = pilots;
    const remainingKeys = Object.keys(pilots);
    if (remainingKeys.length > 0 && local.hostPilotId === pilotId) {
      local.hostPilotId = remainingKeys[0];
      if (local.pilots[local.hostPilotId]) {
        local.pilots[local.hostPilotId].isHost = true;
        local.pilots[local.hostPilotId].slotIndex = 0;
      }
    }
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
  }

  try {
    const { deleteField } = await getFirestoreSdk();
    const fsUpdates: Record<string, any> = {
      [`pilots.${pilotId}`]: deleteField(),
      updatedAt: new Date().toISOString(),
    };
    if (local && local.hostPilotId && local.pilots?.[local.hostPilotId]) {
      fsUpdates.hostPilotId = local.hostPilotId;
      fsUpdates[`pilots.${local.hostPilotId}.isHost`] = true;
      fsUpdates[`pilots.${local.hostPilotId}.slotIndex`] = 0;
    }
    await updateRoomFieldsInFirestore(code, fsUpdates);
  } catch {}

  await sendServerRoomAction(code, 'leave', pilotId, {});
}

/**
 * Toggle Pilot Ready Status in Lobby
 */
export async function setPilotReady(
  roomCode: string,
  pilotId: string,
  isReady: boolean
): Promise<void> {
  const code = roomCode.toUpperCase();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const local = getLocalRoom(code);
  if (local && local.pilots && local.pilots[pilotId]) {
    local.pilots[pilotId].isReady = isReady;
    local.pilots[pilotId].lastHeartbeat = now;
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
  }

  void updateRoomFieldsInFirestore(code, {
    [`pilots.${pilotId}.isReady`]: isReady,
    [`pilots.${pilotId}.lastHeartbeat`]: now,
    updatedAt: nowIso,
  });

  await sendServerRoomAction(code, 'ready', pilotId, { isReady });
}

/**
 * Launch the Squad Co-Op Run for the squad
 */
export async function launchTeamRun(roomCode: string): Promise<SpeedrunRoom | null> {
  const code = roomCode.toUpperCase();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const local = getLocalRoom(code);
  let optimisticRoom: SpeedrunRoom | null = null;
  if (local) {
    const pilotCount = Math.max(1, Object.keys(local.pilots || {}).length);
    const maxHp = getTeamBossMaxHp(pilotCount);
    const resetPilots: Record<string, TeamPilot> = {};
    for (const [pid, p] of Object.entries(local.pilots || {})) {
      const copy: TeamPilot = {
        ...p,
        integrity: 100,
        isKnocked: false,
        readyToContinue: false,
        runPulses: 0,
      };
      delete copy.knockedAt;
      delete copy.knockedUntil;
      resetPilots[pid] = copy;
    }

    optimisticRoom = {
      ...local,
      status: 'active',
      lastContinueAt: now,
      pilots: resetPilots,
      sharedState: {
        ...local.sharedState,
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
        lastAction: 'Squad run launched!',
      },
      updatedAt: nowIso,
    };
    broadcastRoomUpdate(optimisticRoom);
    void saveRoomToFirestore(optimisticRoom, true);
  }

  const res = await sendServerRoomAction(code, 'launch', getLocalPilotId(), {});
  if (res.room) {
    void saveRoomToFirestore(res.room, true);
  }
  return res.room || optimisticRoom || getLocalRoom(code);
}

/**
 * Subscribe to real-time room updates via:
 * 1. Cloud Firestore onSnapshot (cross-phone, cross-network, multi-instance live sync)
 * 2. Express WebSocket (/ws/squad) + 1.5s HTTP sync
 * 3. Mobile Page Visibility resume handler (instant re-sync after switching apps to text room code)
 */
export function subscribeToSpeedrunRoom(
  roomCode: string,
  callback: (room: SpeedrunRoom | null) => void
): () => void {
  const code = roomCode.toUpperCase();
  const localPilotId = getLocalPilotId();
  let isDisposed = false;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let firestoreUnsub: (() => void) | null = null;

  const initialRoom = getLocalRoom(code);
  if (initialRoom) {
    callback(initialRoom);
  }

  // 1. Attach real-time Cloud Firestore onSnapshot listener
  getFirestoreSdk()
    .then(({ db, doc, onSnapshot }) => {
      if (isDisposed) return;
      const roomRef = doc(db, 'speedrun_rooms', code);
      firestoreUnsub = onSnapshot(
        roomRef,
        (snap) => {
          if (isDisposed || !snap.exists()) return;
          const fsRoom = snap.data() as SpeedrunRoom;
          if (!fsRoom?.code) return;
          const merged = mergeRoomSnapshot(getLocalRoom(code), fsRoom, localPilotId);
          saveLocalRoom(merged);
          callback(merged);
        },
        (err) => {
          if (isQuotaError(err)) markFirestoreQuotaExhausted();
        }
      );
    })
    .catch(() => {});

  const fetchLatestRoom = () => {
    if (isDisposed || typeof window === 'undefined') return;
    fetch(`/api/squad/rooms/${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isDisposed && data?.success && data.room) {
          const merged = mergeRoomSnapshot(getLocalRoom(code), data.room, localPilotId);
          saveLocalRoom(merged);
          callback(merged);
        }
      })
      .catch(() => {});
  };

  // Initial fetch + periodic 1.5s sync poll
  fetchLatestRoom();
  if (typeof window !== 'undefined') {
    pollTimer = setInterval(fetchLatestRoom, 1500);
  }

  let lastTelemetryDiskSave = 0;

  const handleIncomingEvent = (msg: any) => {
    if (!msg || isDisposed) return;
    if (msg.type === 'ROOM_UPDATE' && msg.room?.code === code) {
      const merged = mergeRoomSnapshot(getLocalRoom(code), msg.room, localPilotId);
      saveLocalRoom(merged);
      callback(merged);
    } else if (msg.type === 'TELEMETRY' && msg.roomCode === code) {
      const currentRoom = getLocalRoom(code);
      if (currentRoom && currentRoom.pilots && currentRoom.pilots[msg.pilotId]) {
        const isStaleTelemetry =
          (msg.lastContinueAt !== undefined && msg.lastContinueAt < (currentRoom.lastContinueAt || 0)) ||
          (msg.lastWipeAt !== undefined && msg.lastWipeAt < (currentRoom.lastWipeAt || 0)) ||
          (msg.sharedState?.runNumber !== undefined &&
            msg.sharedState.runNumber < (currentRoom.sharedState?.runNumber || 1));

        const isRoomActive = (msg.status || currentRoom.status) === 'active' && currentRoom.status === 'active';

        const mergedSharedState =
          msg.sharedState && !isStaleTelemetry
            ? {
                ...currentRoom.sharedState,
                ...msg.sharedState,
                runPulses: isRoomActive ? (msg.sharedState.runPulses ?? 0) : 0,
                act1SubPart: Math.max(
                  currentRoom.sharedState?.act1SubPart || 1,
                  msg.sharedState.act1SubPart || 1
                ) as 1 | 2,
                act1Bits:
                  (msg.sharedState.act1SubPart || 1) > (currentRoom.sharedState?.act1SubPart || 1)
                    ? msg.sharedState.act1Bits
                    : Math.max(
                        currentRoom.sharedState?.act1Bits || 0,
                        msg.sharedState.act1Bits || 0
                      ),
                act1Resolution:
                  (msg.sharedState.act1SubPart || 1) === 2
                    ? Math.max(
                        currentRoom.sharedState?.act1Resolution || 0,
                        msg.sharedState.act1Resolution || 0
                      )
                    : currentRoom.sharedState?.act1Resolution || 0,
              }
            : currentRoom.sharedState;

        const updatedRoom: SpeedrunRoom = {
          ...currentRoom,
          sharedState: mergedSharedState,
          pilots: {
            ...currentRoom.pilots,
            [msg.pilotId]: {
              ...currentRoom.pilots[msg.pilotId],
              ...msg.data,
              runPulses: isRoomActive ? (msg.data?.runPulses ?? 0) : 0,
            },
          },
        };
        latestRoomByCode.set(code, updatedRoom);
        const now = Date.now();
        if (now - lastTelemetryDiskSave > 2000) {
          lastTelemetryDiskSave = now;
          saveLocalRoom(updatedRoom);
        }
        callback(updatedRoom);
      }
    }
  };

  if (!inTabListeners.has(code)) {
    inTabListeners.set(code, new Set());
  }
  inTabListeners.get(code)!.add(handleIncomingEvent);

  // Connect to WebSocket server on same origin (/ws/squad) with automatic reconnection
  const connectWebSocket = () => {
    if (isDisposed || typeof window === 'undefined') return;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/squad?room=${encodeURIComponent(code)}`;
      ws = new WebSocket(wsUrl);
      activeSocket = ws;
      activeSocketRoomCode = code;

      ws.onopen = () => {
        if (isDisposed || !ws) return;
        try {
          ws.send(
            JSON.stringify({
              type: 'SUBSCRIBE',
              roomCode: code,
              pilotId: localPilotId,
              fallbackRoom: getLocalRoom(code),
            })
          );
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data));
          handleIncomingEvent(parsed);
        } catch {}
      };

      ws.onclose = () => {
        if (activeSocket === ws) {
          activeSocket = null;
          activeSocketRoomCode = null;
        }
        if (!isDisposed) {
          reconnectTimer = setTimeout(connectWebSocket, 1500);
        }
      };

      ws.onerror = () => {
        try {
          ws?.close();
        } catch {}
      };
    } catch {
      if (!isDisposed) {
        reconnectTimer = setTimeout(connectWebSocket, 2000);
      }
    }
  };

  connectWebSocket();

  // Re-sync immediately when returning to mobile browser after switching apps to share room code
  const handleVisibilityChange = () => {
    if (isDisposed || typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') {
      fetchLatestRoom();
      fetchRoomFromFirestore(code).then((fsRoom) => {
        if (!isDisposed && fsRoom) {
          const merged = mergeRoomSnapshot(getLocalRoom(code), fsRoom, localPilotId);
          saveLocalRoom(merged);
          callback(merged);
        }
      });
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  const handleBroadcast = (event: MessageEvent) => {
    handleIncomingEvent(event.data);
  };

  squadChannel?.addEventListener('message', handleBroadcast);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_ROOMS_KEY) {
      const room = loadLocalRooms()[code] || null;
      if (room && !isDisposed) {
        latestRoomByCode.set(code, room);
        callback(room);
      }
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    isDisposed = true;
    inTabListeners.get(code)?.delete(handleIncomingEvent);
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch {}
    }
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pollTimer) clearInterval(pollTimer);
    if (ws) {
      if (activeSocket === ws) {
        activeSocket = null;
        activeSocketRoomCode = null;
      }
      try {
        ws.close();
      } catch {}
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    squadChannel?.removeEventListener('message', handleBroadcast);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

/**
 * Update real-time pilot telemetry (WebSocket + BroadcastChannel + Throttled Firestore Sync)
 */
export async function updatePilotTelemetry(
  roomCode: string,
  pilotId: string,
  data: Partial<TeamPilot> & { runNumber?: number; continueAt?: number }
): Promise<void> {
  const code = roomCode.toUpperCase();
  const local = getLocalRoom(code);
  if (local && local.pilots && local.pilots[pilotId]) {
    local.pilots[pilotId] = {
      ...local.pilots[pilotId],
      ...data,
      lastHeartbeat: Date.now(),
    };
    latestRoomByCode.set(code, local);
  }
  broadcastTelemetry(code, pilotId, data);
}

/**
 * Report Pilot Knocked (Starts 5s automatic respawn timer)
 */
export async function reportPilotKnocked(
  roomCode: string,
  pilotId: string
): Promise<void> {
  const now = Date.now();
  const knockedUntil = now + 5000;
  await updatePilotTelemetry(roomCode, pilotId, {
    integrity: 0,
    isKnocked: true,
    knockedAt: now,
    knockedUntil,
  });
}

/**
 * Report Pilot Revived back to 100% integrity
 */
export async function reportPilotRevived(
  roomCode: string,
  pilotId: string
): Promise<void> {
  await updatePilotTelemetry(roomCode, pilotId, {
    integrity: 100,
    isKnocked: false,
    knockedAt: undefined,
    knockedUntil: undefined,
  });
}

/**
 * Deal damage to shared Boss health (Firestore + WebSocket + Server-Authoritative state)
 */
export async function damageTeamBoss(
  roomCode: string,
  bossNum: 1 | 2,
  damage: number
): Promise<void> {
  const code = roomCode.toUpperCase();
  const nowIso = new Date().toISOString();
  const hpKey = bossNum === 1 ? 'boss1Hp' : 'boss2Hp';
  const local = getLocalRoom(code);
  let nextHp = 0;
  if (local) {
    const currentHp =
      local.sharedState[hpKey] ??
      (bossNum === 1 ? local.sharedState.maxBoss1Hp : local.sharedState.maxBoss2Hp);
    nextHp = Math.max(0, currentHp - damage);
    local.sharedState[hpKey] = nextHp;
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
  }

  void updateRoomFieldsInFirestore(code, {
    [`sharedState.${hpKey}`]: nextHp,
    updatedAt: nowIso,
  });

  void sendServerRoomAction(code, 'damageBoss', getLocalPilotId(), {
    bossNum,
    damage,
  });
}

const LAST_SAVED_ROOM_KEY = 'speedrun_saved_room_code';

export function saveLastSpeedrunRoomCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_SAVED_ROOM_KEY, code.toUpperCase());
  } catch {}
}

export function getLastSpeedrunRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LAST_SAVED_ROOM_KEY);
  } catch {
    return null;
  }
}

/**
 * Atomically contribute reflected wave resources to the shared Squad Total
 */
export async function contributeTeamResources(
  roomCode: string,
  res: { hz?: number; volts?: number; baud?: number }
): Promise<void> {
  const code = roomCode.toUpperCase();
  const nowIso = new Date().toISOString();
  const local = getLocalRoom(code);
  if (local) {
    local.sharedState.totalHz = (local.sharedState.totalHz || 0) + (res.hz || 0);
    local.sharedState.totalV = (local.sharedState.totalV || 0) + (res.volts || 0);
    local.sharedState.totalBaud =
      (local.sharedState.totalBaud || 0) + (res.baud || 0);
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
  }

  // Atomic server-side increment in Firestore so concurrent hits from multiple phones never drop resources
  getFirestoreSdk()
    .then(({ increment }) => {
      const fields: Record<string, any> = { updatedAt: nowIso };
      if (res.hz) fields['sharedState.totalHz'] = increment(res.hz);
      if (res.volts) fields['sharedState.totalV'] = increment(res.volts);
      if (res.baud) fields['sharedState.totalBaud'] = increment(res.baud);
      void updateRoomFieldsInFirestore(code, fields);
    })
    .catch(() => {});

  void sendServerRoomAction(code, 'contribute', getLocalPilotId(), { res });
}

/**
 * Atomically compile upgrade from Squad Total resources for the entire team
 */
export async function compileTeamProgression(
  roomCode: string,
  type: 'bit' | 'resolution' | 'subpart2' | 'N',
  data: {
    newBits?: number;
    newResolution?: number;
    newSubPart?: 1 | 2;
    costHz?: number;
    costV?: number;
    costBaud?: number;
    actionMsg?: string;
  }
): Promise<void> {
  const code = roomCode.toUpperCase();
  const nowIso = new Date().toISOString();
  const local = getLocalRoom(code);
  if (local) {
    const currentHz = local.sharedState?.totalHz || 0;
    const currentV = local.sharedState?.totalV || 0;
    const currentBaud = local.sharedState?.totalBaud || 0;

    local.sharedState.totalHz = Math.max(0, currentHz - (data.costHz || 0));
    local.sharedState.totalV = Math.max(0, currentV - (data.costV || 0));
    local.sharedState.totalBaud = Math.max(0, currentBaud - (data.costBaud || 0));
    local.sharedState.lastAction =
      data.actionMsg || `Squad compiled upgrade: ${type}`;

    if (data.newBits !== undefined) {
      local.sharedState.act1Bits = data.newBits;
      if (data.newBits >= 9) {
        local.sharedState.isBossActive = true;
        local.sharedState.runPulses = 0;
      }
    }
    if (data.newResolution !== undefined) {
      local.sharedState.act1Resolution = data.newResolution;
      if (data.newResolution >= 9) {
        local.sharedState.isBossActive = true;
        local.sharedState.runPulses = 0;
      }
    }
    if (data.newSubPart !== undefined) {
      local.sharedState.act1SubPart = data.newSubPart;
      if (data.newSubPart === 2) {
        local.sharedState.isBossActive = false;
        local.sharedState.runPulses = 0;
      }
    }
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);

    const fsFields: Record<string, any> = {
      'sharedState.totalHz': local.sharedState.totalHz,
      'sharedState.totalV': local.sharedState.totalV,
      'sharedState.totalBaud': local.sharedState.totalBaud,
      'sharedState.lastAction': local.sharedState.lastAction,
      updatedAt: nowIso,
    };
    if (data.newBits !== undefined) {
      fsFields['sharedState.act1Bits'] = data.newBits;
      if (data.newBits >= 9) {
        fsFields['sharedState.isBossActive'] = true;
        fsFields['sharedState.runPulses'] = 0;
      }
    }
    if (data.newResolution !== undefined) {
      fsFields['sharedState.act1Resolution'] = data.newResolution;
      if (data.newResolution >= 9) {
        fsFields['sharedState.isBossActive'] = true;
        fsFields['sharedState.runPulses'] = 0;
      }
    }
    if (data.newSubPart !== undefined) {
      fsFields['sharedState.act1SubPart'] = data.newSubPart;
      if (data.newSubPart === 2) {
        fsFields['sharedState.isBossActive'] = false;
        fsFields['sharedState.runPulses'] = 0;
      }
    }
    void updateRoomFieldsInFirestore(code, fsFields);
  }

  await sendServerRoomAction(code, 'compile', getLocalPilotId(), {
    compileType: type,
    data,
  });
}

/**
 * Sync shared resource bank & compile upgrades across squad
 */
export async function syncSharedProgress(
  roomCode: string,
  updates: Partial<SharedSpeedrunState>
): Promise<void> {
  const code = roomCode.toUpperCase();
  const nowIso = new Date().toISOString();
  const local = getLocalRoom(code);
  if (local) {
    Object.assign(local.sharedState, updates);
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
  }

  const fsFields: Record<string, any> = { updatedAt: nowIso };
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) {
      fsFields[`sharedState.${k}`] = v;
    }
  }
  void updateRoomFieldsInFirestore(code, fsFields);

  void sendServerRoomAction(code, 'syncProgress', getLocalPilotId(), {
    updates,
  });
}

/**
 * Trigger team wipe reset when all pilots are knocked simultaneously.
 */
export async function triggerTeamWipe(
  roomCode: string,
  currentRunNumber: number,
  checkpoint?: Partial<SharedSpeedrunState>
): Promise<void> {
  const code = roomCode.toUpperCase();
  saveLastSpeedrunRoomCode(code);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const local = getLocalRoom(code);
  if (local) {
    const pilotCount = Math.max(1, Object.keys(local.pilots || {}).length);
    const maxHp = getTeamBossMaxHp(pilotCount);
    local.status = 'wiped';
    local.lastWipeAt = now;
    local.sharedState.runNumber = currentRunNumber + 1;
    local.sharedState.runPulses = 0;
    local.sharedState.boss1Hp = maxHp;
    local.sharedState.boss2Hp = maxHp;
    local.sharedState.maxBoss1Hp = maxHp;
    local.sharedState.maxBoss2Hp = maxHp;
    local.sharedState.lastAction = `SIMULTANEOUS SQUAD WIPE! Progress saved. Retrying segment (Run #${currentRunNumber + 1})`;
    if (checkpoint) {
      Object.assign(local.sharedState, checkpoint);
      local.sharedState.runPulses = 0;
    }
    if (local.pilots) {
      for (const p of Object.values(local.pilots)) {
        p.readyToContinue = false;
        p.isKnocked = true;
        p.runPulses = 0;
      }
    }
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
    void saveRoomToFirestore(local, true);
  }

  await sendServerRoomAction(code, 'wipe', getLocalPilotId(), {
    currentRunNumber,
    checkpoint,
  });
}

/**
 * Squad Continue: Revives all squad pilots and resumes speedrun from saved progress
 */
export async function continueTeamRun(roomCode: string): Promise<void> {
  const code = roomCode.toUpperCase();
  saveLastSpeedrunRoomCode(code);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const local = getLocalRoom(code);
  if (local) {
    const pilotCount = Math.max(1, Object.keys(local.pilots || {}).length);
    const maxHp = getTeamBossMaxHp(pilotCount);
    local.status = 'active';
    local.lastContinueAt = now;
    local.sharedState.runPulses = 0;
    local.sharedState.boss1Hp = maxHp;
    local.sharedState.boss2Hp = maxHp;
    local.sharedState.maxBoss1Hp = maxHp;
    local.sharedState.maxBoss2Hp = maxHp;
    local.sharedState.lastAction = 'Squad run resumed from checkpoint!';
    if (local.pilots) {
      for (const p of Object.values(local.pilots)) {
        p.integrity = 100;
        p.isKnocked = false;
        p.readyToContinue = false;
        p.runPulses = 0;
        delete p.knockedAt;
        delete p.knockedUntil;
      }
    }
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
    void saveRoomToFirestore(local, true);
  }

  await sendServerRoomAction(code, 'continue', getLocalPilotId(), {});
}

/**
 * Vote to Continue Run on Death Screen.
 * Requires ALL registered squad pilots to hit continue before the run actually resumes.
 */
export async function voteToContinueRun(
  roomCode: string,
  pilotId: string,
  ready: boolean = true
): Promise<{ allReady: boolean; readyCount: number; totalCount: number }> {
  const code = roomCode.toUpperCase();
  const nowIso = new Date().toISOString();

  // 1. Update pilot's vote in Cloud Firestore immediately
  await updateRoomFieldsInFirestore(code, {
    [`pilots.${pilotId}.readyToContinue`]: ready,
    updatedAt: nowIso,
  });

  // 2. Also send to Express server
  const res = await sendServerRoomAction(code, 'voteContinue', pilotId, {
    ready,
  });
  if (res.success && res.extra?.allReady) {
    return res.extra;
  }

  // 3. Check latest room state from Firestore (or local cache) across all pilots
  const latestRoom = (await fetchRoomFromFirestore(code)) || getLocalRoom(code);
  if (!latestRoom) {
    return { allReady: false, readyCount: 0, totalCount: 1 };
  }

  const pilots = latestRoom.pilots || {};
  const pilotIds = Object.keys(pilots);
  const totalCount = Math.max(1, pilotIds.length);

  let readyCount = 0;
  for (const id of pilotIds) {
    const isThis = id === pilotId ? ready : Boolean(pilots[id]?.readyToContinue);
    if (isThis) readyCount++;
  }

  const allReady = readyCount >= totalCount;

  if (latestRoom.pilots && latestRoom.pilots[pilotId]) {
    latestRoom.pilots[pilotId].readyToContinue = ready;
    latestRoom.updatedAt = nowIso;
    broadcastRoomUpdate(latestRoom);
  }

  if (allReady) {
    await continueTeamRun(code);
    return { allReady: true, readyCount: totalCount, totalCount };
  }
  return { allReady: false, readyCount, totalCount };
}

/**
 * Pause and Save Squad Run: Progress is preserved in Cloud Firestore, Express server, & local storage
 */
export async function pauseAndSaveTeamRun(
  roomCode: string,
  checkpoint?: Partial<SharedSpeedrunState>
): Promise<void> {
  const code = roomCode.toUpperCase();
  saveLastSpeedrunRoomCode(code);
  const nowIso = new Date().toISOString();

  const local = getLocalRoom(code);
  if (local) {
    local.status = 'paused';
    local.sharedState.runPulses = 0;
    local.sharedState.lastAction = 'Squad progress saved. Session paused.';
    if (checkpoint) {
      Object.assign(local.sharedState, checkpoint);
      local.sharedState.runPulses = 0;
    }
    if (local.pilots) {
      for (const p of Object.values(local.pilots)) {
        p.runPulses = 0;
      }
    }
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
    void saveRoomToFirestore(local, true);
  }

  await sendServerRoomAction(code, 'pause', getLocalPilotId(), { checkpoint });
}

/**
 * Resume saved team run from Lobby or Menu (without resetting to 0)
 */
export async function resumeTeamRun(roomCode: string): Promise<SpeedrunRoom | null> {
  const code = roomCode.toUpperCase();
  saveLastSpeedrunRoomCode(code);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const local = getLocalRoom(code);
  let optimisticRoom: SpeedrunRoom | null = null;
  if (local) {
    const pilotCount = Math.max(1, Object.keys(local.pilots || {}).length);
    const maxHp = getTeamBossMaxHp(pilotCount);
    const resetPilots: Record<string, TeamPilot> = {};
    if (local.pilots) {
      for (const [k, p] of Object.entries(local.pilots)) {
        const copy: TeamPilot = {
          ...p,
          integrity: 100,
          isKnocked: false,
          readyToContinue: false,
          runPulses: 0,
        };
        delete copy.knockedAt;
        delete copy.knockedUntil;
        resetPilots[k] = copy;
      }
    }
    optimisticRoom = {
      ...local,
      status: 'active',
      lastContinueAt: now,
      sharedState: {
        ...local.sharedState,
        runPulses: 0,
        boss1Hp: maxHp,
        boss2Hp: maxHp,
        maxBoss1Hp: maxHp,
        maxBoss2Hp: maxHp,
        lastAction: 'Squad resumed run from saved checkpoint.',
      },
      pilots: resetPilots,
      updatedAt: nowIso,
    };
    broadcastRoomUpdate(optimisticRoom);
    void saveRoomToFirestore(optimisticRoom, true);
  }

  const res = await sendServerRoomAction(code, 'resume', getLocalPilotId(), {});
  return res.room || optimisticRoom || getLocalRoom(code);
}

/**
 * Return squad to Pilot Room (Lobby) from Death Screen or In-Game
 */
export async function returnToPilotRoom(
  roomCode: string,
  checkpoint?: Partial<SharedSpeedrunState>
): Promise<void> {
  const code = roomCode.toUpperCase();
  saveLastSpeedrunRoomCode(code);
  const nowIso = new Date().toISOString();

  const local = getLocalRoom(code);
  if (local) {
    local.status = 'lobby';
    local.sharedState.runPulses = 0;
    local.sharedState.lastAction = 'Squad returned to pilot room lobby.';
    if (checkpoint) {
      Object.assign(local.sharedState, checkpoint);
      local.sharedState.runPulses = 0;
    }
    if (local.pilots) {
      for (const p of Object.values(local.pilots)) {
        p.readyToContinue = false;
        p.integrity = 100;
        p.isKnocked = false;
        p.runPulses = 0;
        delete p.knockedAt;
        delete p.knockedUntil;
      }
    }
    local.updatedAt = nowIso;
    broadcastRoomUpdate(local);
    void saveRoomToFirestore(local, true);
  }

  await sendServerRoomAction(code, 'returnToLobby', getLocalPilotId(), {
    checkpoint,
  });
}
