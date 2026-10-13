export interface AudioSettings {
  muteAll: boolean;      // Toggle on/off
  musicVolume: number;   // Slider 1-10, default 5 (current build volume)
  musicMuted: boolean;   // Mute toggle for music
  sfxVolume: number;     // Slider 1-10, default 5 (current build volume)
}

export interface ControlSettings {
  scrollWheelInversion: boolean;          // Toggle inversion on/off, default off (false)
  cyclePolarizerInput: 'spacebar' | 'rmb'; // Toggle Spacebar / RMB, Spacebar default
}

export interface GameSettings {
  audio: AudioSettings;
  controls: ControlSettings;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  audio: {
    muteAll: false,
    musicVolume: 5,
    musicMuted: false,
    sfxVolume: 5,
  },
  controls: {
    scrollWheelInversion: false,
    cyclePolarizerInput: 'spacebar',
  },
};
