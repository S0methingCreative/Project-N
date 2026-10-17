# Pilot Beam Color Customization System (Revised)

Implement a unified 4-color selection system based on the Resolution 8 zone spectrum for **Story Mode**, **Arcade Mode**, and **Speedrun Mode**, featuring an **Edit Color button directly next to the Reset Save button**, single unified color across all modes, in-game horizontal line rendering up to Res 6, player particle accenting, and color-coded initials on all leaderboards (with existing scores defaulting to green).

---

### User Decisions & Design Parameters

> [!IMPORTANT]
> - **Unified Color Across All Modes**: The player selects one color that applies globally to Story Mode, Arcade Mode, and Speedrun Mode.
> - **Palette Choices (The 4 Res 8 Zone Colors)**:
>   1. **Emerald Green** (`#00ff88` / Slit Zone) — Default
>   2. **Cobalt Blue** (`#00d0ff` / Attenuation Zone)
>   3. **Solar Amber** (`#ff9900` / Emitter Maw Zone)
>   4. **Azure Violet** (`#88aaff` / Core Corridor Zone)
> - **UI Placement**:
>   - **DO NOT** place badges/pips next to individual mode buttons.
>   - **DO** place a dedicated **Edit Color button** directly next to the **Reset Save button** in the main menu (with a glowing color swatch / palette icon).
>   - **First Launch**: If the player has not yet chosen a color, the selection modal prompts once on launching Story, Arcade, or Speedrun.
> - **In-Game Rendering**:
>   - Replaces green and green shades specifically on the horizontal line the player inhabits through **Bit 1–10**, **Boss 1**, and **Res 0 through Res 5**.
>   - Player bead particle emitters / trail sparks pick up a subtle accent glow matching the selected color.
>   - At **Res 6**, the horizontal line returns to the existing multi-colored sector-harmonized beam (`#00d0ff`, `#00ff88`, `#ff9900`, `#88aaff`).
>   - Arcade mode stops after Boss 1 (Bit 10), maintaining the selected color throughout.
> - **Leaderboards**:
>   - Recorded high score initials display in the color chosen by the pilot.
>   - All current / legacy scores without an explicit color default to **Emerald Green**.

---

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Main Menu - Story Mode Row                  │
│       [Reset Save ↺]  [Edit Color 🎨 (Swatch)]  [LAUNCH ▶]   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Beam Color Selection Modal                  │
│   [Cobalt Blue]  [Emerald Green]  [Solar Amber]  [Azure]    │
│   (Saved to localStorage: 'bit_pilot_beam_color')           │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       DimensionCanvas        │ │      Leaderboard System      │
│  - Horizontal line (0 to 5)  │ │  - Save entry with color     │
│  - Coordinate hash marks     │ │  - Initials tinted by color  │
│  - Player particle glow      │ │  - Legacy scores: Green      │
│  - Res 6+: Return to sectors │ │  - Global & Local views      │
└──────────────────────────────┘ └──────────────────────────────┘
```

---

### Proposed Implementation Details

#### 1. Color Models & Storage (`src/services/leaderboardService.ts`)
- Define `PilotBeamColor = 'green' | 'blue' | 'amber' | 'azure'`.
- Define palette config with primary, neon glow, light core, and subtle particle tints:
  - `green`: Main `#00ff88`, Glow `#00ffaa`, Light `#55ffbb`, Shadow `rgba(0,255,136,0.5)`, Particle `rgba(0,255,136,0.3)`
  - `blue`: Main `#00d0ff`, Glow `#33ccff`, Light `#66ddff`, Shadow `rgba(0,208,255,0.5)`, Particle `rgba(0,208,255,0.3)`
  - `amber`: Main `#ff9900`, Glow `#ffaa33`, Light `#ffcc55`, Shadow `rgba(255,153,0,0.5)`, Particle `rgba(255,153,0,0.3)`
  - `azure`: Main `#88aaff`, Glow `#aaccff`, Light `#c0d4ff`, Shadow `rgba(136,170,255,0.5)`, Particle `rgba(136,170,255,0.3)`
- Helper functions: `getPilotBeamColor(): PilotBeamColor` and `setPilotBeamColor(color: PilotBeamColor): void` storing to `localStorage.getItem('bit_pilot_beam_color')`.
- Helper `hasChosenBeamColor(): boolean` to detect whether first-launch prompt is needed.
- Update score types (`StoryScoreEntry`, `ArcadeScoreEntry`, etc.) to include `color?: PilotBeamColor`.
- When scores are rendered on leaderboards, default missing color to `'green'`.

#### 2. Color Selection Modal (`src/components/BeamColorSelectModal.tsx`)
- Arcade-styled dialog presenting the 4 Res 8 zone colors with live neon laser beam previews, zone origin descriptions (Harmonic Slit, Attenuation, Emitter Maw, Core Corridor), and selection feedback.
- Accessible on first launch or by clicking the Edit Color button in the main menu.

#### 3. Edit Color Button next to Reset Save (`src/components/MainMenuModal.tsx`)
- Directly beside the `<RotateCcw>` Reset Save button in the Story progress action group:
  - Add an **Edit Color button** (`<Palette className="..." />` with an active color pip / border).
  - Clicking this button opens `BeamColorSelectModal`.
- On clicking Launch/Start for Story, Arcade, or Speedrun: if `!hasChosenBeamColor()`, automatically open the `BeamColorSelectModal` first before launching.

#### 4. In-Game Line & Particle Rendering (`src/components/DimensionCanvas.tsx`)
- Read active beam color palette.
- **Act 1 (Bits 1–10) & Act 2 (Res 0–5)**:
  - Replace green styles (`#33ff88`, `#00ffaa`, `#55ffaa`, etc.) on the player's horizontal line with the chosen palette.
  - Coordinate distance hash marks and envelope guide rails take the selected color tint.
  - Player bead particle emitters / trail sparks pick up the subtle particle glow accent.
- **Res 6+**:
  - Horizontal line seamlessly reverts to the existing multi-colored sector-harmonized state.
- **Arcade Mode**:
  - Runs through Boss 1 (Bit 10) and maintains the chosen color the entire time.

#### 5. Leaderboards Initials Coloring (`src/components/GlobalLeaderboardModal.tsx`)
- Format each pilot's initials tag `[XXX]` on the leaderboards with their chosen color (`green`, `blue`, `amber`, `azure`).
- Any entry without an explicit color is rendered in **Emerald Green**.

---

### Verification Plan
1. **Menu & Modal**:
   - Check that the Edit Color button is visible next to Reset Save button in Main Menu.
   - Click Edit Color, choose a color, and confirm it saves.
2. **First-Time Launch Check**:
   - Clear storage and verify first click of Story, Arcade, or Speedrun prompts the color selector.
3. **Gameplay Line & Particles**:
   - Play Bit 1–10 and Res 0–5 in Blue, Amber, and Azure: verify horizontal line & player particle glow reflect the color.
   - Advance past Res 6 in Story Mode: verify line transitions back to the 4 sector colors.
4. **Leaderboard Color Verification**:
   - Check that existing entries render in green.
   - Check that new scores render with their chosen color.
