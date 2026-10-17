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

export type PilotBeamColor = 'green' | 'blue' | 'amber' | 'azure';

export interface BeamColorConfig {
  id: PilotBeamColor;
  label: string;
  zoneName: string;
  zoneSub: string;
  hex: string;
  glow: string;
  light: string;
  shadow: string;
  particle: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeGlow: string;
}

export const BEAM_COLOR_CONFIGS: Record<PilotBeamColor, BeamColorConfig> = {
  green: {
    id: 'green',
    label: 'Emerald Green',
    zoneName: 'Harmonic Slit',
    zoneSub: 'Res 8 Slit Zone (Default)',
    hex: '#00ff88',
    glow: '#00ffaa',
    light: '#55ffbb',
    shadow: 'rgba(0, 255, 136, 0.55)',
    particle: 'rgba(0, 255, 136, 0.40)',
    badgeBg: 'bg-emerald-950/80',
    badgeBorder: 'border-emerald-500/60',
    badgeText: 'text-emerald-300',
    badgeGlow: 'shadow-[0_0_10px_rgba(0,255,136,0.25)]',
  },
  blue: {
    id: 'blue',
    label: 'Cobalt Blue',
    zoneName: 'Attenuation Zone',
    zoneSub: 'Res 8 Attenuation Spectrum',
    hex: '#00d0ff',
    glow: '#33ccff',
    light: '#66ddff',
    shadow: 'rgba(0, 208, 255, 0.55)',
    particle: 'rgba(0, 208, 255, 0.40)',
    badgeBg: 'bg-cyan-950/80',
    badgeBorder: 'border-cyan-500/60',
    badgeText: 'text-cyan-300',
    badgeGlow: 'shadow-[0_0_10px_rgba(0,208,255,0.25)]',
  },
  amber: {
    id: 'amber',
    label: 'Solar Amber',
    zoneName: 'Emitter Maw',
    zoneSub: 'Res 8 High-Yield Plasma',
    hex: '#ff9900',
    glow: '#ffaa33',
    light: '#ffcc55',
    shadow: 'rgba(255, 153, 0, 0.55)',
    particle: 'rgba(255, 153, 0, 0.40)',
    badgeBg: 'bg-amber-950/80',
    badgeBorder: 'border-amber-500/60',
    badgeText: 'text-amber-300',
    badgeGlow: 'shadow-[0_0_10px_rgba(255,153,0,0.25)]',
  },
  azure: {
    id: 'azure',
    label: 'Azure Violet',
    zoneName: 'Core Corridor',
    zoneSub: 'Res 8 Nucleon Interface',
    hex: '#88aaff',
    glow: '#aaccff',
    light: '#c0d4ff',
    shadow: 'rgba(136, 170, 255, 0.55)',
    particle: 'rgba(136, 170, 255, 0.40)',
    badgeBg: 'bg-indigo-950/80',
    badgeBorder: 'border-indigo-500/60',
    badgeText: 'text-indigo-300',
    badgeGlow: 'shadow-[0_0_10px_rgba(136,170,255,0.25)]',
  },
};

export const PILOT_BEAM_COLOR_STORAGE_KEY = 'bit_pilot_beam_color';

export function getPilotBeamColor(): PilotBeamColor {
  if (typeof window === 'undefined') return 'green';
  try {
    const raw = localStorage.getItem(PILOT_BEAM_COLOR_STORAGE_KEY);
    if (raw && (raw === 'green' || raw === 'blue' || raw === 'amber' || raw === 'azure')) {
      return raw as PilotBeamColor;
    }
  } catch {}
  return 'green';
}

export function hasChosenBeamColor(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PILOT_BEAM_COLOR_STORAGE_KEY) !== null;
  } catch {}
  return true;
}

export function setPilotBeamColor(color: PilotBeamColor): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PILOT_BEAM_COLOR_STORAGE_KEY, color);
    window.dispatchEvent(new CustomEvent('pilot_beam_color_changed', { detail: color }));
  } catch {}
}

export interface StoryScoreEntry {
  id?: string;
  initials: string;
  completions: number; // total number of completions
  stageName: string;   // current level / story progression display
  stageNum: number;    // numeric stage ranking index for sorting
  bit: number;
  resolution: number;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  color?: PilotBeamColor;
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
  color?: PilotBeamColor;
}

export interface SpeedrunScoreEntry {
  id?: string;
  initials: string;
  timeSeconds: number;
  runs: number;
  completed: boolean;
  createdAt: string;
  color?: PilotBeamColor;
}

export interface SurvivalScoreEntry {
  id?: string;
  initials: string;
  survivalSeconds: number;
  totalHz: number;
  createdAt: string;
  color?: PilotBeamColor;
}

export interface FTCEntry {
  initials: string;
  completedAt: string;
  stageName?: string;
  duration?: number;
  totalHz?: number;
  color?: PilotBeamColor;
}

// Environment detection helper: blocks live Firestore submissions in dev console
export function isDevelopmentEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production';
  }
  const host = window.location.hostname.toLowerCase();
  const isLocal =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local');
  const isAisDev =
    host.startsWith('ais-dev-') ||
    host.includes('-dev-') ||
    host.includes('ais-dev') ||
    window.location.port === '3000';
  const isViteDev = Boolean(import.meta.env?.DEV);
  return isLocal || isAisDev || isViteDev;
}

export const BANNED_INITIALS: readonly string[] = [
  'CUM',
  'FAG',
  'KKK',
  'FUK',
  'COK',
  'DIK',
  'SHT',
  'CNT',
  'FUC',
  'JIZ',
  'NIG',
  'CUK',
  'CUC',
  'PUS',
  'DIX',
  'PED',
];

export function isBannedInitials(initials: string | null | undefined): boolean {
  if (!initials) return false;
  const clean = initials.trim().toUpperCase();
  return BANNED_INITIALS.includes(clean);
}

export function isBlockedFromLeaderboard(initials: string | null | undefined): boolean {
  if (!initials) return false;
  const clean = initials.trim().toUpperCase();
  return clean === 'GOD' || isBannedInitials(clean);
}

// Local storage fallback cache keys (v3 clean slate)
const LOCAL_LEADERBOARDS_CACHE_KEY = 'bit_resonance_leaderboards_cache_v3';
const LOCAL_STORY_FTC_CACHE_KEY = 'game_n_story_ftc_cache_v3';
const LOCAL_ARCADE_FTC_CACHE_KEY = 'game_n_arcade_ftc_cache_v3';
export const PLAYER_CODE_STORAGE_KEY = 'game_n_player_code';
export const SCORES_PURGE_FLAG = 'game_n_scores_wiped_v3';

