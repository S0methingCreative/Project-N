# Beta / Full Story Mode: New Project Bootstrap Package

This document contains everything needed to launch your **brand-new, separate Google AI Studio project** dedicated to the **Beta/Full Story Mode**, featuring the tightened **5-Bit Progression Arc**, the **4-Player Co-Op Knockout & Team Wipe Mechanics**, and isolated high scores.

---

## Part 1: The Master Initialization Prompt

> **Instructions**: Copy and paste the prompt below into the very first turn of your new Google AI Studio chat session.

```markdown
Build a retro synth-wave, dimensional rhythm-arcade game centered around an epic narrative campaign: **Game N: Dimensional Transcendence (Beta)** with **4-Player Co-Op Mechanics**.

### Game Identity & Core Narrative
The player is a solitary dimensional pilot (or team of up to 4 pilots) awakening on an active phosphor oscilloscope ray. Through rhythm interception, harmonic wave timing, and resource collection, the pilots compile mathematics, graphics, and dimensions from scratch:

#### Part One: The 5 Bits (Fast, Punchy Action Progression)
- **Bit 1: Monochrome Ray (Immediate Action)**:
  - Starts immediately on the active horizontal beam line ($TRACE\_Y$) with incoming Crest (top) and Trough (bottom) waves.
  - Pilot bead ($14\times 14$ px) and instant polarity toggle (UP/DOWN) are ready from second zero.
  - Binary monochrome oscilloscope ray ($2^1 = 2$ colors) with selectable pilot beam tint.
- **Bit 2: Coordinate Vector Matrix (Spatial Orientation)**:
  - Compiles distance hash marks every 60px, amplitude envelope guide rails ($+V / -V$), and trajectory ghost paths.
  - Wave reflection velocity accelerates ($1.4\times$). 4 colors ($2^2$).
- **Bit 3: Harmonic Polarizer & HUD (Tactical Mastery)**:
  - Unlocks **NEUTRALizer mode** (■ Neutral toggle): Intercepts neutral packets and grants $+40$ Integrity.
  - Telemetry HUD with real-time Hz/V readouts, player mini-integrity gauge, and reflection particle bursts. 8 colors ($2^3$).
- **Bit 4: Dimensional Crucible (Prelude to War)**:
  - High-velocity 16th-note wave barrages, erratic destabilized pulses, and warning sirens.
  - Phosphor bloom halo ($24\text{px}$) and destination lock sequence blinking at the right edge. 16 colors ($2^4$).
- **Bit 5: Master Sovereign Climax (Boss 1 & Transcendence)**:
  - **BOSS 1: THE CORRUPTED SOVEREIGN (180 HP)**. Deflect heavy sinusoidal projectiles back into boss core.
  - Defeating Boss 1 compiles **Bit 5 Master Engine** (32 colors / $2^5$).
  - **Dimensional Revelation**: Unlocks **Directional Flux (Baud)** and initiates **Part Two: Frame Rate & Resolution**!

#### Part Two: Frame Rate & Resolution (Res 0 to Res 10)
- Expands from 15 FPS up to 240 FPS (Res 10).
- Res 1: Overshields unlocked (up to 300 effective HP).
- Res 2: 1D Line Mobility unlocked (navigate across line; red error zones spawn).
- Res 6: The Harmonic Slit recognized (center sector yields 2x resources).
- Res 7: Attenuation Zone discovered (left sector slows incoming pulses).
- Res 8: Emitter Maw recognized (right sector yields 4x resources).
- Res 9: Boss 2 Encounter — **The Fracture Sovereign** (220 HP). Targeted zone shifting mechanics.
- Res 10: Master Transcendence achieved!

#### 4-Player Co-Op Mechanics (Knockout & Team Wipe)
- **4 Harmonic Pilot Colors**: Up to 4 players simultaneously on the line, assigned the 4 harmonic zone colors (P1 Emerald Green, P2 Cobalt Blue, P3 Solar Amber, P4 Azure Violet).
- **Knockout Timer (4.5s High-Pressure Window)**:
  - When a player reaches 0 Integrity, they are knocked unconscious for **4.5 seconds**.
  - While unconscious, the pilot turns into a dimmed 30% ghost wireframe with a holographic circular countdown timer above their head. They cannot deflect waves or toggle polarity.
- **Automatic Passive Revival**:
  - Requires **zero teammate intervention**. The 4.5s countdown ticks down automatically.
  - Upon reaching 0.0s, the pilot reboots with 50% HP and a 1.5s invulnerability phasing shield.
- **Team Wipe Condition**:
  - If **all 4 players are knocked unconscious simultaneously**, the team wipes!
  - Triggers a visceral desynchronization audio drop, red alert vector flashes, and **restarts the current Bit attempt** with full integrity restored.
- **Clutch Alert**: When 3 players are unconscious, a high-priority warning flashes: `⚠️ LAST PILOT STANDING — HOLD THE LINE!`

### Sound & Audio Engine (`src/audio/soundEngine.ts`)
- Pure Web Audio API synthesized procedural music and SFX with no external audio file dependencies.
- **Rhythm Genres**:
  - Slow Waltz / Ballad (78 BPM, 3/4 sway, warm Cmaj7/Am7/F/G7 chords, sub-bass, music-box bells).
  - Math Rock (174 BPM, compound 7/8 + 5/8 odd-meter polyrhythms, tapping chimes, staccato bass, rimshots).
  - Arcade Rave (144 BPM, four-on-the-floor kick, galloping 16th-note saw bass, syncopated offbeat stabs).
  - Dramatic Boss Battle (168 BPM, key change to Dm/Bb/Gm/A7b9, driving saw ostinato, visceral hurt impact chords).
- **Compile / Level-Up Sound**:
  - Bright ascending C Major arpeggio chime fanfare: C5 (523 Hz) -> E5 (659 Hz) -> G5 (784 Hz) -> C6 (1046 Hz) with high sparkle flourish on milestones (E6/G6).

### Pilot Beam Color Customization (`BeamColorSelectModal.tsx`)
- 4 selectable harmonic zone beam frequencies inspired by Resolution 8 sectors:
  1. Emerald Green (`#00ff88` / Harmonic Slit Zone) — Default
  2. Cobalt Blue (`#00d0ff` / Attenuation Zone)
  3. Solar Amber (`#ff9900` / Emitter Maw Zone)
  4. Azure Violet (`#88aaff` / Core Corridor Zone)

