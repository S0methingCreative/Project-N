import React, { useState, useRef, useEffect } from 'react';
import { GameMode, HighScores } from '../types/game';
import {
  Play,
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
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { draw6BitBackground } from '../utils/backgroundArt';
import { UserSettings, DEFAULT_USER_SETTINGS, saveUserSettings } from '../utils/settings';

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
}) => {
  const [activeTab, setActiveTab] = useState<'modes' | 'highscores' | 'options'>('modes');
  const [optionsSubTab, setOptionsSubTab] = useState<'audio' | 'control'>('audio');
  const [confirmFreshStory, setConfirmFreshStory] = useState<boolean>(false);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(soundEngine.isSoundMuted());

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

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape resumes ONLY if there is an active running game to return to
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

  const handleModeClick = (mode: GameMode, forceNew: boolean = false) => {
    soundEngine.playCadenceResolution();
    onSelectMode(mode, forceNew);
    onClose();
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

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleMuteAll();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-mono select-none animate-in fade-in duration-200"
      onClick={(e) => {
        // Prevent click from propagating to canvas or window
        // Ensure clicking anywhere on the main menu background does NOT start the game!
        e.stopPropagation();
        // Safe user gesture to resume audio waltz if browser requires interaction
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

      {/* Dark semi-translucent scrim letting 6-bit pixel art shine through cleanly */}
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[0.5px] pointer-events-none -z-10" />

      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0c0d12]/95 border-2 border-emerald-500/80 rounded-2xl shadow-2xl shadow-emerald-950/80 p-4 sm:p-7 flex flex-col space-y-3 sm:space-y-5 my-auto z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wider text-neutral-100 uppercase">
                  GAME N: MAIN MENU
                </h1>
                {hasCompletedStory && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50">
                    MASTERED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <span>Dimensional Waveform Synthesis Hub</span>
                <span className="text-neutral-600">•</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  6-BIT GRAPHICS ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Audio Status & Action Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              aria-label={isAudioMuted ? 'Unmute slow waltz' : 'Mute audio'}
              className="px-2.5 py-1.5 text-xs text-neutral-300 hover:text-emerald-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation min-h-[38px]"
            >
              {isAudioMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="text-[10px]">MUTED</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">SLOW WALTZ (78 BPM)</span>
                </>
              )}
            </button>

            {/* Resume button only visible when a game run is actually underway */}
            {hasActiveRun ? (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-neutral-300 hover:text-neutral-100 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors cursor-pointer"
              >
                RESUME [ESC]
              </button>
            ) : (
              <div className="px-2.5 py-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/50 rounded-lg">
                READY
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
          <button
            onClick={() => setActiveTab('modes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'modes'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>GAME MODES</span>
          </button>

          <button
            onClick={() => setActiveTab('highscores')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'highscores'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>HIGH SCORES</span>
          </button>

          <button
            onClick={() => setActiveTab('options')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'options'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>OPTIONS</span>
          </button>
        </div>

        {/* Tab 1: Game Modes */}
        {activeTab === 'modes' && (
          <div className="space-y-4">
            {/* FEATURED: START / CONTINUE STORY MODE HERO CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-neutral-900 to-neutral-900 border-2 border-emerald-500/80 shadow-xl shadow-emerald-950/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 shrink-0">
                  <Play className="w-6 h-6 fill-emerald-400 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
                      {storyProgress?.hasSave ? 'ACTIVE STORY SAVE' : 'PRIMARY CAMPAIGN'}
                    </span>
                    {storyProgress?.hasSave && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        PROGRESS PERSISTED
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                    {storyProgress?.hasSave ? 'CONTINUE STORY' : 'START STORY'}
                  </h2>
                  <p className="text-xs text-neutral-300 font-mono mt-0.5">
                    {storyProgress?.hasSave
                      ? `Part ${storyProgress.act1SubPart} • N=${storyProgress.currentN} • ${storyProgress.act1Bits}/10 Bits • Res ${storyProgress.act1Resolution}/10 • ${storyProgress.resources.hertz} Hz, ${storyProgress.resources.volts} V${storyProgress.resources.baud ? `, ${storyProgress.resources.baud} Bd` : ''}`
                      : 'Embark on the canonical journey from the 0D acoustic void to full dimensional reality.'}
                  </p>
                </div>
              </div>

              {confirmFreshStory ? (
                <div className="flex flex-col sm:flex-row items-center gap-2.5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/70 text-xs w-full sm:w-auto animate-in fade-in duration-150">
                  <div className="flex-1 font-mono text-[11px] leading-tight text-center sm:text-left text-rose-200">
                    <div className="font-bold text-rose-300">CLEAR ALL MATERIALS &amp; START FRESH?</div>
                    <div className="text-rose-400/90 text-[10px] mt-0.5">
                      Will clear all gathered materials: 0 Hz, 0 V, 0 Bd, and reset story to 0D Void.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmFreshStory(false);
                        handleModeClick('story', true);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-mono font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>CLEAR ALL &amp; START</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmFreshStory(false);
                      }}
                      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs border border-neutral-700 transition-all cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  {storyProgress?.hasSave && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmFreshStory(true);
                      }}
                      className="px-3.5 py-3 rounded-xl text-xs font-mono font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-rose-300 border border-neutral-700 hover:border-rose-500/60 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span>START FRESH STORY</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleModeClick('story')}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-xl text-xs font-mono font-black bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/70 transition-all cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>{storyProgress?.hasSave ? 'START / CONTINUE STORY' : 'START STORY'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* OTHER GAME MODES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. SPEED RUN */}
              <div
                onClick={() => handleModeClick('speedrun')}
                className="group p-3.5 rounded-xl bg-neutral-900/80 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer hover:bg-neutral-900 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs sm:text-sm">
                      <Zap className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                      <span>SPEED RUN</span>
                    </div>
                    <span className="text-[9px] text-cyan-300/80 px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/80 font-bold">
                      TIME ATTACK
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Auto-compiles bits and resolutions as soon as resources are harvested. Defeat both bosses as fast as possible.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-cyan-400 font-bold">
                  <span>Best: {highScores.speedrunBestTime ? formatTime(highScores.speedrunBestTime) : '--'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 2. SURVIVAL MODE */}
              <div
                onClick={() => handleModeClick('survival')}
                className="group p-3.5 rounded-xl bg-neutral-900/80 border border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer hover:bg-neutral-900 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs sm:text-sm">
                      <Flame className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                      <span>SURVIVAL</span>
                    </div>
                    <span className="text-[9px] text-rose-300/80 px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/80 font-bold">
                      ESCALATION
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Start fully unlocked at 240 FPS with 5 Overshields. Endure endless bosses, error spikes, and rhythm surges.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-rose-400 font-bold">
                  <span>Best: {highScores.survivalBestTime ? formatTime(highScores.survivalBestTime) : '--'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* 3. ARCADE MODE */}
              <div
                onClick={() => handleModeClick('arcade')}
                className="group p-3.5 rounded-xl bg-neutral-900/80 border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer hover:bg-neutral-900 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs sm:text-sm">
                      <Gamepad2 className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
                      <span>ARCADE</span>
                    </div>
                    <span className="text-[9px] text-purple-300/80 px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-800/80 font-bold">
                      1 LIFE
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Linear tempo & pattern escalation starting at 1 Bit. Gain +1 Life at N=2. Kill screen logs records into the Vault.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-purple-400 font-bold">
                  <span className="truncate max-w-[130px]">Best: {highScores.arcadeBestStage ? `${highScores.arcadeBestStage}` : '1 Life • 1 Bit'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: High Scores / Records Vault */}
        {activeTab === 'highscores' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Speed Run Best */}
              <div className="bg-neutral-900/90 border border-cyan-500/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> SPEED RUN RECORD
                  </span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-neutral-100">
                  {highScores.speedrunBestTime ? formatTime(highScores.speedrunBestTime) : 'NO RECORD YET'}
                </div>
                <div className="text-xs text-neutral-400">
                  {highScores.speedrunBestRuns ? `Completed in ${highScores.speedrunBestRuns} run attempts` : 'Defeat both Sovereigns in Speed Run mode to register'}
                </div>
              </div>

              {/* Survival Best */}
              <div className="bg-neutral-900/90 border border-rose-500/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4" /> SURVIVAL RECORD
                  </span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-neutral-100">
                  {highScores.survivalBestTime ? formatTime(highScores.survivalBestTime) : 'NO RECORD YET'}
                </div>
                <div className="text-xs text-neutral-400">
                  {highScores.survivalBestResources
                    ? `Harvested +${highScores.survivalBestResources.hertz} Hz, +${highScores.survivalBestResources.volts} V, +${highScores.survivalBestResources.baud} Flux`
                    : 'Endure escalating difficulty in Survival mode to register'}
                </div>
              </div>

              {/* Arcade Mode Best / Records Vault */}
              <div className="col-span-1 sm:col-span-2 bg-neutral-900/90 border border-purple-500/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4" /> ARCADE RECORDS VAULT
                  </span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div className="text-xl sm:text-2xl font-black text-neutral-100">
                    {highScores.arcadeBestStage ? highScores.arcadeBestStage : 'NO RECORD YET'}
                  </div>
                  {highScores.arcadeBestTime ? (
                    <div className="text-sm font-bold text-amber-400">
                      Time: {formatTime(highScores.arcadeBestTime)}
                    </div>
                  ) : null}
                </div>
                <div className="text-xs text-neutral-400">
                  {highScores.arcadeBestStage
                    ? 'Furthest progress recorded from the Arcade Kill Screen / Victory'
                    : 'Survive the 10-Bit and 10-Resolution escalation in Arcade Mode to log records in Vault'}
                </div>
              </div>
            </div>

            {/* Lifetime Stats */}
            <div className="bg-black/60 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>Total Lifetime Runs Recorded: <strong className="text-emerald-300">{totalRuns}</strong></span>
              </div>
              <div className="text-[11px] text-neutral-500">
                Data saved in browser localStorage
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Options (Sub-menus: Audio & Control) */}
        {activeTab === 'options' && (
          <div className="space-y-4">
            {/* Options Sub Navigation: Audio vs Control */}
            <div className="flex items-center gap-2 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setOptionsSubTab('audio')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  optionsSubTab === 'audio'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>AUDIO</span>
              </button>
              <button
                type="button"
                onClick={() => setOptionsSubTab('control')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  optionsSubTab === 'control'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>CONTROL</span>
              </button>
            </div>

            {/* AUDIO OPTIONS SUB-MENU */}
            {optionsSubTab === 'audio' && (
              <div className="space-y-3">
                {/* 1. Mute All */}
                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                      {userSettings.audio.muteAll ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>Mute All</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Silences all master audio output (music and sound effects).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMuteAll}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                      userSettings.audio.muteAll
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                        : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    }`}
                  >
                    {userSettings.audio.muteAll ? 'MUTED (ON)' : 'UNMUTED (OFF)'}
                  </button>
                </div>

                {/* 2. Music Volume + Mute toggle */}
                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                        <Volume1 className="w-4 h-4 text-cyan-400" />
                        <span>Music Volume</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Procedural C Major background soundtrack (Default: 5).
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300 bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                        {userSettings.audio.musicVolume} / 10
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleMusicMuted}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                          userSettings.audio.musicMuted
                            ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {userSettings.audio.musicMuted ? 'MUSIC MUTED' : 'MUTE MUSIC'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={userSettings.audio.musicVolume}
                    onChange={(e) => handleMusicVolumeChange(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>1 (Quiet)</span>
                    <span>5 (Default Build Volume)</span>
                    <span>10 (Max)</span>
                  </div>
                </div>

                {/* 3. Sound Effect Volume */}
                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>Sound Effect Volume</span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Polarizer matches, kicks, shield sparks & clashes (Default: 5).
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                        {userSettings.audio.sfxVolume} / 10
                      </span>
                      <button
                        type="button"
                        onClick={() => soundEngine.playCorrectHit('general')}
                        className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all cursor-pointer"
                      >
                        TEST SFX
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={userSettings.audio.sfxVolume}
                    onChange={(e) => handleSfxVolumeChange(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>1 (Quiet)</span>
                    <span>5 (Default Build Volume)</span>
                    <span>10 (Max)</span>
                  </div>
                </div>
              </div>
            )}

            {/* CONTROL OPTIONS SUB-MENU */}
            {optionsSubTab === 'control' && (
              <div className="space-y-3">
                {/* 1. Scroll Wheel Inversion */}
                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                      <span>Scroll Wheel Inversion</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Inverts mouse scroll wheel movement direction on the 1D line.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleWheelInversion}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                      userSettings.controls.scrollWheelInversion
                        ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {userSettings.controls.scrollWheelInversion ? 'INVERTED (ON)' : 'DEFAULT (OFF)'}
                  </button>
                </div>

                {/* 2. Cycle Polarizer State Toggle (Spacebar vs RMB) */}
                <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-200">
                        Cycle Polarizer State
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Choose input to toggle polarity between positive, negative, and neutral.
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetPolarizerInput('space')}
                      className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        userSettings.controls.cyclePolarizerInput === 'space'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md'
                          : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span>⌨️ SPACEBAR (DEFAULT)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPolarizerInput('rmb')}
                      className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        userSettings.controls.cyclePolarizerInput === 'rmb'
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md'
                          : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <span>🖱️ RMB (RIGHT CLICK)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Footer controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pt-2 border-t border-neutral-800 text-[11px] text-neutral-500">
          <span>Controls: Tap screen or [SPACE] to cycle polarizer • Drag joystick or scroll to steer</span>
          <span>Project N • Standalone Architecture</span>
        </div>
      </div>
    </div>
  );
};