// Utility to completely wipe local high scores & old cached dev scores
export function wipeAllSavedScores(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'game_n_high_scores_v1',
      'game_n_high_scores_v2',
      'game_n_high_scores_v3',
      'story_scores_v2',
      'arcade_scores_v2',
      'speedrun_scores_v2',
      'survival_scores_v2',
      'story_scores_v3',
      'arcade_scores_v3',
      'speedrun_scores_v3',
      'survival_scores_v3',
      'bit_resonance_leaderboards_cache_v2',
      'bit_resonance_leaderboards_cache_v3',
      'game_n_story_ftc_cache_v1',
      'game_n_story_ftc_cache_v2',
      'game_n_story_ftc_cache_v3',
      'game_n_arcade_ftc_cache_v1',
      'game_n_arcade_ftc_cache_v2',
      'game_n_arcade_ftc_cache_v3',
    ];
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    const currentCode = localStorage.getItem(PLAYER_CODE_STORAGE_KEY);
    if (isBannedInitials(currentCode)) {
      localStorage.removeItem(PLAYER_CODE_STORAGE_KEY);
    }

    // Strip highScores from persistent story save so players keep progression without contaminated scores
    const rawStory = localStorage.getItem('game_n_story_save_v2');
    if (rawStory) {
      try {
        const parsed = JSON.parse(rawStory);
        if (parsed && typeof parsed === 'object') {
          delete parsed.highScores;
          localStorage.setItem('game_n_story_save_v2', JSON.stringify(parsed));
        }
      } catch {}
    }

    const rawLegacy = localStorage.getItem('game_n_run_data_v1');
    if (rawLegacy) {
      try {
        const parsed = JSON.parse(rawLegacy);
        if (parsed && typeof parsed === 'object') {
          delete parsed.highScores;
          localStorage.setItem('game_n_run_data_v1', JSON.stringify(parsed));
        }
      } catch {}
    }
  } catch (err) {
    console.warn('wipeAllSavedScores warning:', err);
  }
}

// Auto-run once to purge legacy dev scores & banned handles from browser
if (typeof window !== 'undefined') {
  try {
    const curCode = localStorage.getItem(PLAYER_CODE_STORAGE_KEY);
    if (isBannedInitials(curCode)) {
      localStorage.removeItem(PLAYER_CODE_STORAGE_KEY);
    }
    if (!localStorage.getItem(SCORES_PURGE_FLAG)) {
      wipeAllSavedScores();
      localStorage.setItem(SCORES_PURGE_FLAG, 'true');
    }
  } catch {}
}

export function getPlayerCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAYER_CODE_STORAGE_KEY);
    if (raw && /^[A-Z]{3}$/i.test(raw.trim())) {
      const clean = raw.trim().toUpperCase();
      if (isBannedInitials(clean)) {
        localStorage.removeItem(PLAYER_CODE_STORAGE_KEY);
        return null;
      }
      return clean;
    }
  } catch {}
  return null;
}

export function setPlayerCode(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clean = code.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if (clean.length !== 3 || isBannedInitials(clean)) {
      localStorage.removeItem(PLAYER_CODE_STORAGE_KEY);
      return;
    }
    localStorage.setItem(PLAYER_CODE_STORAGE_KEY, clean);
  } catch {}
}

const FILLER_CODES = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'III', 'JJJ'];

const STORY_100_CODES = [
  'AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'III', 'JJJ',
  'ACE', 'ARC', 'ASH', 'BAT', 'BEN', 'BOB', 'BUG', 'CAB', 'CAT', 'COW',
  'DAN', 'DEN', 'DOC', 'DOG', 'DOT', 'DUK', 'EAG', 'EAR', 'ELI', 'FOX',
  'GAL', 'GEO', 'GUS', 'GUY', 'HEX', 'HOP', 'IAN', 'ICE', 'IVY', 'JAX',
  'JEF', 'JOE', 'JON', 'JOY', 'KAI', 'KEN', 'KID', 'KIM', 'KOB', 'KYL',
  'LEO', 'LEX', 'LOU', 'LUK', 'LUX', 'MAX', 'MIK', 'NED', 'NEO', 'NIX',
  'NOA', 'NOX', 'OAK', 'OWL', 'PAN', 'PAW', 'PEG', 'PIX', 'PRM', 'QIX',
  'RAD', 'RAM', 'RAY', 'RED', 'REX', 'RIO', 'ROB', 'RON', 'ROY', 'SAM',
  'SOL', 'SON', 'SKY', 'TAE', 'TED', 'TEO', 'TIM', 'TOM', 'TYR', 'VAL',
  'VAN', 'VIC', 'VOX', 'WES', 'WIN', 'WIZ', 'XEN', 'YAR', 'ZAC', 'ZEN',
];

// Default beatable records for Story Mode (Top 100)
export const DEFAULT_STORY_SCORES: StoryScoreEntry[] = STORY_100_CODES.map((code, idx) => ({
  initials: code,
  completions: 0,
  stageName: '0D Void',
  stageNum: 0,
  bit: 0,
  resolution: 0,
  completed: false,
  createdAt: `2026-01-01T00:${(idx % 60).toString().padStart(2, '0')}:00Z`,
  color: 'green',
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
  color: 'green',
}));

export const DEFAULT_SPEEDRUN_SCORES: SpeedrunScoreEntry[] = FILLER_CODES.map((code, idx) => ({
  initials: code,
  timeSeconds: 5999.9, // Formatted as 99:99.9
  runs: 99,
  completed: true,
  createdAt: `2026-01-01T00:0${idx}:00Z`,
  color: 'green',
}));

export const DEFAULT_SURVIVAL_SCORES: SurvivalScoreEntry[] = FILLER_CODES.map((code, idx) => ({
  initials: code,
  survivalSeconds: 0.1, // Formatted as 00:00.1
  totalHz: 0,
  createdAt: `2026-01-01T00:0${idx}:00Z`,
  color: 'green',
}));

export function sanitizeInitials(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const padded = clean.padEnd(3, 'A');
  if (isBannedInitials(padded)) {
    return 'AAA';
  }
  return padded;
}

