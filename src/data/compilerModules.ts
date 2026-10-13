import { CompiledModule } from '../types/game';

export const INITIAL_MODULES: CompiledModule[] = [
  // GAME N ENGINE SUBROUTINES
  {
    id: 'dac_comparator',
    name: 'DAC_Voltage_Comparator.asm',
    category: 'audio',
    description: 'Analog-to-digital pulse clashing comparator for 1D carrier waveform.',
    codeSnippet: 'CMP EAX, [VOLT_SPIKE]\nJG TRIGGER_G4_DOMINANT\nRET',
    unlocked: true,
  },
  {
    id: 'line_raster_buffer',
    name: 'Bresenham_1D_Buffer.vram',
    category: 'graphics',
    description: 'Phosphorescent 1D oscilloscope scanline vector trace buffer.',
    codeSnippet: 'int dx = x1 - x0;\nfor (int x = 0; x < N; x++) {\n  VRAM_1D[x] = PHOSPHOR_GREEN;\n}',
    unlocked: false,
  },
  {
    id: 'bit_depth_quantizer',
    name: 'Quantization_Color_LUT.dither',
    category: 'graphics',
    description: 'Bit-depth color quantization engine stepping from 1-bit up to 10-bit Deep Color (1024 colors).',
    codeSnippet: 'uint16_t quantize(uint16_t val, int bits) {\n  int step = 1024 / (1 << bits);\n  return (val / step) * step;\n}',
    unlocked: false,
  },
  {
    id: 'framerate_interpolator',
    name: 'FrameRate_Scaler_240Hz.clock',
    category: 'spatial',
    description: 'Precision tick interpolation scaling display refresh from 12 FPS up to 240 FPS Ultra.',
    codeSnippet: 'float dt = targetFPS > 0 ? 1.0f / targetFPS : 0.016f;\ninterpolateTracePosition(playerX, velocity, dt);',
    unlocked: false,
  },
  {
    id: 'overshield_absorber',
    name: 'Overshield_Parity_Matrix.guard',
    category: 'spatial',
    description: 'Multi-layer energy buffering absorbing waveform shocks before core integrity damage.',
    codeSnippet: 'if (overshields > 0) {\n  overshields--;\n  absorbIncomingShock();\n} else {\n  applyHullDamage(amount);\n}',
    unlocked: false,
  },
  {
    id: 'harmonic_cadence_synth',
    name: 'Harmonic_Cadence_Synth.dsp',
    category: 'audio',
    description: 'Dynamic C Major triad chord generator and tension-resolution harmonic engine.',
    codeSnippet: 'const float CHORDS[3][5] = {\n  { 196.00, 246.94, 293.66, 392.00 }, // G Major\n  { 174.61, 220.00, 261.63, 349.23 }, // F Major\n  { 220.00, 261.63, 329.63, 440.00 }  // A Minor\n};',
    unlocked: false,
  },
];
