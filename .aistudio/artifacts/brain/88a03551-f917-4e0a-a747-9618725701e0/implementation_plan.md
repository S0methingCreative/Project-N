# Story Mode Mission Briefing & Free Compile Progression Tutorial

## Overview
Implement an authentic retro phosphor terminal boot screen for new Story Mode campaigns, dynamically personalized with the pilot's callsign. The briefing clearly introduces the narrative context, the dual-zone tap-right polarity control mechanic, and explicitly normalizes dying as the core roguelite progression loop ("De-coherence is progress"). In addition, make the first two Story Mode compiles (N = 1 and Bit 1) completely free (0 Hz, 0 V) and highlight the compile button with a glowing phosphor border and pulsing arrow indicator to guide new players.

---

## User Clarifications Incorporated
- **Trigger**: Appears on new Story runs (with an accessible "Skip Briefing" option).
- **Presentation**: Retro typewriter boot terminal with tap-to-reveal / fast-forward capability.
- **Tutorial Guidance**: Glowing phosphor border and pulsing arrow indicator highlighting the first two free compiles in the compile screen.

---

## Detailed Implementation Steps

### 1. Retro Mission Briefing Modal (`src/components/StoryIntroModal.tsx`)
Create a dedicated CRT phosphor terminal component with:
- **Visual Aesthetic**:
  - Deep vector black background with subtle scanline / CRT vignette effects.
  - Glowing phosphor green/cyan monospaced vector typography (`text-emerald-400` / `text-cyan-300`).
  - Terminal header displaying system status: `SYSTEM BOOT // PROJECT N-DIMENSIONAL COMPILER`.
- **Dynamic Content & Callsign**:
  - Read active player callsign via `getPlayerCode()` (defaults to `PIL` if not yet configured).
  - Terminal script structured to match the user's brief:
    ```text
    > GREETINGS INTERDIMENSIONAL TRAVELER.
    > PILOT CALLSIGN [XXX] LOCKED IN.
    > INITIALIZING PROJECT N-DIMENSIONAL COMPILER...
    >
    > PRIMARY MISSION:
    > Synchronize polarizer to match incoming waves (crest) and troughs
    > to collect HZ and V frequencies. Compile bits to power the visual matrix.
    >
    > CONTROL TELEMETRY:
    > Tap the RIGHT SIDE of your screen to invert polarity in sync with incoming signals.
    >
    > CORE PROTOCOL — DE-COHERENCE IS PROGRESS:
    > Dissolution is not failure. It is the intended calibration cycle.
    > Each collapse returns your collected HZ & V to bank permanent dimensional upgrades.
    >
    > INITIAL SUBSIDY:
    > Your first two compiles (N = 1 and Bit 1) are subsidized (0 HZ, 0 V)
    > to establish your initial dimensional foothold.
    >
    > Level up and ascend to conquer the first dimension.
    ```
- **Interactivity**:
  - Typewriter text reveal with character/line cadence and soft terminal click sound.
  - Tapping anywhere accelerates / immediately reveals all text.
  - Distinct `[SKIP BRIEFING]` button in the top corner and an `[ENGAGE MISSION]` action button upon completion.

---

### 2. Story Mode Lifecycle Integration (`src/App.tsx` & `src/components/DimensionCanvas.tsx`)
- In `src/App.tsx` and `src/components/DimensionCanvas.tsx`:
  - When a user starts a fresh Story campaign (from `MainMenuModal` with `forceNew=true` or when starting Story with 0 bits and 0 N), show the `StoryIntroModal`.
  - When the user presses `[ENGAGE MISSION]` or `[SKIP BRIEFING]`, dismiss the modal and seamlessly activate carrier audio and start wave generation.
  - Ensure existing story runs (resumed runs) bypass the intro unless explicitly starting a new campaign.

---

### 3. First Two Compiles Free & Highlight Guidance (`src/components/DimensionCanvas.tsx`)
- **Cost Adjustment for First Two Compiles**:
  - **Compile 1 (N = 1)**: Currently free (`costHz: 0, costV: 0`). Retained as 0 Hz, 0 V.
  - **Compile 2 (Bit 1)**: In Story Mode, update the upgrade cost check so Bit 1 is subsidized at `0 Hz, 0 V` (instead of 1 Hz, 1 V), fulfilling the user requirement that the first two compiles are completely free.
- **Visual Highlight on Compile Screen**:
  - In `DimensionCanvas.tsx` inside the death/compile overlay (`deathScreen`):
    - Identify when the player is on Compile 1 (`target === 'N'`) or Compile 2 (`target === 'bit' && bits === 0`).
    - Render an animated pulsing phosphor border around the compile button (`ring-2 ring-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50`).
    - Display a pulsing arrow indicator above/inside the button: `▲ TUTORIAL: TAP TO COMPILE (FREE) ▲`.
    - Provide a reassuring contextual message: `De-coherence banked your energy! Tap compile to materialize your graphics engine.`

---

## Verification & Testing Plan
1. **New Story Run Flow**:
   - Launch Story Mode from Main Menu -> Confirm the terminal typewriter sequence boots up.
   - Test tap-to-reveal (instant text completion) and "Skip Briefing" button.
   - Verify dynamic callsign interpolation (`[PIL]` or registered 3-letter FTC code).
2. **Control & Gameplay Education**:
   - Verify instructions for right-side tap to invert polarity are clear.
   - Verify that upon player collision / collapse in the 0D void, death screen cleanly explains death is progress.
3. **Free Compile 1 & 2 Verification**:
   - At death in 0D Void: Compile N = 1 is 0 HZ / 0 V and displays the glowing phosphor highlight and pulsing arrow indicator.
   - Upon compiling N = 1 and entering Bit 0: dying prompts Bit 1 compile at 0 HZ / 0 V with the glowing phosphor highlight and pulsing arrow indicator.
   - At Bit 1+: Verify Bit 2 costs regular resources (2 Hz, 2 V) without the tutorial pulsing ring.
4. **Code Quality**:
   - Run `lint_applet` (`tsc --noEmit`) to verify zero syntax/type errors.
   - Run `compile_applet` (`npm run build`) to ensure successful Vite bundling.