function generateDocId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function saveToLocalCache(key: string, data: any) {
  try {
    if (Array.isArray(data)) {
      data = data.filter((item: any) => !isBannedInitials(item?.initials));
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function loadFromLocalCache(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item: any) => !isBannedInitials(item?.initials));
      }
      if (parsed && typeof parsed === 'object' && isBannedInitials(parsed?.initials)) {
        return fallback;
      }
      return parsed;
    }
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
  if (clean.length !== 3 || !/^[A-Z]{3}$/.test(clean)) {
    return { available: false, reason: 'Must be exactly 3 letters (A-Z).' };
  }

  if (isBannedInitials(clean)) {
    return { available: false, reason: `Pilot code "${clean}" is prohibited.` };
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

export const RESOLUTION_FPS_MAP: Record<number, string> = {
  1: '15 FPS',
  2: '24 FPS',
  3: '30 FPS',
  4: '45 FPS',
  5: '60 FPS',
  6: '75 FPS',
  7: '90 FPS',
  8: '120 FPS',
  9: '144 FPS',
  10: '240 FPS',
};

export function getLocalPlayerStoryProgression(code: string): StoryScoreEntry {
  const clean = sanitizeInitials(code);
  let completions = 0;
  let stageName = '0D Void';
  let stageNum = 0;
  let bit = 0;
  let resolution = 0;
  let completed = false;

  if (typeof window !== 'undefined') {
    try {
      const rawStory = localStorage.getItem('game_n_story_save_v2') || localStorage.getItem('game_n_run_data_v1');
      if (rawStory) {
        const parsed = JSON.parse(rawStory);
        if (parsed && typeof parsed === 'object') {
          completions = Math.max(0, Number(parsed.storyCompletions) || (parsed.hasCompletedStory ? 1 : 0));
          completed = Boolean(parsed.hasCompletedStory || completions > 0);

          const rawRes = Number(parsed.act1Resolution ?? parsed.resolution ?? 0);
          const rawSubPart = Number(parsed.act1SubPart ?? parsed.subPart ?? 1);
          const rawBits = Number(parsed.act1Bits ?? parsed.bits ?? 0);

          if (completed) {
            resolution = 10;
            bit = 10;
            stageNum = 20;
            stageName = 'Fracture Sovereign Defeated ★';
          } else if (rawSubPart === 2 || rawBits >= 10 || rawRes > 0) {
            resolution = Math.max(0, Math.min(10, rawRes));
            bit = 10;
            stageNum = 10 + resolution;
            const fps = RESOLUTION_FPS_MAP[resolution] || `${resolution * 15} FPS`;
            stageName = resolution > 0 ? `Resolution ${resolution} (${fps})` : 'Bit 10 (Part 2 Unlocked)';
          } else if (parsed.act1PurchasedN || rawBits > 0) {
            bit = Math.max(0, Math.min(10, rawBits));
            resolution = 0;
            stageNum = bit;
            stageName = bit > 0 ? `Bit ${bit}` : 'N = 1 Point';
          }
        }
      }
    } catch {}
  }

  const nowIso = new Date().toISOString();
  return {
    id: clean,
    initials: clean,
    completions,
    stageName,
    stageNum,
    bit,
    resolution,
    completed,
    createdAt: nowIso,
    updatedAt: nowIso,
    color: getPilotBeamColor(),
  };
}

export async function syncPlayerStoryProgress(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isDevelopmentEnvironment()) return false;
  const playerCode = getPlayerCode();
  if (!playerCode || isBlockedFromLeaderboard(playerCode)) return false;

  const localProgression = getLocalPlayerStoryProgression(playerCode);
  if (!localProgression || (localProgression.stageNum === 0 && localProgression.completions === 0)) {
    return false;
  }

  try {
    return await submitStoryScore({
      initials: localProgression.initials,
      completions: localProgression.completions,
      stageName: localProgression.stageName,
      stageNum: localProgression.stageNum,
      bit: localProgression.bit,
      resolution: localProgression.resolution,
      completed: localProgression.completed,
    });
  } catch (err) {
    console.warn('syncPlayerStoryProgress error:', err);
    return false;
  }
}

export async function registerPlayerCode(code: string): Promise<boolean> {
  const clean = code.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  if (clean.length !== 3 || !/^[A-Z]{3}$/.test(clean) || isBannedInitials(clean)) return false;

  setPlayerCode(clean);

  // Capture current local progression if player already reached resolutions before registering
  const initialStoryPayload: StoryScoreEntry = getLocalPlayerStoryProgression(clean);

  // 1. Immediately seed into local story cache so they appear on the scoreboard right away
  const curCached = loadFromLocalCache('story_scores_v3', DEFAULT_STORY_SCORES);
  const updatedCached = consolidateStoryScores([...curCached, initialStoryPayload]);
  saveToLocalCache('story_scores_v3', updatedCached);

  // In development environment or if handle is blocked, keep registration local only
  if (isDevelopmentEnvironment() || isBlockedFromLeaderboard(clean)) {
    console.info(`[Leaderboard Dev] Player handle '${clean}' registered locally only (remote Firestore write blocked in dev console).`);
    return true;
  }

  try {
    const playerRef = doc(db, 'players', clean);
    const existingPlayer = await getDoc(playerRef);
    if (!existingPlayer.exists()) {
      await setDoc(playerRef, {
        code: clean,
        createdAt: new Date().toISOString(),
      });
    }

    // Write to leaderboards_story if not already exists or if local progress is higher
    const storyDocRef = doc(db, 'leaderboards_story', clean);
    const existingSnap = await getDoc(storyDocRef);
    if (!existingSnap.exists()) {
      await setDoc(storyDocRef, initialStoryPayload);
    } else {
      const existingData = existingSnap.data() as Partial<StoryScoreEntry>;
      if ((existingData.stageNum || 0) < initialStoryPayload.stageNum) {
        await setDoc(storyDocRef, { ...existingData, ...initialStoryPayload }, { merge: true });
      }
    }
    return true;
  } catch (err) {
    console.warn('registerPlayerCode Firestore write warning:', err);
    return true; // Local storage succeeds
  }
}

// ---------------------------------------------------------------------------
// STORY LEADERBOARD (Consolidated per pilot: Total completions + current level)
// ---------------------------------------------------------------------------

