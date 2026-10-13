export interface AudioSettings {
  muteAll: boolean;
  musicVolume: number; // scale 1-10, default 5
  musicMuted: boolean;
  sfxVolume: number;   // scale 1-10, default 5
}

export interface ControlSettings {
  scrollWheelInversion: boolean; // default false
  cyclePolarizerInput: 'space' | 'rmb'; // default 'space'
  devToolsEnabled: boolean; // default false
}

export interface UserSettings {
  audio: AudioSettings;
  controls: ControlSettings;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  audio: {
    muteAll: false,
    musicVolume: 5,
    musicMuted: false,
    sfxVolume: 5,
  },
  controls: {
    scrollWheelInversion: false,
    cyclePolarizerInput: 'space',
    devToolsEnabled: false,
  },
};

const SETTINGS_STORAGE_KEY = 'GAME_N_USER_SETTINGS';

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_USER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      audio: {
        muteAll: typeof parsed.audio?.muteAll === 'boolean' ? parsed.audio.muteAll : DEFAULT_USER_SETTINGS.audio.muteAll,
        musicVolume: typeof parsed.audio?.musicVolume === 'number' ? Math.max(1, Math.min(10, parsed.audio.musicVolume)) : 5,
        musicMuted: typeof parsed.audio?.musicMuted === 'boolean' ? parsed.audio.musicMuted : false,
        sfxVolume: typeof parsed.audio?.sfxVolume === 'number' ? Math.max(1, Math.min(10, parsed.audio.sfxVolume)) : 5,
      },
      controls: {
        scrollWheelInversion: typeof parsed.controls?.scrollWheelInversion === 'boolean' ? parsed.controls.scrollWheelInversion : false,
        cyclePolarizerInput: parsed.controls?.cyclePolarizerInput === 'rmb' ? 'rmb' : 'space',
        devToolsEnabled: typeof parsed.controls?.devToolsEnabled === 'boolean' ? parsed.controls.devToolsEnabled : false,
      },
    };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to persist user settings:', err);
  }
}
