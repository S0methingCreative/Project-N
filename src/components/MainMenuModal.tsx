import React, { useState, useRef, useEffect } from 'react';
import { GameMode, HighScores } from '../types/game';
import {
  BookOpen,
  Zap,
  Gamepad2,
  Trophy,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Flame,
  Volume2,
  Volume1,
  VolumeX,
  Sliders,
  SlidersHorizontal,
  Lock,
  Unlock,
  Crown,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { draw6BitBackground } from '../utils/backgroundArt';
import { UserSettings, DEFAULT_USER_SETTINGS, saveUserSettings } from '../utils/settings';
import { GlobalLeaderboardModal } from './GlobalLeaderboardModal';
import { isDevelopmentEnvironment, wipeAllSavedScores } from '../services/leaderboardService';

export interface StoryProgressSummary {
  hasSave: boolean;
  act: number;
  currentN: number;
  act1Bits: number;
  act1Resolution: number;
  resources: { hertz: number; volts: number; baud: number };
  act1PurchasedN: boolean;
  act1SubPart: number;
}

interface MainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: GameMode, forceNewStory?: boolean) => void;
  highScores?: HighScores;
  totalRuns?: number;
  hasCompletedStory?: boolean;
  storyProgress?: StoryProgressSummary;
  hasActiveRun?: boolean;
  userSettings?: UserSettings;
  onUpdateSettings?: (settings: UserSettings) => void;
  isMobile?: boolean;
}

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  highScores = {},
  totalRuns = 0,
  hasCompletedStory = false,
  storyProgress,
  hasActiveRun = false,
  userSettings = DEFAULT_USER_SETTINGS,
  onUpdateSettings,
  isMobile = false,
}) => {
  const [activeTab, setActiveTab] = useState<'modes' | 'highscores' | 'options'>('modes');
  const [optionsSubTab, setOptionsSubTab] = useState<'audio' | 'control'>('audio');
  const [confirmFreshStory, setConfirmFreshStory] = useState<boolean>(false);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(soundEngine.isSoundMuted());
  const [isDevCodePromptOpen, setIsDevCodePromptOpen] = useState<boolean>(false);
  const [devCodeInput, setDevCodeInput] = useState<string>('');
  const [devCodeError, setDevCodeError] = useState<string>('');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [isGlobalLeaderboardOpen, setIsGlobalLeaderboardOpen] = useState<boolean>(false);
  const [isWipedToast, setIsWipedToast] = useState<boolean>(false);

  useEffect(() => {
    if (!lockedNotice) return;
    const timer = setTimeout(() => setLockedNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [lockedNotice]);

  // Render authentic 6-Bit background image on full screen behind main menu
  useEffect(() => {
    if (!isOpen) {
      setConfirmFreshStory(false);
      return;
    }
    setConfirmFreshStory(false);

    // Set soundtrack to Slow Waltz (78 BPM, 3/4 sway)
    soundEngine.setMusicPacing('slow_waltz', 'easy');
    soundEngine.startBackgroundMusic();

    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    let animId: number;
    const renderBg = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (ctx && w > 0 && h > 0) {
        draw6BitBackground(ctx, w, h, time);
      }
      animId = requestAnimationFrame(renderBg);
    };

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    animId = requestAnimationFrame(renderBg);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hasActiveRun) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hasActiveRun]);

  if (!isOpen) return null;

  const formatTime = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const getStoryStageName = (): string => {
    if (!storyProgress || !storyProgress.hasSave || !storyProgress.act1PurchasedN) {
      return '0D VOID';
    }
    if (storyProgress.act1SubPart === 2) {
      const res = storyProgress.act1Resolution || 0;
      if (res >= 9) {
        return `BOSS 2: FRACTURE SOVEREIGN (RES ${res})`;
      }
      return `RESOLUTION ${res}`;
    }
    const bits = storyProgress.act1Bits || 0;
    if (bits >= 9) {
      return 'BOSS 1: CORRUPTED SOVEREIGN (BIT 9)';
    }
    if (bits === 0) {
      return 'N = 1 (POINT)';
    }
    return `BIT ${bits}`;
  };

  const isModeUnlocked = (mode: GameMode): boolean => {
    if (mode === 'story' || mode === 'arcade') return true;
    return Boolean(hasCompletedStory || userSettings.controls.unlockAllModesDev);
  };

  const handleModeClick = (mode: GameMode, forceNew: boolean = false) => {
    if (!isModeUnlocked(mode)) {
      soundEngine.playIncorrectHit('packet');
      setLockedNotice(
        mode === 'speedrun'
          ? '🔒 SPEED RUN LOCKED: Complete Story Mode (defeat the final Fracture Sovereign at 10/10 Res) to unlock!'
          : '🔒 SURVIVAL LOCKED: Complete Story Mode (defeat the final Fracture Sovereign at 10/10 Res) to unlock!'
      );
      return;
    }
    soundEngine.playCadenceResolution();
    onSelectMode(mode, forceNew);
    onClose();
  };

  const handleToggleDevUnlockAllModes = (unlock: boolean) => {
    const updated: UserSettings = {
      ...userSettings,
      controls: {
        ...userSettings.controls,
        unlockAllModesDev: unlock,
      },
    };
    updateSettingsHelper(updated);
  };

  const updateSettingsHelper = (newSettings: UserSettings) => {
    if (onUpdateSettings) {
      onUpdateSettings(newSettings);
    }
    saveUserSettings(newSettings);
    soundEngine.applyAudioSettings(newSettings.audio);
  };

  const handleToggleMuteAll = () => {
    const updated: UserSettings = {
      ...userSettings,
      audio: {
        ...userSettings.audio,
        muteAll: !userSettings.audio.muteAll,
      },
    };
    updateSettingsHelper(updated);
    setIsAudioMuted(updated.audio.muteAll);
  };

  const handleMusicVolumeChange = (vol: number) => {
    const updated: UserSettings = {
      ...userSettings,
      audio: {
        ...userSettings.audio,
        musicVolume: vol,
      },
    };
    updateSettingsHelper(updated);
  };

  const handleToggleMusicMuted = () => {
    const updated: UserSettings = {
      ...userSettings,
      audio: {
        ...userSettings.audio,
        musicMuted: !userSettings.audio.musicMuted,
      },
    };
    updateSettingsHelper(updated);
  };

  const handleSfxVolumeChange = (vol: number) => {
    const updated: UserSettings = {
      ...userSettings,
      audio: {
        ...userSettings.audio,
        sfxVolume: vol,
      },
    };
    updateSettingsHelper(updated);
  };

  const handleToggleWheelInversion = () => {
    const updated: UserSettings = {
      ...userSettings,
      controls: {
        ...userSettings.controls,
        scrollWheelInversion: !userSettings.controls.scrollWheelInversion,
      },
    };
    updateSettingsHelper(updated);
  };

  const handleSetPolarizerInput = (input: 'space' | 'rmb') => {
    const updated: UserSettings = {
      ...userSettings,
      controls: {
        ...userSettings.controls,
        cyclePolarizerInput: input,
      },
    };
    updateSettingsHelper(updated);
  };

  const handleToggleDevTools = (enable: boolean) => {
    const updated: UserSettings = {
      ...userSettings,
      controls: {
        ...userSettings.controls,
        devToolsEnabled: enable,
      },
    };
    updateSettingsHelper(updated);
  };

  const handleVerifyDevCode = () => {
    if (devCodeInput.trim() === '1111') {
      handleToggleDevTools(true);
      setIsDevCodePromptOpen(false);
      setDevCodeInput('');
      setDevCodeError('');
    } else {
      setDevCodeError('Invalid code. Access denied.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 font-mono select-none animate-in fade-in duration-150 overflow-hidden"
      onClick={(e) => {
        e.stopPropagation();
        soundEngine.ensureResumed();
        soundEngine.setMusicPacing('slow_waltz', 'easy');
        soundEngine.startBackgroundMusic();
      }}
    >
      {/* 6-BIT RETRO GRAPHICS BACKGROUND CANVAS */}
      <canvas
        ref={bgCanvasRef}
        className="fixed inset-0 w-full h-full object-cover pointer-events-none -z-10"
      />

      {/* Subtle backdrop scrim */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-[0.5px] pointer-events-none -z-10" />

      {/* Minimalist Modal Dialog Card - Fits cleanly on screen without scrollbars */}
      <div
        className="relative w-full max-w-xl max-h-[96dvh] sm:max-h-[92dvh] bg-[#0c0d12]/95 border border-emerald-500/70 rounded-2xl shadow-2xl shadow-emerald-950/80 p-3 sm:p-5 flex flex-col gap-2 sm:gap-3.5 my-auto z-10 overflow-y-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Minimalist Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-widest text-neutral-100 uppercase">
                PROJECT N
              </h1>
              {hasCompletedStory ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                  MASTERED
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400/80 font-bold hidden sm:inline">
                  6-BIT SYNTHESIS
                </span>
              )}
            </div>
          </div>

          {/* Audio & Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleMuteAll}
              aria-label={isAudioMuted ? 'Unmute slow waltz' : 'Mute audio'}
              className="p-2 sm:px-2.5 sm:py-1.5 text-xs text-neutral-300 hover:text-emerald-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[38px] min-w-[38px] justify-center"
            >
              {isAudioMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              )}
            </button>

            {hasActiveRun ? (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors cursor-pointer min-h-[38px] flex items-center font-bold"
              >
                RESUME
              </button>
            ) : null}
          </div>
        </div>

        {/* Minimal Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-neutral-800/80 pb-1.5">
          <button
            onClick={() => setActiveTab('modes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'modes'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                : 'bg-neutral-900/80 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>MODES</span>
          </button>

          <button
            onClick={() => setActiveTab('highscores')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'highscores'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-950'
                : 'bg-neutral-900/80 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>SCORES</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playCadenceResolution();
              setIsGlobalLeaderboardOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border border-amber-500/60 shadow-sm shadow-amber-950/40"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>GLOBAL TOP 10</span>
          </button>

          <button
            onClick={() => setActiveTab('options')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'options'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950'
                : 'bg-neutral-900/80 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>OPTIONS</span>
          </button>

          {isDevelopmentEnvironment() && (
            <span
              title="Development environment active: leaderboard score submissions are disabled to prevent dev scores in live rankings."
              className="ml-auto hidden sm:flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold bg-amber-950/80 border border-amber-600/70 text-amber-300"
            >
              <span>DEV: SUBMISSIONS BYPASSED</span>
            </span>
          )}
        </div>

        {/* Tab 1: Game Modes */}
        {activeTab === 'modes' && (
          <div className="flex flex-col gap-2.5">
            {/* FEATURED: STORY MODE HERO CARD (WITH OPEN BOOK ICON) */}
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-neutral-900/90 to-neutral-900/90 border border-emerald-500/70 shadow-lg shadow-emerald-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/80 text-emerald-300 shrink-0 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide">
                      {getStoryStageName()}
                    </h2>
                    {storyProgress?.hasSave && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        SAVED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-300 font-mono mt-0.5">
                    {storyProgress?.hasSave
                      ? `Part ${storyProgress.act1SubPart} • N=${storyProgress.currentN} • ${storyProgress.act1Bits}/10 Bits • Res ${storyProgress.act1Resolution}/10`
                      : '0D Void → Full Dimensionality'}
                  </p>
                </div>
              </div>

              {confirmFreshStory ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-950/80 border border-rose-500/70 text-xs">
                  <span className="text-[10px] text-rose-300 font-bold">RESET SAVE?</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmFreshStory(false);
                      handleModeClick('story', true);
                    }}
                    className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-[11px] cursor-pointer"
                  >
                    CONFIRM
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmFreshStory(false);
                    }}
                    className="px-2 py-1.5 rounded bg-neutral-800 text-neutral-300 font-mono text-[11px] cursor-pointer"
                  >
                    NO
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  {storyProgress?.hasSave && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmFreshStory(true);
                      }}
                      aria-label="Restart fresh story"
                      className="p-2.5 rounded-xl text-xs font-mono font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 border border-neutral-700 transition-colors cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* GREEN PLAY BUTTON CHANGED TO AN OPEN BOOK BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleModeClick('story')}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-mono font-black bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black flex items-center justify-center gap-2 shadow-md shadow-emerald-950/60 transition-all cursor-pointer active:scale-95 min-h-[42px]"
                  >
                    <BookOpen className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>{storyProgress?.hasSave ? 'LAUNCH' : 'START'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* LOCKED NOTICE BANNER */}
            {lockedNotice && (
              <div className="p-2.5 rounded-lg bg-amber-950/90 border border-amber-500/80 text-amber-300 text-xs font-mono font-bold flex items-center justify-between gap-2 shadow-lg shadow-amber-950/50 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{lockedNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLockedNotice(null)}
                  className="text-amber-400 hover:text-white px-1 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* DEV TOOL MODE LOCK OVERRIDE PILL (Only visible when Dev Tools enabled via 1111) */}
            {userSettings.controls.devToolsEnabled && (
              <div className="flex items-center justify-between px-1 py-0.5 rounded bg-amber-950/30 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                <span className="font-bold flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                  DEV OVERRIDE:
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleDevUnlockAllModes(!userSettings.controls.unlockAllModesDev)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    userSettings.controls.unlockAllModesDev
                      ? 'bg-amber-900/80 border-amber-400 text-amber-200'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                  }`}
                  title="Dev Toggle: Unlock All Modes without story completion"
                >
                  {userSettings.controls.unlockAllModesDev ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  <span>{userSettings.controls.unlockAllModesDev ? 'ALL MODES UNLOCKED (DEV)' : 'STORY LOCK ENFORCED'}</span>
                </button>
              </div>
            )}

            {/* MINIMALIST 3 GAME MODES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 1. ARCADE (First from the left) */}
              <div
                onClick={() => handleModeClick('arcade')}
                className="group p-2.5 rounded-xl bg-neutral-900/80 border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-purple-400 font-bold text-xs">
                      <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>ARCADE</span>
                    </div>
                    <span className="text-[9px] text-purple-300 px-1 py-0.5 rounded bg-purple-950 border border-purple-800/80 font-bold">
                      1 LIFE
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-300">
                    Starts at Bit 1 with 1 Life. Scales to Medium at Bit 6, Hard at Bit 10; Boss 1 at Bit 9.
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[10px] text-purple-400 font-bold">
                  <span className="truncate max-w-[110px]">Best: {highScores.arcadeBestStage ? `${highScores.arcadeBestStage}` : 'Bit 1'}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>

              {/* 2. SPEED RUN (Middle) */}
              {(() => {
                const isUnlocked = isModeUnlocked('speedrun');
                return (
                  <div
                    onClick={() => handleModeClick('speedrun')}
                    className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isUnlocked
                        ? 'bg-neutral-900/80 border-cyan-500/40 hover:border-cyan-400 hover:bg-neutral-900'
                        : 'bg-neutral-950/80 border-neutral-800/80 opacity-75 hover:opacity-100 hover:border-amber-500/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className={`flex items-center gap-1 font-bold text-xs ${isUnlocked ? 'text-cyan-400' : 'text-neutral-400'}`}>
                          {isUnlocked ? <Zap className="w-3.5 h-3.5 text-cyan-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                          <span>SPEED RUN</span>
                        </div>
                        {isUnlocked ? (
                          <span className="text-[9px] text-cyan-300 px-1 py-0.5 rounded bg-cyan-950 border border-cyan-800/80 font-bold">
                            TIME ATTACK
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-400 px-1 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 font-bold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> LOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-300">
                        {isUnlocked
                          ? 'Auto-compiler rush. Defeat sovereigns at maximum speed.'
                          : 'Locked. Beat Story Mode (10/10 Res final boss) to unlock.'}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[10px]">
                      {isUnlocked ? (
                        <>
                          <span className="text-cyan-400 font-bold">Best: {highScores.speedrunBestTime ? formatTime(highScores.speedrunBestTime) : '--'}</span>
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                        </>
                      ) : (
                        <>
                          <span className="text-amber-400/90 font-mono text-[9px] font-bold">Requires Story Win</span>
                          <Lock className="w-3 h-3 text-amber-400/80" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 3. SURVIVAL (Far Right) */}
              {(() => {
                const isUnlocked = isModeUnlocked('survival');
                return (
                  <div
                    onClick={() => handleModeClick('survival')}
                    className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isUnlocked
                        ? 'bg-neutral-900/80 border-rose-500/40 hover:border-rose-400 hover:bg-neutral-900'
                        : 'bg-neutral-950/80 border-neutral-800/80 opacity-75 hover:opacity-100 hover:border-amber-500/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className={`flex items-center gap-1 font-bold text-xs ${isUnlocked ? 'text-rose-400' : 'text-neutral-400'}`}>
                          {isUnlocked ? <Flame className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
                          <span>SURVIVAL</span>
                        </div>
                        {isUnlocked ? (
                          <span className="text-[9px] text-rose-300 px-1 py-0.5 rounded bg-rose-950 border border-rose-800/80 font-bold">
                            ENDLESS
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-400 px-1 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 font-bold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> LOCKED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-300">
                        {isUnlocked
                          ? '240 FPS. Endless bosses, rhythm surges, and error spikes.'
                          : 'Locked. Beat Story Mode (10/10 Res final boss) to unlock.'}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[10px]">
                      {isUnlocked ? (
                        <>
                          <span className="text-rose-400 font-bold">Best: {highScores.survivalBestTime ? formatTime(highScores.survivalBestTime) : '--'}</span>
                          <ArrowRight className="w-3 h-3 text-rose-400" />
                        </>
                      ) : (
                        <>
                          <span className="text-amber-400/90 font-mono text-[9px] font-bold">Requires Story Win</span>
                          <Lock className="w-3 h-3 text-amber-400/80" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tab 2: High Scores / Records */}
        {activeTab === 'highscores' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* GLOBAL CLOUD LEADERBOARD HERO CALLOUT */}
            <div className="col-span-2 sm:col-span-4 p-3 rounded-xl bg-gradient-to-r from-amber-950/70 via-neutral-900 to-neutral-900 border border-amber-500/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Crown className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>GLOBAL FIRESTORE LEADERBOARD</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-black font-black">ALL MODES</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    Live Top 10 rankings, 3-initials arcade cabinet, and Story Pioneer Plaque
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playCadenceResolution();
                  setIsGlobalLeaderboardOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-mono font-black text-xs transition-all shadow-md shadow-amber-950/50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>OPEN GLOBAL TOP 10</span>
              </button>
            </div>

            {/* 1. STORY (Far Left) */}
            <div className="bg-neutral-900/90 border border-emerald-500/50 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1">
                <span>STORY</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-sm sm:text-base font-black text-white truncate">
                {getStoryStageName()}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                {storyProgress?.hasSave ? `Part ${storyProgress.act1SubPart} · ${storyProgress.act1Bits}/10 Bits` : '0D Void'}
              </div>
            </div>

            {/* 2. ARCADE (Second) */}
            <div className="bg-neutral-900/90 border border-purple-500/50 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-1">
                <span>ARCADE</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-sm sm:text-base font-black text-white truncate">
                {highScores.arcadeBestStage || '--'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {highScores.arcadeBestTime ? formatTime(highScores.arcadeBestTime) : '1 Life ladder'}
              </div>
            </div>

            {/* 3. SPEED RUN (Third) */}
            <div className="bg-neutral-900/90 border border-cyan-500/50 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-400 mb-1">
                <span>SPEED RUN</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-sm sm:text-base font-black text-white">
                {highScores.speedrunBestTime ? formatTime(highScores.speedrunBestTime) : '--'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {highScores.speedrunBestRuns ? `${highScores.speedrunBestRuns} attempts (fastest)` : 'Dual Sovereign rush'}
              </div>
            </div>

            {/* 4. SURVIVAL (Far Right) */}
            <div className="bg-neutral-900/90 border border-rose-500/50 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1">
                <span>SURVIVAL</span>
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-sm sm:text-base font-black text-white">
                {highScores.survivalBestTime ? formatTime(highScores.survivalBestTime) : '--'}
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {highScores.survivalBestResources ? `+${highScores.survivalBestResources.hertz} Hz` : 'Endless endurance'}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-4 bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex items-center justify-between text-[11px] text-neutral-400">
              <span>Lifetime Runs Recorded: <strong className="text-emerald-300">{totalRuns}</strong></span>
              <span>Local Storage</span>
            </div>
          </div>
        )}

        {/* Tab 3: Options */}
        {activeTab === 'options' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => setOptionsSubTab('audio')}
                className={`flex-1 py-1 px-2.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  optionsSubTab === 'audio'
                    ? 'bg-cyan-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>AUDIO</span>
              </button>
              <button
                type="button"
                onClick={() => setOptionsSubTab('control')}
                className={`flex-1 py-1 px-2.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  optionsSubTab === 'control'
                    ? 'bg-cyan-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>CONTROLS</span>
              </button>
            </div>

            {optionsSubTab === 'audio' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                    {userSettings.audio.muteAll ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Master Audio</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMuteAll}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                      userSettings.audio.muteAll
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                        : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    }`}
                  >
                    {userSettings.audio.muteAll ? 'MUTED' : 'ACTIVE'}
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200">Music Volume</span>
                    <span className="font-mono text-cyan-300">{userSettings.audio.musicVolume} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={userSettings.audio.musicVolume}
                    onChange={(e) => handleMusicVolumeChange(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-neutral-800 rounded appearance-none"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-200">SFX Volume</span>
                    <span className="font-mono text-emerald-300">{userSettings.audio.sfxVolume} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={userSettings.audio.sfxVolume}
                    onChange={(e) => handleSfxVolumeChange(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-800 rounded appearance-none"
                  />
                </div>
              </div>
            )}

            {optionsSubTab === 'control' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200">Invert Scroll Wheel</span>
                  <button
                    type="button"
                    onClick={handleToggleWheelInversion}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                      userSettings.controls.scrollWheelInversion
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                    }`}
                  >
                    {userSettings.controls.scrollWheelInversion ? 'INVERTED' : 'NORMAL'}
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 space-y-1.5">
                  <span className="text-xs font-bold text-neutral-200 block">Cycle Polarizer Key</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetPolarizerInput('space')}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        userSettings.controls.cyclePolarizerInput === 'space'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      SPACEBAR
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPolarizerInput('rmb')}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                        userSettings.controls.cyclePolarizerInput === 'rmb'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      RIGHT CLICK
                    </button>
                  </div>
                </div>

                {/* Developer Tools Toggle (Requires passcode 1111) */}
                <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-200 block">Developer Tools</span>
                      <span className="text-[10px] text-neutral-400 font-mono block">+1 RES, +1 BIT, PIPELINE</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (userSettings.controls.devToolsEnabled) {
                          handleToggleDevTools(false);
                        } else {
                          setIsDevCodePromptOpen(true);
                          setDevCodeInput('');
                          setDevCodeError('');
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                        userSettings.controls.devToolsEnabled
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      {userSettings.controls.devToolsEnabled ? 'ENABLED' : 'OFF'}
                    </button>
                  </div>

                  {isDevCodePromptOpen && (
                    <div className="p-2.5 rounded-md bg-neutral-950 border border-neutral-800 space-y-2">
                      <div className="text-[11px] font-mono text-neutral-300 flex items-center justify-between">
                        <span>Enter Passcode:</span>
                        <button
                          type="button"
                          onClick={() => setIsDevCodePromptOpen(false)}
                          className="text-neutral-500 hover:text-neutral-300 text-xs px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="Passcode"
                          value={devCodeInput}
                          onChange={(e) => {
                            setDevCodeInput(e.target.value);
                            setDevCodeError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerifyDevCode();
                          }}
                          className="flex-1 bg-neutral-900 border border-neutral-700 focus:border-cyan-500 px-2 py-1 text-xs font-mono rounded text-white tracking-widest text-center outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleVerifyDevCode}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold rounded transition-colors cursor-pointer"
                        >
                          UNLOCK
                        </button>
                      </div>
                      {devCodeError && (
                        <p className="text-[10px] font-mono text-red-400">{devCodeError}</p>
                      )}
                    </div>
                  )}

                  {userSettings.controls.devToolsEnabled && (
                    <>
                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-neutral-200 block">Dev: Unlock All Modes</span>
                          <span className="text-[10px] text-neutral-400 font-mono block">Bypasses Story completion lock for Survival & Speed Run</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleDevUnlockAllModes(!userSettings.controls.unlockAllModesDev)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                            userSettings.controls.unlockAllModesDev
                              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                          }`}
                        >
                          {userSettings.controls.unlockAllModesDev ? 'UNLOCKED' : 'LOCKED'}
                        </button>
                      </div>

                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-neutral-200 block">Dev: Wipe Saved High Scores</span>
                          <span className="text-[10px] text-neutral-400 font-mono block">Purges all local high score records without affecting story progress</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            wipeAllSavedScores();
                            setIsWipedToast(true);
                            setTimeout(() => {
                              setIsWipedToast(false);
                              window.location.reload();
                            }, 1200);
                          }}
                          className="px-2.5 py-1 rounded text-xs font-mono font-bold border border-red-500/60 bg-red-950/80 text-red-300 hover:bg-red-900 transition-all cursor-pointer"
                        >
                          {isWipedToast ? 'WIPED ✓' : 'WIPE SCORES'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thank You Appreciation on Menu Screen */}
        <div className="mt-1 pt-2 border-t border-neutral-800/80 flex items-center justify-center text-[10px] text-emerald-400/90 font-mono tracking-widest uppercase">
          <span>✦ BIT RESONANCE · THANK YOU FOR PLAYING ✦</span>
        </div>
      </div>

      {/* Global Leaderboard Modal Dialog */}
      <GlobalLeaderboardModal
        isOpen={isGlobalLeaderboardOpen}
        onClose={() => setIsGlobalLeaderboardOpen(false)}
      />
    </div>
  );
};