### Isolated Story Mode Leaderboard & FTC (`leaderboardService.ts`)
- Cloud Firestore persistent high scores collection: `leaderboards_story_beta`
- Tracks: Rank, 3-letter pilot initials, completions count, furthest stage reached, timestamp, and pilot beam color.
- First-To-Complete (FTC) milestone banner in `leaderboards_meta/story_ftc_beta` with gold lightning bolt.
- Completely anonymous arcade initial entry (`InitialsRegistrationModal.tsx`) with zero login prompts or user friction.
```

---

## Part 2: 5-Bit Condensed Progression Matrix

| Bit Level | Pipeline Title & Theme | Core Gameplay Mechanics | Visuals & HUD Elements | Color Palette & Engine Depth | Background Art Evolution | Music, Tempo & Audio Pacing | Narrative Lore & Milestone Unlock |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Bit 1** | **Monochrome Ray**<br>*(Immediate Action)* | • Immediate active line start.<br>• Crest (top) and Trough (bottom) incoming waves.<br>• Full instant polarity toggle ($\pm 1$ UP/DOWN).<br>• Correct hit reflects wave and yields $+1$ Hz & $+1$ V. | • Solid phosphor laser beam with subtle pilot beam color.<br>• White square pilot bead ($14\times 14$ px).<br>• Active directional vector arrow above/below bead.<br>• Floating text hit confirmations. | **1-Bit / 2 Colors ($2^1$)**<br>Stark high-contrast binary monochrome with chosen pilot beam tint (Emerald, Cobalt, Amber, or Azure). | Deep space void with single crisp horizontal horizon scanline. Minimal star field (4 faint twinkling points). | **Slow Waltz (Easy)**<br>78 BPM, 3/4 sway.<br>Warm Cmaj7 chords and music-box bell chimes. Level-up chime on compile. | *"Pilot online. Oscilloscope ray stabilized in the dark. Incoming harmonic wave packets detected. Time to compile reality."* |
| **Bit 2** | **Coordinate Vector Matrix**<br>*(Spatial Orientation)* | • Distance calculation active.<br>• Trajectory speed scaling (+15% wave velocity).<br>• Wave reflection speed acceleration ($1.4\times$ return speed).<br>• Near-miss damage mitigation. | • Coordinate distance hash marks every 60px across line.<br>• Amplitude envelope dashed guide rails ($+V$ and $-V$).<br>• High-contrast voltage rail indicators.<br>• Dashed vector trajectory ghost path ahead of waves. | **2-Bit / 4 Colors ($2^2$)**<br>Phosphor base + dual amplitude highlights (Green/Cyan/White/Black). | Oscilloscope coordinate graticule grid emerges in background with subtle vertical calibration lines. | **Slow Waltz (Medium)**<br>108 BPM, 3/4 sway.<br>Rhythm tightens; bassline introduces syncopated 3rd beats. | *"Spatial coordinates locked. Distance and amplitude envelopes calibrated. Space gains directional axes."* |
| **Bit 3** | **Harmonic Polarizer & HUD**<br>*(Tactical Mastery)* | • **NEUTRALizer Mode Unlocked** (■ Neutral toggle): Intercepts neutral packets and grants $+40$ Integrity.<br>• Real-time combo multiplier ($+1$ bonus yield per 5 clean hits).<br>• Multi-wave pulse clustering (alternating crest/trough pairs). | • Full Telemetry HUD active (live Hz/V readout gauges).<br>• Dynamic Integrity bar hovering over pilot bead.<br>• Particle spark burst cascades on reflection (16 sparkling motes).<br>• NEUTRAL reticle indicator. | **3-Bit / 8 Colors ($2^3$)**<br>Expanded retro synth palette: Amber alert states, Cyan shields, Magenta error warnings. | Deep nebula filaments begin swirling in background. Star density doubles (12 twinkling stars + faint dust motes). | **Math Rock (Easy)**<br>128 BPM, 7/8 + 5/8 odd-meter.<br>Tapping guitar chimes and eccentric rimshots engage. | *"NEUTRALizer polarity matrix operational. Telemetry systems synchronized. The pilot achieves complete vector authority."* |
| **Bit 4** | **Dimensional Crucible**<br>*(Prelude to War)* | • High-velocity wave barrage (rapid 16th-note cadence).<br>• Destabilized wave packets (erratic speed pulses).<br>• Boss warning siren: Destination locking sequence begins at 50% resource goal. | • High-Definition Phosphor Bloom ($24\text{px}$ ambient blur).<br>• Warning flash banners (`! CORRUPTION DETECTED !`).<br>• Target destination reticle at far right edge blinking crimson. | **4-Bit / 16 Colors ($2^4$)**<br>Rich 16-color arcade palette with deep purple, radiant gold, crimson threat red, and neon emerald. | Cosmic nebula expands; background gravitational lensing distorts grid lines toward the right-hand destination. | **Math Rock (Medium)**<br>156 BPM, aggressive odd-meter.<br>Driving staccato bass and intense polyrhythmic tapping. | *"WARNING: Anomalous entity approaching vector boundary. Destination point seized by the Corrupted Sovereign."* |
| **Bit 5** | **Master Sovereign Climax**<br>*(Boss 1 & Transcendence)* | • **BOSS 1: THE CORRUPTED SOVEREIGN (180 HP)**.<br>• Sovereign fires heavy sinusoidal projectiles.<br>• Player must deflect waves back into boss core.<br>• Defeating Boss 1 compiles **Bit 5 Master Engine**.<br>• **Unlocks Directional Flux (Baud) & Part Two (Resolutions 0–10)**! | • Boss avatar rendered with shifting chromatic aberration.<br>• Boss HP Gauge & shield fracture animations.<br>• Visceral hit impact screen shakes and yellow explosion sparks.<br>• Triumphant dimensional unlock portal sequence on victory. | **5-Bit / 32 Colors ($2^5$)**<br>Full Deep Color master engine. Saturated laser glows, prismatic explosion flares, and pure white-hot cores. | Epic dimensional vortex: swirling galactic core behind the boss that fractures into light upon defeat. | **Dramatic Boss Battle**<br>168 BPM driving saw ostinato in Dm/Bb/Gm/A7b9.<br>Triumphant ascending Major Level-Up fanfare upon victory! | *"CORRUPTED SOVEREIGN HARMONIZED! Dimensional membrane fractured. Discovered DIRECTIONAL FLUX (Baud). Welcome to Part Two!"* |

---

## Part 3: TypeScript Upgrade Configuration for 5-Bit Arc

In `src/components/DimensionCanvas.tsx`, replace the original 10-bit upgrade array with this 5-bit array:

```typescript
export interface BitGraphicsUpgrade {
  bit: number;
  name: string;
  pipelineName: string;
  desc: string;
  costHz: number;
  costV: number;
}

