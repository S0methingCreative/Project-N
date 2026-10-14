import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface StoryScoreEntry {
  id?: string;
  initials: string;
  stageName: string;
  stageNum: number;
  bit: number;
  resolution: number;
  completed: boolean;
  createdAt: string;
}

export interface ArcadeScoreEntry {
  id?: string;
  initials: string;
  stageName: string;
  stageNum: number;
  bit: number;
  duration: number;
  totalHz: number;
  completed: boolean;
  createdAt: string;
}

export interface SpeedrunScoreEntry {
  id?: string;
  initials: string;
  timeSeconds: number;
  runs: number;
  completed: boolean;
  createdAt: string;
}

export interface SurvivalScoreEntry {
  id?: string;
  initials: string;
  survivalSeconds: number;
  totalHz: number;
  createdAt: string;
}

export interface FTCEntry {
  initials: string;
  completedAt: string;
  stageName?: string;
  duration?: number;
  totalHz?: number;
}

// Local storage fallback cache keys
const LOCAL_LEADERBOARDS_CACHE_KEY = 'bit_resonance_leaderboards_cache_v2';
const LOCAL_STORY_FTC_CACHE_KEY = 'game_n_story_ftc_cache_v1';
const LOCAL_ARCADE_FTC_CACHE_KEY = 'game_n_arcade_ftc_cache_v1';
export const PLAYER_CODE_STORAGE_KEY = 'game_n_player_code';

export function getPlayerCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAYER_CODE_STORAGE_KEY);
    if (raw && /^[A-Z0-9]{3}$/i.test(raw.trim())) {
      return raw.trim().toUpperCase();
    }
  } catch {}
  return null;
}

export function setPlayerCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = code.trim().toUpperCase().slice(0, 3);
    localStorage.setItem(PLAYER_CODE_STORAGE_KEY, clean);
  } catch {}
}

const FILLER_CODES = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'III', 'JJJ'];

// Default beatable records (AAA through JJJ)
export const DEFAULT_STORY_SCORES: StoryScoreEntry[] = FILLER_CODES.map((code, idx) => ({
  initials: code,
  stageName: '0D Void',
  stageNum: 0,
  bit: 0,
  resolution: 0,
  completed: false,
  createdAt: `2026-01-01T00:0${idx}:00Z`,
}));

export const DEFAULT_ARCADE_SCORES: ArcadeScoreEntry[] = FILLER_CODES.map((code, idx) => ({
  initials: code,
  stageName: '0D Void',
  stageNum: 0,
  bit: 0,
  duration: 0.1,
  totalHz: 0,
  completed: false,
  createdAt: `2026-01-01T00:0${idx}:00Z`,
}));

export const DEFAULT_SPEEDRUN_SCORES: SpeedrunScoreEntry[] = FILLER_CODES.map((code, idx) => ({
  initials: code,
  timeSeconds: 5999.9, // Formatted as 99:99.9
  runs: 99,
  completed: true,
  createdAt: `2026-01-01T00:0${idx}:00Z`,
}));

export const DEFAULT_SURVIVAL_SCORES: SurvivalScoreEntry[] = FILLER_CODES.map((code, idx) => ({
  initials: code,
  survivalSeconds: 0.1, // Formatted as 00:00.1
  totalHz: 0,
  createdAt: `2026-01-01T00:0${idx}:00Z`,
}));

export function sanitizeInitials(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  return clean.padEnd(3, 'A');
}

