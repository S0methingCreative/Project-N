import React, { useState, useEffect, useRef } from 'react';
import { Shield, Check, AlertCircle, X, ChevronUp, ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import { checkCodeAvailability, registerPlayerCode, isBannedInitials } from '../services/leaderboardService';
import { soundEngine } from '../audio/soundEngine';

const VALID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface InitialsRegistrationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isEditing?: boolean;
  currentCode?: string;
  onCodeRegistered: (code: string) => void;
}

export const InitialsRegistrationModal: React.FC<InitialsRegistrationModalProps> = ({
  isOpen,
  onClose,
  isEditing = false,
  currentCode,
  onCodeRegistered,
}) => {
  const [letters, setLetters] = useState<string[]>(['A', 'A', 'A']);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [checking, setChecking] = useState<boolean>(false);
  const [availability, setAvailability] = useState<{ available: boolean; reason?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentCode && currentCode.length === 3) {
        setLetters(currentCode.toUpperCase().split(''));
      } else {
        setLetters(['A', 'A', 'A']);
      }
      setActiveSlot(0);
      setAvailability(null);
    }
  }, [isOpen, currentCode]);

  // Debounced real-time Firestore check
  useEffect(() => {
    if (!isOpen) return;

    const fullCode = letters.join('').toUpperCase();
    if (fullCode.length !== 3) {
      setAvailability(null);
      return;
    }

    if (isBannedInitials(fullCode)) {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      setChecking(false);
      setAvailability({ available: false, reason: `Pilot code "${fullCode}" is prohibited.` });
      return;
    }

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    setChecking(true);
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await checkCodeAvailability(fullCode, currentCode);
        setAvailability(res);
      } catch {
        setAvailability({ available: true });
      } finally {
        setChecking(false);
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [letters, isOpen, currentCode]);

  // Keyboard navigation & character input
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close if editing
      if (e.key === 'Escape' && isEditing && onClose) {
        onClose();
        return;
      }

      // Enter to confirm
      if (e.key === 'Enter') {
        e.preventDefault();
        if (availability?.available && !checking && !isSubmitting) {
          handleConfirm();
        }
        return;
      }

      // Left / Right arrow navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveSlot((prev) => (prev > 0 ? prev - 1 : 2));
        soundEngine.playCadenceResolution();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveSlot((prev) => (prev < 2 ? prev + 1 : 0));
        soundEngine.playCadenceResolution();
        return;
      }

      // Up / Down arrow cycling
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        cycleChar(activeSlot, -1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        cycleChar(activeSlot, 1);
        return;
      }

      // Backspace: move back
      if (e.key === 'Backspace') {
        e.preventDefault();
        setActiveSlot((prev) => Math.max(0, prev - 1));
        return;
      }

      // Direct letter input (A-Z only)
      const keyUpper = e.key.toUpperCase();
      if (/^[A-Z]$/.test(keyUpper)) {
        e.preventDefault();
        soundEngine.playCadenceResolution();
        setLetters((prev) => {
          const next = [...prev];
          next[activeSlot] = keyUpper;
          return next;
        });
        if (activeSlot < 2) {
          setActiveSlot(activeSlot + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeSlot, availability, checking, isSubmitting, isEditing, onClose]);

  if (!isOpen) return null;

  const cycleChar = (slotIdx: number, delta: number) => {
    soundEngine.playCadenceResolution();
    setLetters((prev) => {
      const next = [...prev];
      const curChar = next[slotIdx] || 'A';
      const curIdx = VALID_CHARS.indexOf(curChar);
      const nextIdx = (curIdx + delta + VALID_CHARS.length) % VALID_CHARS.length;
      next[slotIdx] = VALID_CHARS[nextIdx];
      return next;
    });
  };

  const handleConfirm = async () => {
    const fullCode = letters.join('').toUpperCase();
    if (fullCode.length !== 3 || isBannedInitials(fullCode)) return;

    setIsSubmitting(true);
    try {
      await registerPlayerCode(fullCode);
      soundEngine.playCadenceResolution();
      onCodeRegistered(fullCode);
      if (onClose) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullCode = letters.join('').toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none font-mono animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md bg-[#090c15] border border-amber-500/70 rounded-2xl shadow-2xl shadow-amber-950/80 p-5 sm:p-6 flex flex-col gap-4 text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle glow header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

        {/* Modal Topbar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-md shadow-amber-950">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-white">
                {isEditing ? 'CHANGE 3-LETTER FTC CODE' : 'FIRST TO COMPLETE (FTC)'}
              </h2>
              <p className="text-[11px] text-amber-300/80 font-mono">
                {isEditing
                  ? 'Update your unique cross-device arcade identifier'
                  : 'Register your 3-letter code to compete in FTC challenges'}
              </p>
            </div>
          </div>

          {isEditing && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Instructions banner */}
        <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 space-y-1">
          <p className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>All personal high scores will be saved under this code.</span>
          </p>
          <p className="text-[11px] text-neutral-400">
            Each 3-letter code is unique across all global players and checked in real-time against Firestore.
          </p>
        </div>

        {/* 3 Interactive Letter Slots */}
        <div className="flex justify-center items-center gap-3 my-2">
          {letters.map((char, idx) => {
            const isActive = activeSlot === idx;
            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cycleChar(idx, -1)}
                  className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Previous character"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <div
                  onClick={() => setActiveSlot(idx)}
                  className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl flex items-center justify-center text-3xl sm:text-4xl font-black font-mono tracking-widest cursor-pointer transition-all border-2 ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/30 scale-105'
                      : 'bg-neutral-900/80 border-neutral-700 text-white hover:border-neutral-500'
                  }`}
                >
                  {char}
                </div>

                <button
                  type="button"
                  onClick={() => cycleChar(idx, 1)}
                  className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Next character"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Real-time Uniqueness Feedback */}
        <div className="min-h-[28px] flex items-center justify-center text-xs font-mono">
          {checking ? (
            <span className="flex items-center gap-1.5 text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Checking handle availability across Firestore...</span>
            </span>
          ) : availability ? (
            availability.available ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/50 px-2.5 py-1 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>CODE "{fullCode}" AVAILABLE & VERIFIED</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/70 border border-rose-500/50 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{availability.reason || `CODE "${fullCode}" IS ALREADY TAKEN`}</span>
              </span>
            )
          ) : (
            <span className="text-neutral-500 text-[11px]">
              Use keyboard (A-Z) or arrows to set code
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
          {isEditing && onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer transition-colors"
            >
              CANCEL
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!availability?.available || checking || isSubmitting}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
              availability?.available && !checking && !isSubmitting
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-lg shadow-amber-950 font-black'
                : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING CODE...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? `CONFIRM CODE: ${fullCode}` : `LOCK IN FTC CODE: ${fullCode}`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
