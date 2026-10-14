import React, { useState, useEffect } from 'react';
import { GameState, GameMode, HighScores } from './types/game';
import { INITIAL_MODULES } from './data/compilerModules';
import { DimensionCanvas } from './components/DimensionCanvas';
import { CompilerPipelineHUD } from './components/CompilerPipelineHUD';
import { MainMenuModal } from './components/MainMenuModal';
import { soundEngine } from './audio/soundEngine';
import { loadUserSettings, saveUserSettings, UserSettings } from './utils/settings';
import { InitialsRegistrationModal } from './components/InitialsRegistrationModal';
import { getPlayerCode, isDevelopmentEnvironment, wipeAllSavedScores } from './services/leaderboardService';
import {
  Cpu,
  RotateCcw,
  Activity,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

const STORY_SAVE_KEY = 'game_n_story_save_v2';
const RUN_STORAGE_KEY = 'game_n_run_data_v1';
const HIGH_SCORES_STORAGE_KEY = 'game_n_high_scores_v3';

const DEFAULT_GAME_STATE: GameState = {
  act: 1,
  currentN: 0,
  hp: 100,
  maxHp: 100,
  score: 0,
  engineCompilePercent: 8,
  audioActive: false,
  carrierActive: false,
  resources: {
    hertz: 0,
    volts: 0,
    baud: 0,
  },
  compiledModules: INITIAL_MODULES,
  currentHarmonicMode: 'minor',
  fundamentalFreq: 261.63,
  act1Phase: 'void',
  act1Bits: 0,
  act1PurchasedN: false,
  act1SubPart: 1,
  act1Resolution: 0,
  overshields: 0,
  polarity: 1,
  deathScreen: null,
  totalRuns: 1,
  hasCompletedStory: false,
  gameMode: 'story',
};

function loadSavedHighScores(): HighScores {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HIGH_SCORES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function normalizeStoryState(saved: Partial<GameState>): Partial<GameState> {
  const purchasedN = Boolean(saved.act1PurchasedN);
  if (!purchasedN) {
    return {
      ...saved,
      act: 1,
      currentN: 0,
      act1PurchasedN: false,
      act1Bits: 0,
      act1SubPart: 1,
      act1Resolution: 0,
      act1Phase: 'void',
      overshields: 0,
      polarity: 1,
      deathScreen: null,
    };
  }

  const rawBits = Math.min(10, Math.max(0, Number(saved.act1Bits) || 0));
  const isPart2 = saved.act1SubPart === 2 || rawBits >= 10;

  if (isPart2) {
    const rawRes = Math.min(10, Math.max(0, Number(saved.act1Resolution) || 0));
    return {
      ...saved,
      act: 1,
      currentN: 2,
      act1PurchasedN: true,
      act1Bits: 10,
      act1SubPart: 2,
      act1Resolution: rawRes,
      act1Phase: 'point',
      deathScreen: null,
    };
  }

  return {
    ...saved,
    act: 1,
    currentN: 1,
    act1PurchasedN: true,
    act1Bits: rawBits,
    act1SubPart: 1,
    act1Resolution: 0,
    act1Phase: rawBits >= 9 ? 'line_segment' : 'point',
    overshields: 0,
    deathScreen: null,
  };
}

function loadSavedStoryData(): Partial<GameState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawStory = localStorage.getItem(STORY_SAVE_KEY);
    if (rawStory) {
      const parsed = JSON.parse(rawStory);
      if (parsed && typeof parsed === 'object') return normalizeStoryState(parsed);
    }
    // Fallback: legacy storage
    const rawLegacy = localStorage.getItem(RUN_STORAGE_KEY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy);
      if (parsed && typeof parsed === 'object') {
        if (parsed.gameMode === 'story' || !parsed.gameMode || parsed.act1Bits > 0 || parsed.act1PurchasedN) {
          return normalizeStoryState(parsed);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load story save data:', err);
  }
  return null;
}

function loadInitialGameState(): GameState {
  if (typeof window === 'undefined') return DEFAULT_GAME_STATE;
  try {
    const savedHighScores = loadSavedHighScores();
    const savedStory = loadSavedStoryData();

    if (savedStory) {
      return {
        ...DEFAULT_GAME_STATE,
        ...savedStory,
        hp: 100,
        maxHp: 100,
        gameMode: 'story',
        totalRuns: savedStory.totalRuns || 1,
        hasCompletedStory: savedStory.hasCompletedStory || false,
        highScores: savedHighScores,
        // Keep carrier active on resume if player has already unlocked N
        audioActive: false,
        carrierActive: Boolean(savedStory.act1PurchasedN),
        compiledModules: savedStory.compiledModules || INITIAL_MODULES,
        deathScreen: null,
      };
    }

    return {
      ...DEFAULT_GAME_STATE,
      gameMode: 'story',
      highScores: savedHighScores,
    };
  } catch (err) {
    console.warn('Failed to parse initial game data:', err);
  }
  return DEFAULT_GAME_STATE;
}

export default function App() {
  // Master Game State for Game N (initialized from persistent story storage or fresh first launch)
  const [gameState, setGameState] = useState<GameState>(loadInitialGameState);
  // Session key to ensure a clean engine mount whenever restarting or launching a mode
  const [runSessionKey, setRunSessionKey] = useState<number>(0);
  // Game starts directly on the main menu to simplify navigation and mode picking
  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(true);
  // Prompt 3-letter FTC registration on startup if not already stored
  const [isFTCRegistrationOpen, setIsFTCRegistrationOpen] = useState<boolean>(() => !getPlayerCode());

  // Responsive device / screen detection for phone vs desktop
  const [isMobileDevice, setIsMobileDevice] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save the player's progression: Story mode save is kept strictly preserved
  React.useEffect(() => {
    try {
      // 1. STORY SAVE PERSISTENCE:
      // Only write to STORY_SAVE_KEY when currently in story mode so other modes never overwrite it
      if (!gameState.gameMode || gameState.gameMode === 'story') {
        const storyToSave: Partial<GameState> = {
          act: gameState.act,
          currentN: gameState.currentN,
          hp: 100,
          maxHp: 100,
          score: gameState.score,
          engineCompilePercent: gameState.engineCompilePercent,
          resources: gameState.resources,
          compiledModules: gameState.compiledModules,
          currentHarmonicMode: gameState.currentHarmonicMode,
          fundamentalFreq: gameState.fundamentalFreq,
          act1Phase: gameState.act1Phase,
          act1Bits: gameState.act1Bits,
          act1PurchasedN: gameState.act1PurchasedN,
          act1SubPart: gameState.act1SubPart,
          act1Resolution: gameState.act1Resolution,
          overshields: gameState.overshields,
          polarity: gameState.polarity,
          gameMode: 'story',
          totalRuns: gameState.totalRuns,
          hasCompletedStory: gameState.hasCompletedStory,
        };
        localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(storyToSave));
        localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(storyToSave));
      }

      // 2. High scores are persisted across game modes in live environments
      if (gameState.highScores && !isDevelopmentEnvironment()) {
        localStorage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(gameState.highScores));
      }
    } catch (err) {
      console.warn('Failed to save run data to localStorage:', err);
    }
  }, [gameState]);

  // Before unload handler to guarantee current run data is saved before browser closes
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        if (!gameState.gameMode || gameState.gameMode === 'story') {
          localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(gameState));
          localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(gameState));
        }
        if (gameState.highScores && !isDevelopmentEnvironment()) {
          localStorage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(gameState.highScores));
        }
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  // User Settings state with persistence
  const [userSettings, setUserSettings] = useState<UserSettings>(() => loadUserSettings());

  // Keep soundEngine in sync with user settings
  useEffect(() => {
    soundEngine.applyAudioSettings(userSettings.audio);
  }, [userSettings.audio]);

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    saveUserSettings(newSettings);
    soundEngine.applyAudioSettings(newSettings.audio);
  };

  // Dev tools helper actions (moved to transparent HUD buttons)
  const handleDevAddBit = () => {
    setGameState(prev => {
      if (!prev.act1PurchasedN) {
        return {
          ...prev,
          currentN: 1,
          act1PurchasedN: true,
          act1Phase: 'point',
          act1Bits: 0,
          act1SubPart: 1,
          act1Resolution: 0,
        };
      }
      if (prev.act1SubPart === 1) {
        const nextBits = Math.min(10, (prev.act1Bits || 0) + 1);
        if (nextBits === 10) {
          return {
            ...prev,
            act1Bits: 10,
            act1SubPart: 2,
            act1Phase: 'point',
            act1Resolution: 0,
            currentN: 2,
            engineCompilePercent: 100,
          };
        }
        return {
          ...prev,
          act1Bits: nextBits,
          act1Phase: nextBits >= 9 ? 'line_segment' : 'point',
          engineCompilePercent: Math.min(100, prev.engineCompilePercent + 8),
        };
      } else {
        const nextBits = Math.min(10, (prev.act1Bits || 0) + 1);
        return {
          ...prev,
          act1Bits: nextBits,
        };
      }
    });
  };

  const handleDevAddRes = () => {
    setGameState(prev => {
      if (prev.act1SubPart !== 2) {
        return {
          ...prev,
          currentN: 2,
          act1PurchasedN: true,
          act1Bits: 10,
          act1SubPart: 2,
          act1Resolution: 1,
          engineCompilePercent: 100,
        };
      }
      const currentRes = prev.act1Resolution || 0;
      const nextRes = currentRes >= 10 ? 0 : currentRes + 1;
      return {
        ...prev,
        act1SubPart: 2,
        currentN: 2,
        act1Resolution: nextRes,
      };
    });
  };

  // Engine Pipeline Drawer
  const [isPipelineOpen, setIsPipelineOpen] = useState<boolean>(false);

  // Mode Selection from Main Menu
  const handleSelectMode = (mode: GameMode, forceNewStory: boolean = false) => {
    const isUnlocked = mode === 'story' || mode === 'arcade' || Boolean(gameState.hasCompletedStory || userSettings.controls.unlockAllModesDev);
    if (!isUnlocked) {
      return;
    }

    setIsMainMenuOpen(false);
    soundEngine.setBossMusic(false);
    soundEngine.ensureResumed();
    setRunSessionKey(prev => prev + 1);

    if (mode === 'story') {
      if (forceNewStory) {
        // Player chose to restart story mode from scratch:
        // Clear all materials gathered (HZ, V, and BD) back to 0, reset dimensional progress back to 0-bit void
        const freshStory: GameState = {
          ...DEFAULT_GAME_STATE,
          gameMode: 'story',
          totalRuns: (gameState.totalRuns || 1) + 1,
          hasCompletedStory: gameState.hasCompletedStory,
          highScores: gameState.highScores || loadSavedHighScores(),
          act: 1,
          currentN: 0,
          act1PurchasedN: false,
          act1Bits: 0,
          act1SubPart: 1,
          act1Resolution: 0,
          act1Phase: 'void',
          overshields: 0,
          polarity: 1,
          hp: 100,
          maxHp: 100,
          score: 0,
          engineCompilePercent: 8,
          compiledModules: INITIAL_MODULES,
          deathScreen: null,
          audioActive: true,
          carrierActive: true,
          resources: {
            hertz: 0,
            volts: 0,
            baud: 0,
          },
        };
        try {
          localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(freshStory));
          localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(freshStory));
        } catch {}
        soundEngine.setMusicPacing('slow_waltz', 'easy');
        soundEngine.startBackgroundMusic();
        setGameState(freshStory);
        return;
      }

      // Resume persistent story save file
      const savedStory = loadSavedStoryData();
      if (savedStory) {
        soundEngine.setMusicPacing('slow_waltz', 'easy');
        soundEngine.startBackgroundMusic();
        setGameState(prev => ({
          ...DEFAULT_GAME_STATE,
          ...savedStory,
          gameMode: 'story',
          totalRuns: prev.totalRuns || savedStory.totalRuns || 1,
          hasCompletedStory: prev.hasCompletedStory || savedStory.hasCompletedStory || false,
          highScores: prev.highScores || loadSavedHighScores(),
          audioActive: true,
          carrierActive: true,
          deathScreen: null,
          hp: Math.max(100, savedStory.hp || 100),
        }));
      } else {
        const initialStory: GameState = {
          ...DEFAULT_GAME_STATE,
          gameMode: 'story',
          totalRuns: (gameState.totalRuns || 1) + 1,
          hasCompletedStory: gameState.hasCompletedStory,
          highScores: gameState.highScores || loadSavedHighScores(),
          audioActive: true,
          carrierActive: true,
        };
        try {
          localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(initialStory));
          localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(initialStory));
        } catch {}
        soundEngine.setMusicPacing('slow_waltz', 'easy');
        soundEngine.startBackgroundMusic();
        setGameState(initialStory);
      }
    } else if (mode === 'speedrun') {
      soundEngine.setMusicPacing('arcade_techno', 'easy');
      soundEngine.startBackgroundMusic();
      setGameState(prev => ({
        ...DEFAULT_GAME_STATE,
        gameMode: 'speedrun',
        totalRuns: (prev.totalRuns || 1) + 1,
        hasCompletedStory: prev.hasCompletedStory,
        highScores: prev.highScores || loadSavedHighScores(),
        act: 1,
        currentN: 0,
        act1PurchasedN: false,
        act1Bits: 0,
        act1SubPart: 1,
        act1Resolution: 0,
        act1Phase: 'void',
        overshields: 0,
        polarity: 1,
        hp: 100,
        maxHp: 100,
        deathScreen: null,
        audioActive: true,
        carrierActive: true,
        speedrunTime: 0,
        speedrunRuns: 1,
        resources: { hertz: 0, volts: 0, baud: 0 },
      }));
    } else if (mode === 'survival') {
      soundEngine.setMusicPacing('math_rock', 'medium');
      soundEngine.startBackgroundMusic();
      setGameState(prev => ({
        ...DEFAULT_GAME_STATE,
        gameMode: 'survival',
        totalRuns: (prev.totalRuns || 1) + 1,
        hasCompletedStory: prev.hasCompletedStory,
        highScores: prev.highScores || loadSavedHighScores(),
        hasAttemptedSurvival: true,
        currentN: 2,
        act1PurchasedN: true,
        act1Bits: 10,
        act1SubPart: 2,
        act1Resolution: 10,
        overshields: 5,
        hp: 100,
        maxHp: 100,
        audioActive: true,
        carrierActive: true,
        deathScreen: null,
        survivalTime: 0,
        survivalResourcesCollected: { hertz: 0, volts: 0, baud: 0 },
        resources: { hertz: 0, volts: 0, baud: 0 },
      }));
    } else if (mode === 'arcade') {
      soundEngine.setMusicPacing('slow_waltz', 'easy');
      soundEngine.startBackgroundMusic();
      setGameState(prev => ({
        ...DEFAULT_GAME_STATE,
        gameMode: 'arcade',
        totalRuns: (prev.totalRuns || 1) + 1,
        hasCompletedStory: prev.hasCompletedStory,
        highScores: prev.highScores || loadSavedHighScores(),
        act: 1,
        currentN: 1,
        act1PurchasedN: true,
        act1Bits: 1, // Starts with 1 bit already unlocked
        act1SubPart: 1,
        act1Resolution: 0,
        act1Phase: 'point',
        overshields: 0,
        polarity: 1,
        hp: 100,
        maxHp: 100,
        deathScreen: null,
        audioActive: true,
        carrierActive: true,
        arcadeTime: 0,
        arcadeLives: 1, // Only 1 life at start, +1 when N=2
        resources: { hertz: 0, volts: 0, baud: 0 },
      }));
    }
  };

  // Restart / Reset Active Run
  const handleResetRun = () => {
    soundEngine.playHitSound('quantum');
    if (gameState.gameMode === 'story' || !gameState.gameMode) {
      handleSelectMode('story', true);
    } else if (gameState.gameMode === 'speedrun') {
      handleSelectMode('speedrun');
    } else if (gameState.gameMode === 'survival') {
      handleSelectMode('survival');
    } else if (gameState.gameMode === 'arcade') {
      handleSelectMode('arcade');
    }
  };

  // Story Save Progress summary for Main Menu
  const storySave = loadSavedStoryData();
  const storySource = (!gameState.gameMode || gameState.gameMode === 'story')
    ? normalizeStoryState(gameState)
    : (storySave || DEFAULT_GAME_STATE);
  const activeStoryResources = storySource.resources || { hertz: 0, volts: 0, baud: 0 };
  const hasStoryProgress = Boolean(
    storySource.act1PurchasedN ||
    (storySource.act1Bits || 0) > 0 ||
    (storySource.act1Resolution || 0) > 0 ||
    (storySource.currentN || 0) > 0 ||
    (activeStoryResources.hertz || 0) > 0 ||
    (activeStoryResources.volts || 0) > 0 ||
    (activeStoryResources.baud || 0) > 0
  );
  const storyProgressSummary = {
    hasSave: hasStoryProgress,
    act: storySource.act ?? 1,
    currentN: storySource.currentN ?? 0,
    act1Bits: storySource.act1Bits ?? 0,
    act1Resolution: storySource.act1Resolution ?? 0,
    resources: activeStoryResources,
    act1PurchasedN: Boolean(storySource.act1PurchasedN),
    act1SubPart: storySource.act1SubPart ?? 1,
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-black text-neutral-100 font-sans overflow-hidden select-none touch-none">
      {/* Standalone Fullscreen Game Window (Border-free & Edge-to-Edge) */}
      <main className="relative w-full h-full overflow-hidden flex flex-col bg-black">
        <DimensionCanvas
          key={runSessionKey}
          gameState={gameState}
          onUpdateState={setGameState}
          onOpenMainMenu={() => {
            soundEngine.setMusicPacing('slow_waltz', 'easy');
            soundEngine.startBackgroundMusic();
            setIsMainMenuOpen(true);
          }}
          isMobile={isMobileDevice}
          isMainMenuOpen={isMainMenuOpen}
          userSettings={userSettings}
          onUpdateSettings={handleUpdateSettings}
          onDevAddBit={handleDevAddBit}
          onDevAddRes={handleDevAddRes}
          onTogglePipeline={() => setIsPipelineOpen(prev => !prev)}
        />

        {/* Global Main Menu Modal */}
        <MainMenuModal
          isOpen={isMainMenuOpen}
          onClose={() => setIsMainMenuOpen(false)}
          onSelectMode={handleSelectMode}
          highScores={gameState.highScores}
          totalRuns={gameState.totalRuns || 1}
          hasCompletedStory={gameState.hasCompletedStory}
          storyProgress={storyProgressSummary}
          hasActiveRun={gameState.carrierActive}
          userSettings={userSettings}
          onUpdateSettings={handleUpdateSettings}
          isMobile={isMobileDevice}
        />

        {/* Slide-over Engine Pipeline Drawer */}
        {isPipelineOpen && Boolean(userSettings.controls.devToolsEnabled) && (
          <aside className="absolute top-2 right-2 bottom-2 w-full max-w-[480px] z-40 bg-neutral-950/95 border border-neutral-800 rounded-xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs font-mono">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>GRAPHICS & AUDIO PIPELINE ({gameState.engineCompilePercent}%)</span>
              </div>

              <button
                onClick={() => setIsPipelineOpen(false)}
                aria-label="Close drawer"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-hidden p-2">
              <CompilerPipelineHUD gameState={gameState} />
            </div>
          </aside>
        )}
        {/* Startup 3-Letter FTC Pilot Registration Modal */}
        {isFTCRegistrationOpen && (
          <InitialsRegistrationModal
            isOpen={isFTCRegistrationOpen}
            onCodeRegistered={() => {
              setIsFTCRegistrationOpen(false);
            }}
          />
        )}
      </main>
    </div>
  );
}
