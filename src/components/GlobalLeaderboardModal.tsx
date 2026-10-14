import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Zap,
  Flame,
  Gamepad2,
  BookOpen,
  X,
  RotateCw,
  Settings,
  Radio,
  Clock,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  fetchStoryLeaderboard,
  fetchSpeedrunLeaderboard,
  fetchSurvivalLeaderboard,
  fetchArcadeLeaderboard,
  fetchStoryFTC,
  fetchArcadeFTC,
  subscribeStoryLeaderboard,
  subscribeSpeedrunLeaderboard,
  subscribeSurvivalLeaderboard,
  subscribeArcadeLeaderboard,
  subscribeStoryFTC,
  subscribeArcadeFTC,
  getPlayerCode,
  setPlayerCode,
  isDevelopmentEnvironment,
  StoryScoreEntry,
  SpeedrunScoreEntry,
  SurvivalScoreEntry,
  ArcadeScoreEntry,
  FTCEntry,
} from '../services/leaderboardService';
import { InitialsRegistrationModal } from './InitialsRegistrationModal';
import { soundEngine } from '../audio/soundEngine';

export type LeaderboardTab = 'story' | 'arcade' | 'speedrun' | 'survival';

interface GlobalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LeaderboardTab;
  highlightInitials?: string;
  onCodeChanged?: (newCode: string) => void;
}

