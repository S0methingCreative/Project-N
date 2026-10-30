# Clean Up Redundant Main Menu Buttons & Creative Space Navigation

## Overview
Streamlined the main menu navigation bar by removing the redundant "CREATIVE SPACE" shortcut button, establishing a clean 3-tab layout (`MODES`, `SCORES`, `OPTIONS`).

## Key Decisions & Implementation Details
1. **Removed Creative Space Navigation Button**:
   - Removed the `CREATIVE SPACE` shortcut button from the top navigation bar (`src/components/MainMenuModal.tsx`).
   - The top tab strip now consists cleanly of:
     - `[MODES]` (with `BookOpen` icon)
     - `[SCORES]` (with `Trophy` icon)
     - `[OPTIONS]` (with `Sliders` icon)
2. **Dedicated Mode Card**:
   - Retained and verified the rich Creative Space card inside the `MODES` tab. It handles unlocking status (Bit 10 / N=2 unlock requirement), resolution badges, and direct launching into the Creative Space studio.
3. **Audio Mute Retention**:
   - As requested, preserved the quick-access audio mute button in the top modal header while keeping the detailed audio volume sliders in the `OPTIONS` tab.
4. **Verification**:
   - `lint_applet` (`tsc --noEmit`) completed with 0 errors.
   - `compile_applet` passed successfully.
