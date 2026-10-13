import { GameSettings, DEFAULT_GAME_SETTINGS } from '../types/settings';

const SETTINGS_STORAGE_KEY = 'game_n_settings';
const LEGACY_WHEEL_KEY = 'dim_wheel_inverted';

type SettingsChangeListener = (settings: GameSettings) => void;
const listeners = new Set<SettingsChangeListener>();

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_GAME_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    let legacyWheelInverted = false;
    try {
      legacyWheelInverted = localStorage.getItem(LEGACY_WHEEL_KEY) === 'true';
    } catch {}

    if (!raw) {
      return {
        ...DEFAULT_GAME_SETTINGS,
        controls: {
          ...DEFAULT_GAME_SETTINGS.controls,
          scrollWheelInversion: legacyWheelInverted,
        },
      };
    }

    const parsed = JSON.parse(raw);
    const audio = {
      muteAll: typeof parsed?.audio?.muteAll === 'boolean' ? parsed.audio.muteAll : DEFAULT_GAME_SETTINGS.audio.muteAll,
      musicVolume: typeof parsed?.audio?.musicVolume === 'number' ? Math.max(1, Math.min(10, parsed.audio.musicVolume)) : DEFAULT_GAME_SETTINGS.audio.musicVolume,
      musicMuted: typeof parsed?.audio?.musicMuted === 'boolean' ? parsed.audio.musicMuted : DEFAULT_GAME_SETTINGS.audio.musicMuted,
      sfxVolume: typeof parsed?.audio?.sfxVolume === 'number' ? Math.max(1, Math.min(10, parsed.audio.sfxVolume)) : DEFAULT_GAME_SETTINGS.audio.sfxVolume,
    };

    const controls = {
      scrollWheelInversion: typeof parsed?.controls?.scrollWheelInversion === 'boolean'
        ? parsed.controls.scrollWheelInversion
        : legacyWheelInverted,
      cyclePolarizerInput: (parsed?.controls?.cyclePolarizerInput === 'rmb' ? 'rmb' : 'spacebar') as 'spacebar' | 'rmb',
    };

    return { audio, controls };
  } catch (err) {
    console.warn('Failed to load settings from storage:', err);
    return DEFAULT_GAME_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    // Keep legacy wheel key in sync for backwards compatibility
    localStorage.setItem(LEGACY_WHEEL_KEY, String(settings.controls.scrollWheelInversion));
  } catch (err) {
    console.warn('Failed to save settings to storage:', err);
  }

  // Notify active listeners
  listeners.forEach(listener => {
    try {
      listener(settings);
    } catch (err) {
      console.error('Error in settings listener:', err);
    }
  });
}

export function subscribeToSettings(listener: SettingsChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