function generateDocId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function saveToLocalCache(key: string, data: any) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function loadFromLocalCache(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

// ---------------------------------------------------------------------------
// UNIQUE CODE CHECK & REGISTRATION
// ---------------------------------------------------------------------------
export async function checkCodeAvailability(
  code: string,
  currentCode?: string
): Promise<{ available: boolean; reason?: string }> {
  const clean = code.trim().toUpperCase();
  if (clean.length !== 3 || !/^[A-Z0-9]{3}$/.test(clean)) {
    return { available: false, reason: 'Must be exactly 3 alphanumeric characters (A-Z, 0-9).' };
  }

  if (currentCode && clean === currentCode.trim().toUpperCase()) {
    return { available: true };
  }

  try {
    // 1. Check players registry in Firestore
    const playerRef = doc(db, 'players', clean);
    const playerSnap = await getDoc(playerRef);
    if (playerSnap.exists()) {
      return { available: false, reason: `Pilot code "${clean}" is already registered by another player.` };
    }

    // 2. Check across existing leaderboard collections in real-time
    const checks = [
      getDocs(query(collection(db, 'leaderboards_story'), limit(25))),
      getDocs(query(collection(db, 'leaderboards_arcade'), limit(25))),
      getDocs(query(collection(db, 'leaderboards_speedrun'), limit(25))),
      getDocs(query(collection(db, 'leaderboards_survival'), limit(25))),
    ];
    const results = await Promise.all(checks);
    for (const snap of results) {
      for (const d of snap.docs) {
        const data = d.data();
        if (data.initials === clean) {
          return { available: false, reason: `Pilot code "${clean}" is already in use on global leaderboards.` };
        }
      }
    }

    return { available: true };
  } catch (err) {
    console.warn('Real-time code availability check fallback:', err);
    // Offline / fallback verification against local storage cache
    return { available: true };
  }
}

export async function registerPlayerCode(code: string): Promise<boolean> {
  const clean = code.trim().toUpperCase().slice(0, 3);
  if (clean.length !== 3) return false;

  setPlayerCode(clean);

  try {
    const playerRef = doc(db, 'players', clean);
    await setDoc(playerRef, {
      code: clean,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('registerPlayerCode Firestore write warning:', err);
    return true; // Local storage succeeds
  }
}

// ---------------------------------------------------------------------------
// STORY LEADERBOARD (Furthest stage completed, no time, no score)
// ---------------------------------------------------------------------------
export async function fetchStoryLeaderboard(): Promise<StoryScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_story');
    const q = query(colRef, orderBy('stageNum', 'desc'), limit(10));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoryScoreEntry));
      saveToLocalCache('story_scores_v2', items);
      return items;
    }
  } catch (err) {
    console.warn('fetchStoryLeaderboard error, using cache:', err);
  }
  return loadFromLocalCache('story_scores_v2', DEFAULT_STORY_SCORES);
}

export function subscribeStoryLeaderboard(callback: (scores: StoryScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_story');
    const q = query(colRef, orderBy('stageNum', 'desc'), limit(10));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as StoryScoreEntry));
          saveToLocalCache('story_scores_v2', items);
          callback(items);
        } else {
          callback(loadFromLocalCache('story_scores_v2', DEFAULT_STORY_SCORES));
        }
      },
      (err) => {
        console.warn('Story leaderboard live snapshot failed:', err);
        callback(loadFromLocalCache('story_scores_v2', DEFAULT_STORY_SCORES));
      }
    );
  } catch {
    callback(loadFromLocalCache('story_scores_v2', DEFAULT_STORY_SCORES));
    return () => {};
  }
}

export async function submitStoryScore(entry: Omit<StoryScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  const docId = generateDocId();
  const payload: StoryScoreEntry = {
    ...entry,
    initials: cleanInitials,
    stageName: entry.stageName.slice(0, 64),
    stageNum: typeof entry.stageNum === 'number' ? entry.stageNum : 0,
    bit: Math.max(0, Math.min(20, Math.floor(entry.bit || 0))),
    resolution: Math.max(0, Math.min(20, Math.floor(entry.resolution || 0))),
    completed: Boolean(entry.completed),
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'leaderboards_story', docId), payload);
    return true;
  } catch (err) {
    console.error('Failed to submit story score to Firestore:', err);
    const current = loadFromLocalCache('story_scores_v2', DEFAULT_STORY_SCORES);
    const updated = [...current, { id: docId, ...payload }]
      .sort((a, b) => b.stageNum - a.stageNum)
      .slice(0, 10);
    saveToLocalCache('story_scores_v2', updated);
    return false;
  }
}

// ---------------------------------------------------------------------------
// ARCADE LEADERBOARD (Furthest stage reached then duration, Total HZ tracked)
// ---------------------------------------------------------------------------
export async function fetchArcadeLeaderboard(): Promise<ArcadeScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_arcade');
    const q = query(colRef, orderBy('stageNum', 'desc'), orderBy('duration', 'desc'), limit(10));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ArcadeScoreEntry));
      saveToLocalCache('arcade_scores_v2', items);
      return items;
    }
  } catch (err) {
    console.warn('fetchArcadeLeaderboard error, using cache:', err);
  }
  return loadFromLocalCache('arcade_scores_v2', DEFAULT_ARCADE_SCORES);
}

export function subscribeArcadeLeaderboard(callback: (scores: ArcadeScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_arcade');
    const q = query(colRef, orderBy('stageNum', 'desc'), orderBy('duration', 'desc'), limit(10));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ArcadeScoreEntry));
          saveToLocalCache('arcade_scores_v2', items);
          callback(items);
        } else {
          callback(loadFromLocalCache('arcade_scores_v2', DEFAULT_ARCADE_SCORES));
        }
      },
      (err) => {
        console.warn('Arcade leaderboard live snapshot failed:', err);
        callback(loadFromLocalCache('arcade_scores_v2', DEFAULT_ARCADE_SCORES));
      }
    );
  } catch {
    callback(loadFromLocalCache('arcade_scores_v2', DEFAULT_ARCADE_SCORES));
    return () => {};
  }
}

