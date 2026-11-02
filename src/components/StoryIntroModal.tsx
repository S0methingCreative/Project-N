import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, ChevronRight, Play, ShieldAlert, Radio } from 'lucide-react';
import { getPlayerCode } from '../utils/pilotProfile';
import { soundEngine } from '../audio/soundEngine';

interface StoryIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartStory?: () => void;
  variant?: 'intro' | 'bit10';
}

interface ScriptLine {
  id: string;
  type: 'header' | 'callsign' | 'mission' | 'controls' | 'protocol';
  text: string;
  color?: string;
  highlight?: boolean;
}

const renderHighlightedSlice = (fullText: string, charLimit: number) => {
  const parts = fullText.split(/(\b(?:Hz|HZ|Crests|V|Troughs|Bd|BD|packets|Packets)\b)/g);
  let remaining = charLimit;

  return parts.map((part, idx) => {
    if (remaining <= 0 || !part) return null;
    const visiblePart = part.slice(0, remaining);
    remaining -= part.length;

    if (part === 'Hz' || part === 'HZ' || part === 'Crests') {
      return (
        <span
          key={idx}
          className="text-[#33ff66] font-bold drop-shadow-[0_0_6px_rgba(51,255,102,0.45)]"
        >
          {visiblePart}
        </span>
      );
    }

    if (part === 'V' || part === 'Troughs') {
      return (
        <span
          key={idx}
          className="text-[#ff4455] font-bold drop-shadow-[0_0_6px_rgba(255,68,85,0.45)]"
        >
          {visiblePart}
        </span>
      );
    }

    if (part === 'Bd' || part === 'BD' || part === 'packets' || part === 'Packets') {
      return (
        <span
          key={idx}
          className="text-[#38bdf8] font-bold drop-shadow-[0_0_6px_rgba(56,189,248,0.45)]"
        >
          {visiblePart}
        </span>
      );
    }

    return <React.Fragment key={idx}>{visiblePart}</React.Fragment>;
  });
};