export const BIT_GRAPHICS_UPGRADES_5BIT: BitGraphicsUpgrade[] = [
  {
    bit: 1,
    name: 'Bit 1: Monochrome Ray (2 Colors)',
    pipelineName: '1_Bit_Binary_Raster',
    desc: 'Calibrates 1-bit binary monochrome oscilloscope ray. Pilot, beam, and polarity controls ready.',
    costHz: 0,
    costV: 0,
  },
  {
    bit: 2,
    name: 'Bit 2: Coordinate Vector Matrix (4 Colors)',
    pipelineName: '2_Bit_Vector_Matrix',
    desc: 'Compiles distance hash marks every 60px, amplitude envelope guide rails, and trajectory ghost path.',
    costHz: 4,
    costV: 4,
  },
  {
    bit: 3,
    name: 'Bit 3: Harmonic Polarizer & HUD (8 Colors)',
    pipelineName: '3_Bit_Polarizer_HUD',
    desc: 'Compiles real-time telemetry HUD, reflection particle physics, and NEUTRALizer mode (■ Neutral -> +40 HP).',
    costHz: 12,
    costV: 12,
  },
  {
    bit: 4,
    name: 'Bit 4: Dimensional Crucible (16 Colors)',
    pipelineName: '4_Bit_Crucible_Engine',
    desc: 'Compiles 16-color phosphor bloom and high-velocity wave cadence. Warning: Destination point under siege!',
    costHz: 28,
    costV: 28,
  },
  {
    bit: 5,
    name: 'Bit 5: Master Sovereign Engine (32 Colors)',
    pipelineName: '5_Bit_Master_Sovereign',
    desc: '32-color master engine. Defeat Boss 1 (Corrupted Sovereign) to compile, unlocking Directional Flux & Part Two.',
    costHz: 0,
    costV: 0, // Earned by defeating Boss 1
  },
];
```

---

## Part 4: 4-Player Co-Op Architecture & State Machine

```typescript
export interface CoopPilot {
  id: 'P1' | 'P2' | 'P3' | 'P4';
  name: string;
  color: 'green' | 'blue' | 'amber' | 'azure';
  x: number;
  polarity: 1 | -1 | 0;
  integrity: number; // 0 to 100
  overshields: number; // 0 to 10
  state: 'active' | 'unconscious' | 'phasing';
  rebootTimer: number; // 4.5s countdown
  phasingTimer: number; // 1.5s invulnerability on reboot
}

