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

export function broadcastTelemetry(
  roomCode: string,
  pilotId: string,
  data: Partial<TeamPilot>
): void {
  const code = roomCode.toUpperCase();
  const telemetryEvent = {
    type: 'TELEMETRY',
    roomCode: code,
    pilotId,
    data,
    time: Date.now(),
  };
  notifyInTabListeners(code, telemetryEvent);
  try {
    squadChannel?.postMessage(telemetryEvent);
  } catch {}

  // Send over live WebSocket if open for cross-device real-time sync
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
 * Create a new Squad Co-Op Room on the Express + WebSocket Server (zero Firestore usage)
 */
export async function createSpeedrunRoom(
  initials?: string,
  color?: PilotBeamColor
): Promise<SpeedrunRoom> {
  const pilotId = getLocalPilotId();
  const pilotInitials = (initials || getPlayerCode() || 'PIL').toUpperCase();
  const pilotColor = color || getPilotBeamColor();
  const preferredCode = generateRoomCode();

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
        saveLastSpeedrunRoomCode(data.room.code);
        broadcastRoomUpdate(data.room);
        return data.room as SpeedrunRoom;
      }
    }
  } catch {}

  // Offline/local fallback if server is temporarily unreachable
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
    lastHeartbeat: Date.now(),
    slotIndex: 0,
    joinedAt: Date.now(),
  };

  const roomData: SpeedrunRoom = {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveLastSpeedrunRoomCode(preferredCode);
  broadcastRoomUpdate(roomData);
  return roomData;
}

/**
 * Join an existing Squad Co-Op Room via Express + WebSocket Server (zero Firestore usage)
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

  try {
    const res = await fetch(`/api/squad/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pilotId,
        initials: pilotInitials,
        color: pilotColor,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.room) {
      saveLastSpeedrunRoomCode(code);
      broadcastRoomUpdate(data.room);
      return { success: true, room: data.room as SpeedrunRoom };
    }

    // If server doesn't have the room yet (e.g. after server restart), check if local storage has it
    const localFallback = getLocalRoom(code);
    if (!res.ok && res.status === 404 && localFallback) {
      // Rehydrate on server and join
      await sendServerRoomAction(code, 'syncProgress', pilotId, {
        updates: localFallback.sharedState,
      });
      const retryRes = await fetch(
        `/api/squad/rooms/${encodeURIComponent(code)}/join`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pilotId,
            initials: pilotInitials,
            color: pilotColor,
          }),
        }
      );
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        if (retryData.success && retryData.room) {
          saveLastSpeedrunRoomCode(code);
          broadcastRoomUpdate(retryData.room);
          return { success: true, room: retryData.room as SpeedrunRoom };
        }
      }
    }

    if (data?.error && !localFallback) {
      return { success: false, error: data.error };
    }
  } catch {}

  // Fallback to local room cache if available
  const room = getLocalRoom(code);
  if (!room) {
    return {
      success: false,
      error: `Squad Room [${code}] not found. Check code or create a new room.`,
    };
  }

  const currentPilots = room.pilots || {};
  const pilotKeys = Object.keys(currentPilots);

  if (currentPilots[pilotId]) {
    const existing = currentPilots[pilotId];
    const updatedPilot: TeamPilot = {
      ...existing,
      initials: pilotInitials,
      color: pilotColor,
      lastHeartbeat: Date.now(),
      slotIndex: typeof existing.slotIndex === 'number' ? existing.slotIndex : 1,
      joinedAt: existing.joinedAt || Date.now(),
    };
    const updatedRoom: SpeedrunRoom = {
      ...room,
      pilots: { ...currentPilots, [pilotId]: updatedPilot },
      updatedAt: new Date().toISOString(),
    };
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
    lastHeartbeat: Date.now(),
    slotIndex: assignedSlot,
    joinedAt: Date.now(),
  };

  const nextCount = pilotKeys.length + 1;
  const maxBoss1Hp = getTeamBossMaxHp(nextCount);
  const maxBoss2Hp = getTeamBossMaxHp(nextCount);

  const updatedRoom: SpeedrunRoom = {
    ...room,
    pilots: { ...currentPilots, [pilotId]: newPilot },
    sharedState: { ...room.sharedState, maxBoss1Hp, maxBoss2Hp },
    updatedAt: new Date().toISOString(),
  };
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
  const local = getLocalRoom(code);
  if (local && local.pilots && local.pilots[pilotId]) {
    local.pilots[pilotId].isReady = isReady;
    local.pilots[pilotId].lastHeartbeat = Date.now();
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
  }

  await sendServerRoomAction(code, 'ready', pilotId, { isReady });
}

/**
 * Launch the Squad Co-Op Run for the squad
 */