/**
 * Consolidates story score entries so each pilot displays only ONCE.
 * Keeps records together:
 * - Total number of completions (Math.max of all runs / explicit completions)
 * - Current level / story progression (from most recent run)
 * - Ranked first by total completions, second by current story progression (stageNum)
 */
export function consolidateStoryScores(rawItems: any[]): StoryScoreEntry[] {
  const pilotMap = new Map<string, StoryScoreEntry>();

  for (const raw of rawItems) {
    if (!raw) continue;
    const rawInitials = raw.initials || raw.code;
    if (!rawInitials) continue;
    const clean = sanitizeInitials(rawInitials);
    if (isBannedInitials(clean)) continue;

    const rawCompletions = typeof raw.completions === 'number'
      ? raw.completions
      : (raw.completed ? 1 : 0);
    const stageNum = typeof raw.stageNum === 'number' ? raw.stageNum : 0;
    const stageName = (raw.stageName || '0D Void').slice(0, 64);
    const bit = Math.max(0, Math.floor(raw.bit || 0));
    const resolution = Math.max(0, Math.floor(raw.resolution || 0));
    const completed = Boolean(raw.completed || rawCompletions > 0);
    const createdAt = raw.createdAt || new Date().toISOString();
    const updatedAt = raw.updatedAt || raw.createdAt;
    const itemTime = new Date(updatedAt || createdAt).getTime();

    const itemColor: PilotBeamColor =
      raw.color === 'blue' || raw.color === 'amber' || raw.color === 'azure' ? raw.color : 'green';

    if (!pilotMap.has(clean)) {
      pilotMap.set(clean, {
        id: raw.id || clean,
        initials: clean,
        completions: Math.max(0, rawCompletions),
        stageName,
        stageNum,
        bit,
        resolution,
        completed,
        createdAt,
        updatedAt,
        color: itemColor,
      });
    } else {
      const existing = pilotMap.get(clean)!;
      // Preserve chosen color or update if a newer non-default color is provided
      if (raw.color && raw.color !== 'green') {
        existing.color = raw.color;
      } else if (!existing.color) {
        existing.color = 'green';
      }

      // Highest completions wins across all playthroughs
      existing.completions = Math.max(existing.completions, rawCompletions);
      existing.completed = Boolean(existing.completed || completed || existing.completions > 0);

      // Higher story progression wins; never downgrade a player's stage or resolution
      if (stageNum > existing.stageNum) {
        existing.stageName = stageName;
        existing.stageNum = stageNum;
        existing.bit = bit;
        existing.resolution = resolution;
        existing.updatedAt = updatedAt;
      } else if (stageNum === existing.stageNum) {
        const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (itemTime >= existingTime) {
          existing.stageName = stageName;
          existing.bit = bit;
          existing.resolution = resolution;
          existing.updatedAt = updatedAt;
        }
      }
    }
  }

  const list = Array.from(pilotMap.values());

  // Rank first by total completions, second by current story progression
  list.sort((a, b) => {
    // 1st: Total completions
    if (b.completions !== a.completions) {
      return b.completions - a.completions;
    }
    // 2nd: Current story progression (stageNum)
    if (b.stageNum !== a.stageNum) {
      return b.stageNum - a.stageNum;
    }
    // Tie breaker: latest active
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  // If fewer than 100 unique pilots, fill with remaining default beatable records
  if (list.length < 100) {
    const existingCodes = new Set(list.map(e => e.initials));
    for (const filler of DEFAULT_STORY_SCORES) {
      if (!existingCodes.has(filler.initials)) {
        list.push(filler);
        existingCodes.add(filler.initials);
        if (list.length >= 100) break;
      }
    }
  }

  // Expand Story Mode only to top 100
  return list.slice(0, 100);
}

export async function fetchStoryLeaderboard(): Promise<StoryScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_story');
    const playersRef = collection(db, 'players');

    // Fetch all story entries and registered players in parallel
    const [storySnap, playersSnap] = await Promise.all([
      getDocs(colRef),
      getDocs(playersRef).catch(() => null),
    ]);

    const storyItems = !storySnap.empty ? storySnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
    const knownInitials = new Set(storyItems.map(s => sanitizeInitials((s as any).initials || s.id)));

    // Only add 0D Void placeholder for registered players who do NOT have any story score entry yet
    const playerItems = playersSnap && !playersSnap.empty
      ? playersSnap.docs
          .map(d => {
            const p = d.data();
            return sanitizeInitials(p.code || d.id);
          })
          .filter(code => !knownInitials.has(code))
          .map(code => ({
            id: code,
            initials: code,
            completions: 0,
            stageName: '0D Void',
            stageNum: 0,
            bit: 0,
            resolution: 0,
            completed: false,
            createdAt: new Date().toISOString(),
          }))
      : [];

    // Proactively sync current player progression if pending
    syncPlayerStoryProgress().catch(() => {});

    const localCode = getPlayerCode();
    const localItem = localCode ? [getLocalPlayerStoryProgression(localCode)] : [];

    const combined = [...storyItems, ...localItem, ...playerItems];
    if (combined.length > 0) {
      const consolidated = consolidateStoryScores(combined);
      saveToLocalCache('story_scores_v3', consolidated);
      return consolidated;
    }
  } catch (err) {
    console.warn('fetchStoryLeaderboard error, using cache:', err);
  }
  const cached = loadFromLocalCache('story_scores_v3', DEFAULT_STORY_SCORES);
  const localCode = getPlayerCode();
  const localExtra = localCode ? [getLocalPlayerStoryProgression(localCode)] : [];
  return consolidateStoryScores([...cached, ...localExtra]);
}