export const StoryIntroModal: React.FC<StoryIntroModalProps> = ({
  isOpen,
  onClose,
  onStartStory,
  variant = 'intro',
}) => {
  const pilotCode = getPlayerCode() || 'PIL';

  const scriptLines: ScriptLine[] =
    variant === 'bit10'
      ? [
          {
            id: 'sovereign_defeated',
            type: 'header',
            text: 'CORRUPTED SOVEREIGN DEFEATED: New Coordinate reached',
            color: 'text-emerald-400 font-bold',
          },
          {
            id: 'overshield_unlocked',
            type: 'mission',
            text: 'OVERSHIELD UNLOCKED: Collecting packets generate Bd and provides health or overshield charge.',
            color: 'text-neutral-200',
            highlight: true,
          },
          {
            id: 'controls_res2',
            type: 'controls',
            text: 'FLIGHT CONTROL TELEMETRY: Movement unlocked at Res 2.\nSwipe Left and Right on the left side of your screen to control your pilot.',
            color: 'text-amber-300 font-semibold',
            highlight: true,
          },
        ]
      : [
          {
            id: 'greeting',
            type: 'header',
            text: 'GREETINGS INTERDIMENSIONAL TRAVELER.',
            color: 'text-emerald-400 font-bold',
          },
          {
            id: 'pilot',
            type: 'callsign',
            text: `PILOT CODE [${pilotCode}] LOCKED IN.`,
            color: 'text-cyan-300 font-bold',
            highlight: true,
          },
          {
            id: 'goal',
            type: 'mission',
            text: 'PRIMARY MISSION: Collect Hz and V to compile Bits to power the visual matrix.',
            color: 'text-neutral-200',
          },
          {
            id: 'controls',
            type: 'controls',
            text: 'FLIGHT CONTROL TELEMETRY: Tap the Right side of your screen to synchronize polarizer to incoming Crests and Troughs to collect HZ and V.',
            color: 'text-amber-300 font-semibold',
            highlight: true,
          },
          {
            id: 'protocol',
            type: 'protocol',
            text: 'DE-COHERENCE IS PROGRESS: Dissolution returns you to your core compiler with your collected resources to compile permanent dimensional hardware to aid your mission.',
            color: 'text-emerald-300',
            highlight: true,
          },
        ];

  // Typewriter state
  const [revealedLineIndex, setRevealedLineIndex] = useState<number>(0);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setRevealedLineIndex(0);
      setCurrentCharIndex(0);
      setIsCompleted(false);
      soundEngine.unlockMobileAudio();
    }
  }, [isOpen, variant]);

  // Teletype typewriter progression
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    if (revealedLineIndex >= scriptLines.length) {
      setIsCompleted(true);
      return;
    }

    const currentLine = scriptLines[revealedLineIndex];
    if (!currentLine) {
      setIsCompleted(true);
      return;
    }

    if (currentCharIndex < currentLine.text.length) {
      const step = 2; // reveal 2 chars per tick for smooth fast typewriter
      const timer = setTimeout(() => {
        setCurrentCharIndex(prev => Math.min(currentLine.text.length, prev + step));
      }, 16);
      return () => clearTimeout(timer);
    } else {
      // Line completed, short pause before next line
      const linePause = currentLine.type === 'header' ? 350 : 200;
      const timer = setTimeout(() => {
        setRevealedLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, linePause);
      return () => clearTimeout(timer);
    }
  }, [isOpen, revealedLineIndex, currentCharIndex, isCompleted, scriptLines]);

  // Auto-scroll to bottom of terminal as text appears
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [revealedLineIndex, currentCharIndex]);

  // Tap-to-fast-forward: Reveals all lines immediately
  const handleFastForward = useCallback(() => {
    if (!isCompleted) {
      setRevealedLineIndex(scriptLines.length);
      setCurrentCharIndex(9999);
      setIsCompleted(true);
    }
  }, [isCompleted, scriptLines.length]);

  const handleEngage = useCallback(() => {
    onClose();
    if (onStartStory) {
      onStartStory();
    }
  }, [onClose, onStartStory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-md font-mono select-none"
      onClick={handleFastForward}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
    >
      {/* RETRO CRT MONITOR CONTAINER */}
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#050807] border-2 border-emerald-500/70 rounded-xl shadow-[0_0_40px_rgba(16,185,129,0.35)] overflow-hidden"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >
        {/* CRT Scanline & Phosphor Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-40 z-20" />
        <div className="pointer-events-none absolute inset-0 bg-radial from-transparent via-transparent to-black/70 z-20" />

        {/* TERMINAL HEADER */}
        <div className="relative z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 bg-neutral-950 border-b border-emerald-500/40 text-xs text-emerald-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold tracking-widest text-[11px] sm:text-xs">
              INITIALIZING PROJECT N-DIMENSIONAL COMPILER
            </span>
          </div>
        </div>

        {/* TERMINAL BODY / TELETYPE LOG */}
        <div
          ref={containerRef}
          className="relative z-30 flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 text-xs sm:text-sm leading-relaxed"
          onClick={handleFastForward}
        >
          {scriptLines.map((line, idx) => {
            if (idx > revealedLineIndex) return null;

            const isCurrentLine = idx === revealedLineIndex && !isCompleted;
            const charLimit = isCurrentLine ? currentCharIndex : line.text.length;

            return (
              <div
                key={line.id}
                className={`transition-all duration-150 ${line.color || 'text-neutral-300'} ${
                  line.highlight
                    ? 'p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30'
                    : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 select-none opacity-60 mt-0.5">&gt;</span>
                  <div className="flex-1">
                    {line.type === 'controls' && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1 rounded text-[10px] bg-amber-950/70 border border-amber-500/50 text-amber-300 font-bold">
                        <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                        <span>FLIGHT CONTROL TELEMETRY</span>
                      </div>
                    )}
                    {line.type === 'protocol' && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1 rounded text-[10px] bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-bold">
                        <ShieldAlert className="w-3 h-3 text-emerald-400" />
                        <span>CORE CALIBRATION PROTOCOL</span>
                      </div>
                    )}

                    <p className="whitespace-pre-line leading-relaxed">
                      {renderHighlightedSlice(line.text, charLimit)}
                      {isCurrentLine && (
                        <span className="inline-block w-2 h-3.5 ml-1 bg-emerald-400 animate-pulse" />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Prompt to tap to accelerate if still typing */}
          {!isCompleted && (
            <div className="pt-2 text-[10px] text-neutral-400/80 animate-pulse flex items-center gap-1.5 cursor-pointer">
              <ChevronRight className="w-3 h-3 text-emerald-400" />
              <span>TAP ANYWHERE TO FAST-FORWARD BRIEFING</span>
            </div>
          )}
        </div>

        {/* TERMINAL FOOTER / ACTION BUTTON */}
        <div className="relative z-30 p-3 sm:p-5 bg-neutral-950 border-t border-emerald-500/40 flex items-center">
          <button
            type="button"
            onClick={handleEngage}
            className={`w-full px-6 py-3.5 rounded-lg font-bold text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
              isCompleted
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/60 ring-2 ring-emerald-400/80 animate-pulse'
                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/60 shadow-emerald-950/40'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>INITIALIZE MISSION & ASCEND</span>
          </button>
        </div>
      </div>
    </div>
  );
};