export const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'story',
  highlightInitials,
  onCodeChanged,
}) => {
  // Order of high scores from left to right: Story, Arcade, Speed run, Survival
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(initialTab);
  const [storyScores, setStoryScores] = useState<StoryScoreEntry[]>([]);
  const [arcadeScores, setArcadeScores] = useState<ArcadeScoreEntry[]>([]);
  const [speedrunScores, setSpeedrunScores] = useState<SpeedrunScoreEntry[]>([]);
  const [survivalScores, setSurvivalScores] = useState<SurvivalScoreEntry[]>([]);
  const [storyFTC, setStoryFTC] = useState<FTCEntry | null>(null);
  const [arcadeFTC, setArcadeFTC] = useState<FTCEntry | null>(null);
  const [playerCode, setLocalPlayerCode] = useState<string | null>(getPlayerCode());
  const [isChangeCodeOpen, setIsChangeCodeOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setLocalPlayerCode(getPlayerCode());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);

    // Initial fetch
    Promise.all([
      fetchStoryLeaderboard().then(setStoryScores),
      fetchArcadeLeaderboard().then(setArcadeScores),
      fetchSpeedrunLeaderboard().then(setSpeedrunScores),
      fetchSurvivalLeaderboard().then(setSurvivalScores),
      fetchStoryFTC().then(setStoryFTC),
      fetchArcadeFTC().then(setArcadeFTC),
    ]).finally(() => {
      setIsLoading(false);
    });

    // Real-time Firestore subscriptions
    const unsubStory = subscribeStoryLeaderboard((scores) => {
      setStoryScores(scores);
      setIsLive(true);
    });
    const unsubArcade = subscribeArcadeLeaderboard((scores) => {
      setArcadeScores(scores);
      setIsLive(true);
    });
    const unsubSpeedrun = subscribeSpeedrunLeaderboard((scores) => {
      setSpeedrunScores(scores);
      setIsLive(true);
    });
    const unsubSurvival = subscribeSurvivalLeaderboard((scores) => {
      setSurvivalScores(scores);
      setIsLive(true);
    });
    const unsubStoryFTC = subscribeStoryFTC((ftc) => {
      setStoryFTC(ftc);
      setIsLive(true);
    });
    const unsubArcadeFTC = subscribeArcadeFTC((ftc) => {
      setArcadeFTC(ftc);
      setIsLive(true);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubStory();
      unsubArcade();
      unsubSpeedrun();
      unsubSurvival();
      unsubStoryFTC();
      unsubArcadeFTC();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleRefresh = async () => {
    soundEngine.playCadenceResolution();
    setIsLoading(true);
    await Promise.all([
      fetchStoryLeaderboard().then(setStoryScores),
      fetchArcadeLeaderboard().then(setArcadeScores),
      fetchSpeedrunLeaderboard().then(setSpeedrunScores),
      fetchSurvivalLeaderboard().then(setSurvivalScores),
      fetchStoryFTC().then(setStoryFTC),
      fetchArcadeFTC().then(setArcadeFTC),
    ]);
    setIsLoading(false);
  };

  const handleTabChange = (tab: LeaderboardTab) => {
    soundEngine.playCadenceResolution();
    setActiveTab(tab);
  };

  const handleCodeRegistered = (newCode: string) => {
    setLocalPlayerCode(newCode);
    setPlayerCode(newCode);
    if (onCodeChanged) {
      onCodeChanged(newCode);
    }
  };

  if (!isOpen) return null;

  const formatSeconds = (sec: number = 0): string => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '--';
    }
  };

  // FTC text based on active tab
  const getFtcWinnerCode = (): string => {
    if (activeTab === 'story') {
      return storyFTC?.initials ? storyFTC.initials : '???';
    }
    if (activeTab === 'arcade') {
      return arcadeFTC?.initials ? arcadeFTC.initials : '???';
    }
    return '???';
  };

  const showFtcBanner = activeTab === 'story' || activeTab === 'arcade';

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none font-mono animate-in fade-in duration-150 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="relative w-full max-w-2xl max-h-[94dvh] bg-[#090c15] border border-amber-500/60 rounded-2xl shadow-2xl shadow-amber-950/70 p-3 sm:p-5 flex flex-col gap-3 my-auto z-10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Terminal Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400">
                <Trophy className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-black tracking-wider text-white uppercase">
                    GLOBAL HIGH SCORES
                  </h1>
                  {/* Live firestore icon badge */}
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 border border-emerald-500/50 text-emerald-300">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                    <span>{isLive ? 'LIVE FIRESTORE' : 'OFFLINE CACHE'}</span>
                  </span>

                  {/* FTC Banner: small banner similar in shape and size and to the right of the live firestore icon */}
                  {showFtcBanner && (
                    <span
                      title={
                        activeTab === 'story'
                          ? `Story First To Complete: ${storyFTC?.initials || 'Unclaimed'}`
                          : `Arcade First To Complete: ${arcadeFTC?.initials || 'Unclaimed'}`
                      }
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-950/80 border border-amber-500/60 text-amber-300 animate-in fade-in duration-150"
                    >
                      <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span>⚡FTC: {getFtcWinnerCode()}</span>
                    </span>
                  )}

                  {isDevelopmentEnvironment() && (
                    <span
                      title="Development environment active: leaderboard submissions are disabled to prevent dev scores in live rankings."
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950/90 border border-amber-600/70 text-amber-300"
                    >
                      <span>DEV MODE · NO SUBMISSIONS</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 font-mono">
                  Cross-device Top 10 Hall of Fame · 3-Letter Arcade Protocol
                  {playerCode && (
                    <span className="ml-1 text-amber-400 font-bold">
                      · ACTIVE CODE: [{playerCode}]
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Actions: Gear icon to the left of refresh button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsChangeCodeOpen(true)}
                title={`Change 3-Letter FTC Code (Current: ${playerCode || 'None'})`}
                className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1"
                aria-label="Change Player Code"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh Leaderboards"
                className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Refresh Leaderboards"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Mode Tabs ordered strictly: Story, Arcade, Speed run, Survival */}
          <div className="grid grid-cols-4 gap-1.5 bg-neutral-950/70 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => handleTabChange('story')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'story'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="truncate">STORY</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('arcade')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'arcade'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span className="truncate">ARCADE</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('speedrun')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'speedrun'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="truncate">SPEED RUN</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('survival')}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'survival'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span className="truncate">SURVIVAL</span>
            </button>
          </div>

          {/* Top 10 Table */}
          <div className="flex-1 overflow-y-auto border border-neutral-800 rounded-xl bg-black/40 p-1 sm:p-2 min-h-[220px]">
            {/* 1. STORY HIGH SCORES: Track how far people are in progression with stage completed; remove time; remove score */}
            {activeTab === 'story' && (
              <div className="space-y-1">
                <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-800">
                  <div className="col-span-2 sm:col-span-1">RANK</div>
                  <div className="col-span-3 sm:col-span-2">INITIALS</div>
                  <div className="col-span-4 sm:col-span-7">STAGE COMPLETED</div>
                  <div className="col-span-3 sm:col-span-2 text-right">DATE</div>
                </div>
                {storyScores.map((entry, idx) => {
                  const rank = idx + 1;
                  const isHighlight =
                    (highlightInitials && entry.initials === highlightInitials) ||
                    (playerCode && entry.initials === playerCode);
                  return (
                    <div
                      key={entry.id || idx}
                      className={`grid grid-cols-12 items-center px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                        isHighlight
                          ? 'bg-amber-500/20 border border-amber-400/80 text-amber-200'
                          : rank === 1
                          ? 'bg-amber-950/30 border border-amber-500/40 text-amber-300'
                          : rank === 2
                          ? 'bg-slate-900/40 border border-slate-600/40 text-slate-200'
                          : rank === 3
                          ? 'bg-orange-950/20 border border-orange-700/40 text-orange-300'
                          : 'bg-neutral-900/30 hover:bg-neutral-900/60 text-neutral-300'
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 font-black flex items-center gap-1">
                        {rank === 1 ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : `#${rank}`}
                      </div>
                      <div className="col-span-3 sm:col-span-2 font-black tracking-widest text-white text-sm">
                        {entry.initials}
                      </div>
                      <div className="col-span-4 sm:col-span-7 font-semibold text-emerald-300 truncate">
                        {entry.stageName} {entry.completed ? '★ (CONQUERED)' : ''}
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-right text-neutral-400 tabular-nums text-[11px]">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. ARCADE HIGH SCORES: Stage reached, duration, Total HZ; remove score; ranked first by furthest stage reached then duration */}
            {activeTab === 'arcade' && (
              <div className="space-y-1">
                <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-800">
                  <div className="col-span-2 sm:col-span-1">RANK</div>
                  <div className="col-span-3 sm:col-span-2">INITIALS</div>
                  <div className="col-span-4 sm:col-span-4">STAGE REACHED</div>
                  <div className="col-span-3 sm:col-span-2 text-right">DURATION</div>
                  <div className="hidden sm:block sm:col-span-2 text-right">TOTAL HZ</div>
                  <div className="hidden sm:block sm:col-span-1 text-right">DATE</div>
                </div>
                {arcadeScores.map((entry, idx) => {
                  const rank = idx + 1;
                  const isHighlight =
                    (highlightInitials && entry.initials === highlightInitials) ||
                    (playerCode && entry.initials === playerCode);
                  return (
                    <div
                      key={entry.id || idx}
                      className={`grid grid-cols-12 items-center px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                        isHighlight
                          ? 'bg-purple-500/20 border border-purple-400/80 text-purple-200'
                          : rank === 1
                          ? 'bg-purple-950/40 border border-purple-500/50 text-purple-300'
                          : rank === 2
                          ? 'bg-slate-900/40 border border-slate-600/40 text-slate-200'
                          : rank === 3
                          ? 'bg-orange-950/20 border border-orange-700/40 text-orange-300'
                          : 'bg-neutral-900/30 hover:bg-neutral-900/60 text-neutral-300'
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 font-black flex items-center gap-1">
                        {rank === 1 ? <Crown className="w-3.5 h-3.5 text-purple-400" /> : `#${rank}`}
                      </div>
                      <div className="col-span-3 sm:col-span-2 font-black tracking-widest text-white text-sm">
                        {entry.initials}
                      </div>
                      <div className="col-span-4 sm:col-span-4 font-semibold text-purple-300 truncate">
                        {entry.stageName} {entry.completed ? '★' : ''}
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-right font-black text-amber-300 tabular-nums">
                        {formatSeconds(entry.duration)}
                      </div>
                      <div className="hidden sm:block sm:col-span-2 text-right text-emerald-400 tabular-nums text-[11px]">
                        +{entry.totalHz.toLocaleString()} HZ
                      </div>
                      <div className="hidden sm:block sm:col-span-1 text-right text-neutral-400 tabular-nums text-[11px]">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. SPEED RUN HIGH SCORES: (fastest) phrasing, only completions, remove stage and score */}
            {activeTab === 'speedrun' && (
              <div className="space-y-1">
                <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-800">
                  <div className="col-span-2 sm:col-span-1">RANK</div>
                  <div className="col-span-3 sm:col-span-2">INITIALS</div>
                  <div className="col-span-4 sm:col-span-5 text-right">COMPLETION TIME (fastest)</div>
                  <div className="col-span-3 sm:col-span-2 text-right">RUNS</div>
                  <div className="hidden sm:block sm:col-span-2 text-right">DATE</div>
                </div>
                {speedrunScores.map((entry, idx) => {
                  const rank = idx + 1;
                  const isHighlight =
                    (highlightInitials && entry.initials === highlightInitials) ||
                    (playerCode && entry.initials === playerCode);
                  return (
                    <div
                      key={entry.id || idx}
                      className={`grid grid-cols-12 items-center px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                        isHighlight
                          ? 'bg-cyan-500/20 border border-cyan-400/80 text-cyan-200'
                          : rank === 1
                          ? 'bg-cyan-950/40 border border-cyan-500/50 text-cyan-300'
                          : rank === 2
                          ? 'bg-slate-900/40 border border-slate-600/40 text-slate-200'
                          : rank === 3
                          ? 'bg-orange-950/20 border border-orange-700/40 text-orange-300'
                          : 'bg-neutral-900/30 hover:bg-neutral-900/60 text-neutral-300'
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 font-black flex items-center gap-1">
                        {rank === 1 ? <Crown className="w-3.5 h-3.5 text-cyan-400" /> : `#${rank}`}
                      </div>
                      <div className="col-span-3 sm:col-span-2 font-black tracking-widest text-white text-sm">
                        {entry.initials}
                      </div>
                      <div className="col-span-4 sm:col-span-5 text-right font-black text-cyan-300 tabular-nums text-sm">
                        {formatSeconds(entry.timeSeconds)}s
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-right text-neutral-300 tabular-nums text-[11px]">
                        {entry.runs || 1} {entry.runs === 1 ? 'run' : 'runs'}
                      </div>
                      <div className="hidden sm:block sm:col-span-2 text-right text-neutral-400 tabular-nums text-[11px]">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. SURVIVAL HIGH SCORES: Longest time survived + Total HZ; remove stage reached and score */}
            {activeTab === 'survival' && (
              <div className="space-y-1">
                <div className="grid grid-cols-12 px-3 py-1.5 text-[10px] text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-800">
                  <div className="col-span-2 sm:col-span-1">RANK</div>
                  <div className="col-span-3 sm:col-span-2">INITIALS</div>
                  <div className="col-span-4 sm:col-span-4 text-right">TIME SURVIVED</div>
                  <div className="col-span-3 sm:col-span-3 text-right">TOTAL HZ</div>
                  <div className="hidden sm:block sm:col-span-2 text-right">DATE</div>
                </div>
                {survivalScores.map((entry, idx) => {
                  const rank = idx + 1;
                  const isHighlight =
                    (highlightInitials && entry.initials === highlightInitials) ||
                    (playerCode && entry.initials === playerCode);
                  return (
                    <div
                      key={entry.id || idx}
                      className={`grid grid-cols-12 items-center px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                        isHighlight
                          ? 'bg-rose-500/20 border border-rose-400/80 text-rose-200'
                          : rank === 1
                          ? 'bg-rose-950/40 border border-rose-500/50 text-rose-300'
                          : rank === 2
                          ? 'bg-slate-900/40 border border-slate-600/40 text-slate-200'
                          : rank === 3
                          ? 'bg-orange-950/20 border border-orange-700/40 text-orange-300'
                          : 'bg-neutral-900/30 hover:bg-neutral-900/60 text-neutral-300'
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 font-black flex items-center gap-1">
                        {rank === 1 ? <Crown className="w-3.5 h-3.5 text-rose-400" /> : `#${rank}`}
                      </div>
                      <div className="col-span-3 sm:col-span-2 font-black tracking-widest text-white text-sm">
                        {entry.initials}
                      </div>
                      <div className="col-span-4 sm:col-span-4 text-right font-black text-rose-400 tabular-nums text-sm">
                        {formatSeconds(entry.survivalSeconds)}
                      </div>
                      <div className="col-span-3 sm:col-span-3 text-right font-black text-emerald-400 tabular-nums text-xs">
                        +{entry.totalHz.toLocaleString()} HZ
                      </div>
                      <div className="hidden sm:block sm:col-span-2 text-right text-neutral-400 tabular-nums text-[11px]">
                        {formatDate(entry.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono border-t border-neutral-900 pt-2">
            <span>
              All scores automatically immortalized under pilot code{' '}
              <span className="text-amber-400 font-bold">[{playerCode || 'AAA'}]</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-700 cursor-pointer font-bold transition-colors"
            >
              RETURN
            </button>
          </div>
        </div>
      </div>

      {/* Change Code Modal triggered by Gear button */}
      {isChangeCodeOpen && (
        <InitialsRegistrationModal
          isOpen={isChangeCodeOpen}
          isEditing={true}
          currentCode={playerCode || undefined}
          onClose={() => setIsChangeCodeOpen(false)}
          onCodeRegistered={handleCodeRegistered}
        />
      )}
    </>
  );
};