export function subscribeStoryLeaderboard(callback: (scores: StoryScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_story');
    const playersRef = collection(db, 'players');
    let latestStoryDocs: any[] = [];
    let latestPlayerDocs: any[] = [];

    const notify = () => {
      const storyEntries = latestStoryDocs.map(d => ({ id: d.id, ...d.data() }));
      const knownInitials = new Set(storyEntries.map(s => sanitizeInitials((s as any).initials || s.id)));

      const playerVoidEntries = latestPlayerDocs
        .map(d => {
          const p = d.data();
          return sanitizeInitials(p.code || d.id);
        })
        .filter(code => !knownInitials.has(code))
        .map(code => ({
          id: code,
          initials: code,
          completions: 0,
          stageName: '0D Void',
          stageNum: 0,
          bit: 0,
          resolution: 0,
          completed: false,
          createdAt: new Date().toISOString(),
        }));

      const localCode = getPlayerCode();
      const localEntries = localCode ? [getLocalPlayerStoryProgression(localCode)] : [];

      const combined = [...storyEntries, ...localEntries, ...playerVoidEntries];
      const consolidated = consolidateStoryScores(combined);
      saveToLocalCache('story_scores_v3', consolidated);
      callback(consolidated);
    };

    const unsubStory = onSnapshot(
      colRef,
      (snap) => {
        latestStoryDocs = snap.docs;
        notify();
      },
      (err) => {
        console.warn('Story leaderboard live snapshot failed:', err);
        const cached = loadFromLocalCache('story_scores_v3', DEFAULT_STORY_SCORES);
        callback(consolidateStoryScores(cached));
      }
    );

    const unsubPlayers = onSnapshot(
      playersRef,
      (snap) => {
        latestPlayerDocs = snap.docs;
        notify();
      },
      (err) => {
        console.warn('Players live snapshot warning:', err);
      }
    );

    return () => {
      unsubStory();
      unsubPlayers();
    };
  } catch (err) {
    console.warn('subscribeStoryLeaderboard error, using cache:', err);
    const cached = loadFromLocalCache('story_scores_v3', DEFAULT_STORY_SCORES);
    callback(consolidateStoryScores(cached));
    return () => {};
  }
}

export async function submitStoryScore(entry: Omit<StoryScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  if (isBannedInitials(cleanInitials)) {
    console.warn(`[Leaderboard] Blocked story score with banned initials: ${cleanInitials}`);
    return false;
  }

  const incomingCompletions = Math.max(0, Math.floor(entry.completions ?? (entry.completed ? 1 : 0)));
  const nowIso = new Date().toISOString();
  const payload: StoryScoreEntry = {
    ...entry,
    initials: cleanInitials,
    completions: incomingCompletions,
    stageName: entry.stageName.slice(0, 64),
    stageNum: typeof entry.stageNum === 'number' ? entry.stageNum : 0,
    bit: Math.max(0, Math.min(20, Math.floor(entry.bit || 0))),
    resolution: Math.max(0, Math.min(20, Math.floor(entry.resolution || 0))),
    completed: Boolean(entry.completed || incomingCompletions > 0),
    createdAt: nowIso,
    updatedAt: nowIso,
    color: entry.color || getPilotBeamColor(),
  };

  // 1. Immediately update local storage cache keeping records together per pilot
  const curCached = loadFromLocalCache('story_scores_v3', DEFAULT_STORY_SCORES);
  const updatedCached = consolidateStoryScores([...curCached, payload]);
  saveToLocalCache('story_scores_v3', updatedCached);

  // If pilot is blocked from global leaderboard or running in development console, keep local only and return cleanly
  if (isDevelopmentEnvironment() || isBlockedFromLeaderboard(cleanInitials)) {
    console.info(`[Leaderboard Dev] Story score for '${cleanInitials}' saved to local storage only (remote Firestore write blocked in dev console).`);
    return true;
  }

  // 2. In live Firestore, keep document ID as cleanInitials so each pilot has exactly 1 document
  try {
    const docRef = doc(db, 'leaderboards_story', cleanInitials);
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as Partial<StoryScoreEntry>;
      const existingCompletions = typeof existingData.completions === 'number'
        ? existingData.completions
        : (existingData.completed ? 1 : 0);
      payload.completions = Math.max(incomingCompletions, existingCompletions);
      if (existingData.createdAt) {
        payload.createdAt = existingData.createdAt;
      }
      // If existing has progressed further, do not downgrade
      if ((existingData.stageNum || 0) > payload.stageNum) {
        payload.stageName = existingData.stageName || payload.stageName;
        payload.stageNum = existingData.stageNum || 0;
        payload.bit = existingData.bit || 0;
        payload.resolution = existingData.resolution || 0;
      }
    }
    await setDoc(docRef, payload);
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('[Leaderboard] Story submission blocked by security rules:', err.message);
    } else {
      console.warn('Failed to submit story score to Firestore:', err);
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// ARCADE LEADERBOARD (Furthest stage reached then duration, Total HZ tracked)
// ---------------------------------------------------------------------------

export function consolidateArcadeScores(rawItems: any[]): ArcadeScoreEntry[] {
  const pilotMap = new Map<string, ArcadeScoreEntry>();

  for (const raw of rawItems) {
    if (!raw) continue;
    const clean = sanitizeInitials(raw.initials || raw.code);
    if (!clean || isBannedInitials(clean)) continue;

    const stageNum = typeof raw.stageNum === 'number' ? raw.stageNum : 0;
    const duration = typeof raw.duration === 'number' ? raw.duration : 0;
    const totalHz = typeof raw.totalHz === 'number' ? raw.totalHz : 0;
    const completed = Boolean(raw.completed);
    const stageName = (raw.stageName || (stageNum > 0 ? `Bit ${stageNum}` : '0D Void')).slice(0, 64);
    const createdAt = raw.createdAt || new Date().toISOString();

    const itemColor: PilotBeamColor =
      raw.color === 'blue' || raw.color === 'amber' || raw.color === 'azure' ? raw.color : 'green';

    if (!pilotMap.has(clean)) {
      pilotMap.set(clean, {
        id: raw.id || clean,
        initials: clean,
        stageName,
        stageNum,
        bit: raw.bit || stageNum,
        duration,
        totalHz,
        completed,
        createdAt,
        color: itemColor,
      });
    } else {
      const cur = pilotMap.get(clean)!;
      // Ranked first by furthest stage reached (stageNum), second by duration, third by totalHz
      const isBetter =
        stageNum > cur.stageNum ||
        (stageNum === cur.stageNum && duration > cur.duration) ||
        (stageNum === cur.stageNum && duration === cur.duration && totalHz > cur.totalHz);

      if (isBetter) {
        pilotMap.set(clean, {
          id: raw.id || clean,
          initials: clean,
          stageName,
          stageNum,
          bit: raw.bit || stageNum,
          duration,
          totalHz,
          completed: Boolean(completed || cur.completed),
          createdAt,
          color: raw.color && raw.color !== 'green' ? raw.color : (cur.color || 'green'),
        });
      } else if (raw.color && raw.color !== 'green' && cur.color === 'green') {
        cur.color = raw.color;
      }
    }
  }

  const list = Array.from(pilotMap.values());
  list.sort((a, b) => {
    if (b.stageNum !== a.stageNum) return b.stageNum - a.stageNum;
    if (b.duration !== a.duration) return b.duration - a.duration;
    return b.totalHz - a.totalHz;
  });

  // Fill up to 10 with default records if fewer than 10 unique pilots
  if (list.length < 10) {
    const existingCodes = new Set(list.map(e => e.initials));
    for (const filler of DEFAULT_ARCADE_SCORES) {
      if (!existingCodes.has(filler.initials)) {
        list.push(filler);
        existingCodes.add(filler.initials);
        if (list.length >= 10) break;
      }
    }
  }

  return list.slice(0, 10);
}

export async function fetchArcadeLeaderboard(): Promise<ArcadeScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_arcade');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const consolidated = consolidateArcadeScores(items);
      saveToLocalCache('arcade_scores_v3', consolidated);
      return consolidated;
    }
  } catch (err) {
    console.warn('fetchArcadeLeaderboard error, using cache:', err);
  }
  const cached = loadFromLocalCache('arcade_scores_v3', DEFAULT_ARCADE_SCORES);
  return consolidateArcadeScores(cached);
}