export async function submitArcadeScore(entry: Omit<ArcadeScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  const docId = generateDocId();
  const payload: ArcadeScoreEntry = {
    ...entry,
    initials: cleanInitials,
    stageName: entry.stageName.slice(0, 64),
    stageNum: typeof entry.stageNum === 'number' ? entry.stageNum : 0,
    bit: Math.max(0, Math.min(20, Math.floor(entry.bit || 0))),
    duration: Math.max(0, Math.round(entry.duration * 10) / 10),
    totalHz: Math.max(0, Math.floor(entry.totalHz || 0)),
    completed: Boolean(entry.completed),
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'leaderboards_arcade', docId), payload);
    return true;
  } catch (err) {
    console.error('Failed to submit arcade score to Firestore:', err);
    const current = loadFromLocalCache('arcade_scores_v2', DEFAULT_ARCADE_SCORES);
    const updated = [...current, { id: docId, ...payload }]
      .sort((a, b) => b.stageNum !== a.stageNum ? b.stageNum - a.stageNum : b.duration - a.duration)
      .slice(0, 10);
    saveToLocalCache('arcade_scores_v2', updated);
    return false;
  }
}

// ---------------------------------------------------------------------------
// SPEEDRUN LEADERBOARD (Fastest completion time, completions only)
// ---------------------------------------------------------------------------
export async function fetchSpeedrunLeaderboard(): Promise<SpeedrunScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_speedrun');
    const q = query(colRef, orderBy('timeSeconds', 'asc'), limit(10));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SpeedrunScoreEntry));
      saveToLocalCache('speedrun_scores_v2', items);
      return items;
    }
  } catch (err) {
    console.warn('fetchSpeedrunLeaderboard error, using cache:', err);
  }
  return loadFromLocalCache('speedrun_scores_v2', DEFAULT_SPEEDRUN_SCORES);
}

export function subscribeSpeedrunLeaderboard(callback: (scores: SpeedrunScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_speedrun');
    const q = query(colRef, orderBy('timeSeconds', 'asc'), limit(10));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SpeedrunScoreEntry));
          saveToLocalCache('speedrun_scores_v2', items);
          callback(items);
        } else {
          callback(loadFromLocalCache('speedrun_scores_v2', DEFAULT_SPEEDRUN_SCORES));
        }
      },
      (err) => {
        console.warn('Speedrun leaderboard live snapshot failed:', err);
        callback(loadFromLocalCache('speedrun_scores_v2', DEFAULT_SPEEDRUN_SCORES));
      }
    );
  } catch {
    callback(loadFromLocalCache('speedrun_scores_v2', DEFAULT_SPEEDRUN_SCORES));
    return () => {};
  }
}

export async function submitSpeedrunScore(entry: Omit<SpeedrunScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  const docId = generateDocId();
  const payload: SpeedrunScoreEntry = {
    ...entry,
    initials: cleanInitials,
    timeSeconds: Math.max(0.1, Math.round(entry.timeSeconds * 100) / 100),
    runs: Math.max(1, Math.floor(entry.runs || 1)),
    completed: true, // Speedrun only stores completions
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'leaderboards_speedrun', docId), payload);
    return true;
  } catch (err) {
    console.error('Failed to submit speedrun score to Firestore:', err);
    const current = loadFromLocalCache('speedrun_scores_v2', DEFAULT_SPEEDRUN_SCORES);
    const updated = [...current, { id: docId, ...payload }]
      .sort((a, b) => a.timeSeconds - b.timeSeconds)
      .slice(0, 10);
    saveToLocalCache('speedrun_scores_v2', updated);
    return false;
  }
}

// ---------------------------------------------------------------------------
// SURVIVAL LEADERBOARD (Longest time survived + Total HZ)
// ---------------------------------------------------------------------------
export async function fetchSurvivalLeaderboard(): Promise<SurvivalScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_survival');
    const q = query(colRef, orderBy('survivalSeconds', 'desc'), limit(10));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SurvivalScoreEntry));
      saveToLocalCache('survival_scores_v2', items);
      return items;
    }
  } catch (err) {
    console.warn('fetchSurvivalLeaderboard error, using cache:', err);
  }
  return loadFromLocalCache('survival_scores_v2', DEFAULT_SURVIVAL_SCORES);
}

