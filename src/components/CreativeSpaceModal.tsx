import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Lock,
  Plus,
  Film,
  Undo2,
  X,
  Volume2,
  VolumeX,
  Clock,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

export type StepPolarity = -1 | 0 | 1; // -1 = '-', 0 = '0', 1 = '+'
export type TrackId = 'hihat' | 'kick' | 'snare' | 'bass';

export interface SequencerTracks {
  hihat: StepPolarity[]; // Point 1: x1 (0 to 8)
  kick: StepPolarity[];  // Point 1: y1 (0 to 8)
  snare: StepPolarity[]; // Point 2: x2 (0 to 8)
  bass: StepPolarity[];  // Point 2: y2 (0 to 8)
}

export interface SavedEtchLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tracks: SequencerTracks;
  soloNoteIdx: number | null;
}

interface CreativeSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Highest story stage reached (10 = Bit 10, 11 = Res 1 ... 20 = Res 10) */
  effectiveStage: number;
  devUnlocked?: boolean;
}

const CREATIVE_LINES_STORAGE_KEY = 'GAME_N_ETCH_LINES_V4';
import { getStoredMaxCreativeStage } from '../utils/settings';
export { getStoredMaxCreativeStage };

export interface NoteColorSpec {
  pad: number;
  note: string;
  freq: number;
  colorName: string;
  colorHex: string;
  textHex: string;
  hasLightBorder?: boolean;
}

// 8-Note C Major Scale for Notes 1-8 with exact 1-8 Line Color Mapping:
// 1 = Black, 2 = White, 3 = Red, 4 = Green, 5 = Blue, 6 = Cyan, 7 = Magenta, 8 = Yellow
const SOLO_PAD_NOTES: NoteColorSpec[] = [
  { pad: 1, note: 'C4', freq: 261.63, colorName: 'Black', colorHex: '#000000', textHex: '#FFFFFF', hasLightBorder: true },
  { pad: 2, note: 'D4', freq: 293.66, colorName: 'White', colorHex: '#FFFFFF', textHex: '#000000' },
  { pad: 3, note: 'E4', freq: 329.63, colorName: 'Red', colorHex: '#FF0000', textHex: '#000000' },
  { pad: 4, note: 'F4', freq: 349.23, colorName: 'Green', colorHex: '#00FF00', textHex: '#000000' },
  { pad: 5, note: 'G4', freq: 392.00, colorName: 'Blue', colorHex: '#0000FF', textHex: '#FFFFFF' },
  { pad: 6, note: 'A4', freq: 440.00, colorName: 'Cyan', colorHex: '#00FFFF', textHex: '#000000' },
  { pad: 7, note: 'B4', freq: 493.88, colorName: 'Magenta', colorHex: '#FF00FF', textHex: '#000000' },
  { pad: 8, note: 'C5', freq: 523.25, colorName: 'Yellow', colorHex: '#FFFF00', textHex: '#000000' },
];

function getNoteColorSpec(padNumber: number | null | undefined): NoteColorSpec {
  return SOLO_PAD_NOTES.find((n) => n.pad === padNumber) || SOLO_PAD_NOTES[0];
}

// Default tracks: Point 1 at (1, 1) and Point 2 at (6, 6) so a diagonal line is immediately visible in the 0-8 quadrant
const DEFAULT_TRACKS: SequencerTracks = {
  hihat: [1, 0, 0, 0, 0, 0, 0, 0],
  kick: [1, 0, 0, 0, 0, 0, 0, 0],
  snare: [1, 1, 1, 1, 1, 1, 0, 0],
  bass: [1, 1, 1, 1, 1, 1, 0, 0],
};

function cloneTracks(t: SequencerTracks): SequencerTracks {
  return {
    hihat: [...t.hihat],
    kick: [...t.kick],
    snare: [...t.snare],
    bass: [...t.bass],
  };
}

const GREEN_BG_HEX = '#020b06';
const GREEN_GRID_HEX = '#0c2e19';
const GREEN_AXIS_HEX = '#1b5e34';
const GREEN_ACCENT_HEX = '#a3ffb8';