export function subscribeArcadeLeaderboard(callback: (scores: ArcadeScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_arcade');
    return onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const consolidated = consolidateArcadeScores(items);
          saveToLocalCache('arcade_scores_v3', consolidated);
          callback(consolidated);
        } else {
          callback(consolidateArcadeScores(loadFromLocalCache('arcade_scores_v3', DEFAULT_ARCADE_SCORES)));
        }
      },
      (err) => {
        console.warn('Arcade leaderboard live snapshot failed:', err);
        callback(consolidateArcadeScores(loadFromLocalCache('arcade_scores_v3', DEFAULT_ARCADE_SCORES)));
      }
    );
  } catch {
    callback(consolidateArcadeScores(loadFromLocalCache('arcade_scores_v3', DEFAULT_ARCADE_SCORES)));
    return () => {};
  }
}

export async function submitArcadeScore(entry: Omit<ArcadeScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  if (isBannedInitials(cleanInitials)) {
    console.warn(`[Leaderboard] Blocked arcade score with banned initials: ${cleanInitials}`);
    return false;
  }

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
    color: entry.color || getPilotBeamColor(),
  };

  // If pilot is blocked from global leaderboard or running in development console, save locally and return cleanly
  if (isDevelopmentEnvironment() || isBlockedFromLeaderboard(cleanInitials)) {
    console.info(`[Leaderboard Dev] Arcade score for '${cleanInitials}' saved to local storage only (remote Firestore write blocked in dev console).`);
    const current = loadFromLocalCache('arcade_scores_v3', DEFAULT_ARCADE_SCORES);
    const updated = consolidateArcadeScores([...current, { id: docId, ...payload }]);
    saveToLocalCache('arcade_scores_v3', updated);
    return true;
  }

  try {
    await setDoc(doc(db, 'leaderboards_arcade', docId), payload);
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('[Leaderboard] Arcade submission blocked by security rules:', err.message);
    } else {
      console.warn('Failed to submit arcade score to Firestore, stored locally:', err);
    }
    const current = loadFromLocalCache('arcade_scores_v3', DEFAULT_ARCADE_SCORES);
    const updated = consolidateArcadeScores([...current, { id: docId, ...payload }]);
    saveToLocalCache('arcade_scores_v3', updated);
    return false;
  }
}

// ---------------------------------------------------------------------------
// SPEEDRUN LEADERBOARD (Fastest completion time, completions only)
// ---------------------------------------------------------------------------

export function consolidateSpeedrunScores(rawItems: any[]): SpeedrunScoreEntry[] {
  const pilotMap = new Map<string, SpeedrunScoreEntry>();

  for (const raw of rawItems) {
    if (!raw) continue;
    const clean = sanitizeInitials(raw.initials || raw.code);
    if (!clean || isBannedInitials(clean)) continue;
    if (!raw.completed) continue; // Speedrun only ranks completions

    const timeSeconds = typeof raw.timeSeconds === 'number' ? raw.timeSeconds : 5999.9;
    const runs = typeof raw.runs === 'number' ? raw.runs : 1;
    const createdAt = raw.createdAt || new Date().toISOString();

    const itemColor: PilotBeamColor =
      raw.color === 'blue' || raw.color === 'amber' || raw.color === 'azure' ? raw.color : 'green';

    if (!pilotMap.has(clean)) {
      pilotMap.set(clean, {
        id: raw.id || clean,
        initials: clean,
        timeSeconds,
        runs,
        completed: true,
        createdAt,
        color: itemColor,
      });
    } else {
      const cur = pilotMap.get(clean)!;
      // Fastest completion time wins (lower timeSeconds)
      if (timeSeconds < cur.timeSeconds) {
        pilotMap.set(clean, {
          id: raw.id || clean,
          initials: clean,
          timeSeconds,
          runs: Math.max(runs, cur.runs),
          completed: true,
          createdAt,
          color: raw.color && raw.color !== 'green' ? raw.color : (cur.color || 'green'),
        });
      } else if (raw.color && raw.color !== 'green' && cur.color === 'green') {
        cur.color = raw.color;
      }
    }
  }

  const list = Array.from(pilotMap.values());
  list.sort((a, b) => a.timeSeconds - b.timeSeconds);

  // Fill up to 10 with default records if fewer than 10
  if (list.length < 10) {
    const existingCodes = new Set(list.map(e => e.initials));
    for (const filler of DEFAULT_SPEEDRUN_SCORES) {
      if (!existingCodes.has(filler.initials)) {
        list.push(filler);
        existingCodes.add(filler.initials);
        if (list.length >= 10) break;
      }
    }
  }

  return list.slice(0, 10);
}

export async function fetchSpeedrunLeaderboard(): Promise<SpeedrunScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_speedrun');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const consolidated = consolidateSpeedrunScores(items);
      saveToLocalCache('speedrun_scores_v3', consolidated);
      return consolidated;
    }
  } catch (err) {
    console.warn('fetchSpeedrunLeaderboard error, using cache:', err);
  }
  const cached = loadFromLocalCache('speedrun_scores_v3', DEFAULT_SPEEDRUN_SCORES);
  return consolidateSpeedrunScores(cached);
}

