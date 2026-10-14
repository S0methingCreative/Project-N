export type ActId = 1;

export interface GameResources {
  hertz: number;       // Hz (Frequency)
  volts: number;       // V (Amplitude)
  baud: number;        // Bd (Wavelength)
}

export interface CompiledModule {
  id: string;
  name: string;
  category: 'graphics' | 'audio' | 'spatial' | 'reality';
  description: string;
  codeSnippet: string;
  unlocked: boolean;
}

export type HarmonicMode = 'minor' | 'major' | 'dorian' | 'phrygian' | 'lydian' | 'microtonal';


export interface DeathScreenState {
  active: boolean;
  collectedHz: number;
  collectedV: number;
  collectedBaud?: number;
  costHz: number;
  costV: number;
  costBaud?: number;
  target: 'N' | 'bit' | 'resolution';
  currentResolution?: number;
  overshields?: number;
  message: string;
  upgradeName?: string;
  upgradeDesc?: string;
}

export type GameMode = 'normal' | 'story' | 'speedrun' | 'survival' | 'arcade';

export interface HighScores {
  speedrunBestTime?: number; // Lowest time in seconds
  speedrunBestRuns?: number; // Fewest runs
  survivalBestTime?: number; // Longest time in seconds
  survivalBestResources?: { hertz: number; volts: number; baud: number };
  arcadeBestStage?: string; // e.g. "Resolution 6 (90 FPS)" or "Bit 8" or "VICTORY (Res 10)"
  arcadeBestStageNum?: number; // 1 to 20 for progress comparison
  arcadeBestTime?: number; // Best time in seconds
}

export interface GameState {
  act: ActId;
  currentN: number; // e.g. 0 before purchase, 1 after purchasing N, 2 after 10th bit
  hp: number;
  maxHp: number;
  score: number;
  engineCompilePercent: number;
  audioActive: boolean;
  carrierActive: boolean;
  resources: GameResources;
  compiledModules: CompiledModule[];
  currentHarmonicMode: HarmonicMode;
  fundamentalFreq: number; // Hz (261.63 Hz = C4);
  // Game N Progression
  act1Phase: 'void' | 'point' | 'line_segment' | 'ray';
  act1Bits: number; // 0 to 10 (0-bit void up to 10-bit deep-color master game)
  act1PurchasedN: boolean;
  act1SubPart: 1 | 2; // Part 1: Bits 0-10 on 1D line; Part 2: Resolutions 1-10 Frame Rate Scaling
  act1Resolution: number; // 0 to 10 Frame Rate / Resolution in Part Two
  overshields: number; // 0 to 10 overshields (+20 effective HP each)
  polarity: -1 | 0 | 1; // 1 = Crest (Up), -1 = Trough (Down), 0 = Ground/Neutral (Center)
  deathScreen: DeathScreenState | null;
  // Game Modes, Run Tracking & Main Menu Architecture
  gameMode?: GameMode;
  totalRuns?: number; // Cumulative runs attempted across playthrough
  hasCompletedStory?: boolean; // True once final boss is defeated for the first time
  storyCompletions?: number; // Total number of story completions
  speedrunTime?: number;
  speedrunRuns?: number;
  hasCompletedSpeedrun?: boolean;
  hasAttemptedSurvival?: boolean;
  survivalTime?: number;
  survivalResourcesCollected?: { hertz: number; volts: number; baud: number };
  arcadeTime?: number;
  arcadeFurthestStage?: string;
  arcadeFurthestStageNum?: number;
  arcadeLives?: number; // 1 start, 2 when N=2
  highScores?: HighScores;
}

