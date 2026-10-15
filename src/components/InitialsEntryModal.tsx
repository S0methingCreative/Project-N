import React, { useState, useEffect, useRef } from 'react';
import { Trophy, ChevronUp, ChevronDown, Check, Crown, AlertCircle } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { isBannedInitials } from '../services/leaderboardService';

interface InitialsEntryModalProps {
  isOpen: boolean;
  mode: 'story' | 'speedrun' | 'survival' | 'arcade';
  scoreOrTime: number;
  rank: number;
  isStoryVictory?: boolean;
  onSubmit: (initials: string) => void;
  onCancel?: () => void;
}

const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const InitialsEntryModal: React.FC<InitialsEntryModalProps> = ({
  isOpen,
  mode,
  scoreOrTime,
  rank,
  isStoryVictory = false,
  onSubmit,
  onCancel,
}) => {
  const [letters, setLetters] = useState<string[]>(['A', 'A', 'A']);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLetters(['A', 'A', 'A']);
      setActiveSlot(0);
      soundEngine.playCadenceResolution();
    }
  }, [isOpen]);

  const cycleLetter = (slot: number, delta: number) => {
    soundEngine.playCadenceResolution();
    setLetters((prev) => {
      const copy = [...prev];
      const curChar = copy[slot];
      let idx = CHAR_SET.indexOf(curChar);
      if (idx === -1) idx = 0;
      let nextIdx = (idx + delta + CHAR_SET.length) % CHAR_SET.length;
      copy[slot] = CHAR_SET[nextIdx];
      return copy;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      cycleLetter(activeSlot, -1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cycleLetter(activeSlot, 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveSlot((prev) => Math.max(0, prev - 1));
      soundEngine.playCadenceResolution();
    } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
      e.preventDefault();
      setActiveSlot((prev) => Math.min(2, prev + 1));
      soundEngine.playCadenceResolution();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setLetters((prev) => {
        const copy = [...prev];
        copy[activeSlot] = 'A';
        return copy;
      });
      setActiveSlot((prev) => Math.max(0, prev - 1));
      soundEngine.playCadenceResolution();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentInitials = letters.join('').toUpperCase();
      if (!isBannedInitials(currentInitials)) {
        handleRegister();
      }
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      const char = e.key.toUpperCase();
      setLetters((prev) => {
        const copy = [...prev];
        copy[activeSlot] = char;
        return copy;
      });
      soundEngine.playCadenceResolution();
      if (activeSlot < 2) {
        setActiveSlot(activeSlot + 1);
      }
    }
  };

  const handleRegister = () => {
    const finalInitials = letters.join('').toUpperCase();
    if (isBannedInitials(finalInitials)) {
      return;
    }
    soundEngine.playCadenceResolution();
    onSubmit(finalInitials);
  };

  if (!isOpen) return null;

  const modeTitle = mode.toUpperCase();
  const formatMetric = () => {
    if (mode === 'speedrun') {
      const m = Math.floor(scoreOrTime / 60);
      const s = Math.floor(scoreOrTime % 60);
      const ms = Math.floor((scoreOrTime % 1) * 10);
      return `${m}:${s.toString().padStart(2, '0')}.${ms}s`;
    }
    if (mode === 'survival') {
      const m = Math.floor(scoreOrTime / 60);
      const s = Math.floor(scoreOrTime % 60);
      return `${m}:${s.toString().padStart(2, '0')} survived`;
    }
    return `${Math.floor(scoreOrTime).toLocaleString()} PTS`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none font-mono animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={containerRef}
      autoFocus
    >
      <div className="relative w-full max-w-md bg-[#090d16] border-2 border-amber-400 rounded-2xl shadow-2xl shadow-amber-950/80 p-5 sm:p-7 flex flex-col items-center text-center space-y-4">
        {/* Glow Accent */}
        <div className="absolute -top-10 inset-x-0 mx-auto w-48 h-12 bg-amber-500/20 blur-2xl pointer-events-none" />

        {/* Header Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/70 text-amber-300 text-xs font-bold uppercase tracking-widest animate-pulse">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>GLOBAL TOP 10 QUALIFIED</span>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
            ENTER YOUR INITIALS
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {modeTitle} MODE · RANK #{rank} · <strong className="text-amber-400 font-bold">{formatMetric()}</strong>
          </p>
        </div>

        {/* Special Story Pioneer Notice */}
        {isStoryVictory && (
          <div className="w-full p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/50 flex items-center gap-2.5 text-left text-xs font-mono text-amber-200">
            <Crown className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <span className="font-bold block text-amber-300">PIONEER CANDIDATE</span>
              <span className="text-[11px] text-neutral-300">
                You conquered the story! If you are the first player in history, your initials will be immortalized forever on the Pioneer Plaque.
              </span>
            </div>
          </div>
        )}

        {/* 3-Letter Arcade Slots */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 my-2">
          {[0, 1, 2].map((slot) => {
            const isSelected = activeSlot === slot;
            return (
              <div key={slot} className="flex flex-col items-center">
                {/* Up Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSlot(slot);
                    cycleLetter(slot, -1);
                  }}
                  className={`p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors cursor-pointer mb-1 ${
                    isSelected ? 'text-amber-400' : ''
                  }`}
                  aria-label={`Previous character for slot ${slot + 1}`}
                >
                  <ChevronUp className="w-6 h-6 stroke-[3]" />
                </button>

                {/* Character Box */}
                <button
                  type="button"
                  onClick={() => setActiveSlot(slot)}
                  className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl flex items-center justify-center font-mono font-black text-3xl sm:text-4xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/30 scale-105'
                      : 'bg-neutral-900 border border-neutral-700 text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  {letters[slot]}
                </button>

                {/* Down Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSlot(slot);
                    cycleLetter(slot, 1);
                  }}
                  className={`p-1.5 rounded-lg text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors cursor-pointer mt-1 ${
                    isSelected ? 'text-amber-400' : ''
                  }`}
                  aria-label={`Next character for slot ${slot + 1}`}
                >
                  <ChevronDown className="w-6 h-6 stroke-[3]" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Instructions Hint or Banned Warning */}
        {isBannedInitials(letters.join('')) ? (
          <div className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-rose-950/80 border border-rose-500/70 text-rose-300 text-xs font-mono font-bold animate-pulse">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>CODE "{letters.join('').toUpperCase()}" IS PROHIBITED</span>
          </div>
        ) : (
          <div className="text-[11px] text-neutral-400 font-mono">
            <span className="hidden sm:inline">Use Arrow keys or type on keyboard · [ENTER] to confirm</span>
            <span className="sm:hidden">Tap arrows or slots to cycle initials</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="py-3 px-4 rounded-xl border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 text-xs font-bold transition-all cursor-pointer"
            >
              SKIP
            </button>
          )}

          <button
            type="button"
            onClick={handleRegister}
            disabled={isBannedInitials(letters.join(''))}
            className={`flex-1 py-3 px-5 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isBannedInitials(letters.join(''))
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60'
                : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black shadow-lg shadow-amber-950/80 active:scale-95'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>SUBMIT TO GLOBAL BOARD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