export const CreativeSpaceModal: React.FC<CreativeSpaceModalProps> = ({
  isOpen,
  onClose,
  effectiveStage,
  devUnlocked = false,
}) => {
  const unlockedStage = devUnlocked ? 20 : getStoredMaxCreativeStage(effectiveStage);

  // Convert stage (10..20) to Resolution level (1..10)
  const maxResUnlocked =
    unlockedStage >= 20
      ? 10
      : unlockedStage >= 11
      ? unlockedStage - 10
      : 1; // Stage 10 (Bit 10) starts with Res 1 tier (Note 1 unlocked)

  // All 8 steps of the Coordinate Sequencer are unlocked immediately with Creative Space
  const maxUnlockedSteps = 8;
  // 8-Note Sequencer unlocks progressively with Resolution 1-8 (1 note per Resolution)
  const maxUnlockedNotes = Math.min(8, Math.max(1, maxResUnlocked));
  const isWaltzUnlocked = maxResUnlocked >= 10;

  const [isWaltzTime, setIsWaltzTime] = useState<boolean>(false); // 3/4 time (6 steps) vs 4/4 time (8 steps)
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.isSoundMuted());

  const [tracks, setTracks] = useState<SequencerTracks>(() => cloneTracks(DEFAULT_TRACKS));
  const [savedLines, setSavedLines] = useState<SavedEtchLine[]>([]);
  const [slideshowLineIdx, setSlideshowLineIdx] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [activeSoloPad, setActiveSoloPad] = useState<number>(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pulseBoostRef = useRef<number>(0);

  // Pause background menu music while inside Creative Space so user hears their own beats cleanly
  useEffect(() => {
    if (!isOpen) return;
    soundEngine.ensureResumed();
    soundEngine.stopBackgroundMusic();
  }, [isOpen]);

  // Load saved Etch-a-Sketch lines from localStorage on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(CREATIVE_LINES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedLines(parsed);
        }
      }
    } catch {}
  }, [isOpen]);

  // Persist saved lines when changed
  const persistLines = (nextLines: SavedEtchLine[]) => {
    setSavedLines(nextLines);
    try {
      localStorage.setItem(CREATIVE_LINES_STORAGE_KEY, JSON.stringify(nextLines));
    } catch {}
  };

  // Active loop step count (in 3/4 Waltz mode at Res 10, uses 6 steps; otherwise all 8 steps)
  const activeStepLimit = isWaltzTime ? 6 : maxUnlockedSteps;

  // Which tracks are currently driving the audio & active line
  const displayedTracks: SequencerTracks =
    isSlideshowPlaying && savedLines.length > 0
      ? savedLines[slideshowLineIdx % savedLines.length].tracks
      : tracks;

  // Compute Point 1 (x1, y1) = (Hi-Hat, Kick) and Point 2 (x2, y2) = (Snare, Bass Line) clamped to 0..8
  const computePoints = useCallback(
    (sourceTracks: SequencerTracks) => {
      let x1 = 0; // Hi-Hat -> Point 1 X (0 to 8)
      let y1 = 0; // Kick   -> Point 1 Y (0 to 8)
      let x2 = 0; // Snare  -> Point 2 X (0 to 8)
      let y2 = 0; // Bass   -> Point 2 Y (0 to 8)

      for (let i = 0; i < activeStepLimit; i++) {
        x1 += sourceTracks.hihat[i] || 0;
        y1 += sourceTracks.kick[i] || 0;
        x2 += sourceTracks.snare[i] || 0;
        y2 += sourceTracks.bass[i] || 0;
      }

      return {
        x1: Math.max(0, Math.min(8, x1)),
        y1: Math.max(0, Math.min(8, y1)),
        x2: Math.max(0, Math.min(8, x2)),
        y2: Math.max(0, Math.min(8, y2)),
      };
    },
    [activeStepLimit]
  );

  const activePoints = computePoints(displayedTracks);
  const activeNoteSpec = getNoteColorSpec(activeSoloPad);

  // Synthesize drum/bass sounds for a single step column
  const playStepAudio = useCallback((stepIdx: number, sourceTracks: SequencerTracks) => {
    const hatVal = sourceTracks.hihat[stepIdx] || 0;
    const kickVal = sourceTracks.kick[stepIdx] || 0;
    const snareVal = sourceTracks.snare[stepIdx] || 0;
    const bassVal = sourceTracks.bass[stepIdx] || 0;

    let triggered = false;

    // 1. Hi-Hat (x1): High metallic square/triangle tick
    if (hatVal === 1) {
      soundEngine.playTone(1760, 'square', 0.045, 0.08);
      triggered = true;
    } else if (hatVal === -1) {
      soundEngine.playTone(1174.66, 'triangle', 0.035, 0.07);
      triggered = true;
    }

    // 2. Kick (y1): Punchy bass drum or deep sub pulse
    if (kickVal === 1) {
      soundEngine.playBassDrum();
      triggered = true;
    } else if (kickVal === -1) {
      soundEngine.playTone(55.0, 'sine', 0.14, 0.24);
      triggered = true;
    }

    // 3. Snare (x2): Snappy mid-high crack or rimshot
    if (snareVal === 1) {
      soundEngine.playTone(392.0, 'sawtooth', 0.08, 0.12);
      soundEngine.playTone(784.0, 'triangle', 0.05, 0.09);
      triggered = true;
    } else if (snareVal === -1) {
      soundEngine.playTone(311.13, 'triangle', 0.07, 0.11);
      triggered = true;
    }

    // 4. Bass Line (y2): Warm C-scale bass synth
    if (bassVal === 1) {
      const upperBassNotes = [130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63];
      soundEngine.playTone(
        upperBassNotes[stepIdx % upperBassNotes.length],
        'triangle',
        0.18,
        0.18
      );
      triggered = true;
    } else if (bassVal === -1) {
      const lowerBassNotes = [65.41, 73.42, 82.41, 87.31, 98.0, 110.0, 123.47, 130.81];
      soundEngine.playTone(
        lowerBassNotes[stepIdx % lowerBassNotes.length],
        'sine',
        0.2,
        0.22
      );
      triggered = true;
    }

    if (triggered) {
      pulseBoostRef.current = 1.0;
    }
  }, []);

  // Trigger an 8-note C-scale Solo Pad (unlocked progressively across Res 1-8) & select its line color
  const handleTriggerSoloPad = (padNumber: number) => {
    if (padNumber > maxUnlockedNotes) {
      soundEngine.playIncorrectHit('packet');
      return;
    }
    const spec = SOLO_PAD_NOTES.find((n) => n.pad === padNumber);
    if (!spec) return;
    setActiveSoloPad(padNumber);
    pulseBoostRef.current = 1.0;
    soundEngine.playTone(spec.freq, 'triangle', 0.28, 0.22);
    soundEngine.playTone(spec.freq * 2, 'sine', 0.18, 0.09);
  };

  // Sequencer Clock Loop
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const stepMs = isWaltzTime ? 240 : 210; // Crisp rhythmic step tempo
    const timer = window.setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % activeStepLimit;

        // If we wrapped back to step 0 during Slideshow Play, advance to the next saved line!
        if (next === 0 && isSlideshowPlaying && savedLines.length > 0) {
          setSlideshowLineIdx((prevLine) => {
            const nextLine = (prevLine + 1) % savedLines.length;
            const lineObj = savedLines[nextLine];
            if (lineObj) {
              playStepAudio(0, lineObj.tracks);
              const sNote = getNoteColorSpec(lineObj.soloNoteIdx ?? 1);
              soundEngine.playTone(sNote.freq, 'triangle', 0.25, 0.18);
            }
            return nextLine;
          });
        } else {
          const activeT =
            isSlideshowPlaying && savedLines.length > 0
              ? savedLines[slideshowLineIdx % savedLines.length]?.tracks || tracks
              : tracks;
          playStepAudio(next, activeT);
        }

        return next;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [
    isOpen,
    isPlaying,
    isWaltzTime,
    activeStepLimit,
    isSlideshowPlaying,
    savedLines,
    slideshowLineIdx,
    tracks,
    playStepAudio,
  ]);

  // Draw 0 to 8 Single-Quadrant Coordinate Grid & Note-Colored Stepped Lines
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    const pxSize = 5; // Chunky retro stepped pixel block size

    // Convert (0..8, 0..8) single-quadrant grid coordinates to canvas pixel coordinates
    const toCanvasCoords = (
      gx: number,
      gy: number,
      ox: number,
      oy: number,
      stepPx: number
    ) => {
      const clampedX = Math.max(0, Math.min(8, gx));
      const clampedY = Math.max(0, Math.min(8, gy));
      return {
        px: ox + clampedX * stepPx,
        py: oy - clampedY * stepPx, // +Y is up from bottom-left origin (ox, oy)
      };
    };

    const drawSteppedColoredLine = (
      ctx: CanvasRenderingContext2D,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      noteSpec: NoteColorSpec,
      isHighlighted: boolean
    ) => {
      let gx0 = Math.round(x0 / pxSize);
      let gy0 = Math.round(y0 / pxSize);
      const gx1 = Math.round(x1 / pxSize);
      const gy1 = Math.round(y1 / pxSize);

      const dx = Math.abs(gx1 - gx0);
      const dy = Math.abs(gy1 - gy0);
      const sx = gx0 < gx1 ? 1 : -1;
      const sy = gy0 < gy1 ? 1 : -1;
      let err = dx - dy;

      const points: Array<{ x: number; y: number }> = [];
      let safety = 0;
      while (safety++ < 400) {
        points.push({ x: gx0 * pxSize, y: gy0 * pxSize });
        if (gx0 === gx1 && gy0 === gy1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          gx0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          gy0 += sy;
        }
      }

      // If Note 1 (Black #000000), draw a subtle 1px light border around each stepped block so it stands out on the dark CRT grid
      if (noteSpec.hasLightBorder) {
        ctx.fillStyle = isHighlighted ? '#a3ffb8' : '#94a3b8';
        for (const pt of points) {
          ctx.fillRect(pt.x - 1, pt.y - 1, pxSize + 1, pxSize + 1);
        }
      }

      ctx.fillStyle = noteSpec.colorHex;
      for (const pt of points) {
        ctx.fillRect(pt.x, pt.y, pxSize - 1, pxSize - 1);
      }

      // Draw Point 1 and Point 2 square endpoint markers
      const p0x = Math.round(x0 / pxSize) * pxSize;
      const p0y = Math.round(y0 / pxSize) * pxSize;
      const p1x = gx1 * pxSize;
      const p1y = gy1 * pxSize;

      ctx.fillStyle = noteSpec.hasLightBorder ? '#e2e8f0' : '#ffffff';
      ctx.fillRect(p0x - 3, p0y - 3, pxSize + 5, pxSize + 5);
      ctx.fillRect(p1x - 3, p1y - 3, pxSize + 5, pxSize + 5);

      ctx.fillStyle = noteSpec.colorHex;
      ctx.fillRect(p0x - 1, p0y - 1, pxSize + 1, pxSize + 1);
      ctx.fillRect(p1x - 1, p1y - 1, pxSize + 1, pxSize + 1);
    };

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      pulseBoostRef.current *= 0.88;

      // 1. Dark Emerald CRT Background
      ctx.fillStyle = GREEN_BG_HEX;
      ctx.fillRect(0, 0, w, h);

      // 2. Compute 0 to 8 First-Quadrant Grid Geometry
      // Fit 8 units vertically with space for top HUD and bottom X-axis labels
      const topMargin = 38;
      const bottomMargin = 26;
      const availH = h - topMargin - bottomMargin;
      const stepPx = Math.floor(availH / 8);
      const gridSpan = stepPx * 8;

      // Center the 0..8 square grid horizontally in the canvas
      const ox = Math.round((w - gridSpan) / 2);
      const oy = h - bottomMargin;

      // Draw 0 to 8 vertical and horizontal grid lines
      ctx.fillStyle = GREEN_GRID_HEX;
      for (let g = 0; g <= 8; g++) {
        const vx = ox + g * stepPx;
        const hy = oy - g * stepPx;
        // Vertical grid line at x = g (from y=0 to y=8)
        ctx.fillRect(vx, oy - gridSpan, 1, gridSpan);
        // Horizontal grid line at y = g (from x=0 to x=8)
        ctx.fillRect(ox, hy, gridSpan, 1);
      }

      // Draw X = 0 (bottom) and Y = 0 (left) primary quadrant axes
      ctx.fillStyle = GREEN_AXIS_HEX;
      ctx.fillRect(ox, oy - 1, gridSpan + 2, 2);
      ctx.fillRect(ox - 1, oy - gridSpan, 2, gridSpan + 2);

      // Draw integer axis tick numbers 0..8 on X and Y axes
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let tick = 0; tick <= 8; tick++) {
        ctx.fillText(String(tick), ox + tick * stepPx, oy + 6);
      }

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let tick = 0; tick <= 8; tick++) {
        ctx.fillText(String(tick), ox - 7, oy - tick * stepPx);
      }

      // Axis labels
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('X (0–8)', ox + gridSpan + 10, oy);
      ctx.fillText('Y (0–8)', ox - 18, oy - gridSpan - 10);

      // 3. Draw Saved Etch-a-Sketch Lines in their saved Note 1-8 Color
      const linesToRender = isSlideshowPlaying
        ? savedLines.slice(0, (slideshowLineIdx % Math.max(1, savedLines.length)) + 1)
        : savedLines;

      linesToRender.forEach((saved, idx) => {
        const p1 = toCanvasCoords(saved.x1, saved.y1, ox, oy, stepPx);
        const p2 = toCanvasCoords(saved.x2, saved.y2, ox, oy, stepPx);
        const isCurrentSlide =
          isSlideshowPlaying && idx === slideshowLineIdx % Math.max(1, savedLines.length);
        const savedSpec = getNoteColorSpec(saved.soloNoteIdx ?? 1);

        drawSteppedColoredLine(
          ctx,
          p1.px,
          p1.py,
          p2.px,
          p2.py,
          savedSpec,
          isCurrentSlide
        );
      });

      // 4. Draw Active Live Line Connecting Point 1 (Hi-Hat, Kick) -> Point 2 (Snare, Bass Line)
      if (!isSlideshowPlaying || savedLines.length === 0) {
        const p1 = toCanvasCoords(activePoints.x1, activePoints.y1, ox, oy, stepPx);
        const p2 = toCanvasCoords(activePoints.x2, activePoints.y2, ox, oy, stepPx);

        drawSteppedColoredLine(
          ctx,
          p1.px,
          p1.py,
          p2.px,
          p2.py,
          activeNoteSpec,
          pulseBoostRef.current > 0.35
        );

        // Label P1 and P2 directly next to the points on canvas
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = GREEN_ACCENT_HEX;
        ctx.fillText(`P1(${activePoints.x1},${activePoints.y1})`, p1.px + 7, p1.py - 4);
        ctx.fillText(`P2(${activePoints.x2},${activePoints.y2})`, p2.px + 7, p2.py + 12);
      }

      // 5. Subtle CRT Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    isOpen,
    savedLines,
    isSlideshowPlaying,
    slideshowLineIdx,
    activePoints,
    activeNoteSpec,
  ]);

  if (!isOpen) return null;

  // Cycle a sequencer step cell: 0 -> +1 (+) -> -1 (-) -> 0 (all 8 steps unlocked)
  const handleToggleStep = (track: TrackId, stepIdx: number) => {
    setIsSlideshowPlaying(false);
    setTracks((prev) => {
      const next = cloneTracks(prev);
      const cur = next[track][stepIdx];
      const nextVal: StepPolarity = cur === 0 ? 1 : cur === 1 ? -1 : 0;
      next[track][stepIdx] = nextVal;
      playStepAudio(stepIdx, next);
      return next;
    });
  };

  // Save current line to Etch-a-Sketch canvas with its active Note 1-8 color
  const handleNextLineSave = () => {
    const newLine: SavedEtchLine = {
      id: `${Date.now()}_${savedLines.length}`,
      x1: activePoints.x1,
      y1: activePoints.y1,
      x2: activePoints.x2,
      y2: activePoints.y2,
      tracks: cloneTracks(tracks),
      soloNoteIdx: activeSoloPad,
    };
    const updated = [...savedLines, newLine];
    persistLines(updated);
    setIsSlideshowPlaying(false);
    soundEngine.playCompileLevelUp('standard');
  };

  const handleUndoLastLine = () => {
    if (savedLines.length === 0) return;
    const updated = savedLines.slice(0, -1);
    persistLines(updated);
    setIsSlideshowPlaying(false);
    soundEngine.playHitSound('shield');
  };

  const handleClearAll = () => {
    persistLines([]);
    setIsSlideshowPlaying(false);
    setTracks(cloneTracks(DEFAULT_TRACKS));
    setActiveSoloPad(1);
    soundEngine.playHitSound('quantum');
  };

  const TRACK_ROWS: Array<{
    id: TrackId;
    label: string;
    mathTag: string;
    value: number;
    posClass: string;
    negClass: string;
  }> = [
    {
      id: 'hihat',
      label: 'Hi-Hat',
      mathTag: 'Point 1: X1 (0 to 8)',
      value: activePoints.x1,
      posClass: 'bg-emerald-950 border-emerald-400 text-emerald-300',
      negClass: 'bg-teal-950 border-teal-500 text-teal-300',
    },
    {
      id: 'kick',
      label: 'Kick',
      mathTag: 'Point 1: Y1 (0 to 8)',
      value: activePoints.y1,
      posClass: 'bg-cyan-950 border-cyan-400 text-cyan-200',
      negClass: 'bg-sky-950 border-sky-500 text-sky-300',
    },
    {
      id: 'snare',
      label: 'Snare',
      mathTag: 'Point 2: X2 (0 to 8)',
      value: activePoints.x2,
      posClass: 'bg-amber-950 border-amber-400 text-amber-200',
      negClass: 'bg-orange-950 border-orange-500 text-orange-300',
    },
    {
      id: 'bass',
      label: 'Bass Line',
      mathTag: 'Point 2: Y2 (0 to 8)',
      value: activePoints.y2,
      posClass: 'bg-purple-950 border-purple-400 text-purple-200',
      negClass: 'bg-fuchsia-950 border-fuchsia-500 text-fuchsia-300',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Creative Space Musical Math Etch-a-Sketch"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[96dvh] bg-[#080b10] border border-emerald-500/70 rounded-2xl shadow-2xl shadow-emerald-950/80 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wider uppercase">
                  CREATIVE SPACE · LINE &amp; BEAT ETCH-A-SKETCH
                </h2>
                <span className="text-[11px] text-emerald-400 font-bold tabular-nums">
                  {devUnlocked ? 'DEV UNLOCKED (RES 10)' : `RES ${maxResUnlocked}/10`} · 8/8 STEPS ·{' '}
                  {maxUnlockedNotes}/8 NOTES
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                (Hi-Hat, Kick) = Point 1 (X1, Y1) · (Snare, Bass Line) = Point 2 (X2, Y2) on a 0 to 8 Quadrant Grid
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                isPlaying ? 'bg-amber-400 text-black' : 'bg-emerald-500 text-black'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const muted = soundEngine.toggleMute();
                setIsMuted(muted);
              }}
              className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[38px]"
            >
              <X className="w-4 h-4" />
              <span>CLOSE</span>
            </button>
          </div>
        </div>

        {/* TOP WIREFRAME SPLIT: 0 TO 8 COORDINATE CANVAS (LEFT) + NEXT LINE CONTROLS (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* LEFT: 0 TO 8 COORDINATE GRID CANVAS */}
          <div className="lg:col-span-8 flex flex-col bg-black border-2 border-neutral-800 rounded-xl overflow-hidden relative min-h-[230px] sm:min-h-[260px]">
            <canvas
              ref={canvasRef}
              width={520}
              height={260}
              className="w-full h-full object-cover"
            />

            {/* Top Live Coordinate Readout: P1(x1,y1) -> P2(x2,y2) + Active Note Color */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none text-[11px]">
              <div className="bg-black/85 px-2.5 py-1 rounded border border-neutral-700 text-emerald-300 font-bold tabular-nums flex items-center gap-2">
                <span>
                  P1 ({activePoints.x1}, {activePoints.y1}) → P2 ({activePoints.x2}, {activePoints.y2})
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[10px] text-white">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block border border-white/60"
                    style={{ backgroundColor: activeNoteSpec.colorHex }}
                  />
                  Note {activeNoteSpec.pad} ({activeNoteSpec.colorName})
                </span>
              </div>

              <div className="bg-black/85 px-2.5 py-1 rounded border border-neutral-700 text-emerald-400 font-bold tabular-nums">
                {savedLines.length} {savedLines.length === 1 ? 'Line' : 'Lines'} Saved
              </div>
            </div>

            {isSlideshowPlaying && savedLines.length > 0 && (
              <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-emerald-950/90 border border-emerald-400 px-3 py-1 rounded-lg flex items-center justify-between text-xs text-emerald-200 font-bold">
                <span>
                  SLIDESHOW PLAYING: LINE {(slideshowLineIdx % savedLines.length) + 1} OF{' '}
                  {savedLines.length}
                </span>
                <span>STEP {currentStep + 1}/{activeStepLimit}</span>
              </div>
            )}
          </div>

          {/* RIGHT: NEXT LINE & SLIDESHOW CONTROLS */}
          <div className="lg:col-span-4 flex flex-col justify-between p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase">
                  ETCH-A-SKETCH LINE DECK
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-300">
                  <span
                    className="w-2.5 h-2.5 rounded-sm border border-white/60 inline-block"
                    style={{ backgroundColor: activeNoteSpec.colorHex }}
                  />
                  {activeNoteSpec.colorName}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Save your current Note {activeNoteSpec.pad} ({activeNoteSpec.colorName}) line connecting P1({activePoints.x1}, {activePoints.y1}) and P2({activePoints.x2}, {activePoints.y2}) on the 0–8 quadrant.
              </p>
            </div>

            <button
              type="button"
              onClick={handleNextLineSave}
              className="w-full py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>NEXT LINE (SAVE LINE)</span>
            </button>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={savedLines.length === 0}
                onClick={() => {
                  setSlideshowLineIdx(0);
                  setIsSlideshowPlaying((p) => !p);
                  setIsPlaying(true);
                }}
                className={`col-span-1 py-2 px-2 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 min-h-[38px] ${
                  isSlideshowPlaying
                    ? 'bg-amber-500 text-black border-amber-300 cursor-pointer'
                    : savedLines.length > 0
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border-emerald-500/50 cursor-pointer'
                    : 'bg-neutral-950 text-neutral-600 border-neutral-800 cursor-not-allowed'
                }`}
                title="Play saved lines as an animated musical slideshow"
              >
                <Film className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isSlideshowPlaying ? 'STOP' : 'SLIDESHOW'}</span>
              </button>

              <button
                type="button"
                disabled={savedLines.length === 0}
                onClick={handleUndoLastLine}
                className="py-2 px-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 text-[10px] font-bold border border-neutral-800 flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed min-h-[38px]"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>UNDO</span>
              </button>

              <button
                type="button"
                onClick={handleClearAll}
                className="py-2 px-2 rounded-lg bg-neutral-950 hover:bg-rose-950/60 text-neutral-300 hover:text-rose-300 text-[10px] font-bold border border-neutral-800 flex items-center justify-center gap-1 cursor-pointer min-h-[38px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>CLEAR</span>
              </button>
            </div>

            {/* RES 10: 3/4 WALTZ TIME TOGGLE */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>METER: {isWaltzTime ? '3/4 WALTZ (6 STEPS)' : '4/4 TIME (8 STEPS)'}</span>
              </span>
              <button
                type="button"
                disabled={!isWaltzUnlocked}
                onClick={() => setIsWaltzTime((w) => !w)}
                className={`px-2 py-1 rounded border font-bold ${
                  isWaltzUnlocked
                    ? 'bg-amber-950/70 border-amber-500/60 text-amber-300 cursor-pointer hover:bg-amber-900'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-600 cursor-not-allowed'
                }`}
              >
                {isWaltzUnlocked ? 'TOGGLE 3/4' : 'RES 10'}
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE: 4-ROW x 8-STEP SEQUENCER (All 8 Steps Unlocked Immediately) */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-black text-white uppercase tracking-wide">
              8-STEP COORDINATE SEQUENCER (ALL 8 STEPS UNLOCKED · TAP TO CYCLE: +1 / -1 / 0)
            </span>
            <span className="text-[11px] text-neutral-400">
              Coordinates Clamped 0 to 8 · Active Step:{' '}
              <strong className="text-amber-400 tabular-nums">
                {currentStep + 1}/{activeStepLimit}
              </strong>
            </span>
          </div>

          <div className="space-y-2">
            {TRACK_ROWS.map((row) => {
              const rowSteps = displayedTracks[row.id];
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-neutral-950/70 p-2 rounded-xl border border-neutral-800/90"
                >
                  {/* Row Label & Coordinate Value */}
                  <div className="sm:col-span-3 flex sm:flex-col justify-between sm:justify-center pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase">
                        {row.label}
                      </span>
                      <span className="text-xs font-black text-emerald-400 tabular-nums">
                        {row.value}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">{row.mathTag}</span>
                  </div>

                  {/* 8 Step Buttons (All 8 Unlocked) */}
                  <div className="sm:col-span-9 grid grid-cols-8 gap-1.5">
                    {rowSteps.map((val, stepIdx) => {
                      const isInMeter = stepIdx < activeStepLimit;
                      const isPlayhead = isPlaying && currentStep === stepIdx && isInMeter;

                      const cellColor =
                        !isInMeter
                          ? 'bg-neutral-950/40 border-neutral-800/50 text-neutral-600 opacity-45'
                          : val === 1
                          ? row.posClass
                          : val === -1
                          ? row.negClass
                          : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-600';

                      return (
                        <button
                          key={stepIdx}
                          type="button"
                          onClick={() => handleToggleStep(row.id, stepIdx)}
                          className={`h-11 rounded-lg border flex flex-col items-center justify-center transition-all cursor-pointer tabular-nums ${cellColor} ${
                            isPlayhead ? 'ring-2 ring-amber-400 scale-105' : ''
                          }`}
                        >
                          <span className="text-[9px] opacity-70 font-bold">{stepIdx + 1}</span>
                          <span className="text-sm font-black leading-none">
                            {val === 1 ? '+' : val === -1 ? '-' : '0'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM BOX: 8-NOTE SEQUENCER & LINE COLOR SELECTOR (UNLOCKED WITH RES 1–8) */}
        <div className="rounded-xl p-3 border-2 bg-emerald-950/20 border-emerald-500/80 transition-all space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-black text-emerald-400 uppercase tracking-wider">
              8-NOTE SEQUENCER &amp; LINE COLOR PALETTE (NOTES 1–8 UNLOCK ACROSS RES 1–8)
            </span>
            <span className="text-[11px] text-emerald-300 font-bold">
              {maxUnlockedNotes}/8 NOTES UNLOCKED · TAP NOTE TO PLAY &amp; SET LINE COLOR
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {SOLO_PAD_NOTES.map((item) => {
              const isNoteUnlocked = item.pad <= maxUnlockedNotes;
              const isActive = activeSoloPad === item.pad;

              if (!isNoteUnlocked) {
                return (
                  <button
                    key={item.pad}
                    type="button"
                    disabled
                    title={`Unlocks at Resolution ${item.pad}`}
                    className="h-14 rounded-xl border-2 border-neutral-800 bg-neutral-950/80 text-neutral-600 flex flex-col items-center justify-center gap-0.5 cursor-not-allowed opacity-60 tabular-nums"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                    <span className="text-[10px] font-black">RES {item.pad}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.pad}
                  type="button"
                  onPointerDown={() => handleTriggerSoloPad(item.pad)}
                  className={`h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                    isActive
                      ? 'ring-2 ring-white scale-105 shadow-lg'
                      : 'hover:scale-[1.02] opacity-90 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: item.colorHex,
                    color: item.textHex,
                    borderColor: isActive
                      ? '#ffffff'
                      : item.hasLightBorder
                      ? '#94a3b8'
                      : 'rgba(255,255,255,0.35)',
                  }}
                >
                  <span className="text-xs font-black leading-tight">{item.pad}</span>
                  <span className="text-[10px] font-black leading-tight">{item.note}</span>
                  <span className="text-[9px] font-bold uppercase opacity-90 leading-tight">
                    {item.colorName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