export function subscribeSpeedrunLeaderboard(callback: (scores: SpeedrunScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_speedrun');
    return onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const consolidated = consolidateSpeedrunScores(items);
          saveToLocalCache('speedrun_scores_v3', consolidated);
          callback(consolidated);
        } else {
          callback(consolidateSpeedrunScores(loadFromLocalCache('speedrun_scores_v3', DEFAULT_SPEEDRUN_SCORES)));
        }
      },
      (err) => {
        console.warn('Speedrun leaderboard live snapshot failed:', err);
        callback(consolidateSpeedrunScores(loadFromLocalCache('speedrun_scores_v3', DEFAULT_SPEEDRUN_SCORES)));
      }
    );
  } catch {
    callback(consolidateSpeedrunScores(loadFromLocalCache('speedrun_scores_v3', DEFAULT_SPEEDRUN_SCORES)));
    return () => {};
  }
}

export async function submitSpeedrunScore(entry: Omit<SpeedrunScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  if (isBannedInitials(cleanInitials)) {
    console.warn(`[Leaderboard] Blocked speedrun score with banned initials: ${cleanInitials}`);
    return false;
  }

  const docId = generateDocId();
  const payload: SpeedrunScoreEntry = {
    ...entry,
    initials: cleanInitials,
    timeSeconds: Math.max(0.1, Math.round(entry.timeSeconds * 100) / 100),
    runs: Math.max(1, Math.floor(entry.runs || 1)),
    completed: true, // Speedrun only stores completions
    createdAt: new Date().toISOString(),
    color: entry.color || getPilotBeamColor(),
  };

  // If pilot is blocked from global leaderboard or running in development console, save locally and return cleanly
  if (isDevelopmentEnvironment() || isBlockedFromLeaderboard(cleanInitials)) {
    console.info(`[Leaderboard Dev] Speedrun score for '${cleanInitials}' saved to local storage only (remote Firestore write blocked in dev console).`);
    const current = loadFromLocalCache('speedrun_scores_v3', DEFAULT_SPEEDRUN_SCORES);
    const updated = consolidateSpeedrunScores([...current, { id: docId, ...payload }]);
    saveToLocalCache('speedrun_scores_v3', updated);
    return true;
  }

  try {
    await setDoc(doc(db, 'leaderboards_speedrun', docId), payload);
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('[Leaderboard] Speedrun submission blocked by security rules:', err.message);
    } else {
      console.warn('Failed to submit speedrun score to Firestore, stored locally:', err);
    }
    const current = loadFromLocalCache('speedrun_scores_v3', DEFAULT_SPEEDRUN_SCORES);
    const updated = consolidateSpeedrunScores([...current, { id: docId, ...payload }]);
    saveToLocalCache('speedrun_scores_v3', updated);
    return false;
  }
}

// ---------------------------------------------------------------------------
// SURVIVAL LEADERBOARD (Longest time survived + Total HZ)
// ---------------------------------------------------------------------------

export function consolidateSurvivalScores(rawItems: any[]): SurvivalScoreEntry[] {
  const pilotMap = new Map<string, SurvivalScoreEntry>();

  for (const raw of rawItems) {
    if (!raw) continue;
    const clean = sanitizeInitials(raw.initials || raw.code);
    if (!clean || isBannedInitials(clean)) continue;

    const survivalSeconds = typeof raw.survivalSeconds === 'number' ? raw.survivalSeconds : 0;
    const totalHz = typeof raw.totalHz === 'number' ? raw.totalHz : 0;
    const createdAt = raw.createdAt || new Date().toISOString();

    const itemColor: PilotBeamColor =
      raw.color === 'blue' || raw.color === 'amber' || raw.color === 'azure' ? raw.color : 'green';

    if (!pilotMap.has(clean)) {
      pilotMap.set(clean, {
        id: raw.id || clean,
        initials: clean,
        survivalSeconds,
        totalHz,
        createdAt,
        color: itemColor,
      });
    } else {
      const cur = pilotMap.get(clean)!;
      // Longest survival time wins, then totalHz
      const isBetter =
        survivalSeconds > cur.survivalSeconds ||
        (survivalSeconds === cur.survivalSeconds && totalHz > cur.totalHz);

      if (isBetter) {
        pilotMap.set(clean, {
          id: raw.id || clean,
          initials: clean,
          survivalSeconds,
          totalHz,
          createdAt,
          color: raw.color && raw.color !== 'green' ? raw.color : (cur.color || 'green'),
        });
      } else if (raw.color && raw.color !== 'green' && cur.color === 'green') {
        cur.color = raw.color;
      }
    }
  }

  const list = Array.from(pilotMap.values());
  list.sort((a, b) => {
    if (b.survivalSeconds !== a.survivalSeconds) return b.survivalSeconds - a.survivalSeconds;
    return b.totalHz - a.totalHz;
  });

  // Fill up to 10 with default records if fewer than 10
  if (list.length < 10) {
    const existingCodes = new Set(list.map(e => e.initials));
    for (const filler of DEFAULT_SURVIVAL_SCORES) {
      if (!existingCodes.has(filler.initials)) {
        list.push(filler);
        existingCodes.add(filler.initials);
        if (list.length >= 10) break;
      }
    }
  }

  return list.slice(0, 10);
}

export async function fetchSurvivalLeaderboard(): Promise<SurvivalScoreEntry[]> {
  try {
    const colRef = collection(db, 'leaderboards_survival');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const consolidated = consolidateSurvivalScores(items);
      saveToLocalCache('survival_scores_v3', consolidated);
      return consolidated;
    }
  } catch (err) {
    console.warn('fetchSurvivalLeaderboard error, using cache:', err);
  }
  const cached = loadFromLocalCache('survival_scores_v3', DEFAULT_SURVIVAL_SCORES);
  return consolidateSurvivalScores(cached);
}

export function subscribeSurvivalLeaderboard(callback: (scores: SurvivalScoreEntry[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'leaderboards_survival');
    return onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const consolidated = consolidateSurvivalScores(items);
          saveToLocalCache('survival_scores_v3', consolidated);
          callback(consolidated);
        } else {
          callback(consolidateSurvivalScores(loadFromLocalCache('survival_scores_v3', DEFAULT_SURVIVAL_SCORES)));
        }
      },
      (err) => {
        console.warn('Survival leaderboard live snapshot failed:', err);
        callback(consolidateSurvivalScores(loadFromLocalCache('survival_scores_v3', DEFAULT_SURVIVAL_SCORES)));
      }
    );
  } catch {
    callback(consolidateSurvivalScores(loadFromLocalCache('survival_scores_v3', DEFAULT_SURVIVAL_SCORES)));
    return () => {};
  }
}

