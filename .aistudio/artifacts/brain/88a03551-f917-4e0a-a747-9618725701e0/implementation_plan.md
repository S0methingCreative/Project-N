# Compile & Level-Up Sound Engine Redesign

Replace the current dissonant frequency-sliding and clashing chord compile audio with a crisp, triumphant **Bright Ascending Major Arpeggio Chime** for all auto-compiles (Speedrun & Arcade) and manual compiles (Story mode death screen).

---

### Root Cause Analysis

> [!WARNING]
> - **The Current "Gross" Dissonance**:
>   - In `DimensionCanvas.tsx` (`checkAutoPurchases`), compiling a bit upgrade executes:
>     `soundEngine.triggerNote('C5')` + `soundEngine.playHitSound('quantum')`.
>   - `triggerNote('C5')` fires a full multi-oscillator chord mapped to packet hits.
>   - Simultaneously, `playHitSound('quantum')` sweeps a single raw sine oscillator from 440 Hz (A4) to 880 Hz (A5).
>   - The sweeping microtonal frequency physically clashes against the background music chords and the packet chord, creating an uncoordinated sliding sound.
>   - In other places (`triggerAutoCompileN1` and Resolution compile), `playCadenceResolution()` fires a 0.95-second slow 4-step sequence (C4 → F4 → G4 → C5) that drags on and conflicts with high-tempo tracks.

---

### Proposed Solution

#### 1. Implement `playCompileLevelUp` in `src/audio/soundEngine.ts`
Create a dedicated `playCompileLevelUp(intensity: 'standard' | 'major' = 'standard')`:
- **Harmonic Architecture**:
  - Crisp ascending arpeggio in C Major / Pentatonic:
    - Note 1: **C5** (523.25 Hz) at $t = 0.00\text{s}$
    - Note 2: **E5** (659.25 Hz) at $t = 0.045\text{s}$
    - Note 3: **G5** (783.99 Hz) at $t = 0.090\text{s}$
    - Note 4: **C6** (1046.50 Hz) at $t = 0.135\text{s}$ (Apex bell chime with smooth exponential decay)
  - For **Major Milestones** (intensity = `'major'`, such as N=1, Bit 10, or Resolution 10):
    - Note 5: **E6** (1318.51 Hz) at $t = 0.180\text{s}$ + subtle crystalline octave shimmer (G6 at 1567.98 Hz).
- **Oscillator & Envelope Voicing**:
  - Dual-layer voicing: warm rounded triangle wave fundamental + high-sparkle sine harmonic.
  - Crisp 8ms attack, vibrant release curve (decay over 0.25s for lower notes, 0.45s for the apex chime).
  - Routes through the main SFX limiter/destination to avoid clipping or mud.
- **Audio Throttling**:
  - Incorporate a 60ms debounce window so that rapid simultaneous resource transactions in Speedrun mode don't stack into distorted volume spikes.

#### 2. Update Auto-Compile Call Sites in `src/components/DimensionCanvas.tsx`
- **N=1 Auto-Compile** (`triggerAutoCompileN1` & Arcade N=1 purchase):
  - Replace `triggerNote('G4')` + `playCadenceResolution()` with `soundEngine.playCompileLevelUp('major')`.
- **Bit Auto-Compile** (`checkAutoPurchases`):
  - Replace `triggerNote('C5')` + `playHitSound('quantum')` with `soundEngine.playCompileLevelUp('standard')`.
- **Resolution Auto-Compile** (`checkAutoPurchases`):
  - Replace `triggerNote('C5')` + `playCadenceResolution()` with `soundEngine.playCompileLevelUp('standard')`.

#### 3. Update Manual Compiles on Death Screen (`DimensionCanvas.tsx`)
- In `handleCompile` (lines 2890–3050):
  - For compiling N=1, Bits 1–9, Bit 10, and Resolutions 1–10:
  - Trigger `soundEngine.playCompileLevelUp(isMilestone ? 'major' : 'standard')` so that all upgrades across every game mode share this level-up sound.

---

### Verification & Testing Plan
1. **Speedrun / Arcade Auto-Compile**:
   - Start Speedrun mode, toggle polarity to trigger N=1 auto-compile: verify the bright ascending chime fires crisply.
   - Collect resources to trigger Bit 1, Bit 2, Bit 3 auto-compiles: verify smooth, bright level-up chime with zero dissonance or sine pitch-bending.
2. **Story Mode Death Screen**:
   - Die and click "Compile Bit" or "Compile Res" on the death screen: verify the level-up chime plays clearly upon confirmation.
3. **Audio Consistency**:
   - Verify compile sounds harmonize cleanly over all music genres (Slow Waltz, Math Rock, Arcade Rave, Dramatic Boss).