export const KNOCKOUT_DURATION_SECONDS = 4.5;
export const REBOOT_INVULNERABILITY_SECONDS = 1.5;

// Tick loop updates for downed pilots and team wipe detection
export function updateCoopPilots(pilots: CoopPilot[], dtSeconds: number, onTeamWipe: () => void): void {
  let activePilotsCount = 0;

  for (const pilot of pilots) {
    if (pilot.state === 'unconscious') {
      pilot.rebootTimer = Math.max(0, pilot.rebootTimer - dtSeconds);
      if (pilot.rebootTimer === 0) {
        // Automatic passive reboot
        pilot.state = 'phasing';
        pilot.integrity = 50;
        pilot.phasingTimer = REBOOT_INVULNERABILITY_SECONDS;
      }
    } else {
      activePilotsCount++;
      if (pilot.state === 'phasing') {
        pilot.phasingTimer = Math.max(0, pilot.phasingTimer - dtSeconds);
        if (pilot.phasingTimer === 0) {
          pilot.state = 'active';
        }
      }
    }
  }

  // Team Wipe: If all 4 pilots are knocked out simultaneously
  if (activePilotsCount === 0 && pilots.length > 0) {
    onTeamWipe();
  }
}
```

---

## Part 5: Firestore Setup & Security Rules for New Project

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isBannedInitials(str) {
      return str in ['CUM', 'FAG', 'KKK', 'FUK', 'COK', 'DIK', 'SHT', 'CNT', 'FUC', 'JIZ', 'NIG', 'CUK', 'CUC', 'PUS', 'DIX', 'PED'];
    }

    function isBlockedFromLeaderboard(str) {
      return str == 'GOD' || isBannedInitials(str);
    }

    function isValidInitials(str) {
      return str is string && str.size() == 3 && str.matches('^[A-Z]{3}$') && !isBannedInitials(str);
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 64 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function isValidColor(color) {
      return color in ['green', 'blue', 'amber', 'azure'];
    }

    function isValidStoryBetaEntry(data) {
      return data.keys().hasAll(['initials', 'stageName', 'stageNum', 'completed', 'createdAt'])
        && isValidInitials(data.initials)
        && !isBlockedFromLeaderboard(data.initials)
        && data.stageName is string && data.stageName.size() <= 64
        && data.stageNum is number
        && data.completed is bool
        && (!('color' in data) || isValidColor(data.color))
        && (!('completions' in data) || (data.completions is number && data.completions >= 0))
        && (!('updatedAt' in data) || (data.updatedAt is string && data.updatedAt.size() <= 50))
        && data.createdAt is string && data.createdAt.size() <= 50;
    }

    match /leaderboards_story_beta/{docId} {
      allow read: if true;
      allow create: if isValidId(docId) && isValidStoryBetaEntry(request.resource.data);
      allow update: if isValidId(docId) && isValidStoryBetaEntry(request.resource.data);
      allow delete: if false;
    }

    match /leaderboards_meta/story_ftc_beta {
      allow read: if true;
      allow create: if isValidInitials(request.resource.data.initials)
                    && (!('color' in request.resource.data) || isValidColor(request.resource.data.color));
      allow update: if false;
      allow delete: if false;
    }

    match /players/{code} {
      allow read: if true;
      allow create, update: if isValidInitials(code);
      allow delete: if false;
    }
  }
}
```

---

## Part 6: Summary of Files to Copy to New Project

1. `src/components/DimensionCanvas.tsx` (using `BIT_GRAPHICS_UPGRADES_5BIT` & `CoopPilot` loop)
2. `src/audio/soundEngine.ts` (procedural Web Audio synth engine)
3. `src/services/leaderboardService.ts` (configured for `leaderboards_story_beta`)
4. `src/components/MainMenuModal.tsx` (story launch, options, reset save, beam color)
5. `src/components/GlobalLeaderboardModal.tsx` (high scores table & FTC)
6. `src/components/BeamColorSelectModal.tsx` (4 Res 8 harmonic zone beam colors)
7. `src/components/InitialsRegistrationModal.tsx` (arcade initials dialog)
8. `src/utils/backgroundArt.ts` (procedural 6-bit background)
9. `src/types/game.ts` (type definitions)
