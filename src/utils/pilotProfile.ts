import React from 'react';

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
export const PLAYER_CODE_STORAGE_KEY = 'game_n_player_code';
export const SCORES_PURGE_FLAG = 'game_n_scores_wiped_v3';

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
  const isViteDev = Boolean((import.meta as any).env?.DEV);
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

export const renderInitialsBadge = (initials: string, color?: PilotBeamColor) => {
  const chosenKey: PilotBeamColor =
    color && (color === 'blue' || color === 'amber' || color === 'azure') ? color : 'green';
  const cfg = BEAM_COLOR_CONFIGS[chosenKey];

  return React.createElement(
    'span',
    {
      className: `inline-flex items-center justify-center px-1.5 py-0.5 rounded font-black tracking-wider text-xs sm:text-sm border shadow-sm transition-transform ${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.badgeText} ${cfg.badgeGlow}`,
      title: `Pilot Color: ${cfg.label} (${cfg.zoneName})`,
    },
    initials
  );
};