export function subscribeSurvivalLeaderboard(callback: (scores: SurvivalScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_survival');
    const q = query(colRef, orderBy('survivalSeconds', 'desc'), limit(10));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SurvivalScoreEntry));
          saveToLocalCache('survival_scores_v2', items);
          callback(items);
        } else {
          callback(loadFromLocalCache('survival_scores_v2', DEFAULT_SURVIVAL_SCORES));
        }
      },
      (err) => {
        console.warn('Survival leaderboard live snapshot failed:', err);
        callback(loadFromLocalCache('survival_scores_v2', DEFAULT_SURVIVAL_SCORES));
      }
    );
  } catch {
    callback(loadFromLocalCache('survival_scores_v2', DEFAULT_SURVIVAL_SCORES));
    return () => {};
  }
}

export async function submitSurvivalScore(entry: Omit<SurvivalScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  const docId = generateDocId();
  const payload: SurvivalScoreEntry = {
    ...entry,
    initials: cleanInitials,
    survivalSeconds: Math.max(0, Math.round(entry.survivalSeconds * 10) / 10),
    totalHz: Math.max(0, Math.floor(entry.totalHz || 0)),
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'leaderboards_survival', docId), payload);
    return true;
  } catch (err) {
    console.error('Failed to submit survival score to Firestore:', err);
    const current = loadFromLocalCache('survival_scores_v2', DEFAULT_SURVIVAL_SCORES);
    const updated = [...current, { id: docId, ...payload }]
      .sort((a, b) => b.survivalSeconds - a.survivalSeconds)
      .slice(0, 10);
    saveToLocalCache('survival_scores_v2', updated);
    return false;
  }
}

// ---------------------------------------------------------------------------
// FIRST TO COMPLETE (FTC) CHALLENGES: STORY & ARCADE
// ---------------------------------------------------------------------------
export async function fetchStoryFTC(): Promise<FTCEntry | null> {
  try {
    const ftcRef = doc(db, 'leaderboards_meta', 'story_ftc');
    const snap = await getDoc(ftcRef);
    if (snap.exists()) {
      const data = snap.data() as FTCEntry;
      saveToLocalCache(LOCAL_STORY_FTC_CACHE_KEY, data);
      return data;
    }
  } catch (err) {
    console.warn('fetchStoryFTC error:', err);
  }
  return loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null);
}

export function subscribeStoryFTC(callback: (ftc: FTCEntry | null) => void): Unsubscribe {
  try {
    const ftcRef = doc(db, 'leaderboards_meta', 'story_ftc');
    return onSnapshot(
      ftcRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as FTCEntry;
          saveToLocalCache(LOCAL_STORY_FTC_CACHE_KEY, data);
          callback(data);
        } else {
          callback(loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null));
        }
      },
      (err) => {
        console.warn('Story FTC live snapshot error:', err);
        callback(loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null));
      }
    );
  } catch {
    callback(loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null));
    return () => {};
  }
}

export async function recordStoryFTCIfFirst(initials: string): Promise<{ isFTC: boolean; ftc: FTCEntry }> {
  const ftcRef = doc(db, 'leaderboards_meta', 'story_ftc');
  const cleanInitials = sanitizeInitials(initials);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ftcRef);
      if (snap.exists()) {
        return { isFTC: false, ftc: snap.data() as FTCEntry };
      }

      const newRecord: FTCEntry = {
        initials: cleanInitials,
        completedAt: new Date().toISOString(),
        stageName: 'Fracture Sovereign Defeated ★',
      };

      transaction.set(ftcRef, newRecord);
      return { isFTC: true, ftc: newRecord };
    });

    saveToLocalCache(LOCAL_STORY_FTC_CACHE_KEY, result.ftc);
    return result;
  } catch (err) {
    console.warn('recordStoryFTCIfFirst transaction warning:', err);
    const existing = loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null);
    if (!existing) {
      const fallback: FTCEntry = {
        initials: cleanInitials,
        completedAt: new Date().toISOString(),
        stageName: 'Fracture Sovereign Defeated ★',
      };
      saveToLocalCache(LOCAL_STORY_FTC_CACHE_KEY, fallback);
      return { isFTC: true, ftc: fallback };
    }
    return { isFTC: false, ftc: existing };
  }
}