export async function submitSurvivalScore(entry: Omit<SurvivalScoreEntry, 'id' | 'createdAt'>): Promise<boolean> {
  const cleanInitials = sanitizeInitials(entry.initials);
  if (isBannedInitials(cleanInitials)) {
    console.warn(`[Leaderboard] Blocked survival score with banned initials: ${cleanInitials}`);
    return false;
  }

  const docId = generateDocId();
  const payload: SurvivalScoreEntry = {
    ...entry,
    initials: cleanInitials,
    survivalSeconds: Math.max(0, Math.round(entry.survivalSeconds * 10) / 10),
    totalHz: Math.max(0, Math.floor(entry.totalHz || 0)),
    createdAt: new Date().toISOString(),
    color: entry.color || getPilotBeamColor(),
  };

  // If pilot is blocked from global leaderboard or running in development console, save locally and return cleanly
  if (isDevelopmentEnvironment() || isBlockedFromLeaderboard(cleanInitials)) {
    console.info(`[Leaderboard Dev] Survival score for '${cleanInitials}' saved to local storage only (remote Firestore write blocked in dev console).`);
    const current = loadFromLocalCache('survival_scores_v3', DEFAULT_SURVIVAL_SCORES);
    const updated = consolidateSurvivalScores([...current, { id: docId, ...payload }]);
    saveToLocalCache('survival_scores_v3', updated);
    return true;
  }

  try {
    await setDoc(doc(db, 'leaderboards_survival', docId), payload);
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('[Leaderboard] Survival submission blocked by security rules:', err.message);
    } else {
      console.warn('Failed to submit survival score to Firestore, stored locally:', err);
    }
    const current = loadFromLocalCache('survival_scores_v3', DEFAULT_SURVIVAL_SCORES);
    const updated = consolidateSurvivalScores([...current, { id: docId, ...payload }]);
    saveToLocalCache('survival_scores_v3', updated);
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
      if (isBannedInitials(data.initials)) {
        return null;
      }
      saveToLocalCache(LOCAL_STORY_FTC_CACHE_KEY, data);
      return data;
    }
  } catch (err) {
    console.warn('fetchStoryFTC error:', err);
  }
  const cached = loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null);
  return cached && !isBannedInitials(cached.initials) ? cached : null;
}

export function subscribeStoryFTC(callback: (ftc: FTCEntry | null) => void): Unsubscribe {
  try {
    const ftcRef = doc(db, 'leaderboards_meta', 'story_ftc');
    return onSnapshot(
      ftcRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as FTCEntry;
          if (isBannedInitials(data.initials)) {
            callback(null);
            return;
          }
          saveToLocalCache(LOCAL_STORY_FTC_CACHE_KEY, data);
          callback(data);
        } else {
          const cached = loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null);
          callback(cached && !isBannedInitials(cached.initials) ? cached : null);
        }
      },
      (err) => {
        console.warn('Story FTC live snapshot error:', err);
        const cached = loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null);
        callback(cached && !isBannedInitials(cached.initials) ? cached : null);
      }
    );
  } catch {
    const cached = loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null);
    callback(cached && !isBannedInitials(cached.initials) ? cached : null);
    return () => {};
  }
}

export async function recordStoryFTCIfFirst(initials: string): Promise<{ isFTC: boolean; ftc: FTCEntry }> {
  const cleanInitials = sanitizeInitials(initials);
  if (isDevelopmentEnvironment() || isBlockedFromLeaderboard(cleanInitials)) {
    console.info(`[Leaderboard Dev] Story FTC for '${cleanInitials}' local only (remote write blocked in dev console).`);
    const existing = loadFromLocalCache(LOCAL_STORY_FTC_CACHE_KEY, null);
    return {
      isFTC: false,
      ftc: existing || {
        initials: cleanInitials,
        completedAt: new Date().toISOString(),
        stageName: 'Fracture Sovereign Defeated ★',
      },
    };
  }

  const ftcRef = doc(db, 'leaderboards_meta', 'story_ftc');

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
        color: getPilotBeamColor(),
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
      if (isBannedInitials(data.initials)) {
        return null;
      }
      saveToLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, data);
      return data;
    }
  } catch (err) {
    console.warn('fetchArcadeFTC error:', err);
  }
  const cached = loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null);
  return cached && !isBannedInitials(cached.initials) ? cached : null;
}

export function subscribeArcadeFTC(callback: (ftc: FTCEntry | null) => void): Unsubscribe {
  try {
    const ftcRef = doc(db, 'leaderboards_meta', 'arcade_ftc');
    return onSnapshot(
      ftcRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as FTCEntry;
          if (isBannedInitials(data.initials)) {
            callback(null);
            return;
          }
          saveToLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, data);
          callback(data);
        } else {
          const cached = loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null);
          callback(cached && !isBannedInitials(cached.initials) ? cached : null);
        }
      },
      (err) => {
        console.warn('Arcade FTC live snapshot error:', err);
        const cached = loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null);
        callback(cached && !isBannedInitials(cached.initials) ? cached : null);
      }
    );
  } catch {
    const cached = loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null);
    callback(cached && !isBannedInitials(cached.initials) ? cached : null);
    return () => {};
  }
}

export async function recordArcadeFTCIfFirst(
  initials: string,
  duration: number,
  totalHz: number
): Promise<{ isFTC: boolean; ftc: FTCEntry }> {
  const cleanInitials = sanitizeInitials(initials);
  if (isDevelopmentEnvironment() || isBlockedFromLeaderboard(cleanInitials)) {
    console.info(`[Leaderboard Dev] Arcade FTC for '${cleanInitials}' local only (remote write blocked in dev console).`);
    const existing = loadFromLocalCache(LOCAL_ARCADE_FTC_CACHE_KEY, null);
    return {
      isFTC: false,
      ftc: existing || {
        initials: cleanInitials,
        completedAt: new Date().toISOString(),
        stageName: 'Res 10 Victory (240 FPS) ★',
        duration: Math.round(duration * 10) / 10,
        totalHz: Math.round(totalHz),
      },
    };
  }

  const ftcRef = doc(db, 'leaderboards_meta', 'arcade_ftc');

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
        color: getPilotBeamColor(),
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
