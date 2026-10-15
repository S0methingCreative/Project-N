# Implementation Plan: True Fullscreen Mode with Top-Right Minimalist Toggle

Enable true fullscreen mode across the browser to hide the URL bar and browser chrome, providing an uninterrupted, edge-to-edge gaming canvas. A subtle, nearly transparent grey toggle with no visual effects will be anchored in the top-right corner, supported by the 'F' key hotkey.

---

### User Review & Critical Decisions Confirmed
- **Icon Presentation**: Subtle `Maximize2` and `Minimize2` icons at low opacity (`opacity-30 hover:opacity-75 transition-opacity`).
- **Aesthetic**: Nearly transparent grey button with no glow, animations, or drop shadows (`bg-neutral-800/20 text-neutral-400 border border-neutral-700/20 rounded`).
- **Hotkey**: Pressing the `'F'` key (or `'f'`) toggles fullscreen dynamically when not focused on modal input fields.
- **Persistence**: Remains quietly accessible in the top-right corner at low opacity during both windowed and fullscreen play.
- **Browser & Mobile Support**: Fullscreen API (`requestFullscreen` / `exitFullscreen`) hides the URL bar and browser chrome on supported browsers (Chrome, Edge, Firefox, Android Chrome, and Safari desktop).

---

### Proposed Changes

#### 1. Fullscreen Hook / Controller (`src/components/DimensionCanvas.tsx` or `src/App.tsx`)
- Detect active fullscreen state across standard and vendor-prefixed browser APIs (`document.fullscreenElement`, `webkitFullscreenElement`, `mozFullScreenElement`, `msFullscreenElement`).
- Add `toggleFullscreen()` method:
  - If in fullscreen: invoke `document.exitFullscreen()` (or vendor prefix).
  - If not in fullscreen: invoke `document.documentElement.requestFullscreen()` (or vendor prefix).
- Register `fullscreenchange` and `webkitfullscreenchange` event listeners to keep state synchronized if the user exits via the `Escape` key or browser controls.
- Register `keydown` listener for `'F'` and `'f'` keys:
  - Check that the active element is not an `<input>` or `<textarea>` (e.g., pilot initials registration).
  - Prevent default behavior and toggle fullscreen.

#### 2. Top-Right Corner Minimalist Toggle Button
- Position: Anchored at `top-3 right-3` (with `env(safe-area-inset-top)` / `env(safe-area-inset-right)` support for notched devices).
- Styling:
  - Low opacity (`opacity-30 hover:opacity-80 active:opacity-100 transition-opacity`).
  - Nearly transparent dark grey background (`bg-neutral-900/30 hover:bg-neutral-800/50`).
  - Thin unobtrusive border (`border border-neutral-700/20`).
  - No drop-shadows, no glowing halos, no pulse effects.
  - Sizing: Compact touch-accessible target (`p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center`).
- Icon:
  - Windowed mode: `Maximize2` (14px).
  - Fullscreen mode: `Minimize2` (14px).
  - Accessible `aria-label="Toggle full screen (F)"` and title tooltip.

#### 3. Verification & Safety Checks
- Verify `npm run build` and `npm run lint` pass cleanly.
- Ensure dev tools buttons (if enabled) align neatly alongside the fullscreen button without overlap.
- Ensure modals (Main Menu, Initials Registration, Leaderboards, Death Screen) render above or below cleanly without clipping.

---

### Verification Plan
1. **Compilation**: Run `compile_applet` and `lint_applet` to verify TypeScript builds without errors.
2. **Toggle Click**: Click top-right toggle button to trigger `requestFullscreen()` -> verify browser URL bar and window chrome hide.
3. **Exit Toggle**: Click toggle while in fullscreen to trigger `exitFullscreen()` -> verify windowed mode restores properly.
4. **Hotkey Test**: Press `F` key to toggle into and out of fullscreen.
5. **Escape Key Handling**: Enter fullscreen, press `Escape` key -> verify toggle icon flips back to `Maximize2`.
6. **Input Shielding**: Open initials registration or menu input -> verify typing `F` enters the letter without triggering fullscreen toggle.