export async function fetchArcadeFTC(): Promise<FTCEntry | null> {
  try {
    const ftcRef = doc(db, 'leaderboards_meta', 'arcade_ftc');
    const snap = await getDoc(ftcRef);
    if (snap.exists()) {
      const data = snap.data() as FTCEntry;
      saveToLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, data);
      return data;
    }
  } catch (err) {
    console.warn('fetchArcadeFTC error:', err);
  }
  return loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null);
}

export function subscribeArcadeFTC(callback: (ftc: FTCEntry | null) => void): Unsubscribe {
  try {
    const ftcRef = doc(db, 'leaderboards_meta', 'arcade_ftc');
    return onSnapshot(
      ftcRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as FTCEntry;
          saveToLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, data);
          callback(data);
        } else {
          callback(loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null));
        }
      },
      (err) => {
        console.warn('Arcade FTC live snapshot error:', err);
        callback(loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null));
      }
    );
  } catch {
    callback(loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null));
    return () => {};
  }
}

export async function recordArcadeFTCIfFirst(
  initials: string,
  duration: number,
  totalHz: number
): Promise<{ isFTC: boolean; ftc: FTCEntry }> {
  const ftcRef = doc(db, 'leaderboards_meta', 'arcade_ftc');
  const cleanInitials = sanitizeInitials(initials);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ftcRef);
      if (snap.exists()) {
        return { isFTC: false, ftc: snap.data() as FTCEntry };
      }

      const newRecord: FTCEntry = {
        initials: cleanInitials,
        completedAt: new Date().toISOString(),
        stageName: 'Res 10 Victory (240 FPS) ★',
        duration: Math.round(duration * 10) / 10,
        totalHz: Math.floor(totalHz),
      };

      transaction.set(ftcRef, newRecord);
      return { isFTC: true, ftc: newRecord };
    });

    saveToLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, result.ftc);
    return result;
  } catch (err) {
    console.warn('recordArcadeFTCIfFirst transaction warning:', err);
    const existing = loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null);
    if (!existing) {
      const fallback: FTCEntry = {
        initials: cleanInitials,
        completedAt: new Date().toISOString(),
        stageName: 'Res 10 Victory (240 FPS) ★',
        duration: Math.round(duration * 10) / 10,
        totalHz: Math.floor(totalHz),
      };
      saveToLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, fallback);
      return { isFTC: true, ftc: fallback };
    }
    return { isFTC: false, ftc: existing };
  }
}

// ---------------------------------------------------------------------------
// QUALIFICATION CHECK LOGIC (Top 10 determination)
// ---------------------------------------------------------------------------
export async function checkQualifiesForTop10(
  mode: 'story' | 'speedrun' | 'survival' | 'arcade',
  metricValue: number,
  secondaryMetric: number = 0
): Promise<{ qualifies: boolean; projectedRank: number }> {
  try {
    if (mode === 'story') {
      const scores = await fetchStoryLeaderboard();
      if (scores.length < 10) {
        const rank = scores.filter(s => s.stageNum > metricValue).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
      const lowest = scores[scores.length - 1];
      if (metricValue > lowest.stageNum) {
        const rank = scores.filter(s => s.stageNum > metricValue).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
    } else if (mode === 'speedrun') {
      const times = await fetchSpeedrunLeaderboard();
      if (times.length < 10) {
        const rank = times.filter(t => t.timeSeconds < metricValue).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
      const highest = times[times.length - 1];
      if (metricValue < highest.timeSeconds) {
        const rank = times.filter(t => t.timeSeconds < metricValue).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
    } else if (mode === 'survival') {
      const times = await fetchSurvivalLeaderboard();
      if (times.length < 10) {
        const rank = times.filter(t => t.survivalSeconds > metricValue).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
      const lowest = times[times.length - 1];
      if (metricValue > lowest.survivalSeconds) {
        const rank = times.filter(t => t.survivalSeconds > metricValue).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
    } else if (mode === 'arcade') {
      const scores = await fetchArcadeLeaderboard();
      if (scores.length < 10) {
        const rank = scores.filter(s => s.stageNum !== metricValue ? s.stageNum > metricValue : s.duration > secondaryMetric).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
      const lowest = scores[scores.length - 1];
      const isBetter = metricValue > lowest.stageNum || (metricValue === lowest.stageNum && secondaryMetric > lowest.duration);
      if (isBetter) {
        const rank = scores.filter(s => s.stageNum !== metricValue ? s.stageNum > metricValue : s.duration > secondaryMetric).length + 1;
        return { qualifies: true, projectedRank: rank };
      }
    }
  } catch (err) {
    console.warn('Error evaluating Top 10 qualification:', err);
    return { qualifies: true, projectedRank: 1 };
  }
  return { qualifies: false, projectedRank: 11 };
}
