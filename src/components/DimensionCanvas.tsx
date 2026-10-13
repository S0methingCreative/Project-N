import React, { useEffect, useRef, useState } from 'react';
import { GameState, DeathScreenState, GameMode } from '../types/game';
import { soundEngine, MusicGenre, SpeedZone } from '../audio/soundEngine';
import { Volume2, VolumeX, Shield, Play, RotateCcw, Zap, Sparkles, ArrowUp, ArrowDown, Activity, ShieldAlert, Lock, CheckCircle2, Cpu, SlidersHorizontal, Settings, X } from 'lucide-react';
import { draw6BitBackground } from '../utils/backgroundArt';
import { UserSettings, DEFAULT_USER_SETTINGS, saveUserSettings } from '../utils/settings';

export const MAX_BOSS_1_HP = 180;
export const MAX_BOSS_2_HP = 220;

export const formatTime = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const ms = Math.floor((secs % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export interface BitGraphicsUpgrade {
  bit: number;
  name: string;
  pipelineName: string;
  desc: string;
  costHz: number;
  costV: number;
}

export const BIT_GRAPHICS_UPGRADES: BitGraphicsUpgrade[] = [
  { bit: 1, name: 'Bit 1: 1-Bit Graphics (2 Colors)', pipelineName: '1_Bit_Binary_Raster', desc: 'Calibrates 1-bit binary monochrome oscilloscope ray (2 colors: 0 & 1).', costHz: 3, costV: 3 },
  { bit: 2, name: 'Bit 2: 2-Bit Graphics (4 Colors)', pipelineName: '2_Bit_Vector_Axis', desc: 'Projects 2-bit dashed vector coordinate axis (4 shades of phosphor).', costHz: 6, costV: 6 },
  { bit: 3, name: 'Bit 3: 3-Bit Graphics (8 Colors)', pipelineName: '3_Bit_Polarizer_Reticle', desc: 'Compiles visible directional polarizer reticle arrow (8 colors).', costHz: 10, costV: 10 },
  { bit: 4, name: 'Bit 4: 4-Bit Graphics (16 Colors)', pipelineName: '4_Bit_Calibrated_Bus', desc: 'Solidifies continuous coordinate bus with calibrated distance hash marks (16 colors).', costHz: 16, costV: 16 },
  { bit: 5, name: 'Bit 5: 5-Bit Graphics (32 Colors)', pipelineName: '5_Bit_Envelope_Rails', desc: 'Projects upper (+V) Crest and lower (-V) Trough amplitude guide rails (32 colors).', costHz: 24, costV: 24 },
  { bit: 6, name: 'Bit 6: 6-Bit Graphics (64 Colors)', pipelineName: '6_Bit_Telemetry_HUD', desc: 'Compiles real-time integrity gauge and signal frequency telemetry readouts (64 colors).', costHz: 36, costV: 36 },
  { bit: 7, name: 'Bit 7: 7-Bit Graphics (128 Colors)', pipelineName: '7_Bit_Phase_Grid', desc: 'Projects rhythmic vertical beat horizon ticks along oscilloscope to gauge timing (128 colors).', costHz: 50, costV: 50 },
  { bit: 8, name: 'Bit 8: 8-Bit Graphics (256 Colors)', pipelineName: '8_Bit_Phosphor_Bloom', desc: 'Enables 8-bit VGA color depth and unlocks NEUTRALizer polarizer mode (■ Neutral) to absorb incoming Packets (+40 HP, Am chord) before boss encounter (256 colors).', costHz: 68, costV: 68 },
  { bit: 9, name: 'Bit 9: 9-Bit Graphics (512 Colors)', pipelineName: '9_Bit_Trinary_Matrix', desc: '9-bit trinary pipeline. Reaches destination point in space, now besieged and blocked by the Corrupt Sovereign Boss (512 colors).', costHz: 90, costV: 90 },
  { bit: 10, name: 'Bit 10: 10-Bit Graphics (1024 Colors)', pipelineName: '10_Bit_Master_Engine', desc: '10-bit Deep Color master engine. Purges corrupted point, fully transforming void into living multidimensional universe (1024 colors).', costHz: 120, costV: 120 },
];

export interface ResolutionUpgrade {
  resolution: number;
  name: string;
  fps: string;
  desc: string;
  costBaud: number; // 1X
  costHz: number;   // 2X
  costV: number;    // 2X
}

export const RESOLUTION_UPGRADES: ResolutionUpgrade[] = [
  { resolution: 1, name: 'Res 1: Shields', fps: '15 FPS', desc: 'Overshields', costBaud: 8, costHz: 16, costV: 16 },
  { resolution: 2, name: 'Res 2: Line Move', fps: '24 FPS', desc: 'Movement', costBaud: 12, costHz: 24, costV: 24 },
  { resolution: 3, name: 'Res 3: Speed +33%', fps: '30 FPS', desc: '+33% speed', costBaud: 16, costHz: 32, costV: 32 },
  { resolution: 4, name: 'Res 4: Speed +66%', fps: '45 FPS', desc: '+66% speed', costBaud: 22, costHz: 44, costV: 44 },
  { resolution: 5, name: 'Res 5: Full Agility', fps: '60 FPS', desc: 'Max agility', costBaud: 30, costHz: 60, costV: 60 },
  { resolution: 6, name: 'Res 6: Center 2x', fps: '75 FPS', desc: 'Center 2x yield', costBaud: 40, costHz: 80, costV: 80 },
  { resolution: 7, name: 'Res 7: Slow Zone', fps: '90 FPS', desc: 'Left slow zone', costBaud: 52, costHz: 104, costV: 104 },
  { resolution: 8, name: 'Res 8: Right 4x', fps: '120 FPS', desc: 'Right 4x yield', costBaud: 68, costHz: 136, costV: 136 },
  { resolution: 9, name: 'Res 9: Sovereign', fps: '144 FPS', desc: 'Boss fight', costBaud: 88, costHz: 176, costV: 176 },
  { resolution: 10, name: 'Res 10: Transcend', fps: '240 FPS', desc: 'Mastery', costBaud: 110, costHz: 220, costV: 220 },
];

export interface RedErrorZone {
  id: number;
  startX: number;
  width: number;
  timeRemaining: number;
  maxTime: number;
  isWarning: boolean;
}

/**
 * Renders the Right-Thumb Polarizer Tap Zone message floating seamlessly in the background.
 * No borders or background box — pure subtle environmental typography that scales with Bit and Res unlocks.
 */
function drawPolarizerTapGuide(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  currentBits: number,
  time: number,
  subPart: 1 | 2,
  resolution: number
) {
  // If 0 bits purchased (acoustic void before N=1), remain pure black void!
  if (subPart === 1 && currentBits <= 0) return;

  const rightOffset = Math.min(180, Math.max(85, w * 0.16));
  const centerX = Math.round(w - rightOffset);
  const centerY = Math.round(h * 0.72);
  const text = "TAP · POLARIZE";

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (subPart === 1) {
    if (currentBits === 1) {
      ctx.fillStyle = "rgba(51, 255, 102, 0.75)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    } else if (currentBits === 2) {
      ctx.fillStyle = "rgba(85, 255, 153, 0.8)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    } else if (currentBits >= 3 && currentBits <= 4) {
      ctx.fillStyle = "rgba(85, 255, 170, 0.85)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    } else if (currentBits >= 5 && currentBits <= 7) {
      const pulseAlpha = 0.75 + Math.sin(time * 0.003) * 0.2;
      ctx.fillStyle = `rgba(0, 255, 170, ${pulseAlpha})`;
      ctx.shadowColor = "#00ffaa";
      ctx.shadowBlur = 4;
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    } else {
      ctx.fillStyle = "#55ffc2";
      ctx.shadowColor = "#00ffaa";
      ctx.shadowBlur = 7;
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    }
  } else {
    if (resolution <= 2) {
      ctx.fillStyle = "rgba(56, 225, 255, 0.8)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    } else if (resolution >= 3 && resolution <= 5) {
      const pulse = (Math.sin(time * 0.0035) + 1) * 0.5;
      ctx.fillStyle = `rgba(85, 255, 255, ${0.85 + pulse * 0.15})`;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 4 + pulse * 3;
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    } else if (resolution >= 6 && resolution <= 8) {
      ctx.fillStyle = "#66ffdd";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 6;
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    } else {
      ctx.fillStyle = "#88ffee";
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 10;
      ctx.font = "bold 9px monospace";
      ctx.fillText(text, centerX, centerY);
    }
  }

  ctx.restore();
}

/**
 * Renders the Left-Thumb Drag-to-Move message floating seamlessly in the background.
 * Unlocked and displayed ONLY in Part Two when 1D Line Mobility is compiled (resolution >= 2).
 * Does not display in Part One or Part Two when resolution < 2.
 */
function drawDragMoveGuide(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _currentBits: number,
  time: number,
  subPart: 1 | 2,
  resolution: number
) {
  // Movement left and right is strictly locked until Resolution 2 in Part Two!
  // Do not display the message until then.
  if (subPart !== 2 || resolution < 2) return;

  const leftOffset = Math.min(180, Math.max(85, w * 0.16));
  const centerX = Math.round(leftOffset);
  const centerY = Math.round(h * 0.72);
  const text = "DRAG ◄ ► MOVE";

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (resolution === 2) {
    ctx.fillStyle = "rgba(56, 225, 255, 0.8)";
    ctx.font = "bold 9px monospace";
    ctx.fillText(text, centerX, centerY);
  } else if (resolution >= 3 && resolution <= 5) {
    const pulse = (Math.sin(time * 0.0035) + 1) * 0.5;
    ctx.fillStyle = `rgba(85, 255, 255, ${0.85 + pulse * 0.15})`;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 4 + pulse * 3;
    ctx.font = "bold 9px monospace";
    ctx.fillText(text, centerX, centerY);
  } else if (resolution >= 6 && resolution <= 8) {
    ctx.fillStyle = "#66ffdd";
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 6;
    ctx.font = "bold 9px monospace";
    ctx.fillText(text, centerX, centerY);
  } else {
    ctx.fillStyle = "#88ffee";
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 10;
    ctx.font = "bold 9px monospace";
    ctx.fillText(text, centerX, centerY);
  }

  ctx.restore();
}

/**
 * Renders authentic retro PIXEL ART background graphics that scale with purchased bits (0 to 10).
 * Designed with discrete chunky pixel blocks and dither patterns.
 * Preserves a clear gameplay corridor around TRACE_Y so gameplay mechanics remain 100% visible.
 */
function drawDynamicVoidBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  currentBits: number,
  time: number,
  zone: SpeedZone,
  genre: MusicGenre,
  phase: 'void' | 'point' | 'boss' | 'ray',
  bossHp: number,
  bossMisses: number,
  playerX: number,
  TRACE_START: number,
  TRACE_END: number,
  TRACE_Y: number,
  subPart: 1 | 2 = 1,
  resolution: number = 0,
  bossTargetZone: 'attenuation' | 'harmonic' | 'emitter' = 'harmonic'
) {
  // If in Part Two: Render the Frame Rate & 2D Awakening Background
  // Dynamic Subatomic Simulation: An electron has escaped N=1 into N=2.
  // At the nuclear level, visualize a proton transforming into an electron (beta decay / quark flavor change)
  // Scaling with high movement and kinetic energy across Resolutions 1 through 10.
  if (subPart === 2) {
    // 1. Deep Interstellar Space Canvas & Orion Nebula Base Gradient
    // Deep cosmic space transitions from stellar indigo-violet (#020108) to rich cosmic nebula base
    const resBases = [
      '#020108', '#030210', '#05031a', '#070424', '#09052f',
      '#0c063b', '#0f0747', '#120854', '#150962', '#180a70', '#1c0c80'
    ];
    const baseColor = resBases[Math.min(10, resolution)] || '#05031a';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, w, h);

    // Dynamic relativistic particle motion velocity multiplier based on resolution
    const motionSpeed = 0.0012 + Math.min(10, resolution) * 0.00045;
    
    // NUCLEON CORE SPAWN LOCATION (Res >= 2):
    // Spawns in the far right of the screen exactly where the boss spawns (TRACE_END = w - 80, TRACE_Y)
    const nuclearCenterX = TRACE_END;
    const nuclearCenterY = TRACE_Y;

    // 2. Distant Twinkling Starfield in Deep Cosmic Space (Beyond Orion's Nebula)
    for (let s = 0; s < 70; s++) {
      const sx = ((s * 197.3 + 41) % w);
      const sy = ((s * 131.7 + 29) % h);
      // Strictly avoid obstructing the central gameplay line
      if (Math.abs(sy - TRACE_Y) > 22) {
        const starTwinkle = (Math.sin(time * 0.0032 + s * 1.618) + 1) * 0.5;
        const sAlpha = 0.15 + starTwinkle * 0.65 * Math.min(1, 0.35 + resolution * 0.07);
        const sColor = s % 4 === 0
          ? `rgba(180, 225, 255, ${sAlpha})` // O/B-type blue-white star
          : s % 4 === 1
          ? `rgba(255, 235, 190, ${sAlpha})` // G-type golden sun
          : s % 4 === 2
          ? `rgba(255, 160, 160, ${sAlpha})` // M-type red dwarf
          : `rgba(255, 255, 255, ${sAlpha})`; // White pinpoint
        ctx.fillStyle = sColor;
        const sSize = (s % 8 === 0 && resolution >= 4) ? 2 : 1;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), sSize, sSize);
      }
    }

    // 3. Distant Rotating Spiral Galaxies (Beyond Orion's Nebula)
    // "smaller and more see through and not on the line playing field also have them dispersed
    // throughout the screen so that if they do overlap, it is only the end of the arms."
    if (resolution >= 2) {
      interface DistantGalaxy {
        gx: number;
        gy: number;
        radius: number;
        tilt: number;
        rotSpeed: number;
        arms: number;
        color: string;
      }

      // Dispersed in upper (y < 130) and lower (y > 310) margins — never on the line playing field!
      const distantGalaxies: DistantGalaxy[] = [
        // Upper celestial field (y: 50 to 125, safely > 90px away from TRACE_Y)
        { gx: w * 0.11, gy: 56, radius: 23, tilt: -0.35, rotSpeed: 0.0006, arms: 2, color: 'rgba(130, 220, 255, ' },
        { gx: w * 0.34, gy: 112, radius: 26, tilt: 0.45, rotSpeed: -0.0007, arms: 2, color: 'rgba(235, 145, 255, ' },
        { gx: w * 0.58, gy: 52, radius: 27, tilt: -0.22, rotSpeed: 0.0005, arms: 3, color: 'rgba(110, 255, 230, ' },
        { gx: w * 0.81, gy: 108, radius: 22, tilt: 0.32, rotSpeed: -0.0006, arms: 2, color: 'rgba(255, 210, 155, ' },
        // Lower celestial field (y: 330 to 395, safely > 110px away from TRACE_Y)
        { gx: w * 0.15, gy: 335, radius: 25, tilt: 0.52, rotSpeed: -0.0008, arms: 2, color: 'rgba(145, 205, 255, ' },
        { gx: w * 0.39, gy: 382, radius: 28, tilt: -0.32, rotSpeed: 0.0007, arms: 2, color: 'rgba(255, 155, 215, ' },
        { gx: w * 0.63, gy: 332, radius: 26, tilt: 0.28, rotSpeed: -0.0005, arms: 3, color: 'rgba(95, 245, 215, ' },
        { gx: w * 0.86, gy: 378, radius: 23, tilt: -0.42, rotSpeed: 0.0006, arms: 2, color: 'rgba(245, 185, 255, ' }
      ];

      // Number of distant visible galaxies scales with resolution (2 up to all 8)
      const visibleCount = Math.min(distantGalaxies.length, 2 + Math.floor(resolution * 0.7));

      for (let gIdx = 0; gIdx < visibleCount; gIdx++) {
        const g = distantGalaxies[gIdx];
        const gRot = time * g.rotSpeed;
        const gAlpha = Math.min(0.18, 0.06 + resolution * 0.012);

        ctx.save();
        ctx.translate(g.gx, g.gy);
        ctx.rotate(g.tilt);

        // Microscopic luminous galactic nucleus
        const nGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
        nGrad.addColorStop(0, `${g.color}${gAlpha * 2.5})`);
        nGrad.addColorStop(0.5, `${g.color}${gAlpha * 1.2})`);
        nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Delicate, see-through logarithmic spiral arms
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = `${g.color}${gAlpha})`;

        for (let arm = 0; arm < g.arms; arm++) {
          const armOffset = (arm * Math.PI * 2) / g.arms;
          ctx.beginPath();
          const steps = 30;
          for (let step = 0; step < steps; step++) {
            const fraction = step / steps;
            const r = 3 + fraction * (g.radius - 3);
            const theta = gRot + armOffset + fraction * 3.6;
            // Elliptical perspective compression for realistic cosmic tilt
            const px = Math.cos(theta) * r;
            const py = Math.sin(theta) * (r * 0.58);
            if (step === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);

            // Occasional stardust pinprick along the spiral arms
            if (step % 9 === 0 && step > 0 && resolution >= 4) {
              ctx.fillStyle = `${g.color}${gAlpha * 1.8})`;
              ctx.fillRect(px - 0.5, py - 0.5, 1, 1);
            }
          }
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // 4. INSIDE THE ORION NEBULA (MESSIER 42) — 10" TELESCOPE IMMERSIVE GASEOUS FIELD
    // Immersive perspective: We are inside the luminous cosmic gas clouds!
    // Accentuated colors based on a 10" telescope view:
    // - Phosphorescent [O III] spectral turquoise, electric cyan & seafoam jade mist
    // - Hydrogen-Alpha & Beta glowing orchid-magenta, vivid rose, coral & interstellar lavender
    // - Volumetric billows, undulating gossamer filaments & suspended ionization motes
    const nebAlpha = Math.min(1.0, Math.max(0.18, resolution / 10));

    // A. Volumetric Phosphorescent [O III] Doubly-Ionized Oxygen Mist (Cyan, Turquoise, Seafoam Jade)
    // Breathing displacement for organic living gaseous movement
    const o3BreathX = Math.sin(time * 0.0007) * 22;
    const o3BreathY = Math.cos(time * 0.0009) * 16;

    // Primary [O III] Central Immersion Cloud (Spectral turquoise & emerald jade luminescence)
    const o3MainX = w * 0.42 + o3BreathX;
    const o3MainY = h * 0.38 + o3BreathY;
    const gradO3Main = ctx.createRadialGradient(
      o3MainX, o3MainY, 12,
      o3MainX, o3MainY, 290
    );
    gradO3Main.addColorStop(0, `rgba(0, 255, 215, ${0.36 * nebAlpha})`);    // Peak [O III] seafoam teal
    gradO3Main.addColorStop(0.26, `rgba(20, 235, 255, ${0.28 * nebAlpha})`);  // Electric cyan
    gradO3Main.addColorStop(0.52, `rgba(45, 215, 185, ${0.16 * nebAlpha})`);  // Phosphorescent jade
    gradO3Main.addColorStop(0.80, `rgba(10, 155, 185, ${0.06 * nebAlpha})`);  // Outer aquamarine veil
    gradO3Main.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradO3Main;
    ctx.beginPath();
    ctx.arc(o3MainX, o3MainY, 290, 0, Math.PI * 2);
    ctx.fill();

    // Secondary [O III] Flowing Chamber (Mid-Right gaseous pocket)
    const o3SecondX = w * 0.66 - o3BreathX * 0.7;
    const o3SecondY = h * 0.28 - o3BreathY * 0.8;
    const gradO3Second = ctx.createRadialGradient(
      o3SecondX, o3SecondY, 10,
      o3SecondX, o3SecondY, 230
    );
    gradO3Second.addColorStop(0, `rgba(35, 245, 225, ${0.26 * nebAlpha})`);
    gradO3Second.addColorStop(0.38, `rgba(0, 215, 245, ${0.18 * nebAlpha})`);
    gradO3Second.addColorStop(0.74, `rgba(15, 165, 205, ${0.07 * nebAlpha})`);
    gradO3Second.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradO3Second;
    ctx.beginPath();
    ctx.arc(o3SecondX, o3SecondY, 230, 0, Math.PI * 2);
    ctx.fill();

    // B. Hydrogen-Alpha (Hα) & Beta Luminous Clouds (Orchid-Magenta, Rose, Coral & Interstellar Lavender)
    // Vast billowing sheets of ionized hydrogen surrounding the observer
    const hAlphaWave = Math.sin(time * 0.0006) * 18;

    // Left Giant Wing Lobe (Deep vivid rose-magenta & lavender)
    const hAlpha1X = w * 0.25 + hAlphaWave;
    const hAlpha1Y = h * 0.32 - hAlphaWave * 0.6;
    const gradHAlpha1 = ctx.createRadialGradient(
      hAlpha1X, hAlpha1Y, 15,
      hAlpha1X, hAlpha1Y, 310
    );
    gradHAlpha1.addColorStop(0, `rgba(255, 60, 165, ${0.32 * nebAlpha})`);    // Luminous orchid magenta
    gradHAlpha1.addColorStop(0.32, `rgba(235, 30, 135, ${0.24 * nebAlpha})`);  // Vivid rose crimson
    gradHAlpha1.addColorStop(0.62, `rgba(180, 40, 210, ${0.15 * nebAlpha})`);  // Interstellar lavender
    gradHAlpha1.addColorStop(0.86, `rgba(115, 20, 180, ${0.07 * nebAlpha})`);  // Amethyst edge
    gradHAlpha1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradHAlpha1;
    ctx.beginPath();
    ctx.arc(hAlpha1X, hAlpha1Y, 310, 0, Math.PI * 2);
    ctx.fill();

    // Lower Billowing Gas Canopy (Below coordinate line, enveloping the bottom viewport)
    const hAlpha2X = w * 0.46 - hAlphaWave;
    const hAlpha2Y = h * 0.75 + hAlphaWave * 0.5;
    const gradHAlpha2 = ctx.createRadialGradient(
      hAlpha2X, hAlpha2Y, 15,
      hAlpha2X, hAlpha2Y, 290
    );
    gradHAlpha2.addColorStop(0, `rgba(245, 50, 150, ${0.28 * nebAlpha})`);
    gradHAlpha2.addColorStop(0.36, `rgba(200, 35, 190, ${0.20 * nebAlpha})`);
    gradHAlpha2.addColorStop(0.70, `rgba(135, 25, 200, ${0.11 * nebAlpha})`);
    gradHAlpha2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradHAlpha2;
    ctx.beginPath();
    ctx.arc(hAlpha2X, hAlpha2Y, 290, 0, Math.PI * 2);
    ctx.fill();

    // Upper Sweeping Veil (Above coordinate line, stretching across upper heavens)
    const hAlpha3X = w * 0.52 + hAlphaWave * 0.8;
    const hAlpha3Y = h * 0.17;
    const gradHAlpha3 = ctx.createRadialGradient(
      hAlpha3X, hAlpha3Y, 12,
      hAlpha3X, hAlpha3Y, 250
    );
    gradHAlpha3.addColorStop(0, `rgba(225, 45, 180, ${0.24 * nebAlpha})`);
    gradHAlpha3.addColorStop(0.42, `rgba(165, 35, 215, ${0.15 * nebAlpha})`);
    gradHAlpha3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradHAlpha3;
    ctx.beginPath();
    ctx.arc(hAlpha3X, hAlpha3Y, 250, 0, Math.PI * 2);
    ctx.fill();

    // C. Undulating Gossamer Filaments & Gaseous Ribbons (Organic Ionization Shockfronts)
    // Flowing gaseous currents that undulate through 3D space as if floating inside the cloud
    if (resolution >= 2) {
      ctx.save();
      const numFilaments = Math.min(6, 2 + Math.floor(resolution * 0.45));
      for (let f = 0; f < numFilaments; f++) {
        const fTime = time * 0.0008 + f * 1.35;
        const fBaseY = (f % 2 === 0) ? (h * 0.20 + f * 22) : (h * 0.74 - f * 20);
        // Ensure filaments don't directly crowd the center line
        if (Math.abs(fBaseY - TRACE_Y) < 32) continue;

        const fAlpha = (0.05 + Math.sin(fTime) * 0.02 + resolution * 0.008) * nebAlpha;
        const fColor = f % 3 === 0
          ? `rgba(0, 255, 215, ${fAlpha})`   // Phosphorescent [O III] cyan
          : f % 3 === 1
          ? `rgba(255, 75, 175, ${fAlpha})`  // H-alpha orchid rose
          : `rgba(185, 60, 255, ${fAlpha})`; // Interstellar lavender

        ctx.strokeStyle = fColor;
        ctx.lineWidth = 16 + f * 6;
        ctx.beginPath();
        const startX = -40;
        const cp1x = w * 0.28;
        const cp1y = fBaseY + Math.sin(fTime * 1.2) * 35;
        const cp2x = w * 0.68;
        const cp2y = fBaseY + Math.cos(fTime * 0.9) * 40;
        const endX = w + 40;
        const endY = fBaseY + Math.sin(fTime * 1.4) * 25;

        ctx.moveTo(startX, fBaseY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // D. Drifting Nebular Stardust Motes & Suspended Ion Bubbles
    // Ambient particles suspended inside the gas cloud drifting slowly across our field of view
    if (resolution >= 2) {
      const moteCount = 20 + resolution * 4;
      for (let m = 0; m < moteCount; m++) {
        const mSpeed = 0.0003 + (m % 4) * 0.00015;
        const mProgress = (time * mSpeed + m * 0.089) % 1;
        // Floating drift in 3D cloud
        const mx = (w * 0.08 + mProgress * (w * 0.88) + (m % 5) * 37) % w;
        const my = ((m * 31.7 + Math.sin(time * 0.001 + m) * 18) % h);

        if (Math.abs(my - TRACE_Y) > 20) {
          const mPulse = (Math.sin(time * 0.004 + m * 2.1) + 1) * 0.5;
          const mAlpha = (0.16 + mPulse * 0.5) * nebAlpha;
          const mColor = m % 4 === 0
            ? `rgba(0, 255, 220, ${mAlpha})`  // [O III] cyan mote
            : m % 4 === 1
            ? `rgba(255, 110, 190, ${mAlpha})` // H-alpha rose mote
            : m % 4 === 2
            ? `rgba(200, 120, 255, ${mAlpha})` // Violet ion mote
            : `rgba(255, 240, 180, ${mAlpha})`;// Golden starlight mote
          ctx.fillStyle = mColor;
          const mSize = (m % 6 === 0 && resolution >= 5) ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.arc(mx, my, mSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Emerging Quantum Subatomic Particle Streams (Streaming leftward from far-right core)
    if (resolution >= 1) {
      const particleCount = 18 + resolution * 5;
      for (let p = 0; p < particleCount; p++) {
        // Particles burst outward from nucleon core on far right across the screen to the left
        const pSpeed = (0.0006 + (p % 5) * 0.0003) * (1 + resolution * 0.1);
        const pProgress = ((time * pSpeed + p * 0.073) % 1);
        const pAngle = (p * 2.399) + time * 0.0004;
        const pDist = 25 + pProgress * (w * 0.85);
        // Drifts leftward across the playing field
        const px = (nuclearCenterX - Math.cos(pAngle) * pDist + w * 2) % w;
        const py = (nuclearCenterY + Math.sin(pAngle) * (pDist * 0.32) + h) % h;

        // Skip direct corridor obstruction
        if (Math.abs(py - TRACE_Y) > 22) {
          const pSize = (p % 3 === 0) ? 3 : 2;
          const pColor = p % 3 === 0
            ? 'rgba(0, 255, 230, 0.65)'  // Electron beta radiation (Cyan)
            : p % 3 === 1
            ? 'rgba(255, 90, 200, 0.55)'  // Antineutrino / W-boson trail (Electric Magenta)
            : 'rgba(255, 220, 70, 0.6)';  // Proton quark core (Nuclear Gold)
          ctx.fillStyle = pColor;
          ctx.fillRect(Math.floor(px / 2) * 2, Math.floor(py / 2) * 2, pSize, pSize);
        }
      }
    }

    // 6. THE NUCLEON CORE (Res >= 2): Spawns in far right of screen where boss spawns!
    // Proton decaying into an escaping electron (beta decay / quark flavor transition)
    if (resolution >= 2) {
      const corePulse = (Math.sin(time * 0.006) + 1) * 0.5;
      const coreRadius = 20 + corePulse * 7 + Math.min(12, resolution * 1.2);
      
      // Radiant nuclear glow
      const grad = ctx.createRadialGradient(
        nuclearCenterX, nuclearCenterY, 3,
        nuclearCenterX, nuclearCenterY, coreRadius * 2.2
      );
      grad.addColorStop(0, `rgba(255, 230, 100, ${0.45 + corePulse * 0.2})`);
      grad.addColorStop(0.35, `rgba(255, 70, 180, ${0.28 + corePulse * 0.15})`);
      grad.addColorStop(0.7, `rgba(0, 220, 255, ${0.16 + corePulse * 0.1})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(nuclearCenterX, nuclearCenterY, coreRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Quark Triplets within the decaying proton
      const quarkRot = time * 0.0035;
      for (let q = 0; q < 3; q++) {
        const qAngle = quarkRot + (q * Math.PI * 2) / 3;
        const qDist = 11 + Math.sin(time * 0.008 + q) * 3;
        const qx = nuclearCenterX + Math.cos(qAngle) * qDist;
        const qy = nuclearCenterY + Math.sin(qAngle) * qDist;

        ctx.fillStyle = q === 0 ? '#ffea66' : q === 1 ? '#ff5599' : '#55ffff';
        ctx.beginPath();
        ctx.arc(qx, qy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Strong force gluon bonds linking the quarks
        const nextQAngle = quarkRot + ((q + 1) * Math.PI * 2) / 3;
        const nextQx = nuclearCenterX + Math.cos(nextQAngle) * qDist;
        const nextQy = nuclearCenterY + Math.sin(nextQAngle) * qDist;
        ctx.strokeStyle = 'rgba(255, 230, 120, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(nextQx, nextQy);
        ctx.stroke();
      }

      // Escaping Electron Orbit Spiral (Small & contained right around the core)
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const spiralLoops = 2.5;
      for (let a = 0; a < Math.PI * 2 * spiralLoops; a += 0.18) {
        const sDist = 14 + (a / (Math.PI * 2)) * 18;
        const sx = nuclearCenterX + Math.cos(a + time * 0.004) * sDist;
        const sy = nuclearCenterY + Math.sin(a + time * 0.004) * (sDist * 0.65);
        if (a === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // 7. Scanline Refresh Bands (Scales with Frame Rate from 15 FPS to 240 FPS)
    const scanInterval = Math.max(3, 14 - resolution);
    const scanAlpha = Math.max(0.03, 0.14 - resolution * 0.01);
    ctx.fillStyle = `rgba(0, 245, 255, ${scanAlpha})`;
    for (let sy = 0; sy < h; sy += scanInterval) {
      if (Math.abs(sy - TRACE_Y) > 28) {
        ctx.fillRect(0, sy, w, 1);
      }
    }

    // 8. Sector Indicators along the Line (Resolution 6+) — HIGH-CONTRAST & HIGH-VISIBILITY
    // Designed with dark-tinted filter viewports, glowing boundary fences, and prominent high-contrast badges
    const sectorY = 85;
    const sectorH = h - 170;

    // Harmonic Slit: Center 240 to 430
    if (resolution >= 6) {
      const isPlayerHere = playerX >= 240 && playerX < 430;
      // High-contrast translucent dark backdrop + emerald tint
      ctx.fillStyle = isPlayerHere ? 'rgba(0, 35, 18, 0.65)' : 'rgba(0, 15, 8, 0.45)';
      ctx.fillRect(240, sectorY, 190, sectorH);
      ctx.fillStyle = isPlayerHere ? 'rgba(0, 255, 136, 0.20)' : 'rgba(0, 255, 136, 0.12)';
      ctx.fillRect(240, sectorY, 190, sectorH);

      // Glowing Neon Boundaries
      ctx.strokeStyle = isPlayerHere ? '#00ffaa' : 'rgba(0, 255, 136, 0.65)';
      ctx.lineWidth = isPlayerHere ? 2.5 : 1.5;
      ctx.strokeRect(240, sectorY, 190, sectorH);

      // Header Pill Badge with Dark Backdrop Plate
      const badgeW = 160;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.fillRect(248, sectorY + 8, badgeW, 20);
      ctx.strokeStyle = isPlayerHere ? '#00ffaa' : 'rgba(0, 255, 136, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(248, sectorY + 8, badgeW, 20);

      ctx.fillStyle = isPlayerHere ? '#55ffbb' : '#00ffaa';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isPlayerHere ? '⚡ HARMONIC SLIT [2X ACTIVE]' : '⚡ HARMONIC SLIT [2X YIELD]', 254, sectorY + 22);
    }

    // Attenuation Zone: Left 80 to 240
    if (resolution >= 7) {
      const isPlayerHere = playerX >= 80 && playerX < 240;
      // High-contrast translucent dark backdrop + cobalt tint
      ctx.fillStyle = isPlayerHere ? 'rgba(0, 25, 45, 0.65)' : 'rgba(0, 10, 25, 0.45)';
      ctx.fillRect(80, sectorY, 160, sectorH);
      ctx.fillStyle = isPlayerHere ? 'rgba(0, 170, 255, 0.20)' : 'rgba(0, 170, 255, 0.12)';
      ctx.fillRect(80, sectorY, 160, sectorH);

      // Glowing Neon Boundaries
      ctx.strokeStyle = isPlayerHere ? '#33ccff' : 'rgba(0, 170, 255, 0.65)';
      ctx.lineWidth = isPlayerHere ? 2.5 : 1.5;
      ctx.strokeRect(80, sectorY, 160, sectorH);

      // Header Pill Badge with Dark Backdrop Plate
      const badgeW = 148;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.fillRect(88, sectorY + 8, badgeW, 20);
      ctx.strokeStyle = isPlayerHere ? '#33ccff' : 'rgba(0, 170, 255, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(88, sectorY + 8, badgeW, 20);

      ctx.fillStyle = isPlayerHere ? '#66ddff' : '#00ccff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isPlayerHere ? '🛡️ ATTENUATION [SLOW ACTIVE]' : '🛡️ ATTENUATION ZONE [1X]', 94, sectorY + 22);
    }

    // Emitter Maw: Right 430 to 620
    if (resolution >= 8) {
      const isPlayerHere = playerX >= 430 && playerX < 620;
      // High-contrast translucent dark backdrop + solar amber tint
      ctx.fillStyle = isPlayerHere ? 'rgba(45, 20, 0, 0.65)' : 'rgba(25, 10, 0, 0.45)';
      ctx.fillRect(430, sectorY, 190, sectorH);
      ctx.fillStyle = isPlayerHere ? 'rgba(255, 136, 0, 0.22)' : 'rgba(255, 136, 0, 0.14)';
      ctx.fillRect(430, sectorY, 190, sectorH);

      // Glowing Neon Boundaries
      ctx.strokeStyle = isPlayerHere ? '#ffaa33' : 'rgba(255, 136, 0, 0.65)';
      ctx.lineWidth = isPlayerHere ? 2.5 : 1.5;
      ctx.strokeRect(430, sectorY, 190, sectorH);

      // Header Pill Badge with Dark Backdrop Plate
      const badgeW = 160;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.fillRect(438, sectorY + 8, badgeW, 20);
      ctx.strokeStyle = isPlayerHere ? '#ffaa33' : 'rgba(255, 136, 0, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(438, sectorY + 8, badgeW, 20);

      ctx.fillStyle = isPlayerHere ? '#ffcc55' : '#ff9922';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isPlayerHere ? '🔥 EMITTER MAW [4X ACTIVE]' : '🔥 EMITTER MAW [FAST / 4X]', 444, sectorY + 22);
    }

    // 9. Resolution 9 Boss: Dimensional Vortex & Target Sector Spotlight
    if (resolution >= 9) {
      let targetX = 240;
      let targetW = 190;
      let isPlayerInTarget = playerX >= 240 && playerX < 430;
      if (bossTargetZone === 'attenuation') {
        targetX = 80;
        targetW = 160;
        isPlayerInTarget = playerX >= 80 && playerX < 240;
      } else if (bossTargetZone === 'emitter') {
        targetX = 430;
        targetW = 190;
        isPlayerInTarget = playerX >= 430 && playerX < 620;
      }

      // Vertical focus beam with high-contrast golden pulsating energy
      const beamPulse = (Math.sin(time * 0.008) + 1) * 0.5;
      ctx.fillStyle = `rgba(255, 230, 80, ${0.16 + beamPulse * 0.16})`;
      ctx.fillRect(targetX, 40, targetW, h - 80);
      ctx.strokeStyle = isPlayerInTarget ? '#ffffff' : '#ffe655';
      ctx.lineWidth = isPlayerInTarget ? 3 : 2;
      ctx.strokeRect(targetX, 40, targetW, h - 80);

      // Floating High-Contrast Banner with Dark Backing Plate
      const bannerW = targetW - 16;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
      ctx.fillRect(targetX + 8, 46, bannerW, 28);
      ctx.strokeStyle = isPlayerInTarget ? '#55ff99' : '#ffe655';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(targetX + 8, 46, bannerW, 28);

      ctx.fillStyle = isPlayerInTarget ? '#55ff99' : '#ffea66';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isPlayerInTarget) {
        ctx.fillText('VULNERABLE — STRIKE!', targetX + targetW / 2, 60);
      } else {
        ctx.fillText('VULNERABILITY ZONE', targetX + targetW / 2, 60);
      }
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    // 10. Resolution 10: Master Transcendence Complete — Full Orion Nebula Climax
    if (resolution >= 10) {
      // Supercharged synchrotron arcs sweeping across the cosmic nebula
      for (let arc = 0; arc < 4; arc++) {
        const arcPhase = time * 0.0035 + (arc * Math.PI) / 2;
        const arcY = TRACE_Y + Math.sin(arcPhase) * (h * 0.35);
        ctx.strokeStyle = arc % 2 === 0 ? 'rgba(0, 255, 230, 0.32)' : 'rgba(255, 100, 220, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, arcY);
        ctx.bezierCurveTo(w * 0.33, arcY - 45, w * 0.66, arcY + 45, w, arcY);
        ctx.stroke();
      }
    }

    // Environmental Navigation & Polarizer Guides: Blended directly into Part Two Subatomic & Orion Nebula field
    if (resolution >= 2) {
      drawDragMoveGuide(ctx, w, h, currentBits, time, 2, resolution);
    }
    drawPolarizerTapGuide(ctx, w, h, currentBits, time, 2, resolution);
    return;
  }

  // If 0 bits purchased (or before N): pure black screen! Total acoustic void.
  if (currentBits <= 0) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // Base pixel void background fill
  const voidBases: Record<number, string> = {
    1: '#000402',
    2: '#000703',
    3: '#000b05',
    4: '#000e07',
    5: '#01120a',
    6: '#01160d',
    7: '#021a11',
    8: '#022015',
    9: '#051216', // Diminished tainted palette
    10: '#031422', // Deep celestial navy for full transcendence
  };
  ctx.fillStyle = voidBases[Math.min(10, currentBits)] || '#01120a';
  ctx.fillRect(0, 0, w, h);

  const horizonY = 276; // Below oscilloscope corridor (TRACE_Y = 220)
  const pxSize = 4;     // Standard 4px pixel block unit

  // -------------------------------------------------------------
  // BIT 1+: 1-BIT MONOCHROME PIXEL HORIZON & SEED COORDINATES
  // -------------------------------------------------------------
  if (currentBits >= 1) {
    ctx.fillStyle = 'rgba(24, 89, 38, 0.45)';
    // Chunky pixel dashed datum line across the horizon
    for (let x = 0; x < w; x += 12) {
      ctx.fillRect(x, horizonY, 8, 2);
    }

    // 4 stationary 2x2 monochrome pixel coordinate points in upper sky
    ctx.fillStyle = 'rgba(51, 255, 102, 0.7)';
    const seedPoints = [
      { x: Math.floor((w * 0.16) / 4) * 4, y: 48 },
      { x: Math.floor((w * 0.36) / 4) * 4, y: 72 },
      { x: Math.floor((w * 0.68) / 4) * 4, y: 40 },
      { x: Math.floor((w * 0.86) / 4) * 4, y: 64 },
    ];
    seedPoints.forEach(pt => ctx.fillRect(pt.x, pt.y, 3, 3));
  }

  // -------------------------------------------------------------
  // BIT 2+: 2-BIT 4-SHADE STEPPED PERSPECTIVE FLOOR & PIXEL STARS
  // -------------------------------------------------------------
  if (currentBits >= 2) {
    ctx.fillStyle = 'rgba(28, 85, 40, 0.26)';
    // Horizontal stepped floor raster bands
    for (let fy = horizonY + 8; fy < h; fy += 12) {
      const stepH = fy > horizonY + 60 ? 3 : 2;
      ctx.fillRect(0, fy, w, stepH);
    }

    // 8 subtle twinkling 2x2 pixel stars in upper sky
    for (let s = 0; s < 8; s++) {
      const sx = Math.floor(((s * 116 + 24) % w) / 4) * 4;
      const sy = Math.floor(((s * 41 + 16) % 130) / 4) * 4;
      const blink = (Math.sin(time * 0.003 + s * 1.5) + 1) * 0.5;
      if (blink > 0.35) {
        ctx.fillStyle = 'rgba(85, 255, 153, 0.55)';
        ctx.fillRect(sx, sy, 2, 2);
      }
    }
  }

  // -------------------------------------------------------------
  // BIT 3+: 3-BIT PIXEL CONSTELLATION NODES (8 COLORS)
  // -------------------------------------------------------------
  if (currentBits >= 3) {
    const cNodes = [
      { x: Math.floor((w * 0.14) / 4) * 4, y: 56 },
      { x: Math.floor((w * 0.28) / 4) * 4, y: 36 },
      { x: Math.floor((w * 0.44) / 4) * 4, y: 68 },
      { x: Math.floor((w * 0.60) / 4) * 4, y: 44 },
      { x: Math.floor((w * 0.76) / 4) * 4, y: 80 },
      { x: Math.floor((w * 0.90) / 4) * 4, y: 48 },
    ];

    // Stepped pixel connectors between constellation nodes
    ctx.fillStyle = 'rgba(51, 204, 153, 0.22)';
    for (let n = 0; n < cNodes.length - 1; n++) {
      const n1 = cNodes[n];
      const n2 = cNodes[n + 1];
      const steps = Math.max(Math.abs(n2.x - n1.x), Math.abs(n2.y - n1.y)) / 4;
      for (let st = 0; st <= steps; st++) {
        const px = Math.floor((n1.x + (n2.x - n1.x) * (st / steps)) / 4) * 4;
        const py = Math.floor((n1.y + (n2.y - n1.y) * (st / steps)) / 4) * 4;
        ctx.fillRect(px, py, 2, 2);
      }
    }

    // 4x4 Pixel diamond crosses for nodes
    ctx.fillStyle = 'rgba(85, 255, 170, 0.7)';
    cNodes.forEach(node => {
      ctx.fillRect(node.x - 2, node.y - 4, 4, 8);
      ctx.fillRect(node.x - 4, node.y - 2, 8, 4);
    });
  }

  // -------------------------------------------------------------
  // BIT 4+: 4-BIT CHUNKY STEPPED PIXEL MOUNTAINS (16 COLORS)
  // -------------------------------------------------------------
  if (currentBits >= 4) {
    // Stepped pixel mountain silhouette along horizon (y = 140 to 170, safely above TRACE_Y 220)
    ctx.fillStyle = 'rgba(25, 95, 45, 0.32)';
    for (let mx = 0; mx < w; mx += 8) {
      const peakHeight = Math.floor((Math.sin(mx * 0.015) * 16 + Math.cos(mx * 0.03) * 10) / 4) * 4;
      const colHeight = Math.max(4, 24 + peakHeight);
      ctx.fillRect(mx, 168 - colHeight, 8, colHeight);
    }

    // 16 Parallax drifting 2x2 pixel dust motes
    ctx.fillStyle = 'rgba(102, 255, 178, 0.45)';
    for (let p = 0; p < 16; p++) {
      const px = Math.floor(((p * 88 + time * 0.02) % w) / 4) * 4;
      const py = Math.floor(((p * 37 + 12) % 135) / 4) * 4;
      ctx.fillRect(px, py, 2, 2);
    }
  }

  // -------------------------------------------------------------
  // BIT 5+: 5-BIT DITHERED PIXEL NEBULA & RISING MOTES (32 COLORS)
  // -------------------------------------------------------------
  if (currentBits >= 5) {
    // Checkerboard dithered pixel nebula cluster in upper sky
    ctx.fillStyle = 'rgba(15, 65, 40, 0.26)';
    const nebWidth = Math.floor((w * 0.6) / 8) * 8;
    const nebStart = Math.floor((w * 0.2) / 8) * 8;
    for (let nx = nebStart; nx < nebStart + nebWidth; nx += 8) {
      for (let ny = 20; ny < 120; ny += 8) {
        if ((nx / 8 + ny / 8) % 2 === 0) {
          ctx.fillRect(nx, ny, 4, 4);
        }
      }
    }

    // 14 Floating 3x3 pixel data packets drifting upward
    ctx.fillStyle = 'rgba(102, 230, 180, 0.45)';
    for (let m = 0; m < 14; m++) {
      const mx = Math.floor(((m * 68 + Math.sin(time * 0.001 + m) * 16) % w) / 4) * 4;
      const my = Math.floor(((h - ((time * 0.03 + m * 32) % h))) / 4) * 4;
      if (my < 160 || my > 280) { // Keep gameplay corridor clear!
        ctx.fillRect(mx, my, 3, 3);
      }
    }
  }

  // -------------------------------------------------------------
  // BIT 6+: 6-BIT DUAL PIXEL PERSPECTIVE GRID & PIXEL SUNRISE (64 COLORS)
  // -------------------------------------------------------------
  if (currentBits >= 6) {
    // Pixelated ceiling raster bars
    ctx.fillStyle = 'rgba(25, 90, 50, 0.18)';
    for (let cy = 8; cy < 110; cy += 16) {
      ctx.fillRect(0, cy, w, 2);
    }

    // 8-Bit Pixel Sunrise Disk at horizon center
    const cx = Math.floor((w / 2) / 4) * 4;
    const cy = 164;
    const sunR = 24;
    ctx.fillStyle = 'rgba(45, 170, 85, 0.22)';
    for (let dy = -sunR; dy <= sunR; dy += 4) {
      const span = Math.floor(Math.sqrt(Math.max(0, sunR * sunR - dy * dy)) / 4) * 4;
      if (span > 0 && Math.abs(dy) % 8 !== 0) { // Scanline slit effect
        ctx.fillRect(cx - span, cy + dy, span * 2, 3);
      }
    }
  }

  // -------------------------------------------------------------
  // BIT 7+: 7-BIT STEPPED PIXEL AURORA BANDS (128 COLORS)
  // -------------------------------------------------------------
  if (currentBits >= 7) {
    // Stepped pixel columns of aurora ribbons in cyan, violet, and emerald
    for (let ax = 0; ax < w; ax += 8) {
      const step1 = Math.floor((Math.sin(ax * 0.012 + time * 0.0018) * 20 + 24) / 4) * 4;
      const step2 = Math.floor((Math.sin(ax * 0.018 + time * 0.0024 + 1.2) * 16 + 18) / 4) * 4;

      ctx.fillStyle = 'rgba(51, 230, 170, 0.12)';
      ctx.fillRect(ax, 72 - step1, 6, step1);

      ctx.fillStyle = 'rgba(150, 90, 240, 0.09)';
      ctx.fillRect(ax, 96 - step2, 6, step2);
    }
  }

  // -------------------------------------------------------------
  // BIT 8+: 8-BIT FULL VGA PIXEL CYBER-EXPANSE (256 COLORS)
  // -------------------------------------------------------------
  if (currentBits >= 8) {
    // Layered pixel hills in the background
    ctx.fillStyle = 'rgba(50, 180, 95, 0.22)';
    for (let hx = 0; hx < w; hx += 8) {
      const hillH = Math.floor((Math.sin(hx * 0.008 + 1) * 20 + 22) / 4) * 4;
      ctx.fillRect(hx, 168 - hillH, 8, hillH);
    }

    // Sparkling 3x3 pixel star crosses
    for (let cs = 0; cs < 24; cs++) {
      const sx = Math.floor(((cs * 77 + 19) % w) / 4) * 4;
      const sy = Math.floor(((cs * 43 + 11) % 120) / 4) * 4;
      const blink = (Math.sin(time * 0.004 + cs * 1.8) + 1) * 0.5;
      ctx.fillStyle = cs % 2 === 0 ? `rgba(102, 230, 255, ${0.4 + blink * 0.5})` : `rgba(160, 255, 180, ${0.3 + blink * 0.6})`;
      ctx.fillRect(sx, sy - 2, 2, 6);
      ctx.fillRect(sx - 2, sy, 6, 2);
    }
  }

  // -------------------------------------------------------------
  // BIT 9: THE PRECIPICE — DIMINISHED PIXEL WORLD & CORRUPTED POINT
  // "at 9 bits our hero has almost moved to another point but meets the corrupted point
  // which preventing our hero from occupying another point in space...
  // 9 Bits should show a diminished version by a scale that makes sense."
  // -------------------------------------------------------------
  if (currentBits === 9) {
    // Diminished pixel darkness veil
    ctx.fillStyle = 'rgba(16, 4, 14, 0.44)';
    ctx.fillRect(0, 0, w, h);

    const destX = Math.floor(TRACE_END / 4) * 4;
    const destY = TRACE_Y;

    // 1. Pixel Destination Beacon (8-bit concentric squares trying to manifest)
    ctx.fillStyle = 'rgba(255, 230, 100, 0.75)';
    ctx.fillRect(destX - 6, destY - 6, 12, 12);
    ctx.fillStyle = 'rgba(80, 220, 255, 0.45)';
    ctx.fillRect(destX - 14, destY - 14, 28, 28);
    ctx.clearRect(destX - 10, destY - 10, 20, 20);

    // 2. CORRUPTED POINT BESIEGING DESTINATION (Chunky pixel thorns & glitch blocks)
    const corruptPulse = Math.floor((Math.sin(time * 0.012) * 6 + 28) / 4) * 4;
    ctx.strokeStyle = '#ff1155';
    ctx.lineWidth = 2;
    ctx.strokeRect(destX - corruptPulse, destY - corruptPulse, corruptPulse * 2, corruptPulse * 2);

    // Stepped pixel spikes radiating from corrupted point
    ctx.fillStyle = '#ff2266';
    const spikeOffsets = [
      { dx: 0, dy: -36 }, { dx: 36, dy: 0 },
      { dx: 0, dy: 36 },  { dx: -36, dy: 0 },
      { dx: 24, dy: -24 }, { dx: 24, dy: 24 },
      { dx: -24, dy: 24 }, { dx: -24, dy: -24 },
    ];
    spikeOffsets.forEach(sp => {
      ctx.fillRect(destX + sp.dx - 2, destY + sp.dy - 2, 4, 4);
      ctx.fillRect(destX + Math.floor(sp.dx / 2) - 2, destY + Math.floor(sp.dy / 2) - 2, 4, 4);
    });

    // Flickering pixel glitch bars across horizon
    if (Math.sin(time * 0.02) > 0.4) {
      const glitchY = Math.floor(((Math.sin(time * 0.06) * 0.5 + 0.5) * h) / 4) * 4;
      ctx.fillStyle = 'rgba(255, 30, 80, 0.16)';
      ctx.fillRect(0, glitchY, w, 4);
    }

    // Strained stepped pixel bridge connecting hero and corrupted point
    ctx.fillStyle = 'rgba(255, 50, 90, 0.45)';
    const startX = Math.floor(playerX / 4) * 4;
    for (let bx = startX; bx < destX; bx += 8) {
      ctx.fillRect(bx, destY, 4, 2);
    }

    // Pixel Warning Watermark
    ctx.fillStyle = 'rgba(255, 90, 120, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ CORRUPTED POINT LOCKING TARGET — OCCUPANCY BLOCKED (DIMINISHED 9-BIT STATE)', w / 2, h - 52);
    ctx.textAlign = 'start';
  }

  // -------------------------------------------------------------
  // BIT 10: FULL & COMPLETE TRANSCENDENT CHANGE (1024 COLORS PIXEL ART)
  // "10 collected bits should represent a background that represents this full and complete change."
  // -------------------------------------------------------------
  if (currentBits >= 10) {
    // 1. Deep Celestial Cosmos
    ctx.fillStyle = 'rgba(4, 20, 36, 0.65)';
    ctx.fillRect(0, 0, w, h);

    // 2. Crisp Pixel Lattice Grid across sky and floor
    ctx.fillStyle = 'rgba(80, 240, 255, 0.24)';
    for (let lx = 0; lx <= w; lx += 32) {
      for (let ly = 0; ly <= h; ly += 32) {
        if (ly < 170 || ly > 270) { // Keep corridor clean
          ctx.fillRect(lx, ly, 2, 2);
        }
      }
    }

    // 3. Radiant Multi-Hued Pixel Aurora Ribbons
    for (let px = 0; px < w; px += 8) {
      const aur1 = Math.floor((Math.sin(px * 0.009 + time * 0.002) * 24 + 32) / 4) * 4;
      const aur2 = Math.floor((Math.cos(px * 0.014 + time * 0.0016) * 18 + 24) / 4) * 4;

      ctx.fillStyle = 'rgba(51, 255, 204, 0.18)';
      ctx.fillRect(px, 78 - aur1, 6, aur1);

      ctx.fillStyle = 'rgba(255, 220, 85, 0.16)';
      ctx.fillRect(px, 104 - aur2, 6, aur2);
    }

    // 4. DUAL HARMONIZED PIXEL BEACONS (Hero has Occupied New Point!)
    const destX = Math.floor(TRACE_END / 4) * 4;
    const destY = TRACE_Y;

    // Harmonized stepped pixel bridge of pure light
    const startX = Math.floor(playerX / 4) * 4;
    for (let lx = startX; lx <= destX; lx += 6) {
      const gradColor = lx % 12 === 0 ? '#ffea66' : '#55ffcc';
      ctx.fillStyle = gradColor;
      ctx.fillRect(lx, destY - 1, 4, 3);
    }

    // Concentric pixel diamond rings radiating from harmonized points
    const ringRad = Math.floor(((time * 0.03) % 48) / 4) * 4 + 8;
    ctx.strokeStyle = 'rgba(255, 230, 100, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(destX - ringRad, destY - ringRad, ringRad * 2, ringRad * 2);
    ctx.strokeRect(playerX - ringRad * 0.7, destY - ringRad * 0.7, ringRad * 1.4, ringRad * 1.4);

    // 5. Sparkling Pixel Crystals
    for (let cp = 0; cp < 24; cp++) {
      const cpx = Math.floor(((cp * 43 + time * 0.03) % w) / 4) * 4;
      const cpy = Math.floor(((cp * 29 + 14) % h) / 4) * 4;
      if (cpy < 165 || cpy > 275) {
        ctx.fillStyle = cp % 3 === 0 ? '#ffea66' : cp % 3 === 1 ? '#66e6ff' : '#66ff99';
        ctx.fillRect(cpx, cpy, 3, 3);
      }
    }

    // 6. Transcendent Victory Pixel Banner
    ctx.fillStyle = 'rgba(102, 255, 204, 0.9)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✦ 10-BIT TRANSCENDENCE: VOID FULLY TRANSFORMED — NEW POINT OCCUPIED ✦', w / 2, h * 0.28);
    ctx.textAlign = 'start';
  }

  // Right-Thumb Polarizer Tap Guide: Blended directly into Part One retro pixel background
  drawPolarizerTapGuide(ctx, w, h, currentBits, time, 1, 0);
}

interface Props {
  gameState: GameState;
  onUpdateState: (updater: (prev: GameState) => GameState) => void;
  onLogAction?: (actionText: string) => void;
  onOpenMainMenu?: () => void;
  isMobile?: boolean;
  isMainMenuOpen?: boolean;
  userSettings?: UserSettings;
  onUpdateSettings?: (settings: UserSettings) => void;
  onDevAddBit?: () => void;
  onDevAddRes?: () => void;
  onTogglePipeline?: () => void;
}

export const DimensionCanvas: React.FC<Props> = ({
  gameState,
  onUpdateState,
  onLogAction = () => {},
  onOpenMainMenu,
  isMobile = false,
  isMainMenuOpen = false,
  userSettings = DEFAULT_USER_SETTINGS,
  onUpdateSettings,
  onDevAddBit,
  onDevAddRes,
  onTogglePipeline,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Settings ref for input and wheel handlers
  const userSettingsRef = useRef<UserSettings>(userSettings);
  userSettingsRef.current = userSettings;

  // Invisible Bottom-Left Quadrant Drag-to-Move Controller
  const [joystickDeflection, setJoystickDeflection] = useState<number>(0);
  const joystickDeflectionRef = useRef<number>(0);
  joystickDeflectionRef.current = joystickDeflection;
  const isJoystickDraggingRef = useRef<boolean>(false);
  const dragOriginXRef = useRef<number | null>(null);
  const dragLastClientXRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);

  // Orientation tracking for mobile portrait advisory banner
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    lastTouchTimeRef.current = Date.now();
    if (isMainMenuOpenRef.current || deathScreenRef.current || deathBufferSecondsRef.current > 0) return;
    if (subPartRef.current !== 2 || resolutionRef.current < 2) return;
    if (!stateRef.current.carrierActive) {
      handleStartAudio();
    }
    isJoystickDraggingRef.current = true;
    dragOriginXRef.current = e.clientX;
    dragLastClientXRef.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (subPartRef.current !== 2 || resolutionRef.current < 2) return;
    if (!isJoystickDraggingRef.current || dragOriginXRef.current === null) return;
    if (isMainMenuOpenRef.current || deathBufferSecondsRef.current > 0) return;

    const diffX = e.clientX - dragOriginXRef.current;
    const maxRadius = 45; // 45px deflection radius for left/right thumb control
    const normalized = Math.max(-1, Math.min(1, diffX / maxRadius));
    joystickDeflectionRef.current = normalized;
    setJoystickDeflection(normalized);

    // Floating origin: drift when dragging past maxRadius for effortless continuous navigation
    if (Math.abs(diffX) > maxRadius) {
      dragOriginXRef.current = e.clientX - Math.sign(diffX) * maxRadius;
    }

    // Direct instantaneous displacement tracking per swipe.
    // Progresses in the exact same way as the scroll wheel:
    // Sluggish early on at Resolution 2 (0.08) requiring multiple swipes to move across the screen,
    // scaling with Resolution upgrades:
    const deltaClientX = e.clientX - dragLastClientXRef.current;
    dragLastClientXRef.current = e.clientX;

    if (subPartRef.current === 2 && resolutionRef.current >= 2) {
      const res = resolutionRef.current;
      const agility =
        res <= 2
          ? 0.08
          : res === 3
          ? 0.25
          : res === 4
          ? 0.55
          : res === 5
          ? 0.85
          : 1.0;
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const deltaCanvas = deltaClientX * scale * agility;
        const TRACE_START = 80;
        const TRACE_END = 920 - 80;
        playerXRef.current = Math.max(
          TRACE_START + 10,
          Math.min(TRACE_END - 20, playerXRef.current + deltaCanvas)
        );
      }
    }
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    lastTouchTimeRef.current = Date.now();
    isJoystickDraggingRef.current = false;
    dragOriginXRef.current = null;
    joystickDeflectionRef.current = 0;
    setJoystickDeflection(0);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Main menu tracking ref & soundtrack coordination
  const isMainMenuOpenRef = useRef<boolean>(isMainMenuOpen);
  useEffect(() => {
    isMainMenuOpenRef.current = isMainMenuOpen;
    if (isMainMenuOpen) {
      currentGenreRef.current = 'slow_waltz';
      currentZoneRef.current = 'easy';
      soundEngine.setMusicPacing('slow_waltz', 'easy');
      soundEngine.startBackgroundMusic();
    }
  }, [isMainMenuOpen]);

  // Act 1 Deep Progression States
  // Phases: 'void' (0D) -> 'point' (N=1, collecting 9 bits) -> 'boss' (line segment) -> 'ray' (rift to 2D)
  const [act1Phase, setAct1Phase] = useState<'void' | 'point' | 'boss' | 'ray'>(
    gameState.act1Phase === 'line_segment' ? 'boss' : gameState.act1Phase
  );
  const [hasN, setHasN] = useState<boolean>(gameState.act1PurchasedN);
  const [bits, setBits] = useState<number>(gameState.act1Bits || 0);

  // Part Two Progression: Resolution / Frame Rate (0 to 10)
  const [subPart, setSubPart] = useState<1 | 2>(gameState.act1SubPart || 1);
  const [resolution, setResolution] = useState<number>(gameState.act1Resolution || 0);
  const [overshields, setOvershields] = useState<number>(gameState.overshields || 0);
  const [boss2Hp, setBoss2Hp] = useState<number>(MAX_BOSS_2_HP);

  // Active Polarizer: 1 = Up, -1 = Down (starting modes), 0 = Neutral (unlocked at Bit 8)
  const [playerPolarity, setPlayerPolarity] = useState<-1 | 0 | 1>(1);

  const [bossHp, setBossHp] = useState<number>(MAX_BOSS_1_HP);
  const [integrity, setIntegrity] = useState<number>(100);

  // Scroll wheel direction toggle (persisted via settings)
  const isWheelInverted = userSettings?.controls?.scrollWheelInversion ?? false;
  const wheelInvertedRef = useRef<boolean>(isWheelInverted);
  wheelInvertedRef.current = isWheelInverted;

  const toggleWheelDirection = () => {
    if (onUpdateSettings) {
      const next = !wheelInvertedRef.current;
      const updated: UserSettings = {
        ...userSettingsRef.current,
        controls: {
          ...userSettingsRef.current.controls,
          scrollWheelInversion: next,
        },
      };
      onUpdateSettings(updated);
      saveUserSettings(updated);
    }
  };

  // Game Modes (Normal, Speed Run, Survival)
  const [gameMode, setGameMode] = useState<GameMode>(gameState.gameMode || 'normal');
  const gameModeRef = useRef<GameMode>(gameState.gameMode || 'normal');
  gameModeRef.current = gameMode;

  const [hasCompletedSpeedrun, setHasCompletedSpeedrun] = useState<boolean>(gameState.hasCompletedSpeedrun || false);
  const [hasAttemptedSurvival, setHasAttemptedSurvival] = useState<boolean>(gameState.hasAttemptedSurvival || false);

  const [speedrunTime, setSpeedrunTime] = useState<number>(gameState.speedrunTime || 0);
  const [speedrunRuns, setSpeedrunRuns] = useState<number>(gameState.speedrunRuns || 1);
  const speedrunTimeRef = useRef<number>(gameState.speedrunTime || 0);
  const speedrunRunsRef = useRef<number>(gameState.speedrunRuns || 1);
  const [speedrunCompleteModal, setSpeedrunCompleteModal] = useState<{ time: number; runs: number } | null>(null);
  const speedrunCompleteModalRef = useRef(speedrunCompleteModal);
  speedrunCompleteModalRef.current = speedrunCompleteModal;
  const [storyCompleteModal, setStoryCompleteModal] = useState<{ totalRuns: number } | null>(null);

  const [survivalTime, setSurvivalTime] = useState<number>(0);
  const survivalTimeRef = useRef<number>(0);
  const survivalResourcesRef = useRef<{ hz: number; volts: number; baud: number }>({ hz: 0, volts: 0, baud: 0 });
  const [survivalDeathModal, setSurvivalDeathModal] = useState<{
    time: number;
    resources: { hz: number; volts: number; baud: number };
  } | null>(null);
  const survivalDeathModalRef = useRef(survivalDeathModal);
  survivalDeathModalRef.current = survivalDeathModal;

  const survivalBoss1SpawnedRef = useRef<boolean>(false);
  const survivalBoss2SpawnedRef = useRef<boolean>(false);
  const [activeSurvivalBoss, setActiveSurvivalBoss] = useState<'none' | 'boss1' | 'boss2'>('none');
  const activeSurvivalBossRef = useRef<'none' | 'boss1' | 'boss2'>('none');
  activeSurvivalBossRef.current = activeSurvivalBoss;

  // Arcade Mode State & Modals (1 Life start, Extra life at N=2, Linear escalation)
  const [arcadeTime, setArcadeTime] = useState<number>(gameState.arcadeTime || 0);
  const arcadeTimeRef = useRef<number>(gameState.arcadeTime || 0);
  const [arcadeLives, setArcadeLives] = useState<number>(gameState.arcadeLives || 1);
  const arcadeLivesRef = useRef<number>(gameState.arcadeLives || 1);
  const [arcadeKillModal, setArcadeKillModal] = useState<{
    stageName: string;
    stageNum: number;
    time: number;
    reason: string;
  } | null>(null);
  const arcadeKillModalRef = useRef(arcadeKillModal);
  arcadeKillModalRef.current = arcadeKillModal;
  const [arcadeVictoryModal, setArcadeVictoryModal] = useState<{
    time: number;
    livesRemaining: number;
  } | null>(null);
  const arcadeVictoryModalRef = useRef(arcadeVictoryModal);
  arcadeVictoryModalRef.current = arcadeVictoryModal;

  const bossImmunityCooldownRef = useRef<number>(0);

  // In-Game Options Modal (Accessible from any death / kill screen)
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
  const isOptionsMenuOpenRef = useRef<boolean>(false);
  isOptionsMenuOpenRef.current = isOptionsMenuOpen;
  const [optionsSubTab, setOptionsSubTab] = useState<'audio' | 'control'>('audio');

  const updateSettingsFromCanvas = (updated: UserSettings) => {
    userSettingsRef.current = updated;
    if (onUpdateSettings) {
      onUpdateSettings(updated);
    }
    saveUserSettings(updated);
    soundEngine.applyAudioSettings(updated.audio);
  };

  const handleToggleMuteAll = () => {
    const current = userSettingsRef.current ?? DEFAULT_USER_SETTINGS;
    const updated: UserSettings = {
      ...current,
      audio: {
        ...current.audio,
        muteAll: !current.audio.muteAll,
      },
    };
    updateSettingsFromCanvas(updated);
  };

  const handleMusicVolumeChange = (vol: number) => {
    const current = userSettingsRef.current ?? DEFAULT_USER_SETTINGS;
    const updated: UserSettings = {
      ...current,
      audio: {
        ...current.audio,
        musicVolume: vol,
      },
    };
    updateSettingsFromCanvas(updated);
  };

  const handleSfxVolumeChange = (vol: number) => {
    const current = userSettingsRef.current ?? DEFAULT_USER_SETTINGS;
    const updated: UserSettings = {
      ...current,
      audio: {
        ...current.audio,
        sfxVolume: vol,
      },
    };
    updateSettingsFromCanvas(updated);
  };

  const handleToggleWheelInversion = () => {
    const current = userSettingsRef.current ?? DEFAULT_USER_SETTINGS;
    const updated: UserSettings = {
      ...current,
      controls: {
        ...current.controls,
        scrollWheelInversion: !current.controls.scrollWheelInversion,
      },
    };
    updateSettingsFromCanvas(updated);
  };

  const handleSetPolarizerInput = (input: 'space' | 'rmb') => {
    const current = userSettingsRef.current ?? DEFAULT_USER_SETTINGS;
    const updated: UserSettings = {
      ...current,
      controls: {
        ...current.controls,
        cyclePolarizerInput: input,
      },
    };
    updateSettingsFromCanvas(updated);
  };

  // Phase 0 / Run Stats (State for rendering, Refs for 100% accurate closure reads)
  const [runHz, setRunHz] = useState<number>(0);
  const [runVolts, setRunVolts] = useState<number>(0);
  const [runBaud, setRunBaud] = useState<number>(0);

  const runHzRef = useRef<number>(0);
  const runVoltsRef = useRef<number>(0);
  const runBaudRef = useRef<number>(0);

  // Death / Level-Up Screen
  const [deathScreen, setDeathScreen] = useState<DeathScreenState | null>(gameState.deathScreen);

  // 1-Second Accidental Click Buffer on Death (greys out buttons for 1s to prevent misclicks)
  const [deathBufferSeconds, setDeathBufferSeconds] = useState<number>(0);
  const deathBufferUntilRef = useRef<number>(0);
  const deathBufferSecondsRef = useRef<number>(0);
  deathBufferSecondsRef.current = deathBufferSeconds;

  // Start 1-second click protection timer whenever any death screen appears
  useEffect(() => {
    const isAnyDeathActive = Boolean(deathScreen || survivalDeathModal || arcadeKillModal);
    if (!isAnyDeathActive) {
      deathBufferUntilRef.current = 0;
      setDeathBufferSeconds(0);
      return;
    }

    // Set 1.0 second buffer deadline
    deathBufferUntilRef.current = Date.now() + 1000;
    setDeathBufferSeconds(1.0);

    const intervalId = setInterval(() => {
      const remainingMs = deathBufferUntilRef.current - Date.now();
      if (remainingMs <= 0) {
        setDeathBufferSeconds(0);
        deathBufferUntilRef.current = 0;
        clearInterval(intervalId);
      } else {
        setDeathBufferSeconds(Math.max(0, remainingMs / 1000));
      }
    }, 40);

    return () => clearInterval(intervalId);
  }, [deathScreen !== null, survivalDeathModal !== null, arcadeKillModal !== null]);

  // Ray animation progress
  const foldProgressRef = useRef<number>(0);

  // Part Two Boss Targeting and Red Error Zones
  const bossTargetZoneRef = useRef<'attenuation' | 'harmonic' | 'emitter'>('harmonic');
  const bossTargetTimerRef = useRef<number>(0);
  const redErrorZonesRef = useRef<RedErrorZone[]>([]);
  const redErrorSpawnCooldownRef = useRef<number>(0);
  const bossHitFlashRef = useRef<number>(0);
  const combatTextsRef = useRef<Array<{
    id: number;
    text: string;
    x: number;
    y: number;
    color: string;
    alpha: number;
    vy: number;
  }>>([]);
  const topWavesSpawnedRef = useRef<number>(0);
  const bottomWavesSpawnedRef = useRef<number>(0);

  // Sync internal state with external gameState updates (e.g. resets, dev cheat buttons)
  useEffect(() => {
    setHasN(gameState.act1PurchasedN);
    hasNRef.current = gameState.act1PurchasedN;

    const nextBits = gameState.act1Bits || 0;
    setBits(nextBits);
    bitsRef.current = nextBits;

    const nextSubPart = gameState.act1SubPart || 1;
    setSubPart(nextSubPart);
    subPartRef.current = nextSubPart;

    const nextRes = gameState.act1Resolution || 0;
    setResolution(nextRes);
    resolutionRef.current = nextRes;

    setOvershields(gameState.overshields || 0);
    overshieldsRef.current = gameState.overshields || 0;

    const nextPhase: 'void' | 'point' | 'boss' | 'ray' = !gameState.act1PurchasedN
      ? 'void'
      : (gameState.act1Bits >= 9 && gameState.act1Phase === 'line_segment')
      ? 'boss'
      : gameState.act1Phase === 'ray'
      ? 'ray'
      : 'point';
    setAct1Phase(nextPhase);
    phaseRef.current = nextPhase;
    if (gameState.gameMode) {
      setGameMode(gameState.gameMode);
      gameModeRef.current = gameState.gameMode;
      if (gameState.gameMode === 'survival') {
        pulsesRef.current = [];
        survivalTimeRef.current = 0;
        setSurvivalTime(0);
        survivalBoss1SpawnedRef.current = false;
        survivalBoss2SpawnedRef.current = false;
        setActiveSurvivalBoss('none');
        activeSurvivalBossRef.current = 'none';
        setSurvivalDeathModal(null);
        setDeathScreen(null);
        deathScreenRef.current = null;
        setStoryCompleteModal(null);
        setSpeedrunCompleteModal(null);
        soundEngine.setBossMusic(false);
      } else if (gameState.gameMode === 'speedrun' && gameState.speedrunTime === 0) {
        pulsesRef.current = [];
        speedrunTimeRef.current = 0;
        setSpeedrunTime(0);
        speedrunRunsRef.current = 1;
        setSpeedrunRuns(1);
        setSpeedrunCompleteModal(null);
        setDeathScreen(null);
        deathScreenRef.current = null;
        setStoryCompleteModal(null);
        setSurvivalDeathModal(null);
        soundEngine.setBossMusic(false);
      } else if (gameState.gameMode === 'story') {
        pulsesRef.current = [];
        setStoryCompleteModal(null);
        setDeathScreen(null);
        deathScreenRef.current = null;
        setSpeedrunCompleteModal(null);
        setSurvivalDeathModal(null);
        setArcadeKillModal(null);
        setArcadeVictoryModal(null);
        soundEngine.setBossMusic(false);
        // If starting fresh story from 0D void with 0 materials, clear all active run harvests
        if (
          !gameState.act1PurchasedN &&
          (gameState.act1Bits || 0) === 0 &&
          gameState.resources.hertz === 0 &&
          gameState.resources.volts === 0 &&
          gameState.resources.baud === 0
        ) {
          runHzRef.current = 0;
          runVoltsRef.current = 0;
          runBaudRef.current = 0;
          setRunHz(0);
          setRunVolts(0);
          setRunBaud(0);
        }
      } else if (gameState.gameMode === 'arcade' && (gameState.arcadeTime === 0 || (!gameState.act1PurchasedN && (gameState.act1Bits || 0) === 0))) {
        pulsesRef.current = [];
        arcadeTimeRef.current = gameState.arcadeTime || 0;
        setArcadeTime(arcadeTimeRef.current);
        const initialLives = gameState.arcadeLives !== undefined
          ? gameState.arcadeLives
          : (gameState.act1PurchasedN && gameState.currentN >= 1) ? 2 : 1;
        arcadeLivesRef.current = initialLives;
        setArcadeLives(initialLives);
        setStoryCompleteModal(null);
        setDeathScreen(null);
        deathScreenRef.current = null;
        setSpeedrunCompleteModal(null);
        setSurvivalDeathModal(null);
        setArcadeKillModal(null);
        setArcadeVictoryModal(null);
        soundEngine.setBossMusic(false);
      }
    }
    stateRef.current = gameState;
  }, [gameState.act1Bits, gameState.act1PurchasedN, gameState.act1Phase, gameState.act1SubPart, gameState.act1Resolution, gameState.overshields, gameState.gameMode, gameState.currentN]);

  // Refs for requestAnimationFrame loop
  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const phaseRef = useRef(act1Phase);
  phaseRef.current = act1Phase;
  const hasNRef = useRef(hasN);
  hasNRef.current = hasN;
  const bitsRef = useRef(bits);
  bitsRef.current = bits;
  const subPartRef = useRef(subPart);
  subPartRef.current = subPart;
  const resolutionRef = useRef(resolution);
  resolutionRef.current = resolution;
  const overshieldsRef = useRef(overshields);
  overshieldsRef.current = overshields;
  const polarityRef = useRef(playerPolarity);
  polarityRef.current = playerPolarity;
  const integrityRef = useRef(integrity);
  integrityRef.current = integrity;
  const bossHpRef = useRef(bossHp);
  bossHpRef.current = bossHp;
  const boss2HpRef = useRef(boss2Hp);
  boss2HpRef.current = boss2Hp;
  const deathScreenRef = useRef(deathScreen);
  deathScreenRef.current = deathScreen;

  // Roguelite difficulty, scaling rhythm, and trough kill-wave tracking
  const runPulsesRef = useRef<number>(0);
  const runTimeRef = useRef<number>(0);
  const currentGenreRef = useRef<MusicGenre>('slow_waltz');
  const currentZoneRef = useRef<SpeedZone>('easy');
  const currentMusicStageRef = useRef<string>('slow_waltz');
  const mathBurstStepRef = useRef<number>(0);
  const screenShakeRef = useRef<number>(0);
  const damageFlashRef = useRef<number>(0);
  const troughTrainActiveRef = useRef<boolean>(false);
  const bossMissesRef = useRef<number>(0);

  // Wave / Pulse tracking
  const pulsesRef = useRef<Array<{
    x: number;
    speed: number;
    pol: -1 | 0 | 1;
    kind: 'top' | 'bottom' | 'square';
    color: string;
    res: 'hz' | 'volts' | 'baud';
    amplitude: number;
    reflected: boolean;
    id: number;
  }>>([]);

  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
  }>>([]);

  // Player coordinate anchored at 240, pulled right during boss
  const playerXRef = useRef<number>(240);

  // Initialize Carrier Audio Soundtrack
  const handleStartAudio = () => {
    if (isMainMenuOpenRef.current) return;
    soundEngine.init();
    soundEngine.setMusicPacing(currentGenreRef.current, currentZoneRef.current);
    soundEngine.startBackgroundMusic();
    onUpdateState(prev => ({
      ...prev,
      audioActive: true,
      carrierActive: true,
    }));
    onLogAction(`Audio Carrier engaged: C Major soundtrack active in the void. Pacing: [ZONE: EASY] SLOW WALTZ (${soundEngine.getBpm()} BPM).`);
  };

  const handleToggleMute = () => {
    const isMuted = soundEngine.toggleMute();
    onUpdateState(prev => ({ ...prev, audioActive: !isMuted }));
  };

  // Spark Generator
  const addSparks = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        alpha: 1,
        color,
      });
    }
  };

  // Floating Combat Text Generator
  const addCombatText = (text: string, x: number, y: number, color: string) => {
    combatTextsRef.current.push({
      id: Date.now() + Math.random(),
      text,
      x,
      y,
      color,
      alpha: 1,
      vy: -1.4,
    });
  };

  // Arcade Mode Progression Table Calculator:
  // Breakdown of bit and res music, difficulty, and tempo progression:
  // bit:
  // 1 - waltz; easy difficulty; slow tempo
  // 2 - waltz; easy difficulty; slow tempo
  // 3 - math rock difficulty; easy; slow tempo
  // 4 - arcade techno difficulty; easy; slow tempo
  // 5 - cycle through (Waltz, math rock, arcade techno); easy difficulty; slow tempo
  // 6 - waltz; Medium difficulty; Medium tempo
  // 7 - math rock; Medium; Medium tempo
  // 8 - arcade techno; Medium difficulty; Medium tempo
  // 9 - cycle through (Waltz, math rock, arcade techno); Medium difficulty; Medium tempo
  // 10 - waltz; Fast difficulty; Fast tempo
  // Arcade Pacing:
  // Starts at Easy (0-3 bits), scales to Medium (4-7 bits), and scales to Hard at 8 bits unlocked (Bits 8 & 9 Boss)
  const getArcadePacing = (
    _subP: number,
    bCount: number,
    _resCount: number,
    pulseCount: number
  ): { genre: MusicGenre; zone: SpeedZone } => {
    const genresCycle: MusicGenre[] = ['slow_waltz', 'math_rock', 'arcade_techno'];
    const cycleIndex = Math.floor(pulseCount / 8) % 3;

    if (bCount < 4) {
      // Bits 0 (pre-N=1 void or N=1 initial), 1, 2, 3: EASY difficulty
      const genre: MusicGenre = bCount === 3 ? 'math_rock' : 'slow_waltz';
      return { genre, zone: 'easy' };
    } else if (bCount < 8) {
      // Bits 4, 5, 6, 7: MEDIUM difficulty
      const genre: MusicGenre =
        bCount === 4
          ? 'arcade_techno'
          : bCount === 5
          ? 'slow_waltz'
          : bCount === 6
          ? 'math_rock'
          : genresCycle[cycleIndex];
      return { genre, zone: 'medium' };
    } else {
      // Bit 8 unlocked and Bit 9 Boss 1: HARD difficulty
      const genre: MusicGenre = bCount >= 9 ? genresCycle[cycleIndex] : 'arcade_techno';
      return { genre, zone: 'hard' };
    }
  };

  // Auto-Purchase System for Speed Run & Arcade Modes
  const checkAutoPurchases = () => {
    if (gameModeRef.current !== 'speedrun' && gameModeRef.current !== 'arcade') return;

    const totalHz = stateRef.current.resources.hertz + runHzRef.current;
    const totalV = stateRef.current.resources.volts + runVoltsRef.current;
    const totalBaud = stateRef.current.resources.baud + runBaudRef.current;

    // 1. Auto-purchase N=1 if not yet owned and materials collected (2 Hz, 2 V)
    if (!hasNRef.current) {
      if (totalHz >= 2 && totalV >= 2) {
        runHzRef.current = Math.max(0, runHzRef.current - 2);
        runVoltsRef.current = Math.max(0, runVoltsRef.current - 2);
        setRunHz(runHzRef.current);
        setRunVolts(runVoltsRef.current);
        setHasN(true);
        hasNRef.current = true;
        setAct1Phase('point');
        phaseRef.current = 'point';

        if (gameModeRef.current === 'arcade') {
          arcadeLivesRef.current = 2;
          setArcadeLives(2);
          addCombatText('💖 +1 LIFE UNLOCKED (N=1)! [LIVES: 2]', playerXRef.current, 190, '#ff55bb');
          onLogAction("💖 ARCADE LIFE GRANTED: N=1 materialized! Extra life awarded (Total Lives = 2)!");
        }

        onUpdateState(prev => ({
          ...prev,
          currentN: 1,
          act1PurchasedN: true,
          act1Phase: 'point',
          arcadeLives: prev.gameMode === 'arcade' ? 2 : prev.arcadeLives,
          resources: {
            ...prev.resources,
            hertz: Math.max(0, prev.resources.hertz - 2),
            volts: Math.max(0, prev.resources.volts - 2),
          },
        }));
        soundEngine.triggerNote('G4');
        soundEngine.playCadenceResolution();
        addCombatText('⚡ AUTO-COMPILED N = 1!', playerXRef.current, 190, '#33ff66');
        onLogAction("AUTO-COMPILE: N=1 materialized!");
      }
      return;
    }

    // 2. Auto-purchase Bit upgrades (Part 1: bits 0 to 9)
    if (subPartRef.current === 1 && bitsRef.current < 10) {
      const nextBitIdx = bitsRef.current;
      const upgrade = BIT_GRAPHICS_UPGRADES[nextBitIdx];
      if (upgrade && totalHz >= upgrade.costHz && totalV >= upgrade.costV) {
        runHzRef.current = Math.max(0, runHzRef.current - upgrade.costHz);
        runVoltsRef.current = Math.max(0, runVoltsRef.current - upgrade.costV);
        setRunHz(runHzRef.current);
        setRunVolts(runVoltsRef.current);

        const newBits = bitsRef.current + 1;
        setBits(newBits);
        bitsRef.current = newBits;

        onUpdateState(prev => ({
          ...prev,
          act1Bits: newBits,
          resources: {
            ...prev.resources,
            hertz: Math.max(0, prev.resources.hertz - upgrade.costHz),
            volts: Math.max(0, prev.resources.volts - upgrade.costV),
          },
        }));

        soundEngine.triggerNote('C5');
        soundEngine.playHitSound('quantum');
        addCombatText(`⚡ AUTO: ${upgrade.name}!`, playerXRef.current, 190, '#55ff99');
        onLogAction(`AUTO-COMPILE: ${upgrade.name} compiled!`);

        // In arcade mode, immediately apply new pacing from progression table
        if (gameModeRef.current === 'arcade') {
          const pacing = getArcadePacing(1, newBits, resolutionRef.current, runPulsesRef.current);
          currentGenreRef.current = pacing.genre;
          currentZoneRef.current = pacing.zone;
          soundEngine.setMusicPacing(pacing.genre, pacing.zone);
          onLogAction(`🕹️ ARCADE PROGRESSION: Bit ${newBits} [${pacing.zone.toUpperCase()}] -> ${pacing.genre.replace('_', ' ').toUpperCase()} (${soundEngine.getBpm()} BPM)!`);
        }

        if (newBits === 9 && phaseRef.current !== 'boss' && phaseRef.current !== 'ray') {
          setAct1Phase('boss');
          phaseRef.current = 'boss';
          onUpdateState(prev => ({ ...prev, act1Phase: 'line_segment' }));
          onLogAction("DESTINATION LOCKED BY CORRUPTED SOVEREIGN! Boss fight begins!");
        }
      }
      return;
    }

    // 3. Auto-purchase Resolution upgrades (Part 2 ONLY: subPart === 2 && currentN === 2)
    if (subPartRef.current === 2 && resolutionRef.current < 10) {
      const nextResIdx = resolutionRef.current;
      const upgrade = RESOLUTION_UPGRADES[nextResIdx];
      if (
        upgrade &&
        totalHz >= upgrade.costHz &&
        totalV >= upgrade.costV &&
        totalBaud >= upgrade.costBaud
      ) {
        runHzRef.current = Math.max(0, runHzRef.current - upgrade.costHz);
        runVoltsRef.current = Math.max(0, runVoltsRef.current - upgrade.costV);
        runBaudRef.current = Math.max(0, runBaudRef.current - upgrade.costBaud);
        setRunHz(runHzRef.current);
        setRunVolts(runVoltsRef.current);
        setRunBaud(runBaudRef.current);

        const newRes = resolutionRef.current + 1;
        setResolution(newRes);
        resolutionRef.current = newRes;

        onUpdateState(prev => ({
          ...prev,
          act1Resolution: newRes,
          resources: {
            ...prev.resources,
            baud: Math.max(0, prev.resources.baud - upgrade.costBaud),
            hertz: Math.max(0, prev.resources.hertz - upgrade.costHz),
            volts: Math.max(0, prev.resources.volts - upgrade.costV),
          },
        }));

        soundEngine.triggerNote('C5');
        soundEngine.playCadenceResolution();
        addCombatText(`⚡ AUTO: ${upgrade.fps}!`, playerXRef.current, 190, '#ffe655');
        onLogAction(`AUTO-COMPILE: ${upgrade.name} (${upgrade.fps}) compiled!`);

        // In arcade mode, immediately apply new pacing from progression table
        if (gameModeRef.current === 'arcade') {
          const pacing = getArcadePacing(2, bitsRef.current, newRes, runPulsesRef.current);
          currentGenreRef.current = pacing.genre;
          currentZoneRef.current = pacing.zone;
          soundEngine.setMusicPacing(pacing.genre, pacing.zone);
          onLogAction(`🕹️ ARCADE PROGRESSION: Resolution ${newRes} [${pacing.zone.toUpperCase()}] -> ${pacing.genre.replace('_', ' ').toUpperCase()} (${soundEngine.getBpm()} BPM)!`);
        }
      }
    }
  };

  const handleStartStoryMode = () => {
    soundEngine.setBossMusic(false);
    setGameMode('story');
    gameModeRef.current = 'story';
    setSpeedrunCompleteModal(null);
    setSurvivalDeathModal(null);
    setDeathScreen(null);
    setStoryCompleteModal(null);

    // Reset player state to 0D Void from the start
    runHzRef.current = 0;
    runVoltsRef.current = 0;
    runBaudRef.current = 0;
    setRunHz(0);
    setRunVolts(0);
    setRunBaud(0);

    setHasN(false);
    hasNRef.current = false;
    setBits(0);
    bitsRef.current = 0;
    setSubPart(1);
    subPartRef.current = 1;
    setResolution(0);
    resolutionRef.current = 0;
    setAct1Phase('void');
    phaseRef.current = 'void';
    setIntegrity(100);
    setOvershields(0);
    overshieldsRef.current = 0;

    pulsesRef.current = [];
    playerXRef.current = 240;
    runPulsesRef.current = 0;
    runTimeRef.current = 0;
    currentGenreRef.current = 'slow_waltz';
    currentZoneRef.current = 'easy';
    soundEngine.setMusicPacing('slow_waltz', 'easy');

    onUpdateState(prev => ({
      ...prev,
      gameMode: 'story',
      act1PurchasedN: false,
      currentN: 0,
      act1Bits: 0,
      act1SubPart: 1,
      act1Resolution: 0,
      act1Phase: 'void',
      overshields: 0,
      resources: {
        hertz: 0,
        volts: 0,
        baud: 0,
      },
    }));

    onLogAction("✦ STORY MODE ENGAGED: Relaunching from 0-bit acoustic void! Return-to-menu enabled upon death.");
  };

  const handleStartSpeedrunMode = () => {
    soundEngine.setBossMusic(false);
    setGameMode('speedrun');
    gameModeRef.current = 'speedrun';
    setSpeedrunCompleteModal(null);
    setSurvivalDeathModal(null);
    setDeathScreen(null);
    setStoryCompleteModal(null);

    // Clear player's reserves and place them back in the acoustic void
    runHzRef.current = 0;
    runVoltsRef.current = 0;
    runBaudRef.current = 0;
    setRunHz(0);
    setRunVolts(0);
    setRunBaud(0);

    setHasN(false);
    hasNRef.current = false;
    setBits(0);
    bitsRef.current = 0;
    setSubPart(1);
    subPartRef.current = 1;
    setResolution(0);
    resolutionRef.current = 0;
    setAct1Phase('void');
    phaseRef.current = 'void';
    setIntegrity(100);
    setOvershields(0);
    overshieldsRef.current = 0;

    speedrunTimeRef.current = 0;
    setSpeedrunTime(0);
    speedrunRunsRef.current = 1;
    setSpeedrunRuns(1);

    pulsesRef.current = [];
    playerXRef.current = 240;
    runPulsesRef.current = 0;
    runTimeRef.current = 0;
    currentGenreRef.current = 'slow_waltz';
    currentZoneRef.current = 'easy';
    soundEngine.setMusicPacing('slow_waltz', 'easy');

    onUpdateState(prev => ({
      ...prev,
      gameMode: 'speedrun',
      act1PurchasedN: false,
      currentN: 0,
      act1Bits: 0,
      act1SubPart: 1,
      act1Resolution: 0,
      act1Phase: 'void',
      resources: {
        ...prev.resources,
        hertz: 0,
        volts: 0,
        baud: 0,
      },
    }));

    onLogAction("✦ SPEED RUN COMMENCED! Time begins now. All unlocks will auto-compile as resources are collected!");
  };

  const handleStartSurvivalMode = () => {
    soundEngine.setBossMusic(false);
    setGameMode('survival');
    gameModeRef.current = 'survival';
    setHasAttemptedSurvival(true);
    setSurvivalDeathModal(null);
    setSpeedrunCompleteModal(null);
    setDeathScreen(null);

    // Survival mode starts the game with all unlocks:
    setHasN(true);
    hasNRef.current = true;
    setBits(10);
    bitsRef.current = 10;
    setSubPart(2);
    subPartRef.current = 2;
    setResolution(10);
    resolutionRef.current = 10;
    setOvershields(5);
    overshieldsRef.current = 5;
    setIntegrity(100);

    survivalTimeRef.current = 0;
    setSurvivalTime(0);
    survivalResourcesRef.current = { hz: 0, volts: 0, baud: 0 };
    survivalBoss1SpawnedRef.current = false;
    survivalBoss2SpawnedRef.current = false;
    setActiveSurvivalBoss('none');
    activeSurvivalBossRef.current = 'none';

    pulsesRef.current = [];
    playerXRef.current = 240;
    runPulsesRef.current = 0;
    runTimeRef.current = 0;
    currentGenreRef.current = 'arcade_techno';
    currentZoneRef.current = 'easy';
    soundEngine.setMusicPacing('arcade_techno', 'easy');

    onUpdateState(prev => ({
      ...prev,
      gameMode: 'survival',
      act1PurchasedN: true,
      currentN: 2,
      act1Bits: 10,
      act1SubPart: 2,
      act1Resolution: 10,
      hasAttemptedSurvival: true,
    }));

    onLogAction("SURVIVAL MODE ENGAGED: All unlocks granted! Difficulty begins at regular and escalates past Crazy to Difficult!");
  };

  const handleStartArcadeMode = () => {
    soundEngine.setBossMusic(false);
    setGameMode('arcade');
    gameModeRef.current = 'arcade';
    setArcadeKillModal(null);
    setArcadeVictoryModal(null);
    setSpeedrunCompleteModal(null);
    setSurvivalDeathModal(null);
    setDeathScreen(null);
    setStoryCompleteModal(null);

    // Arcade starts at start of story mode state (0D Void, 0 Bits) with 1 Life
    runHzRef.current = 0;
    runVoltsRef.current = 0;
    runBaudRef.current = 0;
    setRunHz(0);
    setRunVolts(0);
    setRunBaud(0);

    setHasN(false);
    hasNRef.current = false;
    setBits(0);
    bitsRef.current = 0;
    setSubPart(1);
    subPartRef.current = 1;
    setResolution(0);
    resolutionRef.current = 0;
    setAct1Phase('void');
    phaseRef.current = 'void';
    setIntegrity(100);
    setOvershields(0);
    overshieldsRef.current = 0;

    arcadeLivesRef.current = 1;
    setArcadeLives(1);
    arcadeTimeRef.current = 0;
    setArcadeTime(0);

    pulsesRef.current = [];
    playerXRef.current = 240;
    runPulsesRef.current = 0;
    runTimeRef.current = 0;
    currentGenreRef.current = 'slow_waltz';
    currentZoneRef.current = 'easy';
    soundEngine.setMusicPacing('slow_waltz', 'easy');

    onUpdateState(prev => ({
      ...prev,
      gameMode: 'arcade',
      act1PurchasedN: false,
      currentN: 0,
      act1Bits: 0,
      act1SubPart: 1,
      act1Resolution: 0,
      act1Phase: 'void',
      overshields: 0,
      arcadeLives: 1,
      arcadeTime: 0,
      resources: {
        ...prev.resources,
        hertz: 0,
        volts: 0,
        baud: 0,
      },
    }));

    onLogAction("🕹️ ARCADE MODE ENGAGED: Starting from 0D Void with 1 Life! Scales to Hard at 8 Bits. Second life unlocks at N=1!");
  };

  // Death Screen Trigger (reads refs for 100% accurate resource banking)
  const triggerDeath = (reason: string) => {
    if (deathScreenRef.current || survivalDeathModal || arcadeKillModal || arcadeVictoryModal) return;

    soundEngine.setBossMusic(false);
    bossImmunityCooldownRef.current = 0;
    pulsesRef.current = [];

    const hzGained = runHzRef.current;
    const vGained = runVoltsRef.current;
    const baudGained = runBaudRef.current;

    const currentTotalHz = stateRef.current.resources.hertz + hzGained;
    const currentTotalV = stateRef.current.resources.volts + vGained;
    const currentTotalBaud = stateRef.current.resources.baud + baudGained;

    // Save collected run resources to global state persistently!
    onUpdateState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        hertz: prev.resources.hertz + hzGained,
        volts: prev.resources.volts + vGained,
        baud: prev.resources.baud + baudGained,
      },
    }));

    // Arcade Mode Death / Life Check
    if (gameModeRef.current === 'arcade') {
      if (arcadeLivesRef.current > 1) {
        arcadeLivesRef.current -= 1;
        setArcadeLives(1);
        setIntegrity(100);
        damageFlashRef.current = 1;
        screenShakeRef.current = 16;
        soundEngine.playHitSound('quantum');
        addCombatText('💔 LIFE EXPENDED! [1 LIFE REMAINING]', playerXRef.current, 190, '#ff4466');
        onLogAction(`⚠️ ARCADE DAMAGE: Blow absorbed! Life expended (1 LIFE REMAINING).`);
        bossImmunityCooldownRef.current = 45;
        return;
      }

      // Single life exhausted: Kill Screen!
      const finalTime = arcadeTimeRef.current;
      const currentPart = subPartRef.current;
      const currentB = bitsRef.current;
      const currentR = resolutionRef.current;
      const isPart1Boss = phaseRef.current === 'boss';
      const isPart2Boss = currentPart === 2 && currentR >= 9;

      let stageName = !hasNRef.current ? '0D Void (Pre-N=1)' : `Bit ${currentB}`;
      let stageNum = !hasNRef.current ? 0 : currentB;
      if (isPart1Boss) {
        stageName = `Boss 1: Corrupted Sovereign (Bit 9)`;
        stageNum = 9.5;
      } else if (currentPart === 2) {
        stageNum = 10 + currentR;
        const resUpgrade = RESOLUTION_UPGRADES[Math.min(RESOLUTION_UPGRADES.length - 1, Math.max(0, currentR - 1))];
        stageName = `Resolution ${currentR} (${resUpgrade?.fps || '60 FPS'})`;
        if (isPart2Boss) {
          stageName = `Boss 2: Fracture Sovereign (Res ${currentR})`;
          stageNum = 19.5;
        }
      }

      setArcadeKillModal({
        stageName,
        stageNum,
        time: finalTime,
        reason,
      });

      onUpdateState(prev => {
        const curBestStageNum = prev.highScores?.arcadeBestStageNum || 0;
        const curBestTime = prev.highScores?.arcadeBestTime || 0;
        const isNewStageRecord = stageNum > curBestStageNum;
        const isNewTimeRecord = stageNum === curBestStageNum ? finalTime > curBestTime : isNewStageRecord;

        return {
          ...prev,
          arcadeTime: finalTime,
          arcadeFurthestStage: stageName,
          arcadeFurthestStageNum: stageNum,
          arcadeLives: 0,
          highScores: {
            ...prev.highScores,
            arcadeBestStage: isNewStageRecord ? stageName : (prev.highScores?.arcadeBestStage || stageName),
            arcadeBestStageNum: Math.max(curBestStageNum, stageNum),
            arcadeBestTime: isNewTimeRecord ? finalTime : (prev.highScores?.arcadeBestTime || finalTime),
          },
        };
      });

      onLogAction(`💀 ARCADE RUN TERMINATED at ${stageName} after ${formatTime(finalTime)}. Record saved in Records Vault.`);
      return;
    }

    // Survival Mode Death: specialized summary screen
    if (gameModeRef.current === 'survival') {
      const finalSurvTime = survivalTimeRef.current;
      const finalSurvRes = {
        hertz: survivalResourcesRef.current.hz + hzGained,
        volts: survivalResourcesRef.current.volts + vGained,
        baud: survivalResourcesRef.current.baud + baudGained,
      };
      setHasAttemptedSurvival(true);
      setSurvivalDeathModal({
        time: finalSurvTime,
        resources: {
          hz: finalSurvRes.hertz,
          volts: finalSurvRes.volts,
          baud: finalSurvRes.baud,
        },
      });
      onUpdateState(prev => {
        const curBestTime = prev.highScores?.survivalBestTime || 0;
        const isNewBest = finalSurvTime > curBestTime;
        return {
          ...prev,
          hasAttemptedSurvival: true,
          survivalTime: finalSurvTime,
          survivalResourcesCollected: finalSurvRes,
          highScores: {
            ...prev.highScores,
            survivalBestTime: isNewBest ? finalSurvTime : curBestTime,
            survivalBestResources: isNewBest ? finalSurvRes : prev.highScores?.survivalBestResources,
          },
        };
      });
      onLogAction(`SURVIVAL COLLAPSED after ${formatTime(finalSurvTime)}! Collected +${hzGained} Hz, +${vGained} V, +${baudGained} Flux.`);
      return;
    }

    // Record cumulative runs attempted across player's campaign
    onUpdateState(prev => ({
      ...prev,
      totalRuns: (prev.totalRuns || 1) + 1,
    }));

    if (gameModeRef.current === 'speedrun') {
      speedrunRunsRef.current += 1;
      setSpeedrunRuns(speedrunRunsRef.current);
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 25, 40]);
      } catch {}
    }

    if (subPartRef.current === 2) {
      // Phase 2: Frame Rate / Resolution Progression (1 to 10)
      const nextResIdx = Math.min(RESOLUTION_UPGRADES.length - 1, resolutionRef.current);
      const upgrade = RESOLUTION_UPGRADES[nextResIdx];
      const screen: DeathScreenState = {
        active: true,
        collectedHz: hzGained,
        collectedV: vGained,
        collectedBaud: baudGained,
        costHz: upgrade.costHz,
        costV: upgrade.costV,
        costBaud: upgrade.costBaud,
        target: 'resolution',
        currentResolution: resolutionRef.current,
        upgradeName: upgrade.name,
        upgradeDesc: `${upgrade.fps} · ${upgrade.desc}`,
        message: `PERIMETER COLLAPSED.\nCOLLECTED: +${hzGained} HZ, +${vGained} V, +${baudGained} FLUX.\nBANKED: ${currentTotalHz} HZ, ${currentTotalV} V, ${currentTotalBaud} FLUX.\nCOMPILE ${upgrade.name}?`,
      };
      setDeathScreen(screen);
      onLogAction(`Resolution perimeter collapsed. Collected +${hzGained} Hz, +${vGained} V, +${baudGained} Flux. Banked: ${currentTotalHz} Hz, ${currentTotalV} V, ${currentTotalBaud} Flux. Compile ${upgrade.name}?`);
    } else if (!hasN) {
      // Phase 0: Asking to buy N (Equal cost: 2 Hz and 2 V)
      const screen: DeathScreenState = {
        active: true,
        collectedHz: hzGained,
        collectedV: vGained,
        collectedBaud: baudGained,
        costHz: 2,
        costV: 2,
        target: 'N',
        upgradeName: 'N = 1: The Stationary Pixel',
        upgradeDesc: 'Compiles the single stationary white pixel in the void and displays N = 1 in the top left corner.',
        message: `OH NO YOU DIED.\nYOU COLLECTED ${hzGained} HZ AND ${vGained} V.\nYOU NOW HAVE ${currentTotalHz} HZ AND ${currentTotalV} V.\nSPEND 2 HZ AND 2 V FOR 1 N?`,
      };
      setDeathScreen(screen);
      onLogAction(`Entity dissolved in 0-bit void. Collected ${hzGained} HZ, ${vGained} V. Spend 2 HZ & 2 V for 1 N?`);
    } else {
      // Phase 1: Asking to buy next Bit (Equal cost: X Hz and X V)
      const nextBitIdx = Math.min(BIT_GRAPHICS_UPGRADES.length - 1, bitsRef.current);
      const upgrade = BIT_GRAPHICS_UPGRADES[nextBitIdx];
      const screen: DeathScreenState = {
        active: true,
        collectedHz: hzGained,
        collectedV: vGained,
        collectedBaud: baudGained,
        costHz: upgrade.costHz,
        costV: upgrade.costV,
        target: 'bit',
        upgradeName: upgrade.name,
        upgradeDesc: upgrade.desc,
        message: `OH NO YOU DIED.\nYOU COLLECTED ${hzGained} HZ AND ${vGained} V.\nYOU NOW HAVE ${currentTotalHz} HZ AND ${currentTotalV} V.\nSPEND ${upgrade.costHz} HZ AND ${upgrade.costV} V TO COMPILE ${upgrade.name}?\n"${upgrade.desc}"`,
      };
      setDeathScreen(screen);
      onLogAction(`Perimeter dissolved. Collected ${hzGained} HZ, ${vGained} V. Next upgrade: ${upgrade.name} (${upgrade.costHz} Hz, ${upgrade.costV} V).`);
    }

    pulsesRef.current = [];
  };

  // Handle Continue from Death Screen
  const handleContinueAfterDeath = () => {
    if (deathBufferSecondsRef.current > 0) return;
    setDeathScreen(null);
    setIntegrity(100);
    setOvershields(0);
    overshieldsRef.current = 0;
    runHzRef.current = 0;
    runVoltsRef.current = 0;
    runBaudRef.current = 0;
    setRunHz(0);
    setRunVolts(0);
    setRunBaud(0);
    pulsesRef.current = [];
    playerXRef.current = 240;
    runPulsesRef.current = 0;
    runTimeRef.current = 0;
    mathBurstStepRef.current = 0;
    currentGenreRef.current = 'slow_waltz';
    currentZoneRef.current = 'easy';
    currentMusicStageRef.current = 'slow_waltz';
    soundEngine.setMusicPacing('slow_waltz', 'easy');
    soundEngine.setBossMusic(false);
    troughTrainActiveRef.current = false;
    bossMissesRef.current = 0;
    bossImmunityCooldownRef.current = 0;
    setBossHp(MAX_BOSS_1_HP);
    setBoss2Hp(MAX_BOSS_2_HP);
    redErrorZonesRef.current = [];
    topWavesSpawnedRef.current = 0;
    bottomWavesSpawnedRef.current = 0;
    combatTextsRef.current = [];
    bossHitFlashRef.current = 0;
  };

  // Handle Purchasing N, Bit, or Resolution Upgrade
  const handlePurchaseUpgrade = () => {
    if (!deathScreen || deathBufferSecondsRef.current > 0) return;

    if (deathScreen.target === 'N') {
      if (gameState.resources.hertz >= deathScreen.costHz && gameState.resources.volts >= deathScreen.costV) {
        onUpdateState(prev => ({
          ...prev,
          currentN: 1,
          act1PurchasedN: true,
          act1Phase: 'point',
          resources: {
            ...prev.resources,
            hertz: prev.resources.hertz - deathScreen.costHz,
            volts: prev.resources.volts - deathScreen.costV,
          },
        }));
        setHasN(true);
        hasNRef.current = true;
        setAct1Phase('point');
        phaseRef.current = 'point';
        if (gameModeRef.current === 'arcade') {
          arcadeLivesRef.current = 2;
          setArcadeLives(2);
          addCombatText('💖 +1 LIFE UNLOCKED (N=1)! [LIVES: 2]', playerXRef.current, 190, '#ff55bb');
          onLogAction("💖 ARCADE LIFE GRANTED: N=1 materialized! Extra life awarded (Total Lives = 2)!");
        }
        soundEngine.triggerNote('G4');
        soundEngine.playCadenceResolution();
        onLogAction("BOUGHT 1 N! N=1 materialized in the top-left corner. A single stationary white pixel appears in the void.");
        handleContinueAfterDeath();
      }
    } else if (deathScreen.target === 'bit') {
      if (gameState.resources.hertz >= deathScreen.costHz && gameState.resources.volts >= deathScreen.costV) {
        const nextBits = Math.min(10, bits + 1);
        const upgrade = BIT_GRAPHICS_UPGRADES[nextBits - 1];
        setBits(nextBits);
        onUpdateState(prev => ({
          ...prev,
          act1Bits: nextBits,
          engineCompilePercent: Math.min(100, prev.engineCompilePercent + 8),
          resources: {
            ...prev.resources,
            hertz: prev.resources.hertz - deathScreen.costHz,
            volts: prev.resources.volts - deathScreen.costV,
          },
        }));

        soundEngine.triggerNote('G4');
        soundEngine.playCadenceResolution();
        onLogAction(`COMPILED ${upgrade.name}! Graphical engine updated to ${nextBits}-bit (${Math.pow(2, nextBits)} colors): ${upgrade.desc}`);

        if (nextBits === 8) {
          onLogAction("8TH BIT COMPILED! NEUTRALizer polarizer mode (■ Neutral -> +40 HP, Am chord) unlocked before boss fight!");
        } else if (nextBits === 9 && act1Phase !== 'boss' && act1Phase !== 'ray') {
          setAct1Phase('boss');
          onUpdateState(prev => ({ ...prev, act1Phase: 'line_segment' }));
          onLogAction("9TH BIT COMPILED! Destination point locked by Corrupted Sovereign. Boss encounter initiated!");
        } else if (nextBits === 10) {
          // Unlocks Part Two!
          setSubPart(2);
          subPartRef.current = 2;
          setResolution(0);
          resolutionRef.current = 0;
          onUpdateState(prev => ({
            ...prev,
            act1Phase: 'point',
            act1SubPart: 2,
            act1Resolution: 0,
            currentN: 2,
          }));
          onLogAction("✦ 10TH BIT COMPILED! PART ONE COMPLETE! Dimensional Revelation: You discover the secretly gathered DIRECTIONAL FLUX (Baud). Welcome to Part Two: Frame Rate & Resolution!");
        }

        handleContinueAfterDeath();
      }
    } else if (deathScreen.target === 'resolution') {
      const costBaud = deathScreen.costBaud || 0;
      if (
        gameState.resources.baud >= costBaud &&
        gameState.resources.hertz >= deathScreen.costHz &&
        gameState.resources.volts >= deathScreen.costV
      ) {
        const nextRes = Math.min(10, resolution + 1);
        const upgrade = RESOLUTION_UPGRADES[nextRes - 1];
        setResolution(nextRes);
        resolutionRef.current = nextRes;
        onUpdateState(prev => ({
          ...prev,
          act1Resolution: nextRes,
          resources: {
            ...prev.resources,
            baud: prev.resources.baud - costBaud,
            hertz: prev.resources.hertz - deathScreen.costHz,
            volts: prev.resources.volts - deathScreen.costV,
          },
        }));

        soundEngine.triggerNote('C5');
        soundEngine.playCadenceResolution();
        onLogAction(`COMPILED ${upgrade.name} (${upgrade.fps})! ${upgrade.desc}`);

        if (nextRes === 1) {
          onLogAction("RESOLUTION 1 COMPILED: Overshields unlocked! Squares at 100 HP grant +20 Overshield (up to 10 stacks / 300 effective HP).");
        } else if (nextRes === 2) {
          onLogAction("RESOLUTION 2 COMPILED: 1D Line Mobility unlocked! Use touch joystick, scroll wheel, or A/D keys to navigate line. Red error zones now spawn across the line!");
        } else if (nextRes === 6) {
          onLogAction("RESOLUTION 6 COMPILED: The Harmonic Slit recognized! Center sector yields 2x resources!");
        } else if (nextRes === 7) {
          onLogAction("RESOLUTION 7 COMPILED: The Attenuation Zone discovered! Left sector slows incoming pulses!");
        } else if (nextRes === 8) {
          onLogAction("RESOLUTION 8 COMPILED: Emitter Maw recognized! Right sector yields 4x resources at high projectile velocity!");
        } else if (nextRes === 9) {
          onLogAction("RESOLUTION 9 COMPILED: FRACTURE SOVEREIGN ENGAGED! Boss can only be damaged when player occupies the targeted line sector!");
        } else if (nextRes === 10) {
          onLogAction("✦ RESOLUTION 10 COMPILED! MASTER TRANSCENDENCE ACHIEVED! You have fully mastered Game N!");
        }

        handleContinueAfterDeath();
      }
    }
  };

  // Cycle Active Polarizer (called by Spacebar, touch on canvas, or the Opaque Polarizer Button)
  const cyclePolarizer = () => {
    if (isMainMenuOpenRef.current) return;
    // Start carrier audio if not yet engaged
    if (!stateRef.current.carrierActive) {
      handleStartAudio();
    }

    soundEngine.playBassDrum(); // Kick drum sound effect on every change of polarizer

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch {}
    }

    let next: -1 | 0 | 1;
    if (bitsRef.current < 8 && subPartRef.current === 1) {
      // Up (1) or Down (-1) are the starting available modes for the polarizer:
      next = polarityRef.current === 1 ? -1 : 1;
    } else {
      // The ability to neutralize the polarizer unlocks at the 8th bit:
      // Cycle through all 3 modes: Up (1) -> Down (-1) -> Neutral (0)
      next = polarityRef.current === 1 ? -1 : polarityRef.current === -1 ? 0 : 1;
    }
    setPlayerPolarity(next);
    polarityRef.current = next;
    onUpdateState(s => ({ ...s, polarity: next }));
  };

  // Handle moving along the line in Part Two (for touch drag, keyboard keys, or mobile gestures)
  const handleMoveAlongLine = (direction: -1 | 1, stepMultiplier = 1) => {
    if (subPartRef.current !== 2 || resolutionRef.current < 2) return;
    const res = resolutionRef.current;
    const agility =
      res <= 2
        ? 0.08
        : res === 3
        ? 0.25
        : res === 4
        ? 0.55
        : res === 5
        ? 0.85
        : 1.0;
    const step = direction * 28 * agility * stepMultiplier;
    const TRACE_START = 80;
    const TRACE_END = 920 - 80;
    playerXRef.current = Math.max(
      TRACE_START + 10,
      Math.min(TRACE_END - 20, playerXRef.current + step)
    );
  };

  // Mouse wheel listener for desktop Part Two navigation
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isMainMenuOpenRef.current || subPartRef.current !== 2 || resolutionRef.current < 2) return;
      e.preventDefault();
      // Sluggish early on at Resolution 2 so player has to aggressively spin it, improving with Resolution upgrades:
      const agility =
        resolutionRef.current <= 2
          ? 0.08
          : resolutionRef.current === 3
          ? 0.25
          : resolutionRef.current === 4
          ? 0.55
          : resolutionRef.current === 5
          ? 0.85
          : 1.0;
      // Reversible direction based on player toggle:
      const dirSign = wheelInvertedRef.current ? (e.deltaY > 0 ? 1 : -1) : (e.deltaY > 0 ? -1 : 1);
      const delta = dirSign * 22 * agility;
      const TRACE_START = 80;
      const TRACE_END = 920 - 80;
      playerXRef.current = Math.max(
        TRACE_START + 10,
        Math.min(TRACE_END - 20, playerXRef.current + delta)
      );
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not handle gameplay keys while main menu is open
      if (isMainMenuOpenRef.current) return;

      // Key 8: Activate carrier drone
      if (e.key === '8') {
        if (!stateRef.current.audioActive) {
          handleStartAudio();
        } else {
          soundEngine.triggerNote('C4');
        }
        return;
      }

      // Invert scroll wheel direction toggle: key 'i' or 'I'
      if (e.key === 'i' || e.key === 'I') {
        toggleWheelDirection();
        onLogAction(`Scroll wheel direction toggled: ${!wheelInvertedRef.current ? 'INVERTED' : 'NORMAL'}`);
        return;
      }

      // Line Mobility (Part Two when unlocked at Res >= 2): Arrow keys or A / D
      if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && subPartRef.current === 2 && resolutionRef.current >= 2) {
        e.preventDefault();
        handleMoveAlongLine(-1);
        return;
      }
      if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && subPartRef.current === 2 && resolutionRef.current >= 2) {
        e.preventDefault();
        handleMoveAlongLine(1);
        return;
      }

      // Death screen quick keys: B to buy, Enter / C to retry run (Spacebar disabled to avoid accidental restarts!)
      if (deathScreenRef.current) {
        if (deathBufferSecondsRef.current > 0) {
          e.preventDefault();
          return;
        }
        if (e.key === 'b' || e.key === 'B') {
          handlePurchaseUpgrade();
        } else if (e.key === 'Enter' || e.key === 'c' || e.key === 'C') {
          handleContinueAfterDeath();
        }
        return;
      }

      // Escape closes options modal first if open, or opens main menu on kill screen
      if (e.key === 'Escape') {
        if (isOptionsMenuOpenRef.current) {
          e.preventDefault();
          setIsOptionsMenuOpen(false);
          return;
        }
        if (onOpenMainMenu) {
          const isKillScreen = Boolean(
            deathScreenRef.current ||
            survivalDeathModalRef.current ||
            arcadeKillModalRef.current ||
            speedrunCompleteModalRef.current ||
            arcadeVictoryModalRef.current
          );
          if (isKillScreen) {
            e.preventDefault();
            onOpenMainMenu();
          }
        }
        return;
      }

      // SPACEBAR MECHANICS & POLARITY SHORTCUTS
      // Spacebar cycles the polarizer with kick drum sound effect (only if configured to spacebar, default)
      if (e.code === 'Space') {
        const cycleInput = userSettingsRef.current?.controls?.cyclePolarizerInput ?? 'space';
        if (cycleInput === 'space') {
          e.preventDefault();
          cyclePolarizer();
        }
        return;
      }
    };

    // GLOBAL MOUSE CLICK: Left mouse click cycles polarity direction; RMB cycles if configured
    const handleGlobalMouseDown = (e: MouseEvent) => {
      // Don't cycle polarizer or start gameplay if main menu or death screen is open, or during death buffer
      if (isMainMenuOpenRef.current) return;
      if (deathScreenRef.current || deathBufferSecondsRef.current > 0) return;

      // Ignore emulated mouse events following touch interactions
      if (Date.now() - lastTouchTimeRef.current < 500) return;

      // Ignore clicks on buttons, inputs, interactive controls, or modals
      const target = e.target as HTMLElement | null;
      if (target) {
        if (
          target.closest('button') ||
          target.closest('input') ||
          target.closest('a') ||
          target.closest('header') ||
          target.closest('aside') ||
          target.closest('[role="dialog"]')
        ) {
          return;
        }
      }

      // STRICT REQUIREMENT: Tapping or clicking the left half NEVER cycles the polarizer!
      const canvas = canvasRef.current;
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const midX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      if (e.clientX < midX) {
        return;
      }

      const cycleInput = userSettingsRef.current?.controls?.cyclePolarizerInput ?? 'space';

      if (e.button === 0) {
        // Universal Left click on the right half cycles polarity
        cyclePolarizer();
      } else if (e.button === 2 && cycleInput === 'rmb') {
        // Right Mouse Button cycles polarity when RMB toggle is selected
        e.preventDefault();
        cyclePolarizer();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const cycleInput = userSettingsRef.current?.controls?.cyclePolarizerInput ?? 'space';
      if (cycleInput === 'rmb') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleGlobalMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleGlobalMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [hasN, bits, deathScreen]);

  // Main Canvas Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let tickCount = 0;
    let spawnCooldown = 0;

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;
      tickCount++;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const phase = phaseRef.current;

      const TRACE_Y = h / 2;
      const TRACE_START = 80;
      const TRACE_END = w - 80;

      // Screen Shake & Red Damage Flash
      ctx.save();
      if (screenShakeRef.current > 0) {
        const sx = (Math.random() - 0.5) * screenShakeRef.current;
        const sy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(sx, sy);
        screenShakeRef.current *= 0.86;
        if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
      }

      // When at main menu, render authentic 6-bit background image and halt entity simulation
      if (isMainMenuOpenRef.current) {
        draw6BitBackground(ctx, w, h, time);
        ctx.restore();
        animId = requestAnimationFrame(render);
        return;
      }

      // Clear Canvas & Render Living Background Scaled to Purchased Bits (0 to 10) & Resolution (Part 2)
      drawDynamicVoidBackground(
        ctx,
        w,
        h,
        bitsRef.current,
        time,
        currentZoneRef.current,
        currentGenreRef.current,
        phase,
        bossHpRef.current,
        bossMissesRef.current,
        playerXRef.current,
        TRACE_START,
        TRACE_END,
        TRACE_Y,
        subPartRef.current,
        resolutionRef.current,
        bossTargetZoneRef.current
      );

      // Red damage flash overlay
      if (damageFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 30, 60, ${damageFlashRef.current * 0.24})`;
        ctx.fillRect(-10, -10, w + 20, h + 20);
        damageFlashRef.current = Math.max(0, damageFlashRef.current - dt * 3.5);
      }

      // CRT Scanline Overlay (drawn only when bits >= 1 so 0-bit remains pure black!)
      const drawCrtOverlay = () => {
        if (!hasN || bitsRef.current === 0) return;
        ctx.fillStyle = 'rgba(0, 20, 5, 0.04)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 4) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Screen Vignette
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.65);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 8, 2, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      };

      // ---------------------------------------------------------------------
      // GAME N: CORE ENGINE (0D Void -> Point -> Line Segment -> Ray)
      // ---------------------------------------------------------------------
      const currentBits = bitsRef.current;
      const playerX = playerXRef.current;
      const paddleHalf = 14;

        // ==========================================
        // ENTITY SIMULATION (Active ONLY when alive and carrier is on)
        // ==========================================
        if (!deathScreenRef.current && stateRef.current.carrierActive) {
          // In Part 1 Boss fight: boss pulls player toward right!
          if (phase === 'boss' && subPartRef.current === 1) {
            // If player incorrectly polarizes more than 1 projectile (bossMissesRef.current > 1),
            // gravitational suction accelerates irreversibly, dragging player into the singularity!
            const pullRate = bossMissesRef.current > 1 ? 140 : bossMissesRef.current === 1 ? 26 : 14;
            playerXRef.current = Math.min(TRACE_END - 20, playerXRef.current + dt * pullRate);

            if (playerXRef.current >= TRACE_END - 24) {
              triggerDeath("SUCKED INTO CORRUPTED SINGULARITY: More than 1 failed polarization caused irreversible gravitational collapse!");
            }
          }

          // In Part 2 Boss fight (Resolution >= 9): cycle boss vulnerable target sector
          if (subPartRef.current === 2 && resolutionRef.current >= 9) {
            bossTargetTimerRef.current += dt;
            if (bossTargetTimerRef.current >= 6.5) {
              bossTargetTimerRef.current = 0;
              const zones: Array<'attenuation' | 'harmonic' | 'emitter'> = ['attenuation', 'harmonic', 'emitter'];
              const curIdx = zones.indexOf(bossTargetZoneRef.current);
              bossTargetZoneRef.current = zones[(curIdx + 1) % zones.length];
              soundEngine.playHitSound('shield');
              onLogAction(`⚡ SOVEREIGN SECTOR SHIFT: Boss is now vulnerable ONLY in [${bossTargetZoneRef.current.toUpperCase()}]!`);
            }
          }

          // Part 2 Red Error Zones: Spawning & Updating
          if (subPartRef.current === 2) {
            redErrorSpawnCooldownRef.current += dt;
            const currentPulses = runPulsesRef.current;
            const res = resolutionRef.current;
            const spawnInterval = Math.max(1.8, 3.8 - currentPulses * 0.04);

            if (redErrorSpawnCooldownRef.current >= spawnInterval) {
              redErrorSpawnCooldownRef.current = 0;
              if (res < 2) {
                // At Res < 2: Unavoidable red error zone appears directly under the stationary hero!
                redErrorZonesRef.current.push({
                  id: Date.now() + Math.random(),
                  startX: playerXRef.current - 18,
                  width: 36,
                  timeRemaining: 1.5,
                  maxTime: 1.5,
                  isWarning: true,
                });
              } else {
                // At Res >= 2: Randomly spawns along the line (player must scroll wheel away to dodge!)
                const maxZones = currentPulses > 32 ? 3 : currentPulses > 16 ? 2 : 1;
                if (redErrorZonesRef.current.length < maxZones) {
                  const randX = 100 + Math.random() * 420;
                  const randW = 38 + Math.random() * 26;
                  const duration = 2.4 + Math.min(1.4, currentPulses * 0.03);
                  redErrorZonesRef.current.push({
                    id: Date.now() + Math.random(),
                    startX: randX,
                    width: randW,
                    timeRemaining: duration,
                    maxTime: duration,
                    isWarning: true,
                  });
                }
              }
            }

            // Update & collide red error zones
            for (let z = redErrorZonesRef.current.length - 1; z >= 0; z--) {
              const zone = redErrorZonesRef.current[z];
              zone.timeRemaining -= dt;
              if (zone.maxTime - zone.timeRemaining > 0.6) {
                zone.isWarning = false;
              }

              if (!zone.isWarning) {
                if (playerXRef.current >= zone.startX - 6 && playerXRef.current <= zone.startX + zone.width + 6) {
                  screenShakeRef.current = 5;
                  damageFlashRef.current = 0.4;
                  if (overshieldsRef.current > 0) {
                    overshieldsRef.current = Math.max(0, overshieldsRef.current - dt * 2);
                    setOvershields(Math.round(overshieldsRef.current));
                  } else {
                    const tickDmg = 15 * dt;
                    const nextH = Math.max(0, integrityRef.current - tickDmg);
                    integrityRef.current = nextH;
                    setIntegrity(nextH);
                    if (nextH <= 0) {
                      triggerDeath("RED SPATIAL ERROR COLLAPSE: Stood in active hazard zone on the coordinate line!");
                    }
                  }
                }
              }

              if (zone.timeRemaining <= 0) {
                redErrorZonesRef.current.splice(z, 1);
              }
            }
          }

          // ==========================================
          // PULSE SPAWNING: 5 SPEED ZONES x 3 RHYTHM GENRES
          // Progression order: Slow Waltz -> Math Rock -> Arcade Techno
          // Speed Zones: Easy -> Medium -> Hard -> Crazy -> Difficult
          // ==========================================
          runTimeRef.current += dt;

          if (gameModeRef.current === 'speedrun' && !speedrunCompleteModal) {
            speedrunTimeRef.current += dt;
            checkAutoPurchases();
            if (tickCount % 6 === 0) {
              setSpeedrunTime(speedrunTimeRef.current);
            }
          }

          if (gameModeRef.current === 'survival' && !survivalDeathModal) {
            survivalTimeRef.current += dt;
            if (tickCount % 6 === 0) {
              setSurvivalTime(survivalTimeRef.current);
            }
          }

          if (gameModeRef.current === 'arcade' && !arcadeKillModal && !arcadeVictoryModal) {
            arcadeTimeRef.current += dt;
            checkAutoPurchases();
            if (tickCount % 6 === 0) {
              setArcadeTime(arcadeTimeRef.current);
            }
          }

          if (bossImmunityCooldownRef.current > 0) {
            bossImmunityCooldownRef.current = Math.max(0, bossImmunityCooldownRef.current - dt);
          }

          const currentPulses = runPulsesRef.current;

          // Determine current Speed Zone and Music Genre:
          let targetZone: SpeedZone = 'easy';
          let targetGenre: MusicGenre = 'slow_waltz';

          if (gameModeRef.current === 'arcade') {
            const arcadePacing = getArcadePacing(
              subPartRef.current,
              bitsRef.current,
              resolutionRef.current,
              runPulsesRef.current
            );
            targetZone = arcadePacing.zone;
            targetGenre = arcadePacing.genre;
          } else if (gameModeRef.current === 'survival') {
            // Survival mode starts at regular difficulty and progresses over time past Crazy to Difficult:
            const sTime = survivalTimeRef.current;
            if (sTime < 25) targetZone = 'easy';
            else if (sTime < 50) targetZone = 'medium';
            else if (sTime < 75) targetZone = 'hard';
            else if (sTime < 100) targetZone = 'crazy';
            else targetZone = 'difficult'; // "progresses in difficulty past crazy to a higher difficulty level called 'difficult'"
            targetGenre = 'arcade_techno';

            // Survival Mode Boss Spawns:
            // "In the survival mode, the first boss spawns at 1 minutes and the second boss spawns at 2 minutes."
            if (sTime >= 60 && !survivalBoss1SpawnedRef.current) {
              survivalBoss1SpawnedRef.current = true;
              setActiveSurvivalBoss('boss1');
              activeSurvivalBossRef.current = 'boss1';
              setBossHp(MAX_BOSS_1_HP);
              bossHpRef.current = MAX_BOSS_1_HP;
              soundEngine.setBossMusic(true);
              onLogAction("⚠️ SURVIVAL CRISIS (1 MINUTE): CORRUPTED SOVEREIGN HAS INFILTRATED THE LINE!");
              addCombatText("⚠️ BOSS 1: CORRUPTED SOVEREIGN!", 460, 160, '#ff4466');
            }

            if (sTime >= 120 && !survivalBoss2SpawnedRef.current) {
              survivalBoss2SpawnedRef.current = true;
              setActiveSurvivalBoss('boss2');
              activeSurvivalBossRef.current = 'boss2';
              setBoss2Hp(MAX_BOSS_2_HP);
              boss2HpRef.current = MAX_BOSS_2_HP;
              soundEngine.setBossMusic(true);
              onLogAction("⚠️ SURVIVAL CRISIS (2 MINUTES): FRACTURE SOVEREIGN HAS ENGAGED!");
              addCombatText("⚠️ BOSS 2: FRACTURE SOVEREIGN!", 460, 160, '#ff4466');
            }
          } else if (phase === 'boss' && subPartRef.current === 1) {
            // First Boss Encounter (Corrupted Sovereign, Bit 9):
            // "make the first boss fight even harder. Start us at the hard difficulty setting and increase as per usual."
            if (currentPulses <= 12) {
              targetZone = 'hard';
              targetGenre = 'slow_waltz';
            } else if (currentPulses <= 28) {
              targetZone = 'hard';
              targetGenre = 'math_rock';
            } else if (currentPulses <= 44) {
              targetZone = 'hard';
              targetGenre = 'arcade_techno';
            } else {
              targetZone = 'crazy';
              targetGenre = ((currentPulses - 44) % 32 < 16) ? 'math_rock' : 'arcade_techno';
            }
          } else {
            // Standard Runs:
            if (currentPulses <= 8) {
              targetZone = 'easy';
              targetGenre = 'slow_waltz';
            } else if (currentPulses <= 24) {
              targetZone = 'easy';
              targetGenre = 'math_rock';
            } else if (currentPulses <= 40) {
              targetZone = 'easy';
              targetGenre = 'arcade_techno';
            } else if (currentPulses <= 48) {
              targetZone = 'medium';
              targetGenre = 'slow_waltz';
            } else if (currentPulses <= 64) {
              targetZone = 'medium';
              targetGenre = 'math_rock';
            } else if (currentPulses <= 80) {
              targetZone = 'medium';
              targetGenre = 'arcade_techno';
            } else if (currentPulses <= 88) {
              targetZone = 'hard';
              targetGenre = 'slow_waltz';
            } else if (currentPulses <= 104) {
              targetZone = 'hard';
              targetGenre = 'math_rock';
            } else if (currentPulses <= 120) {
              targetZone = 'hard';
              targetGenre = 'arcade_techno';
            } else if (currentPulses <= 128) {
              targetZone = 'crazy';
              targetGenre = 'slow_waltz';
            } else if (currentPulses <= 144) {
              targetZone = 'crazy';
              targetGenre = 'math_rock';
            } else {
              targetZone = 'crazy';
              targetGenre = 'arcade_techno';
            }
          }

          // Check Dramatic Boss Music
          const isBossActive =
            (phase === 'boss' && bossHpRef.current > 0) ||
            (subPartRef.current === 2 && resolutionRef.current >= 9 && boss2HpRef.current > 0) ||
            (gameModeRef.current === 'survival' && activeSurvivalBossRef.current !== 'none');

          if (isBossActive) {
            if (!soundEngine.isBossMusicActive()) {
              soundEngine.setBossMusic(true);
            }
          } else {
            if (soundEngine.isBossMusicActive()) {
              soundEngine.setBossMusic(false);
            }
          }

          if (targetGenre !== currentGenreRef.current || targetZone !== currentZoneRef.current) {
            const prevZ = currentZoneRef.current;
            currentZoneRef.current = targetZone;
            currentGenreRef.current = targetGenre;
            currentMusicStageRef.current = targetGenre;
            soundEngine.setMusicPacing(targetGenre, targetZone);

            const zoneName = targetZone.toUpperCase();
            const genreName = targetGenre.replace('_', ' ').toUpperCase();
            const bpm = soundEngine.getBpm();

            if (targetZone !== prevZ) {
              onLogAction(`⚡ SPEED ZONE ESCALATION: [ZONE: ${zoneName}] // ${genreName} (${bpm} BPM)!`);
            } else {
              onLogAction(`🎵 RHYTHMIC PROGRESSION: [ZONE: ${zoneName}] -> ${genreName} (${bpm} BPM)!`);
            }
          }

          spawnCooldown++;

          // Dynamic spawn cooldown and pulse velocity tailored to Zone & Genre:
          let cooldownThreshold = 74;
          let pulseSpeed = -2.5;

          if (targetZone === 'easy') {
            if (targetGenre === 'slow_waltz') {
              cooldownThreshold = 76;
              pulseSpeed = -2.4;
            } else if (targetGenre === 'math_rock') {
              const mathDelays = [22, 22, 54, 26, 46];
              cooldownThreshold = mathDelays[mathBurstStepRef.current % mathDelays.length];
              const quirkyMod = ((currentPulses * 5) % 4) * 0.12;
              pulseSpeed = -(2.8 + quirkyMod);
            } else {
              // arcade_techno
              cooldownThreshold = (currentPulses % 2 === 1 ? 22 : 44);
              pulseSpeed = -3.2;
            }
          } else if (targetZone === 'medium') {
            if (targetGenre === 'slow_waltz') {
              cooldownThreshold = 62;
              pulseSpeed = -3.3;
            } else if (targetGenre === 'math_rock') {
              const mathDelays = [16, 16, 38, 19, 32];
              cooldownThreshold = mathDelays[mathBurstStepRef.current % mathDelays.length];
              const quirkyMod = ((currentPulses * 5) % 4) * 0.16;
              pulseSpeed = -(3.8 + quirkyMod);
            } else {
              // arcade_techno
              cooldownThreshold = (currentPulses % 2 === 1 ? 16 : 32);
              pulseSpeed = -4.3;
            }
          } else if (targetZone === 'hard') {
            if (targetGenre === 'slow_waltz') {
              cooldownThreshold = 48;
              pulseSpeed = -4.4;
            } else if (targetGenre === 'math_rock') {
              const mathDelays = [12, 12, 28, 14, 24];
              cooldownThreshold = mathDelays[mathBurstStepRef.current % mathDelays.length];
              const quirkyMod = ((currentPulses * 5) % 4) * 0.20;
              pulseSpeed = -(5.0 + quirkyMod);
            } else {
              // arcade_techno
              cooldownThreshold = (currentPulses % 2 === 1 ? 11 : 24);
              pulseSpeed = -5.6;
            }
          } else if (targetZone === 'crazy') {
            if (targetGenre === 'slow_waltz') {
              cooldownThreshold = 36;
              pulseSpeed = -5.6;
            } else if (targetGenre === 'math_rock') {
              const mathDelays = [8, 8, 18, 10, 16];
              cooldownThreshold = mathDelays[mathBurstStepRef.current % mathDelays.length];
              const quirkyMod = ((currentPulses * 5) % 4) * 0.25;
              pulseSpeed = -(6.4 + quirkyMod);
            } else {
              // arcade_techno
              cooldownThreshold = (currentPulses % 3 === 0 ? 8 : 16);
              pulseSpeed = -7.2;
            }
          } else {
            // difficult: intense velocity and frequency
            cooldownThreshold = (currentPulses % 3 === 0 ? 6 : 13);
            pulseSpeed = -8.5;
          }

          if (spawnCooldown >= cooldownThreshold) {
            spawnCooldown = 0;
            runPulsesRef.current++;
            mathBurstStepRef.current++;

            let chosenKind: 'top' | 'bottom' | 'square' = 'top';
            let chosenPol: -1 | 0 | 1 = 1;
            let chosenColor = '#55ff99';
            let chosenRes: 'hz' | 'volts' | 'baud' = 'hz';

            // Ability to spawn neutral packets unlocks at Bit 8, during boss fight, in Part Two, or during survival boss:
            const isAnyBoss = (phase === 'boss' || activeSurvivalBossRef.current !== 'none');
            const canSpawnPackets = (currentBits >= 8 || isAnyBoss || subPartRef.current === 2);
            // Spawn packet every 3 pulses during boss fight so player can regularly deflect damage and beat boss:
            const isPacketStep = canSpawnPackets && (currentPulses % (isAnyBoss ? 3 : 5) === 0);

            if (isPacketStep) {
              chosenKind = 'square';
              chosenPol = 0;
              chosenColor = '#66ccff';
              chosenRes = 'baud';
            } else {
              // Wave Generation with dynamic balance guarantee:
              // Review reserves: ensure on average player receives equal Hz and Volts across runs!
              const totalHz = stateRef.current.resources.hertz + runHzRef.current;
              const totalV = stateRef.current.resources.volts + runVoltsRef.current;
              const hzVDiscrepancy = totalV - totalHz;

              let waveType: 'top' | 'bottom' = 'top';

              // If severe imbalance in reserves, auto-equalize wave spawn rates:
              if (hzVDiscrepancy >= 8) {
                // Too many Volts, player urgently needs Hz! 80% Crests (top)
                waveType = Math.random() < 0.8 ? 'top' : 'bottom';
              } else if (hzVDiscrepancy <= -8) {
                // Too many Hz, player needs Volts! 80% Troughs (bottom)
                waveType = Math.random() < 0.8 ? 'bottom' : 'top';
              } else {
                // Balanced! Use the progressive rhythm patterns:
                if (targetZone === 'easy') {
                  // Strict 50/50 alternation based on actual wave count so packet skips don't bias:
                  waveType = (topWavesSpawnedRef.current <= bottomWavesSpawnedRef.current) ? 'top' : 'bottom';
                } else if (targetZone === 'medium') {
                  const medPattern: Array<'top' | 'bottom'> = [
                    'top', 'top', 'bottom', 'bottom',
                    'top', 'bottom', 'bottom', 'top'
                  ];
                  waveType = medPattern[currentPulses % medPattern.length];
                } else if (targetZone === 'hard') {
                  const hardPattern: Array<'top' | 'bottom'> = [
                    'top', 'top', 'top', 'bottom', 'bottom', 'bottom',
                    'top', 'bottom', 'bottom', 'top'
                  ];
                  waveType = hardPattern[currentPulses % hardPattern.length];
                } else {
                  const crazyPattern: Array<'top' | 'bottom'> = [
                    'top', 'bottom', 'bottom', 'top',
                    'top', 'top', 'bottom', 'bottom',
                    'top', 'bottom', 'top', 'bottom'
                  ];
                  waveType = crazyPattern[currentPulses % crazyPattern.length];
                }
              }

              if (waveType === 'top') {
                topWavesSpawnedRef.current++;
                chosenKind = 'top';
                chosenPol = 1;
                chosenColor = '#55ff99';
                chosenRes = 'hz';
              } else {
                bottomWavesSpawnedRef.current++;
                chosenKind = 'bottom';
                chosenPol = -1;
                chosenColor = '#ff66aa';
                chosenRes = 'volts';
              }
            }

            let effectiveSpeed = pulseSpeed;
            if (subPartRef.current === 2) {
              if (playerX < 240) effectiveSpeed *= 0.65; // Attenuation zone slows pulses
              else if (playerX >= 430) effectiveSpeed *= 1.45; // Emitter Maw accelerates pulses
            }

            pulsesRef.current.push({
              x: TRACE_END,
              speed: effectiveSpeed,
              pol: chosenPol,
              kind: chosenKind,
              color: chosenColor,
              res: chosenRes,
              amplitude: 28,
              reflected: false,
              id: Date.now() + Math.random(),
            });
          }
        }

        // ==========================================
        // GRAPHICAL PIPELINE RENDERING PER PHASE & BITS
        // ==========================================
        if (!hasN) {
          // ------------------------------------------
          // 0-BIT: THE BLACK SCREEN (ACOUSTIC VOID)
          // ------------------------------------------
          // "The screen is black. There is a tone consistently playing... N=0"
          // Absolutely black screen. No pixels, no traces drawn.
          if (!stateRef.current.carrierActive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
            ctx.fillRect(w / 2 - 250, h / 2 - 42, 500, 84);
            ctx.strokeStyle = '#33ff66';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(w / 2 - 250, h / 2 - 42, 500, 84);

            ctx.fillStyle = '#33ff66';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('CARRIER STANDBY // C MAJOR AUDIO CARRIER', w / 2, h / 2 - 14);
            ctx.fillStyle = '#a3ffb8';
            ctx.font = '11px monospace';
            const isTouchActive = isMobile || (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
            ctx.fillText(isTouchActive ? 'TAP ANYWHERE TO ENGAGE SOUNDTRACK' : 'CLICK [LMB], TAP OR PRESS [SPACEBAR] TO ENGAGE SOUNDTRACK', w / 2, h / 2 + 8);
            ctx.fillText('0-BIT ACOUSTIC VOID — SCREEN IS BLACK', w / 2, h / 2 + 26);
            ctx.textAlign = 'start';
          }
          // When carrier is active, the screen is 100% pure black 0-bit.
        } else if (currentBits === 0) {
          // ------------------------------------------
          // N = 1 (0 BITS): THE SINGLE STATIONARY WHITE PIXEL
          // ------------------------------------------
          // "They purchase N and the white pixel appears...
          // N = 1 appears in the top left corner. Player hits continue but this time,
          // N remains in the top left corner. A single white pixel [appears in the center]."
          ctx.fillStyle = '#ffffff';
          ctx.font = '13px monospace';
          ctx.fillText('N = 1', 24, 26);

          // A single white stationary pixel right at the center coordinates
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(playerX - 2, TRACE_Y - 2, 4, 4);
        } else if (phase === 'point' || phase === 'boss') {
          // ------------------------------------------
          // 1-BIT UP TO 9-BIT GRAPHICS PIPELINE
          // ------------------------------------------

          // ==========================================
          // STATIONARY COORDINATE LINE (LINEAR PROGRESSION)
          // Always stationary at TRACE_Y connecting TRACE_START to TRACE_END.
          // Built with an ultra-high contrast dark underlay and brilliant glowing core
          // ensuring crystal-clear visibility against all backgrounds and nebular gases.
          // ==========================================

          const isPart2 = subPartRef.current === 2;
          const currentRes = resolutionRef.current;

          // 1. HIGH-CONTRAST UNDERLAY (Ensures 100% contrast over all gases and nebulae)
          const baseLineWidth = isPart2 ? (2.6 + Math.min(10, currentRes) * 0.22) : (2.0 + Math.min(10, currentBits) * 0.15);
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.94)';
          ctx.lineWidth = baseLineWidth + 4;
          ctx.beginPath();
          ctx.moveTo(TRACE_START, TRACE_Y);
          ctx.lineTo(TRACE_END, TRACE_Y);
          ctx.stroke();
          ctx.restore();

          if (!isPart2) {
            // ------------------------------------------
            // PART 1: BITS 1 TO 10 LINEAR PROGRESSION
            // ------------------------------------------

            // Bit 1: Crisp Phosphor Green Scanline Beam
            // Bit 2: Dashed Vector Trajectory
            // Bit 3+: Solidifying Phosphor Laser with Neon Glow
            ctx.save();
            if (currentBits === 2) {
              ctx.setLineDash([8, 8]);
              ctx.strokeStyle = '#44ff88';
              ctx.lineWidth = 2.2;
            } else if (currentBits < 3) {
              ctx.strokeStyle = '#33ff77';
              ctx.lineWidth = 2.0;
            } else if (currentBits < 6) {
              ctx.strokeStyle = '#33ff88';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#33ff88';
              ctx.shadowBlur = 6;
            } else {
              // Bit 6+: Multi-layer glowing laser
              ctx.strokeStyle = currentBits >= 8 ? '#00ffaa' : '#33ff99';
              ctx.lineWidth = currentBits >= 8 ? 3.4 : 2.8;
              ctx.shadowColor = '#00ff88';
              ctx.shadowBlur = currentBits >= 8 ? 14 : 8;
            }

            ctx.beginPath();
            ctx.moveTo(TRACE_START, TRACE_Y);
            ctx.lineTo(TRACE_END, TRACE_Y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Inner white-hot core for Bits 6+
            if (currentBits >= 6) {
              ctx.save();
              ctx.strokeStyle = currentBits >= 8 ? '#ffffff' : '#c0ffea';
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              ctx.moveTo(TRACE_START, TRACE_Y);
              ctx.lineTo(TRACE_END, TRACE_Y);
              ctx.stroke();
              ctx.restore();
            }

            // BIT 4+: Coordinate Distance Hash Marks
            if (currentBits >= 4) {
              ctx.strokeStyle = '#55ffaa';
              ctx.lineWidth = 1.2;
              for (let hx = TRACE_START; hx <= TRACE_END; hx += 60) {
                ctx.beginPath();
                ctx.moveTo(hx, TRACE_Y - 5);
                ctx.lineTo(hx, TRACE_Y + 5);
                ctx.stroke();
              }
            }

            // BIT 5+: Waveform Amplitude Envelope Guide Rails
            if (currentBits >= 5) {
              ctx.save();
              ctx.strokeStyle = 'rgba(85, 255, 153, 0.45)';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 6]);
              // Upper Rail (+V)
              ctx.beginPath();
              ctx.moveTo(TRACE_START, TRACE_Y - 28);
              ctx.lineTo(TRACE_END, TRACE_Y - 28);
              ctx.stroke();
              // Lower Rail (-V)
              ctx.beginPath();
              ctx.moveTo(TRACE_START, TRACE_Y + 28);
              ctx.lineTo(TRACE_END, TRACE_Y + 28);
              ctx.stroke();
              ctx.setLineDash([]);

              // High-contrast rail text indicators with dark background plate
              ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
              ctx.fillRect(TRACE_START, TRACE_Y - 42, 86, 12);
              ctx.fillRect(TRACE_START, TRACE_Y + 30, 92, 12);
              ctx.fillStyle = '#55ffaa';
              ctx.font = 'bold 9px monospace';
              ctx.fillText('+V MAX (CREST)', TRACE_START + 2, TRACE_Y - 33);
              ctx.fillText('-V MIN (TROUGH)', TRACE_START + 2, TRACE_Y + 39);
              ctx.restore();
            }

            // BIT 7+: Phase Timing Grid (Rhythmic beat horizon ticks)
            if (currentBits >= 7) {
              const beatPulse = (Math.sin(time * 0.008) + 1) * 0.5;
              ctx.strokeStyle = `rgba(102, 220, 255, ${0.25 + beatPulse * 0.25})`;
              ctx.lineWidth = 1;
              for (let bx = TRACE_START; bx <= TRACE_END; bx += 40) {
                ctx.beginPath();
                ctx.moveTo(bx, TRACE_Y - 14);
                ctx.lineTo(bx, TRACE_Y + 14);
                ctx.stroke();
              }
            }
          } else {
            // ------------------------------------------
            // PART 2: RESOLUTIONS 0 TO 10 LINEAR PROGRESSION
            // Continues linear progression scaling with Resolution & Frame Rate
            // ------------------------------------------

            // Sector boundaries for Res 6+ dynamic harmonized beam
            const hasSectors = currentRes >= 6;

            if (!hasSectors) {
              // Res 0-5: Radiant Laser Beam with High Brightness
              ctx.save();
              ctx.strokeStyle = currentRes >= 3 ? '#00ffcc' : '#33ffaa';
              ctx.lineWidth = baseLineWidth;
              ctx.shadowColor = '#00ffaa';
              ctx.shadowBlur = 8 + currentRes * 1.2;
              ctx.beginPath();
              ctx.moveTo(TRACE_START, TRACE_Y);
              ctx.lineTo(TRACE_END, TRACE_Y);
              ctx.stroke();

              // Inner white core
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.2 + currentRes * 0.1;
              ctx.stroke();
              ctx.restore();
            } else {
              // Res 6-10: Sector-Harmonized Stationary Beam
              // The stationary line dynamically shifts energy frequency across each sector!
              ctx.save();

              // Segment 1: Attenuation Zone (80 to 240) - Electric Cobalt Blue
              ctx.strokeStyle = currentRes >= 7 ? '#00d0ff' : '#00ffcc';
              ctx.lineWidth = baseLineWidth;
              ctx.shadowColor = '#00aaff';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.moveTo(TRACE_START, TRACE_Y);
              ctx.lineTo(240, TRACE_Y);
              ctx.stroke();

              // Segment 2: Harmonic Slit (240 to 430) - Resonant Emerald Green (2X)
              ctx.strokeStyle = '#00ff88';
              ctx.shadowColor = '#00ff88';
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.moveTo(240, TRACE_Y);
              ctx.lineTo(430, TRACE_Y);
              ctx.stroke();

              // Segment 3: Emitter Maw (430 to 620) - Blazing Solar Amber (4X)
              ctx.strokeStyle = currentRes >= 8 ? '#ff9900' : '#00ff88';
              ctx.shadowColor = '#ff8800';
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.moveTo(430, TRACE_Y);
              ctx.lineTo(620, TRACE_Y);
              ctx.stroke();

              // Segment 4: Right Core Corridor (620 to TRACE_END) - High-Frequency Azure / Nucleon Interface
              ctx.strokeStyle = '#88aaff';
              ctx.shadowColor = '#6688ff';
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.moveTo(620, TRACE_Y);
              ctx.lineTo(TRACE_END, TRACE_Y);
              ctx.stroke();

              // White-hot inner core across entire length
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = currentRes >= 10 ? 2.0 : 1.4;
              ctx.shadowBlur = 0;
              ctx.beginPath();
              ctx.moveTo(TRACE_START, TRACE_Y);
              ctx.lineTo(TRACE_END, TRACE_Y);
              ctx.stroke();
              ctx.restore();
            }

            // Res 2+: Precision Mobility Coordinate Graticule (Scroll Navigation Track)
            if (currentRes >= 2) {
              const tickSpacing = currentRes >= 6 ? 30 : 40;
              ctx.save();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
              ctx.lineWidth = 1.2;
              for (let tx = TRACE_START; tx <= TRACE_END; tx += tickSpacing) {
                const isMajor = (tx - TRACE_START) % (tickSpacing * 2) === 0;
                ctx.beginPath();
                ctx.moveTo(tx, TRACE_Y - (isMajor ? 6 : 3));
                ctx.lineTo(tx, TRACE_Y + (isMajor ? 6 : 3));
                ctx.stroke();
              }
              ctx.restore();
            }

            // Res 3+: Dual Magnetic Waveguide Confinement Rails
            if (currentRes >= 3) {
              ctx.save();
              const railDist = 12 + Math.min(8, currentRes);
              ctx.strokeStyle = `rgba(0, 240, 255, ${0.28 + currentRes * 0.03})`;
              ctx.lineWidth = 1;
              ctx.setLineDash([6, 6]);
              ctx.beginPath();
              ctx.moveTo(TRACE_START, TRACE_Y - railDist);
              ctx.lineTo(TRACE_END, TRACE_Y - railDist);
              ctx.moveTo(TRACE_START, TRACE_Y + railDist);
              ctx.lineTo(TRACE_END, TRACE_Y + railDist);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.restore();
            }
          }

          // Render Boss Node (Part One Boss Phase or Survival Boss 1)
          if (phase === 'boss' || (gameModeRef.current === 'survival' && activeSurvivalBossRef.current === 'boss1')) {
            const bossFlash = bossHitFlashRef.current > 0;
            ctx.fillStyle = bossFlash ? '#ffffff' : '#33ff66';
            ctx.shadowColor = bossFlash ? '#ffffff' : '#33ff66';
            ctx.shadowBlur = bossFlash ? 24 : 14;
            ctx.fillRect(TRACE_END - 8, TRACE_Y - 16, 16, 32);

            // Corrupted core
            ctx.fillStyle = bossFlash ? '#ffe655' : '#ff2255';
            ctx.fillRect(TRACE_END - 4, TRACE_Y - 8, 8, 16);
            ctx.shadowBlur = 0;

            // Line segment between player and boss solidifies with bright energy
            const segGrad = ctx.createLinearGradient(playerX, TRACE_Y, TRACE_END, TRACE_Y);
            segGrad.addColorStop(0, '#55ff99');
            segGrad.addColorStop(1, '#ff3366');
            ctx.strokeStyle = segGrad;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(playerX, TRACE_Y);
            ctx.lineTo(TRACE_END, TRACE_Y);
            ctx.stroke();

            // Floating Boss 1 Health Bar
            const barW = 90;
            const barH = 6;
            const barX = TRACE_END - barW / 2;
            const barY = TRACE_Y - 34;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
            ctx.strokeStyle = '#ff3366';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

            const hpPct = Math.max(0, bossHpRef.current / MAX_BOSS_1_HP);
            ctx.fillStyle = hpPct > 0.5 ? '#33ff66' : hpPct > 0.25 ? '#ffaa33' : '#ff2255';
            ctx.fillRect(barX, barY, hpPct * barW, barH);

            ctx.fillStyle = '#ff6688';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`SOVEREIGN [${Math.round(hpPct * 100)}%]`, TRACE_END, barY - 4);
            ctx.textAlign = 'start';
          }

          // Render Fracture Sovereign Sprite (Part Two Boss Phase at Resolution 9 or Survival Boss 2)
          if ((subPartRef.current === 2 && resolutionRef.current >= 9) || (gameModeRef.current === 'survival' && activeSurvivalBossRef.current === 'boss2')) {
            const bossX = TRACE_END;
            const bossY = TRACE_Y;
            const bossFlash = bossHitFlashRef.current > 0;
            const hp = boss2HpRef.current;
            const pSec = playerX < 240 ? 'attenuation' : playerX < 430 ? 'harmonic' : 'emitter';
            const isPlayerInVulnerableZone = (pSec === bossTargetZoneRef.current);

            // 1. Dimensional Rift Rings (Rotating octagons)
            const rot1 = time * 0.003;
            const rot2 = -time * 0.002;
            ctx.save();
            ctx.translate(bossX, bossY);

            // Outer Rift Shield Ring
            ctx.rotate(rot1);
            ctx.strokeStyle = bossFlash ? '#ffffff' : isPlayerInVulnerableZone ? '#ffe655' : '#ff2255';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 16;
            ctx.strokeRect(-26, -26, 52, 52);

            // Inner Rotating Geometric Facet
            ctx.rotate(rot2);
            ctx.strokeStyle = bossFlash ? '#ffeedd' : '#88ddff';
            ctx.lineWidth = 2;
            ctx.strokeRect(-18, -18, 36, 36);
            ctx.restore();

            // 2. Core Crystalline Sovereign Sprite (Pixel Art)
            const coreColor = bossFlash ? '#ffffff' : hp > 110 ? '#33ff66' : hp > 50 ? '#ffaa33' : '#ff2255';
            ctx.fillStyle = coreColor;
            ctx.shadowColor = coreColor;
            ctx.shadowBlur = bossFlash ? 28 : 14;
            ctx.fillRect(bossX - 12, bossY - 18, 24, 36);

            // Central Eye / Singularity Core
            ctx.fillStyle = '#050a14';
            ctx.fillRect(bossX - 6, bossY - 10, 12, 20);
            ctx.fillStyle = bossFlash ? '#ff3344' : '#ffe655';
            ctx.fillRect(bossX - 3, bossY - 5, 6, 10);
            ctx.shadowBlur = 0;

            // 3. Floating Boss Health Bar & Status Plate
            const barW = 100;
            const barH = 7;
            const barX = bossX - barW / 2;
            const barY = bossY - 44;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
            ctx.strokeStyle = '#ffe655';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

            const hpPct = Math.max(0, hp / MAX_BOSS_2_HP);
            const hpFillW = hpPct * barW;
            ctx.fillStyle = hpPct > 0.5 ? '#33ff66' : hpPct > 0.25 ? '#ffaa33' : '#ff2255';
            ctx.fillRect(barX, barY, hpFillW, barH);

            // Boss Title & HP
            ctx.fillStyle = '#ffe655';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`FRACTURE SOVEREIGN [${Math.round(hpPct * 100)}%]`, bossX, barY - 6);

            // Vulnerability Badge
            ctx.fillStyle = isPlayerInVulnerableZone ? '#55ff99' : '#ff6677';
            ctx.font = '9px monospace';
            const badgeText = isPlayerInVulnerableZone
              ? 'VULNERABLE — STRIKE!'
              : 'DEFLECTING — FIND WEAK ZONE';
            ctx.fillText(badgeText, bossX, barY + barH + 12);
            ctx.textAlign = 'start';
          }

          // Stationary Point / Square Entity
          // BIT 8+: High-Definition Phosphor Bloom
          const isBloom = currentBits >= 8;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#33ff66';
          ctx.shadowColor = '#33ff66';
          ctx.shadowBlur = isBloom ? 24 : currentBits >= 1 ? 10 : 0;
          ctx.lineWidth = isBloom ? 3.5 : 2;

          const sqSize = 14;
          ctx.fillRect(playerX - sqSize / 2, TRACE_Y - sqSize / 2, sqSize, sqSize);
          ctx.strokeRect(playerX - sqSize / 2, TRACE_Y - sqSize / 2, sqSize, sqSize);
          ctx.shadowBlur = 0;

          // BIT 3+: Active Polarizer Reticle (Directional Vector Arrow above head)
          if (currentBits >= 3) {
            if (polarityRef.current === 1) {
              // Arrow UP
              ctx.strokeStyle = '#55ff99';
              ctx.shadowColor = '#55ff99';
              ctx.shadowBlur = isBloom ? 10 : 0;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(playerX - 7, TRACE_Y - 14);
              ctx.lineTo(playerX, TRACE_Y - 24);
              ctx.lineTo(playerX + 7, TRACE_Y - 14);
              ctx.stroke();
              ctx.shadowBlur = 0;
            } else if (polarityRef.current === -1) {
              // Arrow DOWN (Unlocked at Bit 9)
              ctx.strokeStyle = '#ff66aa';
              ctx.shadowColor = '#ff66aa';
              ctx.shadowBlur = isBloom ? 10 : 0;
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(playerX - 7, TRACE_Y + 14);
              ctx.lineTo(playerX, TRACE_Y + 24);
              ctx.lineTo(playerX + 7, TRACE_Y + 14);
              ctx.stroke();
              ctx.shadowBlur = 0;
            } else {
              // Neutral indicator (dash above square)
              ctx.strokeStyle = '#66ccff';
              ctx.shadowColor = '#66ccff';
              ctx.shadowBlur = isBloom ? 10 : 0;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(playerX - 6, TRACE_Y - 18);
              ctx.lineTo(playerX + 6, TRACE_Y - 18);
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
          }

          // Render Red Error Zones on the line (Part Two)
          if (subPartRef.current === 2) {
            redErrorZonesRef.current.forEach(zone => {
              if (zone.isWarning) {
                const flash = (Math.sin(time * 0.03) + 1) * 0.5;
                ctx.fillStyle = `rgba(255, 120, 30, ${0.25 + flash * 0.35})`;
                ctx.fillRect(zone.startX, TRACE_Y - 8, zone.width, 16);
                ctx.strokeStyle = '#ff9922';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(zone.startX, TRACE_Y - 8, zone.width, 16);
                ctx.fillStyle = '#ffaa33';
                ctx.font = '8px monospace';
                ctx.fillText('⚠️ HAZARD', zone.startX + 2, TRACE_Y - 11);
              } else {
                const pulse = (Math.sin(time * 0.04) + 1) * 0.5;
                ctx.fillStyle = `rgba(255, 20, 60, ${0.45 + pulse * 0.35})`;
                ctx.fillRect(zone.startX, TRACE_Y - 10, zone.width, 20);
                ctx.strokeStyle = '#ff1144';
                ctx.lineWidth = 2;
                ctx.strokeRect(zone.startX, TRACE_Y - 10, zone.width, 20);
                ctx.fillStyle = '#ff2255';
                ctx.font = 'bold 8px monospace';
                ctx.fillText('⚡ ERROR', zone.startX + 2, TRACE_Y - 13);
              }
            });
          }

          const zoneName = currentZoneRef.current.toUpperCase();
          const genreName = currentGenreRef.current.replace('_', ' ').toUpperCase();
          const bpmVal = soundEngine.getBpm();
          const stageDesc = `[ZONE: ${zoneName}] ${genreName} (${bpmVal} BPM)`;

          // Part Two Telemetry HUD
          // Lower Telemetry HUD (Clean left-aligned HUD clear of joystick)
          const roundedIntegrity = Math.round(integrity);
          const barFilled = Math.max(0, Math.min(10, Math.round(roundedIntegrity / 10)));
          const barStr = '[' + '█'.repeat(barFilled) + '░'.repeat(10 - barFilled) + ']';
          const hudX = 20;
          ctx.textAlign = 'left';

          if (subPartRef.current === 2) {
            ctx.fillStyle = roundedIntegrity < 35 ? '#ff3355' : roundedIntegrity < 65 ? '#ffaa33' : '#33ff66';
            const shortPol = polarityRef.current === 1 ? '▲ UP' : polarityRef.current === -1 ? '▼ DOWN' : '■ NEUTRAL';
            const sectorName = playerX < 240 ? 'ATTENUATION (1X)' : playerX < 430 ? 'HARMONIC SLIT (2X)' : 'EMITTER MAW (4X)';
            const overshieldText = overshieldsRef.current > 0 ? ` | 🛡️ +${overshieldsRef.current * 20} HP` : '';

            if (w < 640) {
              ctx.font = '10px monospace';
              ctx.fillText(`INTEGRITY: ${barStr} ${roundedIntegrity}%${overshieldText} | [${sectorName}] | ${shortPol}`, hudX, h - 26);
              ctx.fillStyle = '#88ffaa';
              ctx.font = '9.5px monospace';
              ctx.fillText(`HARVEST: +${runHzRef.current} Hz | +${runVoltsRef.current} V | +${runBaudRef.current} Flux  [Target: Res ${Math.min(10, resolutionRef.current + 1)}]`, hudX, h - 12);
            } else {
              ctx.font = '11px monospace';
              ctx.fillText(`INTEGRITY: ${barStr} ${roundedIntegrity}%${overshieldText} | SECTOR: [${sectorName}] | POLARIZER: [ ${shortPol} ]`, hudX, h - 26);
              ctx.fillStyle = '#88ffaa';
              ctx.font = '10px monospace';
              ctx.fillText(`RUN HARVEST: +${runHzRef.current} Hz | +${runVoltsRef.current} V | +${runBaudRef.current} Flux  [Target: Res ${Math.min(10, resolutionRef.current + 1)}]`, hudX, h - 12);
            }
          } else if (currentBits >= 6) {
            ctx.fillStyle = roundedIntegrity < 35 ? '#ff3355' : roundedIntegrity < 65 ? '#ffaa33' : '#33ff66';
            const shortPol = polarityRef.current === 1 ? '▲ UP' : polarityRef.current === -1 ? '▼ DOWN' : '■ NEUTRAL';
            ctx.font = w < 640 ? '10px monospace' : '11px monospace';
            ctx.fillText(`INTEGRITY: ${barStr} ${roundedIntegrity}% | ${stageDesc} | POL: [ ${shortPol} ]`, hudX, h - 26);
            ctx.fillStyle = '#88ffaa';
            ctx.font = w < 640 ? '9.5px monospace' : '10px monospace';
            ctx.fillText(`RUN HARVEST: +${runHzRef.current} Hz | +${runVoltsRef.current} V  [Target: Bit ${Math.min(10, currentBits + 1)}]`, hudX, h - 12);
          } else if (currentBits >= 1) {
            ctx.fillStyle = roundedIntegrity < 35 ? '#ff3355' : '#33ff66';
            ctx.font = '11px monospace';
            const shortPol = polarityRef.current === 1 ? '▲ UP' : polarityRef.current === -1 ? '▼ DOWN' : '■ NEUTRAL';
            ctx.fillText(`INTEGRITY: ${roundedIntegrity}% | ${stageDesc} | POL: [ ${shortPol} ]`, hudX, h - 14);
          }
        } else if (phase === 'ray') {
          // SUB-PHASE 3: BECOMING A RAY (90° FOLD)
          foldProgressRef.current = Math.min(1, foldProgressRef.current + dt * 0.7);
          const foldT = foldProgressRef.current;

          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 4;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#00f0ff';

          // Horizontal Ray
          ctx.beginPath();
          ctx.moveTo(TRACE_START, TRACE_Y);
          ctx.lineTo(TRACE_END, TRACE_Y);
          ctx.stroke();

          // 90 degree fold tearing open Y-axis
          ctx.beginPath();
          ctx.moveTo(TRACE_END, TRACE_Y);
          ctx.lineTo(TRACE_END, TRACE_Y - foldT * (h * 0.65));
          ctx.stroke();

          // Sparks at corner
          for (let s = 0; s < 8; s++) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(
              TRACE_END + (Math.random() - 0.5) * 30 * foldT,
              TRACE_Y - Math.random() * foldT * (h * 0.6),
              2.5,
              2.5
            );
          }
          ctx.shadowBlur = 0;

          ctx.fillStyle = '#00f0ff';
          ctx.font = 'bold 15px monospace';
          ctx.fillText('SOVEREIGN HARMONIZED. POINT RESOLVED INTO A RAY.', w * 0.12, h * 0.25);
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px monospace';
          ctx.fillText('MASTER HARMONIC RIFT: PART TWO RESOLUTION ENGINE ENGAGED.', w * 0.12, h * 0.32);
        }

        // ==========================================
        // PULSE UPDATES & HARMONIC COLLISION RESOLUTION
        // ==========================================
        for (let i = pulsesRef.current.length - 1; i >= 0; i--) {
          const p = pulsesRef.current[i];
          p.x += p.speed;

          // Pulse hits Boss
          if (p.reflected && p.x >= TRACE_END) {
            // Ignore reflected damage if player already dead (prevents reaching win screen while dead)
            if (deathScreenRef.current?.active) {
              pulsesRef.current.splice(i, 1);
              continue;
            }

            // Part Two Boss (Resolution 9 or Survival Boss 2)
            if ((subPartRef.current === 2 && resolutionRef.current >= 9) || (gameModeRef.current === 'survival' && activeSurvivalBossRef.current === 'boss2')) {
              const pSec = playerX < 240 ? 'attenuation' : playerX < 430 ? 'harmonic' : 'emitter';
              if (pSec === bossTargetZoneRef.current) {
                soundEngine.playBossDamageChord(2);
                bossHitFlashRef.current = 1;
                screenShakeRef.current = 14;
                addSparks(TRACE_END, TRACE_Y, '#ffe655', 28);
                addCombatText('-14 HP', TRACE_END - 10, TRACE_Y - 32, '#ffe655');
                const nextBoss2Hp = Math.max(0, boss2HpRef.current - 14);
                boss2HpRef.current = nextBoss2Hp;
                setBoss2Hp(nextBoss2Hp);
                if (nextBoss2Hp <= 0) {
                  soundEngine.setBossMusic(false);
                  soundEngine.playCadenceResolution();
                  if (gameModeRef.current === 'survival') {
                    setActiveSurvivalBoss('none');
                    activeSurvivalBossRef.current = 'none';
                    addCombatText('✦ FRACTURE SOVEREIGN CONQUERED! ✦', TRACE_END, TRACE_Y - 30, '#ffe655');
                    survivalResourcesRef.current.baud += 100;
                  } else if (gameModeRef.current === 'speedrun') {
                    const finalTime = speedrunTimeRef.current;
                    const finalRuns = speedrunRunsRef.current;
                    setHasCompletedSpeedrun(true);
                    setSpeedrunCompleteModal({
                      time: finalTime,
                      runs: finalRuns,
                    });
                    onUpdateState(prev => {
                      const curBest = prev.highScores?.speedrunBestTime;
                      const isNewBest = !curBest || finalTime < curBest;
                      return {
                        ...prev,
                        hasCompletedSpeedrun: true,
                        speedrunTime: finalTime,
                        speedrunRuns: finalRuns,
                        highScores: {
                          ...prev.highScores,
                          speedrunBestTime: isNewBest ? finalTime : curBest,
                          speedrunBestRuns: isNewBest ? finalRuns : (prev.highScores?.speedrunBestRuns || finalRuns),
                        },
                      };
                    });
                    onLogAction(`✦ SPEEDRUN COMPLETED in ${formatTime(finalTime)} across ${finalRuns} runs! Select Speed Run or Survival Mode!`);
                  } else if (gameModeRef.current === 'arcade') {
                    const finalTime = arcadeTimeRef.current;
                    const lives = arcadeLivesRef.current;
                    setArcadeVictoryModal({
                      time: finalTime,
                      livesRemaining: lives,
                    });
                    onUpdateState(prev => {
                      const curBestTime = prev.highScores?.arcadeBestTime || 0;
                      const isNewBest = !curBestTime || finalTime < curBestTime;
                      return {
                        ...prev,
                        arcadeTime: finalTime,
                        arcadeFurthestStage: 'Victory! (Res 10 Complete)',
                        arcadeFurthestStageNum: 20,
                        highScores: {
                          ...prev.highScores,
                          arcadeBestStage: 'Victory! (Res 10 Complete)',
                          arcadeBestStageNum: 20,
                          arcadeBestTime: isNewBest ? finalTime : curBestTime,
                        },
                      };
                    });
                    onLogAction(`👑 ARCADE VICTORY! Conquered the escalation in ${formatTime(finalTime)} with ${lives} lives remaining! Recorded in Vault.`);
                  } else {
                    // Normal / Story Mode Final Boss Defeated!
                    const runsAttempted = (stateRef.current.totalRuns || 1);
                    setStoryCompleteModal({
                      totalRuns: runsAttempted,
                    });
                    onUpdateState(prev => ({
                      ...prev,
                      hasCompletedStory: true,
                      totalRuns: runsAttempted,
                    }));
                    onLogAction(`✦ CONGRATULATIONS! FRACTURE SOVEREIGN DEFEATED in ${runsAttempted} total runs! The dimensional engine is fully transcended!`);
                  }
                }
              } else {
                soundEngine.playHitSound('shield');
                addSparks(TRACE_END, TRACE_Y, '#ff4444', 16);
                addCombatText('DEFLECTED!', TRACE_END - 10, TRACE_Y - 32, '#ff4444');
                onLogAction(`DEFLECTED! The Sovereign is only vulnerable when attacking from [${bossTargetZoneRef.current.toUpperCase()}]!`);
              }
              pulsesRef.current.splice(i, 1);
              continue;
            }

            // Part One Boss (Phase === 'boss' or Survival Boss 1)
            if (phase === 'boss' || (gameModeRef.current === 'survival' && activeSurvivalBossRef.current === 'boss1')) {
              if (bossImmunityCooldownRef.current > 0) {
                addSparks(TRACE_END, TRACE_Y, '#ff1144', 8);
                addCombatText('DEFLECTED!', TRACE_END - 10, TRACE_Y - 32, '#ff4444');
                pulsesRef.current.splice(i, 1);
                continue;
              }

              const dmg = 15;
              soundEngine.playBossDamageChord(1);
              bossHitFlashRef.current = 1;
              bossMissesRef.current = 0; // Reset misses on hit
              addCombatText('-15 HP', TRACE_END - 10, TRACE_Y - 32, '#55ff99');
              const nextBoss1Hp = Math.max(0, bossHpRef.current - dmg);
              bossHpRef.current = nextBoss1Hp;
              setBossHp(nextBoss1Hp);
              if (nextBoss1Hp <= 0) {
                soundEngine.setBossMusic(false);
                soundEngine.playCadenceResolution();
                if (gameModeRef.current === 'survival') {
                  setActiveSurvivalBoss('none');
                  activeSurvivalBossRef.current = 'none';
                  addCombatText('✦ SOVEREIGN CONQUERED! ✦', TRACE_END, TRACE_Y - 30, '#55ff99');
                  survivalResourcesRef.current.hz += 50;
                  survivalResourcesRef.current.volts += 50;
                } else if (gameModeRef.current === 'arcade') {
                  // Arcade mode ENDS at the first boss!
                  const finalTime = arcadeTimeRef.current;
                  const lives = arcadeLivesRef.current;
                  setArcadeVictoryModal({
                    time: finalTime,
                    livesRemaining: lives,
                  });
                  onUpdateState(prev => {
                    const curBestTime = prev.highScores?.arcadeBestTime || 0;
                    const isNewBest = !curBestTime || finalTime < curBestTime;
                    return {
                      ...prev,
                      arcadeTime: finalTime,
                      arcadeFurthestStage: 'Victory! (Boss 1 Conquered)',
                      arcadeFurthestStageNum: 9.5,
                      highScores: {
                        ...prev.highScores,
                        arcadeBestStage: 'Victory! (Boss 1 Conquered)',
                        arcadeBestStageNum: 9.5,
                        arcadeBestTime: isNewBest ? finalTime : curBestTime,
                      },
                    };
                  });
                  onLogAction(`👑 ARCADE VICTORY! Conquered Corrupted Sovereign in ${formatTime(finalTime)} with ${lives} lives remaining! Recorded in Vault.`);
                } else {
                  setBits(10);
                  bitsRef.current = 10;
                  setSubPart(2);
                  subPartRef.current = 2;
                  setResolution(0);
                  resolutionRef.current = 0;
                  setAct1Phase('point');
                  phaseRef.current = 'point';

                  onUpdateState(prev => ({
                    ...prev,
                    act1Bits: 10,
                    act1SubPart: 2,
                    act1Resolution: 0,
                    act1Phase: 'point',
                    currentN: 2,
                    resources: {
                      ...prev.resources,
                      baud: prev.resources.baud + 25,
                    },
                  }));
                  onLogAction("SOVEREIGN HARMONIZED! Part 1 complete. Awakening to PART TWO: Dimensional Frame Rate & Resolution (N = 2)!");
                }
              }

              addSparks(TRACE_END, TRACE_Y, '#ffff44', currentBits >= 8 ? 20 : 12);
            } else {
              // Reflected wave safely dissipates off right edge in non-boss phases
              addSparks(TRACE_END, TRACE_Y, '#55ff99', 6);
            }
            pulsesRef.current.splice(i, 1);
            continue;
          }

          // Pulse reaches Player's Point (Interception guarantee)
          if (!p.reflected && p.x <= playerX + paddleHalf + 8) {
            const currentPol = polarityRef.current;
            let currentSectorYield = 1;
            if (subPartRef.current === 2) {
              if (playerX < 240) currentSectorYield = 1;
              else if (playerX < 430) currentSectorYield = 2;
              else currentSectorYield = 4;
            }

            // 1. CREST (Top wave): Approaching crest
            if (p.kind === 'top') {
              if (currentPol === 1) {
                soundEngine.playCorrectHit('crest');
                runHzRef.current += currentSectorYield;
                setRunHz(runHzRef.current);
                if (gameModeRef.current === 'survival') survivalResourcesRef.current.hz += currentSectorYield;
                checkAutoPurchases();
                bossMissesRef.current = 0;
                bossImmunityCooldownRef.current = 0;
                addSparks(playerX, TRACE_Y, '#55ff99', currentBits >= 8 ? 20 : 10);
                p.reflected = true;
                p.speed = Math.abs(p.speed) * 1.4;
                p.x = playerX + paddleHalf + 10;
              } else {
                if (phase === 'boss' || (gameModeRef.current === 'survival' && activeSurvivalBossRef.current === 'boss1')) {
                  bossMissesRef.current++;
                  if (bossMissesRef.current > 1) {
                    bossImmunityCooldownRef.current = 1.2;
                  }
                }
                soundEngine.playIncorrectHit('crest');
                screenShakeRef.current = 10;
                damageFlashRef.current = 1;

                let effectiveDmg = 40;
                if (overshieldsRef.current > 0) {
                  const absorb = Math.min(overshieldsRef.current * 20, effectiveDmg);
                  const stacksUsed = Math.ceil(absorb / 20);
                  overshieldsRef.current = Math.max(0, overshieldsRef.current - stacksUsed);
                  setOvershields(overshieldsRef.current);
                  effectiveDmg -= absorb;
                }

                if (effectiveDmg > 0) {
                  const nextH = Math.max(0, integrityRef.current - effectiveDmg);
                  integrityRef.current = nextH;
                  setIntegrity(nextH);
                  if (nextH <= 0) {
                    triggerDeath("Crest chord clash collapsed integrity.");
                  }
                }
                addSparks(playerX, TRACE_Y, '#ff3344', 16);
                pulsesRef.current.splice(i, 1);
              }
            }
            // 2. TROUGH (Bottom wave): Approaching trough
            else if (p.kind === 'bottom') {
              if (currentPol === -1) {
                soundEngine.playCorrectHit('trough');
                runVoltsRef.current += currentSectorYield;
                setRunVolts(runVoltsRef.current);
                if (gameModeRef.current === 'survival') survivalResourcesRef.current.volts += currentSectorYield;
                checkAutoPurchases();
                bossMissesRef.current = 0;
                bossImmunityCooldownRef.current = 0;
                addSparks(playerX, TRACE_Y, '#ff66aa', currentBits >= 8 ? 24 : 14);
                p.reflected = true;
                p.speed = Math.abs(p.speed) * 1.4;
                p.x = playerX + paddleHalf + 10;
              } else {
                if (phase === 'boss' || (gameModeRef.current === 'survival' && activeSurvivalBossRef.current === 'boss1')) {
                  bossMissesRef.current++;
                  if (bossMissesRef.current > 1) {
                    bossImmunityCooldownRef.current = 1.2;
                  }
                }
                soundEngine.playIncorrectHit('trough');
                screenShakeRef.current = 10;
                damageFlashRef.current = 1;

                let effectiveDmg = 40;
                if (overshieldsRef.current > 0) {
                  const absorb = Math.min(overshieldsRef.current * 20, effectiveDmg);
                  const stacksUsed = Math.ceil(absorb / 20);
                  overshieldsRef.current = Math.max(0, overshieldsRef.current - stacksUsed);
                  setOvershields(overshieldsRef.current);
                  effectiveDmg -= absorb;
                }

                if (effectiveDmg > 0) {
                  const nextH = Math.max(0, integrityRef.current - effectiveDmg);
                  integrityRef.current = nextH;
                  setIntegrity(nextH);
                  if (nextH <= 0) {
                    triggerDeath("Trough chord clash collapsed integrity.");
                  }
                }
                addSparks(playerX, TRACE_Y, '#ff3377', 16);
                pulsesRef.current.splice(i, 1);
              }
            }
            // 3. PACKET (Square): Incoming neutral packet
            else if (p.kind === 'square') {
              if (currentPol === 0) {
                soundEngine.playCorrectHit('packet');
                // Secretly gathers third resource (Baud / Directional Flux):
                runBaudRef.current += currentSectorYield;
                setRunBaud(runBaudRef.current);
                if (gameModeRef.current === 'survival') survivalResourcesRef.current.baud += currentSectorYield;
                checkAutoPurchases();
                bossMissesRef.current = 0;
                bossImmunityCooldownRef.current = 0;
                setRunBaud(runBaudRef.current);

                // Heal up to max 100 HP, or add Overshield if in Part Two (Res >= 1)
                if (integrityRef.current < 100) {
                  setIntegrity(h => Math.min(100, h + 40));
                } else if (subPartRef.current === 2 && resolutionRef.current >= 1) {
                  overshieldsRef.current = Math.min(10, overshieldsRef.current + 1);
                  setOvershields(overshieldsRef.current);
                }

                // Matching absorption animation & particles
                addSparks(playerX, TRACE_Y, '#66ccff', 22);
                p.reflected = true;
                p.speed = Math.abs(p.speed) * 1.4;
                p.x = playerX + paddleHalf + 10;
              } else {
                // Misaligned square packets DO NOT damage you; they just disappear and do nothing!
                pulsesRef.current.splice(i, 1);
              }
            }
            continue;
          }

          // Clean removal of any wave exiting left trace (no damage/penalty)
          if (p.x < TRACE_START) {
            pulsesRef.current.splice(i, 1);
            continue;
          }

          // Render Pulse (visible only once graphics are compiled: hasN && currentBits >= 1)
          if (hasN && currentBits >= 1 && (phase === 'point' || phase === 'boss')) {
            ctx.strokeStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = currentBits >= 8 ? 12 : 0;
            ctx.lineWidth = 3;
            ctx.beginPath();

            if (p.kind === 'square') {
              ctx.strokeRect(p.x - 10, TRACE_Y - 9, 20, 18);
            } else {
              const hWave = p.pol === 1 ? -p.amplitude : p.amplitude;
              ctx.moveTo(p.x - 18, TRACE_Y);
              ctx.quadraticCurveTo(p.x, TRACE_Y + hWave, p.x + 18, TRACE_Y);
              ctx.stroke();
            }
            ctx.shadowBlur = 0;
          }
        }

        // Decay Boss Hit Flash
        if (bossHitFlashRef.current > 0) {
          bossHitFlashRef.current = Math.max(0, bossHitFlashRef.current - dt * 3.5);
        }

        // Render Floating Combat Texts (Damage & Deflection feedback)
        for (let c = combatTextsRef.current.length - 1; c >= 0; c--) {
          const ct = combatTextsRef.current[c];
          ct.y += ct.vy;
          ct.alpha -= dt * 0.9;
          if (ct.alpha <= 0) {
            combatTextsRef.current.splice(c, 1);
            continue;
          }
          ctx.save();
          ctx.fillStyle = ct.color;
          ctx.globalAlpha = Math.max(0, ct.alpha);
          ctx.font = 'bold 12px monospace';
          ctx.shadowColor = ct.color;
          ctx.shadowBlur = 8;
          ctx.textAlign = 'center';
          ctx.fillText(ct.text, ct.x, ct.y);
          ctx.restore();
        }

        // Top HUD Header
        if (hasN) {
          ctx.fillStyle = '#33ff66';
          ctx.font = '13px monospace';
          if (subPartRef.current === 2) {
            // "Move N = 2 to the left hand corner. It popped up on the right. Have it replace or cover N = 1"
            const resUpgrade = RESOLUTION_UPGRADES[Math.min(RESOLUTION_UPGRADES.length - 1, Math.max(0, resolutionRef.current - 1))];
            const fpsLabel = resUpgrade?.fps || '12 FPS';
            ctx.save();
            ctx.font = 'bold 13px monospace';
            ctx.shadowColor = '#33ff66';
            ctx.shadowBlur = 8;
            ctx.fillText(`N = 2  [${fpsLabel}] [RES: ${resolutionRef.current}/10]`, 24, 26);
            ctx.restore();
          } else if (currentBits === 0) {
            ctx.fillText('N = 1', 24, 26);
          } else {
            const bitColors = Math.pow(2, currentBits);
            const bitDots = Array.from({ length: 10 }).map((_, i) => i < bitsRef.current ? '•' : '◦').join(' ');
            ctx.fillText(`N = 1  [${currentBits}-BIT GRAPHICS // ${bitColors} COLORS] [ ${bitDots} ]`, 24, 26);
          }
        }

        // Active Game Mode HUD Indicators
        if (gameModeRef.current === 'speedrun') {
          ctx.save();
          ctx.fillStyle = '#00f0ff';
          ctx.font = 'bold 12px monospace';
          const hudX = (subPartRef.current === 2 || (hasN && currentBits > 0)) ? 320 : 24;
          const hudY = (hasN && currentBits === 0 && subPartRef.current !== 2) ? 46 : 26;
          ctx.fillText(`⚡ SPEED RUN: ${formatTime(speedrunTimeRef.current)}  [RUN #${speedrunRunsRef.current}]`, hudX, hudY);
          ctx.restore();
        } else if (gameModeRef.current === 'survival') {
          ctx.save();
          ctx.fillStyle = '#ff4466';
          ctx.font = 'bold 12px monospace';
          const hudX = (subPartRef.current === 2 || (hasN && currentBits > 0)) ? 320 : 24;
          const hudY = (hasN && currentBits === 0 && subPartRef.current !== 2) ? 46 : 26;
          ctx.fillText(`⚔️ SURVIVAL: ${formatTime(survivalTimeRef.current)}  [${currentZoneRef.current.toUpperCase()}]`, hudX, hudY);
          ctx.restore();
        } else if (gameModeRef.current === 'arcade') {
          ctx.save();
          ctx.fillStyle = '#c084fc';
          ctx.font = 'bold 12px monospace';
          const hudX = (subPartRef.current === 2 || (hasN && currentBits > 0)) ? 320 : 24;
          const hudY = (hasN && currentBits === 0 && subPartRef.current !== 2) ? 46 : 26;
          const livesStr = arcadeLivesRef.current === 2 ? '💖💖 2 LIVES' : '💖 1 LIFE';
          ctx.fillText(`🕹️ ARCADE: ${formatTime(arcadeTimeRef.current)}  [${currentZoneRef.current.toUpperCase()}]  [${livesStr}]`, hudX, hudY);
          ctx.restore();
        }

        if (phase === 'boss' || (gameModeRef.current === 'survival' && activeSurvivalBossRef.current === 'boss1')) {
          ctx.fillStyle = '#ff4466';
          ctx.font = '13px monospace';
          ctx.fillText(`SOVEREIGN: ${Math.round((bossHpRef.current / MAX_BOSS_1_HP) * 100)}%`, w - 180, 26);
        }

      // Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.035;
        if (pt.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillRect(pt.x, pt.y, 2.5, 2.5);
        ctx.globalAlpha = 1;
      }

      // Apply Progressive Bit-Depth Graphical Quantization (when in Game N with 1 to 7 bits)
      if (hasN && bitsRef.current >= 1 && bitsRef.current < 8) {
        try {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          const levels = Math.pow(2, bitsRef.current);
          const step = 255 / (levels - 1);

          for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 0 && data[i + 1] === 8 && data[i + 2] === 2) continue;
            if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) continue;

            if (bitsRef.current === 1) {
              // Strictly 1-bit binary graphics (2 colors: 0 or 255 phosphor green)
              const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
              if (brightness > 28) {
                data[i] = 51;
                data[i + 1] = 255;
                data[i + 2] = 102;
              } else {
                data[i] = 0;
                data[i + 1] = 8;
                data[i + 2] = 2;
              }
            } else {
              // Quantize channels to 2^bits levels
              data[i] = Math.round(data[i] / step) * step;
              data[i + 1] = Math.round(data[i + 1] / step) * step;
              data[i + 2] = Math.round(data[i + 2] / step) * step;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // Fallback if read error
        }
      }

      // Draw CRT scanlines only once 1-bit graphics or higher are unlocked
      if (hasN && bitsRef.current >= 1) {
        drawCrtOverlay();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [hasN, bits, act1Phase, playerPolarity]);

  // Mobile Touch tracking for horizontal movement and quick taps
  const touchStartXRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const playerStartXRef = useRef<number>(240);

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isMainMenuOpenRef.current || deathScreenRef.current || deathBufferSecondsRef.current > 0) return;
    lastTouchTimeRef.current = Date.now();
    if (!stateRef.current.carrierActive) {
      handleStartAudio();
    }
    if (e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartTimeRef.current = Date.now();
      playerStartXRef.current = playerXRef.current;
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isMainMenuOpenRef.current || deathBufferSecondsRef.current > 0) return;
    if (subPartRef.current !== 2 || resolutionRef.current < 2) return;
    if (touchStartXRef.current === null || e.touches.length === 0) return;
    const clientX = e.touches[0].clientX;
    const diff = clientX - touchStartXRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const agility =
      resolutionRef.current <= 2
        ? 0.08
        : resolutionRef.current === 3
        ? 0.25
        : resolutionRef.current === 4
        ? 0.55
        : resolutionRef.current === 5
        ? 0.85
        : 1.0;
    const deltaCanvas = diff * scale * agility;
    const TRACE_START = 80;
    const TRACE_END = 920 - 80;
    playerXRef.current = Math.max(
      TRACE_START + 10,
      Math.min(TRACE_END - 20, playerStartXRef.current + deltaCanvas)
    );
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    lastTouchTimeRef.current = Date.now();
    if (isMainMenuOpenRef.current || deathBufferSecondsRef.current > 0) return;
    if (touchStartXRef.current !== null && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const diffX = Math.abs(touch.clientX - touchStartXRef.current);
      const duration = Date.now() - touchStartTimeRef.current;

      const canvas = canvasRef.current;
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const midX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const isRightHalf = touch.clientX >= midX;

      // Quick tap (< 250ms and moved < 15px) strictly on the RIGHT half cycles the polarizer.
      // Tapping the LEFT half NEVER cycles the polarizer!
      if (isRightHalf && duration < 250 && diffX < 15 && !deathScreenRef.current && deathBufferSecondsRef.current <= 0) {
        cyclePolarizer();
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none flex items-center justify-center">
      {/* Mobile Portrait Orientation Advisory */}
      {isPortrait && isMobile && (
        <div className="absolute top-2 inset-x-2 z-40 bg-neutral-900/90 border border-cyan-500/40 rounded-lg py-1.5 px-3 text-center text-[11px] font-mono text-cyan-300 backdrop-blur-md flex items-center justify-center gap-2 shadow-lg">
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Rotate to landscape for edge-to-edge dual-thumb play</span>
        </div>
      )}

      {/* ASPECT-RATIO LOCKED GAME CANVAS & HUD CONTAINER */}
      <div className="relative w-full h-full max-w-full max-h-full aspect-[920/440] flex items-center justify-center overflow-hidden">
        {/* FULLSCREEN GAMEPLAY CANVAS */}
        <canvas
          ref={canvasRef}
          width={920}
          height={440}
          className="w-full h-full object-contain cursor-crosshair touch-none select-none"
          onClick={() => {
            if (isMainMenuOpenRef.current) return;
            if (!gameState.carrierActive) handleStartAudio();
          }}
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}
        />

        {/* DEV TOOLS: NEARLY TRANSPARENT BUTTONS ON TOP OF TOP RIGHT QUADRANT */}
        {!isMainMenuOpen && !deathScreen && !speedrunCompleteModal && !survivalDeathModal && !arcadeKillModal && !arcadeVictoryModal && (
          <div
            style={{ right: 'max(12px, env(safe-area-inset-right, 12px))' }}
            className="absolute top-3 sm:top-4 z-30 flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity"
          >
            {onDevAddBit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDevAddBit();
                }}
                aria-label="Dev Tool: Add 1 Bit"
                className="px-2.5 py-1.5 min-h-[44px] min-w-[44px] text-[10px] font-mono font-bold rounded bg-white/5 hover:bg-white/15 active:bg-white/20 text-white/60 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center"
              >
                +1 BIT
              </button>
            )}
            {onDevAddRes && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDevAddRes();
                }}
                aria-label="Dev Tool: Add 1 Resolution"
                className="px-2.5 py-1.5 min-h-[44px] min-w-[44px] text-[10px] font-mono font-bold rounded bg-white/5 hover:bg-white/15 active:bg-white/20 text-white/60 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center"
              >
                +1 RES
              </button>
            )}
            {onTogglePipeline && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePipeline();
                }}
                aria-label="Dev Tool: Pipeline Drawer"
                className="px-2.5 py-1.5 min-h-[44px] min-w-[44px] text-[10px] font-mono font-bold rounded bg-white/5 hover:bg-white/15 active:bg-white/20 text-white/60 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-sm transition-all cursor-pointer select-none touch-manipulation flex items-center justify-center"
              >
                PIPELINE
              </button>
            )}
          </div>
        )}

        {/* INVISIBLE DRAG MOBILITY ZONE: BOTTOM-LEFT QUADRANT (Only active when Res >= 2 in Part 2) */}
        {!isMainMenuOpen && !deathScreen && !speedrunCompleteModal && !survivalDeathModal && !arcadeKillModal && !arcadeVictoryModal && subPart === 2 && resolution >= 2 && (
          <div
            onPointerDown={handleDragPointerDown}
            onPointerMove={handleDragPointerMove}
            onPointerUp={handleDragPointerUp}
            onPointerCancel={handleDragPointerUp}
            aria-label="Bottom-left quadrant drag to control horizontal movement"
            role="slider"
            aria-valuenow={Math.round(joystickDeflection * 100)}
            aria-valuemin={-100}
            aria-valuemax={100}
            style={{
              left: 0,
              top: '50%',
              width: '50%',
              height: '50%',
            }}
            className="absolute z-20 touch-none select-none pointer-events-auto cursor-ew-resize opacity-0"
          />
        )}
      </div>



        {/* DEATH / LEVEL-UP SCREEN OVERLAY */}
        {deathScreen && (
          <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 text-center font-mono z-30 animate-in fade-in duration-200 overflow-y-auto">
            <div className="max-w-md w-full max-h-[92vh] overflow-y-auto my-auto border border-emerald-500/80 bg-neutral-950/95 p-4 sm:p-6 rounded-xl shadow-2xl shadow-emerald-950/50 space-y-3 sm:space-y-4">
              <div className="text-rose-400 font-bold text-lg sm:text-xl tracking-wider">
                OH NO YOU DIED.
              </div>

              <div className="text-xs text-neutral-300 leading-relaxed bg-black/70 p-3 rounded-lg border border-neutral-800 text-left space-y-1.5">
                <div>• Collected this run: <span className="text-cyan-400 font-bold">+{deathScreen.collectedHz} HZ</span> and <span className="text-rose-400 font-bold">+{deathScreen.collectedV} V</span>.</div>
                <div>• Available reserves: <span className="text-cyan-300 font-bold">{gameState.resources.hertz} HZ</span> and <span className="text-rose-300 font-bold">{gameState.resources.volts} V</span>.</div>
                {deathScreen.collectedBaud !== undefined && deathScreen.collectedBaud > 0 && (
                  <div>• Directional Flux (Bd): <span className="text-amber-400 font-bold">+{deathScreen.collectedBaud} BD</span> | Total: <span className="text-amber-300 font-bold">{gameState.resources.baud} BD</span></div>
                )}
                {deathScreen.target === 'bit' && (
                  <div className="text-[11px] text-emerald-400 border-t border-neutral-800 pt-1.5">
                    <span className="font-bold">Next Graphics Upgrade:</span> {deathScreen.upgradeName}
                    <div className="text-neutral-400 text-[10px] mt-0.5">{deathScreen.upgradeDesc}</div>
                  </div>
                )}
                {deathScreen.target === 'resolution' && (
                  <div className="text-[11px] text-cyan-400 border-t border-neutral-800 pt-1.5">
                    <span className="font-bold">Next:</span> {deathScreen.upgradeName}
                    <div className="text-neutral-400 text-[10px] mt-0.5">{deathScreen.upgradeDesc}</div>
                  </div>
                )}
                {deathScreen.target === 'N' && (
                  <div className="text-[11px] text-emerald-400 border-t border-neutral-800 pt-1.5">
                    <span className="font-bold">Next:</span> N=1 (Stationary Pixel)
                    <div className="text-neutral-400 text-[10px] mt-0.5">Origin point.</div>
                  </div>
                )}
              </div>

              <div className="text-emerald-300 font-bold text-xs sm:text-sm">
                {deathScreen.target === 'N' ? (
                  <span>SPEND {deathScreen.costHz} HZ AND {deathScreen.costV} V TO COMPILE N=1?</span>
                ) : deathScreen.target === 'resolution' ? (
                  <span>SPEND {deathScreen.costBaud} BD, {deathScreen.costHz} HZ & {deathScreen.costV} V TO COMPILE RESOLUTION {resolution + 1}?</span>
                ) : (
                  <span>SPEND {deathScreen.costHz} HZ AND {deathScreen.costV} V TO COMPILE? ({bits}/10 BITS)</span>
                )}
              </div>

              {/* 1-SECOND ACCIDENTAL CLICK BUFFER: subtle small indicator while buttons are greyed out */}
              {deathBufferSeconds > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-400 py-0.5">
                  <Lock className="w-3 h-3 text-neutral-400" />
                  <span>Buffer active ({deathBufferSeconds.toFixed(1)}s)</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                <button
                  onClick={handlePurchaseUpgrade}
                  disabled={
                    deathBufferSeconds > 0 ||
                    (deathScreen.target === 'resolution' && gameState.resources.baud < (deathScreen.costBaud || 0)) ||
                    (gameState.resources.hertz < deathScreen.costHz) ||
                    (gameState.resources.volts < deathScreen.costV)
                  }
                  className={`w-full sm:w-auto px-5 py-3 font-bold rounded-lg text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 font-mono ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-50'
                      : ((deathScreen.target === 'resolution' && gameState.resources.baud < (deathScreen.costBaud || 0)) ||
                         (gameState.resources.hertz < deathScreen.costHz) ||
                         (gameState.resources.volts < deathScreen.costV))
                      ? 'bg-neutral-800/80 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                      : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white active:scale-95 cursor-pointer shadow-blue-950/60 border border-blue-400/30'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  <span>
                    {deathScreen.target === 'N'
                      ? 'COMPILE 1 N'
                      : deathScreen.target === 'resolution'
                      ? `COMPILE RES ${resolution + 1}`
                      : `COMPILE BIT ${bits + 1}`}
                  </span>
                </button>

                <button
                  onClick={handleContinueAfterDeath}
                  disabled={deathBufferSeconds > 0}
                  className={`w-full sm:w-auto px-5 py-3 rounded-lg text-xs transition-all border font-mono font-bold flex items-center justify-center gap-1.5 ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border-emerald-400/40 shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer'
                  }`}
                >
                  <span>RETRY RUN</span>
                </button>

                {(gameState.gameMode === 'story' || gameState.hasCompletedStory || onOpenMainMenu) && (
                  <button
                    onClick={() => {
                      if (deathBufferSeconds > 0) return;
                      handleContinueAfterDeath();
                      if (onOpenMainMenu) onOpenMainMenu();
                    }}
                    disabled={deathBufferSeconds > 0}
                    className={`w-full sm:w-auto px-4 py-3 rounded-lg text-xs transition-all font-mono font-bold flex items-center justify-center gap-1.5 border ${
                      deathBufferSeconds > 0
                        ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed opacity-60'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-amber-600/60 active:scale-95 cursor-pointer'
                    }`}
                  >
                    <span>MAIN MENU</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    setIsOptionsMenuOpen(true);
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`w-full sm:w-auto px-4 py-3 rounded-lg text-xs transition-all font-mono font-bold flex items-center justify-center gap-1.5 border ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed opacity-60'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border-cyan-600/60 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>OPTIONS</span>
                </button>
              </div>

              {Math.abs(gameState.resources.volts - gameState.resources.hertz) >= 20 && (
                <button
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    const total = gameState.resources.hertz + gameState.resources.volts;
                    const half = Math.floor(total / 2);
                    onUpdateState(prev => ({
                      ...prev,
                      resources: {
                        ...prev.resources,
                        hertz: half,
                        volts: total - half,
                      },
                    }));
                    soundEngine.playCadenceResolution();
                    onLogAction(`✦ WAVEFORMS HARMONIZED: Equalized reserves to ${half} Hz and ${total - half} V!`);
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`w-full px-3 py-2 text-xs font-mono rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-50'
                      : 'bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/60 text-purple-200 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>HARMONIZE RESERVES (Equalize {gameState.resources.hertz} Hz ⇄ {gameState.resources.volts} V)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* STORY / CANONICAL FINAL BOSS COMPLETION MODAL */}
        {storyCompleteModal && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#0e1017] border-2 border-emerald-400 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-7 text-center shadow-2xl shadow-emerald-950/90 animate-in fade-in zoom-in-95 duration-200 space-y-3 sm:space-y-4">
              <div className="text-4xl animate-bounce">👑 🌌 ✦</div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-wider">
                CONGRATULATIONS!
              </h2>
              <div className="text-xs sm:text-sm text-neutral-200 font-mono leading-relaxed bg-black/60 p-4 rounded-xl border border-neutral-800 text-left space-y-2">
                <p>
                  You have defeated the <strong className="text-amber-300">Fracture Sovereign</strong> and completed the full dimensional sequence of Game N!
                </p>
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Total Runs to Completion:</span>
                  <span className="text-lg font-black text-amber-400">{storyCompleteModal.totalRuns} RUNS</span>
                </div>
              </div>

              <p className="text-xs text-neutral-300 font-mono">
                Congratulations! Go to main menu?
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStoryCompleteModal(null);
                    if (onOpenMainMenu) onOpenMainMenu();
                  }}
                  className="flex-1 py-3 px-5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-mono font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>GO TO MAIN MENU</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoryCompleteModal(null);
                    handleStartStoryMode();
                  }}
                  className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs rounded-xl border border-neutral-700 transition-all cursor-pointer"
                >
                  REPLAY RUN
                </button>
                <button
                  type="button"
                  onClick={() => setIsOptionsMenuOpen(true)}
                  className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-cyan-300 font-mono text-xs rounded-xl border border-cyan-600/60 transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>OPTIONS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SPEED RUN COMPLETION MODAL */}
        {speedrunCompleteModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-neutral-900 border-2 border-emerald-500 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 text-center shadow-2xl shadow-emerald-950/80 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-3xl mb-2">✦ ⚡ ✦</div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-wider mb-2">
                SPEED RUN COMPLETE!
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 font-mono mb-6">
                All unlocks compiled and both sovereigns harmonized! Total time and run attempts recorded:
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 bg-black/60 p-4 rounded-xl border border-neutral-800">
                <div>
                  <div className="text-[11px] text-neutral-400 font-mono uppercase">COMPLETION TIME</div>
                  <div className="text-2xl font-mono font-black text-cyan-400">
                    {formatTime(speedrunCompleteModal.time)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-neutral-400 font-mono uppercase">TOTAL RUNS</div>
                  <div className="text-2xl font-mono font-black text-amber-400">
                    {speedrunCompleteModal.runs}
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-400 font-mono mb-4">
                Select your next challenge mode:
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleStartSpeedrunMode}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-mono font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  ⚡ REPLAY SPEED RUN
                </button>
                <button
                  type="button"
                  onClick={handleStartSurvivalMode}
                  className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-mono font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  ⚔️ ENTER SURVIVAL MODE
                </button>
                {onOpenMainMenu && (
                  <button
                    type="button"
                    onClick={() => {
                      setSpeedrunCompleteModal(null);
                      onOpenMainMenu();
                    }}
                    className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-amber-300 font-mono text-xs rounded-xl border border-amber-600/60 transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>MAIN MENU</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOptionsMenuOpen(true)}
                  className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-cyan-300 font-mono text-xs rounded-xl border border-cyan-600/60 transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>OPTIONS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SURVIVAL DEATH SUMMARY MODAL */}
        {survivalDeathModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-neutral-900 border-2 border-rose-500 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 text-center shadow-2xl shadow-rose-950/80 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-3xl mb-2">⚔️ 💥 ⚔️</div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-rose-400 tracking-wider mb-2">
                SURVIVAL MISSION TERMINATED
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 font-mono mb-6">
                Dimensional integrity collapsed under high-frequency escalation. Final survival telemetry:
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 bg-black/60 p-4 rounded-xl border border-neutral-800">
                <div className="col-span-2">
                  <div className="text-[11px] text-neutral-400 font-mono uppercase">TIME SURVIVED</div>
                  <div className="text-3xl font-mono font-black text-amber-400">
                    {formatTime(survivalDeathModal.time)}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-center gap-4 pt-2 border-t border-neutral-800">
                  <div className="text-xs font-mono text-cyan-400">+{survivalDeathModal.resources.hz} Hz</div>
                  <div className="text-xs font-mono text-rose-400">+{survivalDeathModal.resources.volts} V</div>
                  <div className="text-xs font-mono text-emerald-400">+{survivalDeathModal.resources.baud} Flux</div>
                </div>
              </div>

              {/* 1-SECOND ACCIDENTAL CLICK BUFFER: subtle small indicator while buttons are greyed out */}
              {deathBufferSeconds > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-400 py-0.5 mb-3">
                  <Lock className="w-3 h-3 text-neutral-400" />
                  <span>Buffer active ({deathBufferSeconds.toFixed(1)}s)</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    handleStartSurvivalMode();
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`flex-1 py-3 px-4 font-mono font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700 opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-emerald-950/50 border border-emerald-400/30'
                  }`}
                >
                  <span>⚔️ RETRY SURVIVAL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    setSurvivalDeathModal(null);
                    if (onOpenMainMenu) onOpenMainMenu();
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`py-3 px-4 font-mono text-xs rounded-xl border transition-all font-bold flex items-center justify-center gap-1.5 ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed opacity-60'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-amber-600/60 cursor-pointer'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>MAIN MENU</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    setIsOptionsMenuOpen(true);
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`py-3 px-4 font-mono text-xs rounded-xl border transition-all font-bold flex items-center justify-center gap-1.5 ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed opacity-60'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border-cyan-600/60 cursor-pointer'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>OPTIONS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ARCADE MODE KILL SCREEN MODAL */}
        {arcadeKillModal && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#120f1a] border-2 border-purple-500 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 text-center shadow-2xl shadow-purple-950/90 animate-in fade-in zoom-in-95 duration-200 space-y-3 sm:space-y-4">
              <div className="text-3xl animate-pulse">🕹️ 💀 🕹️</div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-purple-400 tracking-wider">
                ARCADE RUN TERMINATED
              </h2>
              <div className="text-xs text-neutral-300 font-mono leading-relaxed bg-black/60 p-4 rounded-xl border border-neutral-800 text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Furthest Stage Reached:</span>
                  <span className="text-sm font-bold text-purple-300">{arcadeKillModal.stageName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Time Elapsed:</span>
                  <span className="text-sm font-bold text-amber-300">{formatTime(arcadeKillModal.time)}</span>
                </div>
                <div className="text-[10px] text-purple-400/90 italic pt-1 border-t border-neutral-800">
                  ✓ Recorded into the High Scores Records Vault.
                </div>
              </div>

              {/* 1-SECOND ACCIDENTAL CLICK BUFFER: subtle small indicator while buttons are greyed out */}
              {deathBufferSeconds > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-400 py-0.5">
                  <Lock className="w-3 h-3 text-neutral-400" />
                  <span>Buffer active ({deathBufferSeconds.toFixed(1)}s)</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    handleStartArcadeMode();
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`flex-1 py-3 px-4 font-mono font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700 opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white cursor-pointer shadow-emerald-950/50 border border-emerald-400/30'
                  }`}
                >
                  <span>🕹️ RETRY ARCADE</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    setArcadeKillModal(null);
                    if (onOpenMainMenu) onOpenMainMenu();
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`py-3 px-4 font-mono text-xs rounded-xl border transition-all font-bold flex items-center justify-center gap-1.5 ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed opacity-60'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-amber-600/60 cursor-pointer'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>MAIN MENU</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deathBufferSeconds > 0) return;
                    setIsOptionsMenuOpen(true);
                  }}
                  disabled={deathBufferSeconds > 0}
                  className={`py-3 px-4 font-mono text-xs rounded-xl border transition-all font-bold flex items-center justify-center gap-1.5 ${
                    deathBufferSeconds > 0
                      ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed opacity-60'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border-cyan-600/60 cursor-pointer'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>OPTIONS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ARCADE MODE VICTORY MODAL */}
        {arcadeVictoryModal && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#120f1a] border-2 border-amber-400 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 text-center shadow-2xl shadow-purple-950/90 animate-in fade-in zoom-in-95 duration-200 space-y-3 sm:space-y-4">
              <div className="text-4xl animate-bounce">👑 🕹️ ⚡</div>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-wider">
                ARCADE ESCALATION MASTERED!
              </h2>
              <div className="text-xs text-neutral-300 font-mono leading-relaxed bg-black/60 p-4 rounded-xl border border-neutral-800 text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Total Run Time:</span>
                  <span className="text-lg font-black text-cyan-300">{formatTime(arcadeVictoryModal.time)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Lives Remaining:</span>
                  <span className="text-sm font-bold text-rose-300">{arcadeVictoryModal.livesRemaining} / 2 LIVES</span>
                </div>
                <div className="pt-2 border-t border-neutral-800 text-[11px] text-emerald-400 font-bold">
                  Corrupted Sovereign conquered across escalating difficulty (Easy → Hard at 8 Bits)!
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartArcadeMode}
                  className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-mono font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  🕹️ REPLAY ARCADE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArcadeVictoryModal(null);
                    if (onOpenMainMenu) onOpenMainMenu();
                  }}
                  className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-amber-300 font-mono text-xs rounded-xl border border-amber-600/60 transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>MAIN MENU</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOptionsMenuOpen(true)}
                  className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-cyan-300 font-mono text-xs rounded-xl border border-cyan-600/60 transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>OPTIONS</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-GAME OPTIONS & SETTINGS MODAL (Accessible from any kill screen) */}
        {isOptionsMenuOpen && (
          <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#12131a] border-2 border-cyan-500 rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto my-auto p-5 sm:p-6 text-center shadow-2xl shadow-cyan-950/80 animate-in fade-in zoom-in-95 duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-cyan-400 font-mono font-black text-base sm:text-lg">
                  <Settings className="w-5 h-5 text-cyan-400 animate-spin-slow" />
                  <span>GAME OPTIONS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOptionsMenuOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setOptionsSubTab('audio')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    optionsSubTab === 'audio'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>AUDIO</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOptionsSubTab('control')}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    optionsSubTab === 'control'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>CONTROLS</span>
                </button>
              </div>

              {optionsSubTab === 'audio' && (
                <div className="space-y-3 text-left">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                    <div className="text-xs font-mono font-bold text-neutral-200 flex items-center gap-2">
                      {userSettingsRef.current?.audio?.muteAll ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>Master Audio</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleMuteAll}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        userSettingsRef.current?.audio?.muteAll
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                          : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      }`}
                    >
                      {userSettingsRef.current?.audio?.muteAll ? 'MUTED' : 'ACTIVE'}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-neutral-200">Music Volume</span>
                      <span className="text-cyan-300 font-bold">{userSettingsRef.current?.audio?.musicVolume ?? 5} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={userSettingsRef.current?.audio?.musicVolume ?? 5}
                      onChange={(e) => handleMusicVolumeChange(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-neutral-200">SFX Volume</span>
                      <span className="text-emerald-300 font-bold">{userSettingsRef.current?.audio?.sfxVolume ?? 5} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={userSettingsRef.current?.audio?.sfxVolume ?? 5}
                      onChange={(e) => handleSfxVolumeChange(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              )}

              {optionsSubTab === 'control' && (
                <div className="space-y-3 text-left">
                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-neutral-200">Invert Scroll Wheel</span>
                    <button
                      type="button"
                      onClick={handleToggleWheelInversion}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        userSettingsRef.current?.controls?.scrollWheelInversion
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      {userSettingsRef.current?.controls?.scrollWheelInversion ? 'INVERTED' : 'NORMAL'}
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
                    <span className="text-xs font-mono font-bold text-neutral-200 block">Cycle Polarizer Key</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPolarizerInput('space')}
                        className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                          (userSettingsRef.current?.controls?.cyclePolarizerInput ?? 'space') === 'space'
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        SPACEBAR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPolarizerInput('rmb')}
                        className={`py-2 px-3 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                          userSettingsRef.current?.controls?.cyclePolarizerInput === 'rmb'
                            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                        }`}
                      >
                        RIGHT CLICK
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsOptionsMenuOpen(false)}
                className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-mono font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <span>DONE / RETURN TO SCREEN</span>
              </button>
            </div>
          </div>
        )}
      </div>
  );
};