export async function launchTeamRun(roomCode: string): Promise<SpeedrunRoom | null> {
  const code = roomCode.toUpperCase();
  const local = getLocalRoom(code);
  let optimisticRoom: SpeedrunRoom | null = null;
  if (local) {
    const pilotCount = Math.max(1, Object.keys(local.pilots || {}).length);
    const maxHp = getTeamBossMaxHp(pilotCount);
    optimisticRoom = {
      ...local,
      status: 'active',
      lastContinueAt: Date.now(),
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
      },
      updatedAt: new Date().toISOString(),
    };
    broadcastRoomUpdate(optimisticRoom);
  }

  const res = await sendServerRoomAction(code, 'launch', getLocalPilotId(), {});
  return res.room || optimisticRoom || getLocalRoom(code);
}

/**
 * Subscribe to real-time room updates via Express WebSocket (/ws/squad) + BroadcastChannel + 1s HTTP sync
 */
export function subscribeToSpeedrunRoom(
  roomCode: string,
  callback: (room: SpeedrunRoom | null) => void
): () => void {
  const code = roomCode.toUpperCase();
  let isDisposed = false;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const initialRoom = getLocalRoom(code);
  if (initialRoom) {
    callback(initialRoom);
  }

  const fetchLatestRoom = () => {
    if (isDisposed || typeof window === 'undefined') return;
    fetch(`/api/squad/rooms/${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isDisposed && data?.success && data.room) {
          saveLocalRoom(data.room);
          callback(data.room);
        }
      })
      .catch(() => {});
  };

  // Initial fetch + periodic 1s sync poll to guarantee zero missed state transitions across devices
  fetchLatestRoom();
  if (typeof window !== 'undefined') {
    pollTimer = setInterval(fetchLatestRoom, 1000);
  }

  let lastTelemetryDiskSave = 0;

  const handleIncomingEvent = (msg: any) => {
    if (!msg || isDisposed) return;
    if (msg.type === 'ROOM_UPDATE' && msg.room?.code === code) {
      saveLocalRoom(msg.room);
      callback(msg.room);
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
                // Never regress progression fields on out-of-order telemetry packets
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
              pilotId: getLocalPilotId(),
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
    squadChannel?.removeEventListener('message', handleBroadcast);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

/**
 * Update real-time pilot telemetry (WebSocket + BroadcastChannel for zero quota high-frequency position)
 */
export async function updatePilotTelemetry(
  roomCode: string,
  pilotId: string,
  data: Partial<TeamPilot> & { runNumber?: number; continueAt?: number }
): Promise<void> {
  const code = roomCode.toUpperCase();
  broadcastTelemetry(code, pilotId, data);

  const local = getLocalRoom(code);
  if (local && local.pilots && local.pilots[pilotId]) {
    local.pilots[pilotId] = {
      ...local.pilots[pilotId],
      ...data,
      lastHeartbeat: Date.now(),
    };
    latestRoomByCode.set(code, local);
  }
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
 * Deal damage to shared Boss health (WebSocket + Server-Authoritative state)
 */
export async function damageTeamBoss(
  roomCode: string,
  bossNum: 1 | 2,
  damage: number
): Promise<void> {
  const code = roomCode.toUpperCase();
  const local = getLocalRoom(code);
  if (local) {
    const hpKey = bossNum === 1 ? 'boss1Hp' : 'boss2Hp';
    const currentHp =
      local.sharedState[hpKey] ??
      (bossNum === 1 ? local.sharedState.maxBoss1Hp : local.sharedState.maxBoss2Hp);
    local.sharedState[hpKey] = Math.max(0, currentHp - damage);
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
  }

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
  const local = getLocalRoom(code);
  if (local) {
    local.sharedState.totalHz = (local.sharedState.totalHz || 0) + (res.hz || 0);
    local.sharedState.totalV = (local.sharedState.totalV || 0) + (res.volts || 0);
    local.sharedState.totalBaud =
      (local.sharedState.totalBaud || 0) + (res.baud || 0);
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
  }

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
      if (data.newBits >= 9) local.sharedState.isBossActive = true;
    }
    if (data.newResolution !== undefined) {
      local.sharedState.act1Resolution = data.newResolution;
      if (data.newResolution >= 9) local.sharedState.isBossActive = true;
    }
    if (data.newSubPart !== undefined) {
      local.sharedState.act1SubPart = data.newSubPart;
    }
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
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
  const local = getLocalRoom(code);
  if (local) {
    Object.assign(local.sharedState, updates);
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
  }

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
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
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
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
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
  const res = await sendServerRoomAction(code, 'voteContinue', pilotId, {
    ready,
  });
  if (res.success && res.extra) {
    return res.extra;
  }

  const room = getLocalRoom(code);
  if (!room) {
    return { allReady: false, readyCount: 0, totalCount: 1 };
  }

  const pilots = room.pilots || {};
  const pilotIds = Object.keys(pilots);
  const totalCount = Math.max(1, pilotIds.length);

  let readyCount = 0;
  for (const id of pilotIds) {
    const isThis = id === pilotId ? ready : Boolean(pilots[id]?.readyToContinue);
    if (isThis) readyCount++;
  }

  const allReady = readyCount >= totalCount;

  if (room.pilots && room.pilots[pilotId]) {
    room.pilots[pilotId].readyToContinue = ready;
    room.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(room);
  }

  if (allReady) {
    await continueTeamRun(code);
    return { allReady: true, readyCount: totalCount, totalCount };
  }
  return { allReady: false, readyCount, totalCount };
}

/**
 * Pause and Save Squad Run: Progress is preserved on the Express server (24h TTL) & local storage
 */
export async function pauseAndSaveTeamRun(
  roomCode: string,
  checkpoint?: Partial<SharedSpeedrunState>
): Promise<void> {
  const code = roomCode.toUpperCase();
  saveLastSpeedrunRoomCode(code);

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
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
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

  const local = getLocalRoom(code);
  let optimisticRoom: SpeedrunRoom | null = null;
  if (local) {
    const pilotCount = Math.max(1, Object.keys(local.pilots || {}).length);
    const maxHp = getTeamBossMaxHp(pilotCount);
    const resetPilots: Record<string, TeamPilot> = {};
    if (local.pilots) {
      for (const [k, p] of Object.entries(local.pilots)) {
        resetPilots[k] = {
          ...p,
          integrity: 100,
          isKnocked: false,
          readyToContinue: false,
          runPulses: 0,
          knockedAt: undefined,
          knockedUntil: undefined,
        };
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
      updatedAt: new Date().toISOString(),
    };
    broadcastRoomUpdate(optimisticRoom);
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
    local.updatedAt = new Date().toISOString();
    broadcastRoomUpdate(local);
  }

  await sendServerRoomAction(code, 'returnToLobby', getLocalPilotId(), {
    checkpoint,
  });
}
