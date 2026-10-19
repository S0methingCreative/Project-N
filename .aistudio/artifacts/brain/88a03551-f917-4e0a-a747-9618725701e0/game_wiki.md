# GAME N: Comprehensive Mechanics Wiki & Technical Reference Manual

---

## Table of Contents
1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [Game Mode Architecture & Rulesets](#2-game-mode-architecture--rulesets)
   - [2.1 Story Mode](#21-story-mode)
   - [2.2 Speedrun Mode](#22-speedrun-mode)
   - [2.3 Arcade Mode](#23-arcade-mode)
   - [2.4 Survival Mode](#24-survival-mode)
   - [2.5 Normal Mode (Legacy Sandbox)](#25-normal-mode-legacy-sandbox)
   - [2.6 Comparative Game Mode Matrix](#26-comparative-game-mode-matrix)
3. [Chronological Progression: Part One (0D Void to 1D Line, Bits 0–10)](#3-chronological-progression-part-one-0d-void-to-1d-line-bits-010)
   - [3.1 0D Acoustic Void (`currentN = 0`)](#31-0d-acoustic-void-currentn--0)
   - [3.2 1D Coordinate Genesis (`currentN = 1`)](#32-1d-coordinate-genesis-currentn--1)
   - [3.3 Bit Unlock Sequence (Bits 1 through 9)](#33-bit-unlock-sequence-bits-1-through-9)
   - [3.4 Boss 1 Encounter: The Corrupted Sovereign (Bit 9)](#34-boss-1-encounter-the-corrupted-sovereign-bit-9)
   - [3.5 Bit 10 Master Engine Compilation](#35-bit-10-master-engine-compilation)
4. [Chronological Progression: Part Two (2D Spatial & Resolution Scaling, Res 0–10)](#4-chronological-progression-part-two-2d-spatial--resolution-scaling-res-010)
   - [4.1 Spatial Rift Entry (`currentN = 2`, Res 0)](#41-spatial-rift-entry-currentn--2-res-0)
   - [4.2 Defensive & Mobility Unlocks (Resolutions 1–5)](#42-defensive--mobility-unlocks-resolutions-15)
   - [4.3 Environmental Sector Tri-Partition (Resolutions 6–8)](#43-environmental-sector-tri-partition-resolutions-68)
   - [4.4 Boss 2 Encounter: The Fracture Sovereign (Resolution 9)](#44-boss-2-encounter-the-fracture-sovereign-resolution-9)
   - [4.5 Resolution 10: Master Transcendence](#45-resolution-10-master-transcendence)
5. [Mathematical Formulations & System Variables](#5-mathematical-formulations--system-variables)
   - [5.1 Spawning Intervals & Cooldown Thresholds](#51-spawning-intervals--cooldown-thresholds)
   - [5.2 Pulse Velocity Formulations ($v_{\text{pulse}}$)](#52-pulse-velocity-formulations-v_textpulse)
   - [5.3 Damage, Shielding, and Collision Equations](#53-damage-shielding-and-collision-equations)
   - [5.4 Economy, Upgrade Cost Schedules & Ratios](#54-economy-upgrade-cost-schedules--ratios)
6. [Telemetry, Audio-Visual Synthesis & Controls Guide](#6-telemetry-audio-visual-synthesis--controls-guide)

---

## 1. Executive Summary & Core Philosophy

**Game N** is a dimensional deconstructionist rhythm-survival game. The player begins trapped in a zero-dimensional ($0\text{D}$) singularity—a void stripped of spatial coordinates, color palettes, telemetry, and frame rate. Through rhythmic interaction with waveforms and packets, the player harvests fundamental digital currency:
- **Frequency ($\text{Hz}$)**: Sourced from sinusoidal crests; measures spatial clock cycles.
- **Amplitude ($\text{Volts} / \text{V}$)**: Sourced from sinusoidal troughs; measures dielectric potential.
- **Wavelength ($\text{Baud} / \text{Bd}$)**: Sourced from neutral square packets; measures dimensional bandwidth.

Progressing through the game systematically boots up computer graphics history: 1-bit monochrome rastering $\to$ vector coordinate buses $\to$ color palettes $\to$ telemetry readouts $\to$ 8-bit VGA phosphor bloom $\to$ 2D spatial freedom $\to$ high-refresh-rate synchrotron acceleration ($240\text{ Hz}$).

```
[0D Acoustic Void] ──(1 Hz)──> [1D Oscilloscope Line] ──(Bits 1-8)──> [Bit 9: Corrupted Sovereign]
                                                                               │
                                                                       (Victory Compile)
                                                                               ▼
[240 Hz Master Transcendence] <──(Res 9: Fracture Sovereign) <── [Resolutions 1-8] <── [2D Spatial Rift (N=2)]
```

---

## 2. Game Mode Architecture & Rulesets

Game N provides four primary game modes, each enforcing distinct persistence rules, death penalties, tempo progressions, and victory conditions.

### 2.1 Story Mode
The canonical narrative progression spanning the full genesis from $0\text{D}$ to $2\text{D}$ Master Transcendence.
- **Save State Persistence**: Automatically persists to local storage key `game_n_story_save_v2`. Persisted fields: `currentN`, `act1Bits`, `act2Resolution`, `hertz`, `volts`, `baud`, `overshields`, `autoCompileEnabled`, `storyDialogueFlags`.
- **Checkpointing**: Automatic checkpointing upon entering Part Two ($N=2$) and upon defeating Boss 1 (Bit 10 compiled).
- **Death Recovery**:
  - Depletion of integrity to $0$ triggers the **Signal Collapse / Decompilation Screen**.
  - Players retain previously compiled permanent bit/resolution states.
  - A death compiler/recovery shop allows reinvesting harvested resources into integrity reinforcement before resuming.
- **Pacing**: Starts at `easy` Slow Waltz ($68\text{ BPM}$). Difficulty dynamically escalates based on pulse count:
  - Pulses $0 - 40$: `easy`
  - Pulses $41 - 80$: `medium`
  - Pulses $81 - 120$: `hard`
  - Pulses $121 - 160$: `crazy`
  - Pulses $161+$: `difficult`
- **Boss Checkpoints**: Boss 1 engages at Bit 9 (`MAX_BOSS_1_HP = 100`). Boss 2 engages at Resolution 9 (`MAX_BOSS_2_HP = 100`).

### 2.2 Speedrun Mode
High-stakes competitive mode engineered for pure execution and split timing.
- **Entry Point**: Always begins cleanly in the $0\text{D}$ Acoustic Void at $T = 00:00.000$.
- **Automated Mechanics**:
  - `autoCompileEnabled = true` is activated immediately from the very first frame.
  - As soon as the player harvests $1\text{ Hz}$ in the void, compilation of $N=1$ triggers automatically with zero latency.
- **Story-Equivalent Pulse Pacing & Dynamic Difficulty Escalation**:
  - Speedrun mode scales tempo, spawn rate, and wave velocities dynamically based on pulse count at the exact same rate as Story Mode:
    $$\text{Tier}(\text{pulses}) = \begin{cases} \text{easy: Slow Waltz} & 0 \le \text{pulses} \le 8 \\ \text{easy: Math Rock} & 9 \le \text{pulses} \le 24 \\ \text{easy: Arcade Techno} & 25 \le \text{pulses} \le 40 \\ \text{medium: Slow Waltz} & 41 \le \text{pulses} \le 48 \\ \text{medium: Math Rock} & 49 \le \text{pulses} \le 64 \\ \text{medium: Arcade Techno} & 65 \le \text{pulses} \le 80 \\ \text{hard: Slow Waltz} & 81 \le \text{pulses} \le 88 \\ \text{hard: Math Rock} & 89 \le \text{pulses} \le 104 \\ \text{hard: Arcade Techno} & 105 \le \text{pulses} \le 120 \\ \text{crazy: Slow Waltz} & 121 \le \text{pulses} \le 128 \\ \text{crazy: Math Rock} & 129 \le \text{pulses} \le 144 \\ \text{crazy: Arcade Techno} & \text{pulses} \ge 145 \end{cases}$$
  - **Boss Encounters**: Boss 1 (Bit 9) and Boss 2 (Resolution 9) initiate with dramatic Boss Music active; Boss 1 begins at Hard difficulty ($0-12$ pulses Slow Waltz $\to 13-28$ Math Rock $\to 29-44$ Arcade Techno $\to 45+$ Crazy) identical to Story Mode.
  - **Milestone Transitions**: Pulse counts reset upon transitioning into Boss 1, ascending to Part Two ($N=2$), and engaging Boss 2 to maintain pristine Story Mode pacing across major dimensional shifts.
- **Death Screen & Recovery**:
  - The death interface presents a direct **"CONTINUE RUN"** button; manual compilation shops are bypassed via auto-compile.
  - Upon death, the **pulse counter resets to 0**, tempo resets to the baseline Slow Waltz (`easy`), and all in-flight projectiles and particles are purged to prevent instant re-death while the cumulative speedrun clock continues.
- **Victory Condition**: Defeat of Boss 2 and compilation of Resolution 10 stops the speedrun clock with millisecond precision.

### 2.3 Arcade Mode
A structured 9-stage challenge emphasizing resource efficiency and strict single-life survival, culminating in the First Boss confrontation.
- **Stage Progression Ladder (9 Distinct Stages)**:
  - Stages 1–9 correspond to Bits 1 through 9.
  - Conquering Boss 1 (Corrupted Sovereign, Bit 9) achieves immediate Arcade Victory!
  - Arcade mode strictly does NOT have Part 2 or extra lives.
- **Lives Pool**:
  - Begins and remains with strictly **1 Life** (`lives = 1`).
  - No extra lives are awarded at any point during the run.
- **Auto-Compile Full Repair Mechanic**:
  - To balance the strict 1-life permadeath constraint, **every Bit auto-compilation automatically restores pilot integrity back to 100% full health**.
  - Collecting the required $\text{Hz}$ and $\text{V}$ to advance to the next bit provides an instant tactical repair, rewarding consistent rhythm and proactive harvesting.
- **Permadeath**: Depleting your 1 life triggers a permanent **GAME OVER** screen displaying:
  - Stage Reached (e.g., `Stage 09: Bit 9 - The Precipice`)
  - Survival Duration (`mm:ss.sss`)
  - Total Harmonics Harvested
  - Cause of Terminal Failure (e.g., `Trough Polarity Mismatch`, `Direct Error Zone Thermal Exposure`)
- **Stage Upgrade Costs (`ARCADE_BIT_UNLOCK_COSTS`)**:
  | Stage | Target Bit | Hz Required | V Required | Special Stage Milestone |
  | :--- | :--- | :--- | :--- | :--- |
  | 1 | Bit 1 | $0\text{ Hz}$ | $0\text{ V}$ | Starting Baseline (1-Bit Oscilloscope) |
  | 2 | Bit 2 | $2\text{ Hz}$ | $2\text{ V}$ | 2-Bit Vector Axis |
  | 3 | Bit 3 | $3\text{ Hz}$ | $3\text{ V}$ | Polarizer Reticle |
  | 4 | Bit 4 | $6\text{ Hz}$ | $6\text{ V}$ | Calibrated Distance Bus |
  | 5 | Bit 5 | $10\text{ Hz}$ | $10\text{ V}$ | Upper & Lower Rail Horizontals |
  | 6 | Bit 6 | $16\text{ Hz}$ | $16\text{ V}$ | Telemetry Gauge (Math Rock, Medium) |
  | 7 | Bit 7 | $24\text{ Hz}$ | $24\text{ V}$ | Beat Horizon Phase Grid (Arcade Techno, Medium) |
  | 8 | Bit 8 | $36\text{ Hz}$ | $36\text{ V}$ | Neutralizer Mode (Cycling, Medium) |
  | 9 | Bit 9 | $50\text{ Hz}$ | $50\text{ V}$ | Boss 1: Corrupted Sovereign (Cycling 2, Hard — Victory Completes Mode) |
- **Stage Pacing Architecture (`getArcadePacing`)**:
  Arcade mode explicitly locks musical genres and tempos per stage rather than relying purely on pulse counters:
  - **Stage 1 & 2 (Bits 1–2)**: `genre = 'slow_waltz'`, `difficulty = 'easy'` ($68\text{ BPM}$)
  - **Stage 3 (Bit 3)**: `genre = 'math_rock'`, `difficulty = 'easy'` ($92\text{ BPM}$)
  - **Stage 4 (Bit 4)**: `genre = 'arcade_techno'`, `difficulty = 'easy'` ($128\text{ BPM}$)
  - **Stage 5 (Bit 5)**: `genre = 'cycling'`, `difficulty = 'easy'` (Cycles Waltz $\leftrightarrow$ Rock $\leftrightarrow$ Techno every 8 pulses)
  - **Stage 6 (Bit 6)**: `genre = 'math_rock'`, `difficulty = 'medium'` ($110\text{ BPM}$)
  - **Stage 7 (Bit 7)**: `genre = 'arcade_techno'`, `difficulty = 'medium'` ($140\text{ BPM}$)
  - **Stage 8 (Bit 8)**: `genre = 'cycling'`, `difficulty = 'medium'` (Cycles Waltz $\leftrightarrow$ Rock $\leftrightarrow$ Techno every 8 pulses)
  - **Stage 9 (Bit 9)**: `genre = 'cycling2'`, `difficulty = 'hard'` (Cycles Rock and Techno every 8 pulses; Boss 1 Encounter — Conquering achieves Mode Victory!)

### 2.4 Survival Mode
Endurance trial taking place entirely within the overclocked $2\text{D}$ engine.
- **Starting Conditions**:
  - $N = 2$ (2D Space Active)
  - Graphics Engine: Bit 10 ($1024$ Colors)
  - Temporal Resolution: Resolution 10 ($240\text{ FPS}$)
  - Defensive Matrix: **5 Overshields** + $100\text{ HP}$ Base Integrity
  - All environmental sectors (Harmonic Slit, Attenuation Zone, Emitter Maw) active from second 0.
- **Time-Based Difficulty Escalation**:
  Survival difficulty scales strictly by elapsed survival time (starting a little easier with an introductory pace ramp over the first 30s):
  $$\text{Tier}(t) = \begin{cases} \text{easy} & 0\text{s} \le t < 30\text{s} \quad (\text{introductory warmup progressing to current standard difficulty}) \\ \text{medium} & 30\text{s} \le t < 50\text{s} \\ \text{hard} & 50\text{s} \le t < 75\text{s} \\ \text{crazy} & 75\text{s} \le t < 100\text{s} \\ \text{difficult} & t \ge 100\text{s} \end{cases}$$
- **Timed Sovereign Invasions**:
  - **$t = 60\text{s}$ (1:00)**: **Boss 1 (Corrupted Sovereign)** infiltrates the line.
  - **$t = 120\text{s}$ (2:00)**: **Boss 2 (Fracture Sovereign)** engages with full sector spotlight shifts.
- **End State**: Permadeath on integrity reaching zero. Final metrics logged: Survival Time, Peak Sector Occupied, Baud Collected, Sovereign Defeats.

### 2.5 Normal Mode (Legacy Sandbox)
Free-form sandbox allowing players to manually test bit upgrades, audio synthesizers, and mechanical stages without strict permadeath or speedrun constraints.

---

### 2.6 Comparative Game Mode Matrix

| Feature | Story Mode | Speedrun Mode | Arcade Mode | Survival Mode |
| :--- | :--- | :--- | :--- | :--- |
| **Starting Dimension** | $0\text{D}$ Void | $0\text{D}$ Void | $1\text{D}$ (Bit 1) | $2\text{D}$ (Res 10, Bit 10) |
| **Initial Lives** | Infinite (Respawn) | Infinite (Timer Keeps Running) | 1 Life (Strict Permadeath, No Extra Lives) | 1 Life (Strict Permadeath) |
| **Starting Overshields** | 0 | 0 | 0 | 5 Stacks |
| **Auto-Compile** | Unlocked via upgrade | Active from Frame 0 | Auto per stage payment | Not applicable |
| **Pacing Model** | Pulse Count Dependent | Continuous Pulse Escalation | Stage-Locked (`getArcadePacing`) | Survival Time ($25\text{s}$ bands) |
| **Death Consequence** | Checkpoint Reset | Pulse count & tempo reset | Permanent Game Over | Permanent Game Over |
| **Local Persistence** | `game_n_story_save_v2` | Session only | Session high scores | Session high scores |
| **Boss Invasions** | Bit 9 & Res 9 | Bit 9 & Res 9 | Stage 9 (Boss 1, Completes Mode) | $t=60\text{s}$ & $t=120\text{s}$ |

---

## 3. Chronological Progression: Part One (0D Void to 1D Line, Bits 0–10)

```
0D VOID (Tap for Hz) 
       │
       ▼ [1 Hz: Compile N=1]
1D LINE (playerX = 240, traceY = 220)
       │
       ├── Bit 1: Monochrome binary raster (Crest +10 HP, Trough -20 HP)
       ├── Bit 2: 4-color phosphor, 2-bit dashed vector axis
       ├── Bit 3: Polarizer reticle indicator & constellation nodes
       ├── Bit 4: 16-color calibrated coordinate bus with hash marks
       ├── Bit 5: Upper (+V) & Lower (-V) rail guides
       ├── Bit 6: Telemetry HUD (Integrity gauge, frequency readouts)
       ├── Bit 7: Beat horizon ticks (128-color phase grid)
       ├── Bit 8: Neutralizer Mode (Polarity = 0) absorbs Square Packets
       ├── Bit 9: The Precipice (Corrupted destination point)
       │          └── BOSS 1: CORRUPTED SOVEREIGN (100 HP)
       ▼
BIT 10: 1024-Color Master Engine Compiled ──> Opens Part Two Rift
```

### 3.1 0D Acoustic Void (`currentN = 0`)
- **System Variables**:
  - `act1PurchasedN = false`
  - `currentN = 0`
  - `act1Bits = 0`
  - `act1Phase = 'void'`
- **Visual Presentation**: Absolute pitch-black canvas (`#000000`). No axes, no coordinates, no grid, no frame rate counter.
- **Audio Profile**: Slow Waltz fundamental tone in $C_4$ ($261.63\text{ Hz}$). Sub-bass drone at $65.41\text{ Hz}$.
- **Core Mechanics**:
  - Direct pointer interaction (mouse click, touch tap, or keyboard spacebar) compresses the acoustic singularity.
  - Each tap generates an acoustic pop (triangle wave synthesized with exponential pitch decay) and increments Frequency:
    $$\text{Hz} = \text{Hz} + 1$$
  - Reaching the compile threshold ($\text{Hz} \ge 1$) unlocks the prompt to compile the first dimension:
    $$\text{Target: Compile Dimension } N=1 \quad (\text{Cost: } 1\text{ Hz})$$
  - In **Speedrun Mode**, the compilation executes instantaneously upon reaching $1\text{ Hz}$.

---

### 3.2 1D Coordinate Genesis (`currentN = 1`)
- **System Variables**:
  - `act1PurchasedN = true`
  - `currentN = 1`
  - `act1Phase = 'point'`
  - `playerX = 240.0` (Stationary coordinate anchor)
  - `TRACE_Y = 220.0`
- **Spatial Anchoring**:
  - A horizontal vector line renders across the canvas at $y = 220$.
  - The player entity appears as a 1D coordinate node anchored at $x = 240$.
  - In Part One, the player possesses **zero lateral mobility** ($v_x = 0$); navigation occurs purely along the **polar axis**:
    $$\text{Polarity } P \in \{+1 \text{ [Crest]}, -1 \text{ [Trough]}\}$$
  - Controls: Key Up / W sets $P = +1$; Key Down / S sets $P = -1$.

---

### 3.3 Bit Unlock Sequence (Bits 1 through 9)

#### Bit 1: 2 Colors (Binary Monochrome Raster)
- **Palette**: Strict binary black and phosphor green (`#000000`, `#00ff66`).
- **Mechanics**:
  - Periodic sinusoidal wave pulses spawn at the right boundary ($x = 800$) and travel left toward the player node ($x = 240$).
  - **Top Wave (Crest, $P_{\text{pulse}} = +1$)**: Harbors **Hertz (Hz)**. If player matches polarity ($P = +1$), absorbs the wave:
    $$\text{Hz} = \text{Hz} + 1, \quad \text{Integrity} = \min(100, \text{Integrity} + 10)$$
  - **Bottom Wave (Trough, $P_{\text{pulse}} = -1$)**: Harbors **Volts (V)**. If player matches polarity ($P = -1$), safely grounds dielectric potential:
    $$\text{V} = \text{V} + 1$$
  - **Mismatch Collision**: If player polarity mismatches the wave ($P \ne P_{\text{pulse}}$):
    $$\text{Integrity} = \text{Integrity} - 20$$
  - Collision spawns binary 1-bit monochrome debris particles that disperse along horizontal vector trajectories.

#### Bit 2: 4 Colors (Vector Coordinate Axis)
- **Visuals**: Phosphor depth expands to 4 tonal values.
- **Additions**:
  - Primary coordinate axis displays dashed vector ticks every $20\text{ px}$.
  - Stepped scanline floor renders at the bottom of the display.

#### Bit 3: 8 Colors (Polarizer Reticle)
- **Visuals**: 8-color vintage terminal palette.
- **Additions**:
  - The player node gains a directional **vector arrow reticle** indicating current polarity state.
  - Ambient constellation nodes oscillate in the background in harmonic sync with the active music genre.

#### Bit 4: 16 Colors (Calibrated Distance Bus)
- **Visuals**: 16-color EGA-inspired cyber-palette.
- **Additions**:
  - The coordinate line renders calibrated distance hash marks with coordinate offsets relative to $x=240$.
  - Chromatic color coding distinguishes Top Crests (emerald green) from Bottom Troughs (electric violet).

#### Bit 5: 32 Colors (Amplitude Guide Rails)
- **Visuals**: 32-color extended palette.
- **Additions**:
  - Upper amplitude rail ($y = 170$) and lower amplitude rail ($y = 270$) render as faint phosphor guides, giving visual boundaries to incoming sinusoidal arcs.

#### Bit 6: 64 Colors (Telemetry HUD)
- **Visuals**: 64-color palette.
- **Additions**:
  - Real-time digital telemetry HUD displays:
    - Integrity Bar (`HP 100/100`)
    - Frequency Readout (`Hz`)
    - Amplitude Readout (`V`)
    - Current Music Genre & BPM
  - *Arcade Mode Unique Event*: Reaching Stage 6 activates **Math Rock (Medium Difficulty)** with accelerating 5/8 polyrhythmic pulses.

#### Bit 7: 128 Colors (Beat Horizon Phase Grid)
- **Visuals**: 128-color depth.
- **Additions**:
  - Vertical beat markers slide across the trace line in exact synchrony with the synthesizer tempo, providing visual cues for incoming wave impacts.

#### Bit 8: 256 Colors (Neutralizer Mode Unlocked)
- **Visuals**: Full 8-bit 256-color VGA palette with subtle phosphor bloom.
- **Major Mechanical Unlock: The Neutralizer**:
  - A third polarity state becomes available:
    $$P = 0 \quad (\text{Neutral State / } \blacksquare)$$
  - Controls: Pressing Key Down when at Crest, or Key Up when at Trough, centers the reticle to $P = 0$. (Or dedicated Center key / Spacebar / Screen Center Tap).
- **Square Packet Spawning**:
  - Square wave telemetry packets begin spawning along the center rail ($y = 220$).
  - If player is in Neutral polarity ($P = 0$) upon impact:
    $$\text{Baud} = \text{Baud} + 1, \quad \text{Integrity} = \min(100, \text{Integrity} + 40)$$
    Plays an ethereal $A\text{m}$ arpeggiated chord ($A_4 - C_5 - E_5$).
  - If player is polarized ($P = +1$ or $P = -1$) upon square packet impact:
    $$\text{Integrity} = \text{Integrity} - 25$$

#### Bit 9: 512 Colors (The Precipice)
- **Visuals**: Diminished, glitching scanlines. The coordinate trace flickers between red and emerald.
- **Mechanical State**: Spatial destination point at $x = 650$ is corrupted by anomaly signature **Sovereign-1**. Access to Part Two is barred until the anomaly is purged.

---

### 3.4 Boss 1 Encounter: The Corrupted Sovereign (Bit 9)

```
        CORRUPTED SOVEREIGN (Boss 1 - 100 HP)
                [X = 650, Y = 220]
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
Tractor Force   Alternating Waves   Thermal Error Zones
(Pulls Player)  (Crest / Trough)    (Red Line Hazards)
```

- **Trigger**: Purchasing Bit 9 or reaching Stage 9 in Arcade Mode.
- **Boss Statistics**:
  - Health: $\text{BossHP} = 100$
  - Position: Fixed at $x = 650$, hovering over the corrupted terminus.
  - Vulnerability: Damaged by absorbing in-flight waveforms and deflecting them back into the sovereign.
- **Combat Mechanics & Attack Phases**:
  1. **Phase 1: Tractor Gravity ($100 \ge \text{HP} > 70$)**:
     - The Sovereign emits a localized gravitational pull, drawing the trace line into high-frequency oscillation.
     - Spawns rapid single crests and troughs at $1.5\times$ base speed.
     - Matching a wave inflicts $-10\text{ HP}$ on Boss 1:
       $$\text{BossHP} = \text{BossHP} - 10$$
  2. **Phase 2: Thermal Error Zones ($70 \ge \text{HP} > 35$)**:
     - The boss paints red glowing error segments onto the coordinate line:
       $$\text{Hazard Zone: } x \in [x_{\text{start}}, x_{\text{end}}]$$
     - While an error zone covers the player node, direct thermal integrity damage is applied:
       $$\frac{d(\text{Integrity})}{dt} = -30\text{ HP/s}$$
  3. **Phase 3: Hyper-Density Packet Barrage ($\text{HP} \le 35$)**:
     - Sovereign alternates rapid Square Packets and inverted sinusoidal troughs.
     - Player must toggle rapidly: $+1 \to 0 \to -1 \to 0 \to +1$.
     - Successfully absorbing a Square Packet deals $-15\text{ HP}$ to Boss 1.
- **Victory Condition**:
  - $\text{BossHP} \le 0$: Boss 1 explodes into a radial burst of 256 phosphor particles.
  - Automatically compiles **Bit 10 (1024 Colors Master Engine)**.
  - The dimensional rift opens, allowing the player to compile $N = 2$.

---

### 3.5 Bit 10 Master Engine Compilation
- **Palette**: Full 1024-color high-dynamic-range spectrum.
- **Effects**: Vector line anti-aliasing, phosphor trail persistence, dynamic bloom shader simulation.
- Unlocks the dimensional transition bridge to **Part Two ($2\text{D}$ Spatial Plane)**.

---

## 4. Chronological Progression: Part Two (2D Spatial & Resolution Scaling, Res 0–10)

```
PART TWO: 2D SPATIAL PLANE (N = 2)
========================================================================================
[SECTOR 1: ATTENUATION]     [SECTOR 2: HARMONIC SLIT]     [SECTOR 3: EMITTER MAW]
X: 80 to 240                X: 240 to 430                 X: 430 to 620
Blue Glow | 0.6x Wave Speed Emerald Glow | 2x Yield       Amber Glow | 4x Yield (High Risk)
========================================================================================
Resolutions:
- Res 1: Overshields Compiled (Stackable pulse absorption)
- Res 2: 1D Line Mobility Unlocked (Left / Right Movement: A/D or Left Thumb)
- Res 3: Agility Boost (+33% lateral speed)
- Res 4: Agility Boost (+66% lateral speed)
- Res 5: Full 60 FPS Agility (Instant lateral response)
- Res 6: Harmonic Slit Gateway Active (2x Yield)
- Res 7: Attenuation Gateway Active (Dampens incoming velocities)
- Res 8: Emitter Maw Gateway Active (4x Yield)
- Res 9: BOSS 2: FRACTURE SOVEREIGN (Vulnerability Spotlight Shifts)
- Res 10: MASTER TRANSCENDENCE (240 FPS, Orion Nebula, Synchrotron Arcs)
```

### 4.1 Spatial Rift Entry (`currentN = 2`, Res 0)
- **Dimensional Shift**:
  - Dimension expands from 1D scalar line to 2D Cartesian plane:
    $$N = 2, \quad \text{Resolution} = 0 \quad (0\text{ FPS Static Rift})$$
  - The trace line is now embedded within a dual-axis coordinate matrix with vertical and horizontal phosphor bounds.

---

### 4.2 Defensive & Mobility Unlocks (Resolutions 1–5)

#### Resolution 1: 15 FPS (Overshields Compiled)
- **Defensive Matrix Initialization**:
  - Compiles the Overshield subsystem (`overshields` integer variable, max capacity 10).
  - Each overshield stack provides an electromagnetic buffer against pulse collisions:
    $$\text{Incoming Mismatch Damage} \implies \begin{cases} \text{overshields} = \text{overshields} - 1, \quad \Delta\text{Integrity} = 0 & \text{if } \text{overshields} > 0 \\ \text{Integrity} = \text{Integrity} - 20 & \text{if } \text{overshields} = 0 \end{cases}$$
  - Overshields render as concentric glowing cyan hexagonal barriers around the player core.

#### Resolution 2: 24 FPS (1D Line Mobility Unlocked)
- **Major Control Breakthrough: Lateral Movement**:
  - The player entity is freed from stationary lock at $x = 240$.
  - Controls: Key Left / A moves player leftward; Key Right / D moves player rightward. On mobile, dragging the left virtual joystick provides analog positioning.
  - Active Movement Range:
    $$x_{\text{player}} \in [80, 620]$$
  - Base lateral movement velocity: $v_x = 180\text{ px/s}$.

#### Resolution 3: 30 FPS (Agility +33%)
- Lateral movement velocity scales up:
  $$v_x = 240\text{ px/s}$$

#### Resolution 4: 45 FPS (Agility +66%)
- Lateral movement velocity scales up:
  $$v_x = 300\text{ px/s}$$

#### Resolution 5: 60 FPS (Full 60 FPS Agility)
- Lateral movement velocity achieves full hardware response:
  $$v_x = 380\text{ px/s}$$
- Allows micro-dodging between closely spaced high-velocity pulse trains.

---

### 4.3 Environmental Sector Tri-Partition (Resolutions 6–8)

At Resolution 6 through 8, the coordinate playfield divides into three distinct thermodynamic zones:

```
+─────────────────────+─────────────────────+─────────────────────+
|  ATTENUATION ZONE   |    HARMONIC SLIT    |     EMITTER MAW     |
|   X: [80, 240]      |    X: [240, 430]    |    X: [430, 620]    |
|   Cobalt / Blue     |   Emerald / Green   |    Amber / Solar    |
|   Wave Speed: 0.6x  |   Resource: 2x      |   Resource: 4x      |
|   Yield: 1x         |   Wave Speed: 1.0x  |   Wave Speed: 1.3x  |
+─────────────────────+─────────────────────+─────────────────────+
```

#### Resolution 6: 75 FPS (Harmonic Slit Gateway)
- **Sector**: Center Sector, $x \in [240, 430]$.
- **Aesthetic**: Translucent emerald boundary with standing vertical harmonic waves.
- **Resource Multiplier**:
  $$\text{Harvested Hz} = \text{BaseHz} \times 2, \quad \text{Harvested V} = \text{BaseV} \times 2$$

#### Resolution 7: 90 FPS (Attenuation Zone Gateway)
- **Sector**: Left Sector, $x \in [80, 240]$.
- **Aesthetic**: Deep cobalt blue ionization barrier.
- **Physics Alteration**:
  - Entering this sector dampens incoming pulse velocities by $40\%$:
    $$v_{\text{pulse, attenuated}} = v_{\text{pulse}} \times 0.60$$
  - Provides a safe harbor during `crazy` and `difficult` tempo spikes.

#### Resolution 8: 120 FPS (Emitter Maw Gateway)
- **Sector**: Right Sector, $x \in [430, 620]$.
- **Aesthetic**: Solar amber / incandescent flare boundary directly facing the wave emitter source.
- **Physics & Economy**:
  - High-risk, extreme-reward territory:
    $$\text{Harvested Hz} = \text{BaseHz} \times 4, \quad \text{Harvested V} = \text{BaseV} \times 4, \quad \text{Harvested Baud} = \text{BaseBaud} \times 4$$
  - Incoming pulse velocity is accelerated by $+30\%$:
    $$v_{\text{pulse, maw}} = v_{\text{pulse}} \times 1.30$$
  - Player reaction window drops below $120\text{ ms}$.

---

### 4.4 Boss 2 Encounter: The Fracture Sovereign (Resolution 9)

```
                       FRACTURE SOVEREIGN (Boss 2 - 100 HP)
                                [Dimension 2 Vortex]
                                         │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
Shifting Spotlight Target       Dimensional Shear Waves        Red Error Sweep
(Harmonic / Attenuation / Maw)  (Dual-Polarity Overlaps)      (Continuous Line Hazards)
```

- **Trigger**: Compiling Resolution 9 or reaching $t = 120\text{s}$ in Survival Mode.
- **Boss Statistics**:
  - Health: $\text{BossHP}_2 = 100$
  - Behavior: Fluid dimensional vortex hovering across the top of the canvas.
- **Core Mechanic: Shifting Vulnerability Spotlight**:
  - The Fracture Sovereign projects a roving spotlight that shifts between the three sectors:
    $$\text{Active Vulnerability} \in \{\text{'harmonic'}, \text{'attenuation'}, \text{'emitter'}\}$$
  - The spotlight changes position every $6.0\text{ seconds}$ (accompanied by an alert siren and sector glow flare).
  - **Damage Rule**: Absorbing or deflecting waves **only damages Boss 2 if the player is physically located within the illuminated Vulnerability Sector**:
    $$\Delta\text{BossHP}_2 = \begin{cases} -10 & \text{if } x_{\text{player}} \in \text{VulnerabilitySector} \\ 0 & \text{if } x_{\text{player}} \notin \text{VulnerabilitySector} \end{cases}$$
- **Boss Attack Patterns**:
  1. **Dual-Polarity Wave Overlaps**: Spawns paired Crest ($+1$) and Trough ($-1$) waves in rapid succession, forcing the player to reposition dynamically into the Attenuation zone or time instant polarity flips.
  2. **Sweeping Red Error Beam**: A sweeping red thermal zone moves across one or two sectors, forcing the player to evacuate to the opposite side of the playfield.
  3. **Packet Vortex**: Flurry of neutral Square Packets aimed directly at the player. Absorbing them while inside the active spotlight deals critical damage ($-20\text{ HP}$ to Boss 2).
- **Victory**: Boss 2 fractures into multidimensional geometry, releasing the cosmic lock on Resolution 10.

---

### 4.5 Resolution 10: Master Transcendence
- **Visual Presentation**:
  - **Temporal Refresh**: Render loop uncapped up to $240\text{ Hz}$.
  - **Cosmic Environment**: The background illuminates into an ultra-high-definition procedural **Orion Nebula** with deep violet, magenta, and cyan gas clouds.
  - **Synchrotron Arcs**: High-energy electric arcs arc across the boundaries of the playfield.
  - **HUD Status**: Displays `TRANSCENDENCE COMPLETE - ENGINE NOMINAL`.

---

## 5. Mathematical Formulations & System Variables

### 5.1 Spawning Intervals & Cooldown Thresholds

Wave and packet generation is governed by a tick-accumulator pattern evaluated every frame:

```
cooldownCounter += 1
if cooldownCounter >= cooldownThreshold:
    cooldownCounter = 0
    spawnPulse()
```

The value of `cooldownThreshold` is a function of the active **Difficulty Tier** (`easy`, `medium`, `hard`, `crazy`, `difficult`) and **Music Genre** (`slow_waltz`, `math_rock`, `arcade_techno`):

#### 1. Easy Tier ($0 - 40$ Pulses)
- **Slow Waltz ($68\text{ BPM}$)**:
  $$\text{cooldownThreshold} = 76\text{ ticks}$$
- **Math Rock ($92\text{ BPM}$, 5-Step Polyrhythm Burst Array)**:
  $$\text{burstSteps} = [22, 22, 54, 26, 46]$$
  $$\text{cooldownThreshold} = \text{burstSteps}[\text{burstIndex} \bmod 5]$$
- **Arcade Techno ($128\text{ BPM}$, Alternating Pulse Interval)**:
  $$\text{cooldownThreshold} = \begin{cases} 22\text{ ticks} & \text{if } \text{pulses} \equiv 1 \pmod 2 \\ 44\text{ ticks} & \text{if } \text{pulses} \equiv 0 \pmod 2 \end{cases}$$

#### 2. Medium Tier ($41 - 80$ Pulses)
- **Slow Waltz ($82\text{ BPM}$)**:
  $$\text{cooldownThreshold} = 62\text{ ticks}$$
- **Math Rock ($110\text{ BPM}$)**:
  $$\text{burstSteps} = [16, 16, 38, 19, 32]$$
  $$\text{cooldownThreshold} = \text{burstSteps}[\text{burstIndex} \bmod 5]$$
- **Arcade Techno ($140\text{ BPM}$)**:
  $$\text{cooldownThreshold} = \begin{cases} 16\text{ ticks} & \text{if } \text{pulses} \equiv 1 \pmod 2 \\ 32\text{ ticks} & \text{if } \text{pulses} \equiv 0 \pmod 2 \end{cases}$$

#### 3. Hard Tier ($81 - 120$ Pulses)
- **Slow Waltz ($96\text{ BPM}$)**:
  $$\text{cooldownThreshold} = 48\text{ ticks}$$
- **Math Rock ($126\text{ BPM}$)**:
  $$\text{burstSteps} = [12, 12, 28, 14, 24]$$
  $$\text{cooldownThreshold} = \text{burstSteps}[\text{burstIndex} \bmod 5]$$
- **Arcade Techno ($156\text{ BPM}$)**:
  $$\text{cooldownThreshold} = \begin{cases} 12\text{ ticks} & \text{if } \text{pulses} \equiv 1 \pmod 2 \\ 24\text{ ticks} & \text{if } \text{pulses} \equiv 0 \pmod 2 \end{cases}$$

#### 4. Crazy Tier ($121 - 160$ Pulses)
- **Slow Waltz ($112\text{ BPM}$)**:
  $$\text{cooldownThreshold} = 36\text{ ticks}$$
- **Math Rock ($144\text{ BPM}$)**:
  $$\text{burstSteps} = [9, 9, 20, 11, 18]$$
  $$\text{cooldownThreshold} = \text{burstSteps}[\text{burstIndex} \bmod 5]$$
- **Arcade Techno ($174\text{ BPM}$)**:
  $$\text{cooldownThreshold} = \begin{cases} 9\text{ ticks} & \text{if } \text{pulses} \equiv 1 \pmod 2 \\ 18\text{ ticks} & \text{if } \text{pulses} \equiv 0 \pmod 2 \end{cases}$$

#### 5. Difficult Tier ($161+$ Pulses)
- Spawns decay dynamically based on pulse excess:
  $$\text{cooldownThreshold} = \max\left(8, 14 - \left\lfloor \frac{\text{pulses} - 160}{20} \right\rfloor \right) \text{ ticks}$$

---

### 5.2 Pulse Velocity Formulations ($v_{\text{pulse}}$)

Pulse movement across the horizontal axis is computed per frame:
$$x_{\text{pulse}}(t + \Delta t) = x_{\text{pulse}}(t) + (v_{\text{pulse}} \cdot 60 \cdot \Delta t)$$
*(Where $v_{\text{pulse}} < 0$, moving right-to-left from emitter $x \approx 800$ to sink $x \approx 0$.)*

#### Base Velocities by Tier & Genre:
| Difficulty Tier | Slow Waltz ($v_{\text{pulse}}$) | Math Rock ($v_{\text{pulse}}$) | Arcade Techno ($v_{\text{pulse}}$) |
| :--- | :--- | :--- | :--- |
| **Easy** | $-2.4\text{ px/frame}$ | $-2.8\text{ px/frame}$ | $-3.2\text{ px/frame}$ |
| **Medium** | $-3.3\text{ px/frame}$ | $-3.8\text{ px/frame}$ | $-4.3\text{ px/frame}$ |
| **Hard** | $-4.4\text{ px/frame}$ | $-5.0\text{ px/frame}$ | $-5.5\text{ px/frame}$ |
| **Crazy** | $-5.6\text{ px/frame}$ | $-6.2\text{ px/frame}$ | $-6.8\text{ px/frame}$ |
| **Difficult** | $-7.2\text{ px/frame}$ | $-7.8\text{ px/frame}$ | $-8.5\text{ px/frame}$ |

#### Environmental Modifiers (Part Two):
$$v_{\text{final}} = \begin{cases} v_{\text{pulse}} \times 0.60 & \text{if pulse enters Attenuation Zone } (x \in [80, 240]) \\ v_{\text{pulse}} \times 1.00 & \text{if pulse enters Harmonic Slit } (x \in [240, 430]) \\ v_{\text{pulse}} \times 1.30 & \text{if pulse enters Emitter Maw } (x \in [430, 620]) \end{cases}$$

---

### 5.3 Damage, Shielding, and Collision Equations

Let $P_{\text{player}} \in \{+1, 0, -1\}$ and $P_{\text{pulse}} \in \{+1, 0, -1\}$.

#### 1. Sinusoidal Waves ($P_{\text{pulse}} \in \{+1, -1\}$):
- **Collision Check**: Occurs when $|x_{\text{player}} - x_{\text{pulse}}| \le \text{HIT\_RADIUS}$ ($18\text{ px}$).
- **Matched Polarity ($P_{\text{player}} = P_{\text{pulse}}$)**:
  $$\text{Integrity} \leftarrow \min(100, \text{Integrity} + 10)$$
  $$\text{Resource} \leftarrow \text{Resource} + (1 \times \text{SectorMultiplier})$$
- **Mismatched Polarity ($P_{\text{player}} \ne P_{\text{pulse}}$)**:
  $$\begin{cases} \text{overshields} \leftarrow \text{overshields} - 1 & \text{if } \text{overshields} > 0 \\ \text{Integrity} \leftarrow \text{Integrity} - 20 & \text{if } \text{overshields} = 0 \end{cases}$$

#### 2. Neutral Square Packets ($P_{\text{pulse}} = 0$):
- **Matched Polarity ($P_{\text{player}} = 0$)**:
  $$\text{Integrity} \leftarrow \min(100, \text{Integrity} + 40)$$
  $$\text{Baud} \leftarrow \text{Baud} + (1 \times \text{SectorMultiplier})$$
- **Mismatched Polarity ($P_{\text{player}} \ne 0$)**:
  $$\begin{cases} \text{overshields} \leftarrow \text{overshields} - 1 & \text{if } \text{overshields} > 0 \\ \text{Integrity} \leftarrow \text{Integrity} - 25 & \text{if } \text{overshields} = 0 \end{cases}$$

#### 3. Red Thermal Error Zones:
- Continuous exposure damage applied per delta-time tick:
  $$\text{Integrity} \leftarrow \text{Integrity} - (30 \times \Delta t)$$
  *(Overshields do not absorb continuous environmental thermal burn).*

---

### 5.4 Economy, Upgrade Cost Schedules & Ratios

#### Standard Mode: Part One Bit Unlock Costs (`BIT_GRAPHICS_UPGRADES`)
| Bit Level | Color Depth | Hz Required | V Required | Baud Required | Mechanics Unlocked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bit 1** | 2 Colors | $2\text{ Hz}$ | $0\text{ V}$ | $0\text{ Bd}$ | Binary monochrome wave collision |
| **Bit 2** | 4 Colors | $4\text{ Hz}$ | $4\text{ V}$ | $0\text{ Bd}$ | Dashed vector axis & scanline floor |
| **Bit 3** | 8 Colors | $8\text{ Hz}$ | $8\text{ V}$ | $0\text{ Bd}$ | Polarizer reticle & constellation nodes |
| **Bit 4** | 16 Colors | $15\text{ Hz}$ | $15\text{ V}$ | $0\text{ Bd}$ | Calibrated distance bus |
| **Bit 5** | 32 Colors | $25\text{ Hz}$ | $25\text{ V}$ | $0\text{ Bd}$ | Upper (+V) & lower (-V) guide rails |
| **Bit 6** | 64 Colors | $38\text{ Hz}$ | $38\text{ V}$ | $0\text{ Bd}$ | Telemetry HUD (integrity & frequencies) |
| **Bit 7** | 128 Colors | $52\text{ Hz}$ | $52\text{ V}$ | $0\text{ Bd}$ | Beat horizon phase grid ticks |
| **Bit 8** | 256 Colors | $68\text{ Hz}$ | $68\text{ V}$ | $0\text{ Bd}$ | Neutralizer mode (Polarity = 0) |
| **Bit 9** | 512 Colors | $85\text{ Hz}$ | $85\text{ V}$ | $0\text{ Bd}$ | Corrupted Sovereign Boss Encounter |
| **Bit 10** | 1024 Colors | Boss Defeat | Boss Defeat | $0\text{ Bd}$ | Opens 2D Rift ($N=2$) |

#### Part Two Resolution Upgrade Costs (`RESOLUTION_UPGRADES`)
| Resolution | FPS Target | Hz Required | V Required | Baud Required | Feature Unlocked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Res 1** | 15 FPS | $40\text{ Hz}$ | $40\text{ V}$ | $20\text{ Bd}$ | Overshield subsystem compiled |
| **Res 2** | 24 FPS | $60\text{ Hz}$ | $60\text{ V}$ | $30\text{ Bd}$ | 1D Line Mobility (Left/Right motion) |
| **Res 3** | 30 FPS | $90\text{ Hz}$ | $90\text{ V}$ | $45\text{ Bd}$ | Agility Boost (+33% speed) |
| **Res 4** | 45 FPS | $130\text{ Hz}$ | $130\text{ V}$ | $65\text{ Bd}$ | Agility Boost (+66% speed) |
| **Res 5** | 60 FPS | $180\text{ Hz}$ | $180\text{ V}$ | $90\text{ Bd}$ | Full 60 FPS Agility |
| **Res 6** | 75 FPS | $240\text{ Hz}$ | $240\text{ V}$ | $120\text{ Bd}$ | Harmonic Slit Gateway (2x Multiplier) |
| **Res 7** | 90 FPS | $310\text{ Hz}$ | $310\text{ V}$ | $155\text{ Bd}$ | Attenuation Gateway (0.6x Speed) |
| **Res 8** | 120 FPS | $400\text{ Hz}$ | $400\text{ V}$ | $200\text{ Bd}$ | Emitter Maw Gateway (4x Multiplier) |
| **Res 9** | 144 FPS | $520\text{ Hz}$ | $520\text{ V}$ | $260\text{ Bd}$ | Fracture Sovereign Boss Encounter |
| **Res 10** | 240 FPS | Boss Defeat | Boss Defeat | Boss Defeat | Master Transcendence Climax |

#### Resource Exchange Equivalence:
$$\text{Cost Ratio} = 1\text{ Baud} : 2\text{ Hz} : 2\text{ V}$$

---

## 6. Telemetry, Audio-Visual Synthesis & Controls Guide

### 6.1 Audio-Synthesizer Architecture
The audio engine utilizes the Web Audio API with zero external media files:
- **Oscillator Types**:
  - `triangle`: Fundamental melodic tones and basslines.
  - `sine`: Ethereal harmonic resonances and neutralizer packet arpeggios.
  - `sawtooth`: Warning sirens, boss charge sequences, and thermal hazard alarms.
  - `square`: Polarity switch clicks and raw 1-bit raster audio.
- **Rhythm Profiles**:
  - **Slow Waltz**: Triple meter ($3/4$ time), primary downbeat accent followed by two soft harmonic pulses.
  - **Math Rock**: Asymmetrical polyrhythms based on $5/8$ and $7/8$ time with staccato syncopation.
  - **Arcade Techno**: Driving $4/4$ time with prominent side-chained kick pulses and fast 16th-note hi-hat synthesis.

### 6.2 Complete Input Matrix

| Input Action | Desktop (Keyboard) | Desktop (Mouse) | Mobile / Touch Screen |
| :--- | :--- | :--- | :--- |
| **Singularity Tap (0D)** | Spacebar / Enter | Left Click Center | Tap Singularity Node |
| **Polarity: Crest (+1)** | Arrow Up / W | Click Upper Half | Tap Top Sector / Swipe Up |
| **Polarity: Trough (-1)** | Arrow Down / S | Click Lower Half | Tap Bottom Sector / Swipe Down |
| **Polarity: Neutral (0)** | Down from Crest / Up from Trough / Space | Click Center Line | Tap Center Reticle Button |
| **Lateral Move Left** | Arrow Left / A | Drag Reticle Left | Left Virtual Thumb Drag Left |
| **Lateral Move Right** | Arrow Right / D | Drag Reticle Right | Left Virtual Thumb Drag Right |
| **Toggle Auto-Compile** | C Key | Click HUD Compile Toggle | Tap HUD Compile Pill |
| **Pause / Menu** | Escape | Click Pause Button | Tap Pause Icon |

---

*Game N Technical Reference Manual — Version 2.4 — Compiled for AI Studio Runtime Environment.*
