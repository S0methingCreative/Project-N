# Mobile Optimization & In-Game Tooltip Audit Plan

Comprehensive review of in-game tooltips, desktop-specific hints, and instructional text, accompanied by a priority breakdown chart of high-potential candidates for removal and actionable mobile optimization strategies.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your preferences from Turn 1:
> - **Primary Focus**: Clean touch-first HUD with minimal desktop hints.
> - **Display Profile**: Landscape-optimized with edge-to-edge touch zones.
> - **Actionable Scope**: Review and categorize redundant tooltips, strip desktop-biased control hints on mobile, and establish ergonomics for touchscreens.

- **Confirmed Decision 1**: Eliminate desktop-only controls references (e.g. `[LMB]`, `[SPACEBAR]`, `[A/D]`, `Scroll Wheel`) on mobile touch viewports in favor of clean touch-centric prompts (e.g. "TAP TO BEGIN", touch gestures).
- **Confirmed Decision 2**: Remove non-functional and dead tooltip attributes (such as `title` attributes on `pointer-events-none` DOM elements and desktop hover titles that never trigger on mobile).
- **Confirmed Decision 3**: Optimize mobile canvas viewport ergonomics for landscape mode, adding touch gesture hardening (prevent pull-to-refresh/double-tap zoom), safe area inset padding, and tactile haptic feedback.

---

## 1. Tooltip & Hint Audit: Removal Candidates Chart

The following chart breaks down all identified tooltips, DOM `title` attributes, and control instructional labels across the application, ranking their potential for removal or mobile refactoring:

| Location | Text / Tooltip Content | Current Issue & Redundancy | Recommendation | Removal Priority |
| :--- | :--- | :--- | :--- | :---: |
| **DimensionCanvas.tsx** (Lines 4234–4236) | `title="Attenuation Zone marker"`, `title="Harmonic Slit center marker"`, `title="Emitter Maw marker"` | Attached to internal DOM lines styled with `pointer-events-none`. Browser mouse events are suppressed, meaning **these tooltips never trigger for any user** on desktop or mobile. | **Remove completely**. Pure dead code attributes. | **HIGH (Dead Code)** |
| **DimensionCanvas.tsx** (Line 4228) | `title="Dimensional Vector Joystick (Drag square knob or use A/D, ◀/▶, or Scroll Wheel to steer along line)"` | Mentions A/D, arrow keys, and scroll wheel—controls that do not exist on phones/tablets. Mobile users cannot hover to read title attributes. | **Remove title attribute**; the visual joystick with Part 2 telemetry HUD (`1D MOBILITY`) already explains its function visually without tooltip clutter. | **HIGH (Desktop Biased)** |
| **DimensionCanvas.tsx** (Line 3078) | Canvas intro text: `"CLICK [LMB], TAP OR PRESS [SPACEBAR] TO ENGAGE SOUNDTRACK"` | Cluttered desktop jargon (`[LMB]`, `[SPACEBAR]`) confusing to smartphone users. Tap anywhere to start is the only action relevant on phones. | **Adaptive wording**: Render `"TAP ANYWHERE TO ENGAGE SOUNDTRACK"` on touch/mobile devices, retaining keyboard hint only on desktop. | **HIGH (UX Friction)** |
| **MainMenuModal.tsx** (Line 817) | Footer: `"Controls: [LMB] Left Click or [SPACE] to cycle polarizer"` | Redundant on mobile where physical mouse buttons and spacebars are absent. The player cycles polarity by tapping anywhere on screen. | **Conditionally adapt or remove** on mobile viewports; display `"Tap anywhere or stick to steer"`. | **HIGH (Mobile Inaccurate)** |
| **DimensionCanvas.tsx** (Lines 4181, 4194, 4207) | Dev tool buttons: `title="Dev Tool: +1 Bit"`, `title="Dev Tool: +1 Resolution"`, `title="Dev Tool: Pipeline Drawer"` | Native `title` tooltips do not work on touchscreens. Button text (`+1 BIT`, `+1 RES`, `PIPELINE`) is already self-describing. | **Remove title attributes** or convert to accessible `aria-label` without desktop hover dependency. | **MEDIUM (Redundant)** |
| **MainMenuModal.tsx** (Line 420) | `title="Clear all materials (Hz, V, Bd) and restart story from 0D void"` | Native title hover tooltip on "RESTART STORY FROM VOID" button. Ineffective on touch devices; the button triggers a confirmation dialog that already explains consequences. | **Remove title attribute**. Modal confirmation handles explanation safely. | **MEDIUM (Redundant)** |
| **App.tsx** (Line 544) | `title="Close drawer"` | Close drawer button uses an "X" icon with title hover text. | **Replace with explicit `aria-label="Close drawer"`** to maintain screen reader accessibility without relying on hover tooltips. | **LOW (Standard A11y)** |
| **MainMenuModal.tsx** (Line 275) | `title={isAudioMuted ? 'Unmute slow waltz' : 'Mute audio'}` | Mute toggle button already has a clear visual sound wave / muted icon. | **Convert to `aria-label`** for accessibility, eliminating unnecessary browser hover delay tooltip. | **LOW (A11y Refactor)** |

---

## 2. Additional Mobile Optimization Recommendations

To transform the game into a premier touch-first experience, the following optimizations are recommended across architecture, ergonomics, and responsiveness:

### A. Touch Target & Thumb-Zone Ergonomics
```
┌────────────────────────────────────────────────────────────────────────┐
│  [N=2 HUD] [FPS]                            [DEV: +1B +1R PIPELINE]    │
│  (Top 15% - Info & dev tools outside natural thumb rest)              │
│────────────────────────────────────────────────────────────────────────│
│                                                                        │
│                    INTERACTIVE CANVAS WAVEFIELD                        │
│             (Middle 50% - Visual focus, wave propagation)              │
│                                                                        │
│────────────────────────────────────────────────────────────────────────│
│  [  JOYSTICK TRACK  ]                           [ UNIVERSAL TAP ZONE ] │
│  (Bottom Left: Steer)                           (Bottom Right: Flip)   │
│  (Bottom 35% - Natural thumb zone with 48px+ touch hitboxes)           │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Enlarged Touch Hitboxes for Dev Tools & Buttons**:
   - Dev HUD buttons (`+1 BIT`, `+1 RES`, `PIPELINE`) are currently `px-2 py-1 text-[10px]` (~24px tall). On touchscreens, these should have minimum hitboxes of **$44 \times 44\text{px}$** (via transparent touch-padding or `touch-manipulation`) to prevent missed taps.
2. **Joystick Touch Region Padding**:
   - Extend the pointer capture target above and below the joystick track (`min-h-[48px]`), ensuring sweaty or fast-moving thumbs don't lose knob engagement during intense boss fights.
3. **Dedicated Screen Tap Zones for Polarizer**:
   - Explicitly support dual-thumb landscape play: **Left thumb steers joystick**, **Right half of screen taps to cycle polarity** seamlessly without finger collision.

### B. Mobile Viewport & Orientation Hardening
1. **Landscape Aspect Ratio Optimization**:
   - Canvas aspect ratio is designed around 920:440 (~2.09:1), which aligns with modern smartphone widescreen ratios (19.5:9 to 20:9 on iPhone and Android).
   - Use CSS `object-fit: contain` and `viewport-fit=cover` so letterboxing is centered with zero horizontal/vertical scrolling.
2. **Safe Area Inset Compliance**:
   - Add `padding-left: max(12px, env(safe-area-inset-left))` and `padding-right: max(12px, env(safe-area-inset-right))` so HUD badges and joysticks are not obstructed by camera hole-punches, dynamic islands, or home gesture bars.
3. **Gentle Orientation Guidance**:
   - When detected in portrait mode on mobile devices (`@media (max-width: 640px) and (orientation: portrait)`), display a sleek non-blocking indicator: *"Rotate device to landscape for full audio-visual immersion"*.

### C. Touch Gesture Hygiene & Haptic Feedback
1. **Prevent Browser Rubber-Banding & Pull-to-Refresh**:
   - Apply `overscroll-behavior: none` and `touch-action: none` to the game canvas container to prevent unwanted browser reloads or page elastic bounce while dragging the joystick or tapping.
2. **Disable Double-Tap Zoom**:
   - Ensure `touch-action: manipulation` or `touch-action: none` prevents iOS Safari and Android Chrome from triggering 300ms double-tap zoom delays.
3. **Tactile Haptic Feedback**:
   - Utilize `navigator.vibrate([15])` on polarity flips and `navigator.vibrate([30, 20, 30])` on taking damage or deflecting boss pulses, providing physical feedback on mobile without audible distraction.

### D. Modal & Menu Landscape Responsiveness
1. **Compact Modal Scaling on Short Viewports**:
   - Mobile landscape screens typically have small vertical heights ($360\text{px}$–$390\text{px}$).
   - Constrain modals (`DeathScreen`, `MainMenuModal`, `SpeedrunCompleteModal`) with `max-h-[88vh] overflow-y-auto` and tighter vertical padding (`py-2` to `py-3` on landscape mobile) so action buttons remain immediately accessible above the fold without requiring tedious scrolling.

---

## 3. Phased Implementation Roadmap

### Phase 1: Tooltip & Desktop Hint Cleanup
- Strip all redundant and dead `title` attributes identified in the audit chart.
- Replace desktop keyboard/mouse phrasing on mobile viewports with touch-appropriate terminology (`"TAP ANYWHERE"` instead of `"[LMB] / [SPACE]"`).
- Replace hover tooltips with accessible `aria-label` tags for screen readers.

### Phase 2: Touch Ergonomics & Viewport Hardening
- Expand touch targets for top HUD controls to $\ge 44\text{px}$.
- Prevent browser overscroll, pull-to-refresh, and zoom gestures across the canvas.
- Add safe-area inset cushioning for edge-to-edge mobile devices.
- Refine landscape modal density for short viewports.

### Phase 3: Tactile Refinements & Testing
- Integrate subtle haptic pulses on touch interactions.
- Verify touch response across responsive emulation (iPhone, iPad, Android).

---

## 4. Verification & Testing Plan

1. **DOM Audit Verification**:
   - Confirm zero occurrences of dead `title` attributes on `pointer-events-none` elements.
   - Verify that mobile touch views display clean, touch-first prompt copy without keyboard shortcuts.
2. **Mobile Viewport Emulation**:
   - Test in Chrome DevTools Device Mode on **iPhone 14/15/16 Pro** (Landscape, 393×852), **Pixel 7** (Landscape, 412×915), and **iPad** (Landscape, 810×1080).
   - Ensure joystick and HUD buttons remain completely visible inside safe-area insets.
3. **Modal Height & Scroll Testing**:
   - Trigger the Death Screen and Main Menu in short landscape viewports ($375\text{px}$ height) to confirm no critical retry/continue buttons are clipped.
4. **Codebase Compilation**:
   - Run `compile_applet` and `lint_applet` to ensure pristine TypeScript compliance.
