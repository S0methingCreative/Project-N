# Developer Technical Wiki & FAQs Reference
## Game N: The Dimension Compiler

A comprehensive engineering reference manual, mathematical specification, and operational FAQ guide for developers and engineers building, maintaining, and extending *Game N: The Dimension Compiler*.

---

## Table of Contents

1. [Chapter 1: Engine & Dimensional Architecture](#chapter-1-engine--dimensional-architecture)
2. [Chapter 2: Physics & Wave Mathematics](#chapter-2-physics--wave-mathematics)
3. [Chapter 3: Story & Resolution Progression Matrix](#chapter-3-story--resolution-progression-matrix)
4. [Chapter 4: Game Modes Specification](#chapter-4-game-modes-specification)
5. [Chapter 5: Database Schemas & Firestore Security Rules](#chapter-5-database-schemas--firestore-security-rules)
6. [Chapter 6: Multiplayer Squad Co-Op Networking Protocol](#chapter-6-multiplayer-squad-co-op-networking-protocol)
7. [Chapter 7: Audio Synthesis & Harmonic Pacing Engine](#chapter-7-audio-synthesis--harmonic-pacing-engine)
8. [Chapter 8: Creative Space Step Machine & Visualizer Architecture](#chapter-8-creative-space-step-machine--visualizer-architecture)
9. [Chapter 9: Developer Passcode, Cheats & Diagnostic Commands](#chapter-9-developer-passcode-cheats--diagnostic-commands)
10. [Chapter 10: Master Developer FAQs](#chapter-10-master-developer-faqs)

---

## Chapter 1: Engine & Dimensional Architecture

### 1.1 The Dimensional Compiler Philosophy
The core thematic and engineering concept of the game is **The Dimensional Compiler**: the game starts inside a zero-dimensional void (`0D Void`, where coordinates, space, time, and colors do not exist yet) and progressively "compiles" the universe from a single point into a multi-dimensional cosmos.

```text
+------------------------------------------------------------------------------------+
|                         DIMENSIONAL COMPILER PIPELINE                              |
+------------------------------------------------------------------------------------+
|  Phase 0: 0D Void          -> Space uninitialized; no canvas coordinates (N = 0)   |
|  Phase 1: 1D Line Segment  -> Point & Line axis compiled; Bits 0-10 (N = 1)       |
|  Phase 2: 2D Spatial Plane -> Frame rate & Resolution scaling 1-10 (N = 2)         |
|  Phase 3: 3D-10D Cosmos    -> Multi-axis vector expansion & Orion Nebula (N = 3..10)|
+------------------------------------------------------------------------------------+
```

### 1.2 State Machine & Dimensional Progression
Dimensional state is encapsulated in `GameState` (`src/types/game.ts`):
- `currentN`: The active dimensional index:
  - `0`: Pre-compile. The player must gather resources in the void to purchase `N = 1`.
  - `1`: Part 1. 1D coordinate line. Collects Bits 1 through 10.
  - `2`: Part 2. 2D spatial plane. Unlocks frame rate scaling, Resolutions 1 through 10.
- `engineCompilePercent`: Ranges from `8%` at boot up to `100%` at full compilation. Each bit milestone adds `+8%` to `+10%` to the compiler pipeline.
- `compiledModules`: Array of modules unlocked across `graphics`, `audio`, `spatial`, and `reality`.

### 1.3 State Persistence & Data Separation
The client maintains strict isolation between game modes to avoid data pollution:
- **`game_n_story_save_v2`**: Stores the persistent Story Mode campaign. Only updated when the player is currently playing Story Mode.
- **`game_n_high_scores_v3`**: Stores personal best records across all modes (`speedrunBestTime`, `survivalBestTime`, `arcadeBestStageNum`, etc.).
- **`GAME_N_CREATIVE_SPACE_MAX_STAGE_V1`**: Stores the highest-ever story milestone reached (`0` to `20`) so that Creative Space unlocks are permanent even if the story is restarted.

---

## Chapter 2: Physics & Wave Mathematics

### 2.1 The Harmonic Wave Function
The player's pilot beam moves across the screen along a parametric sine wave perturbed by user polarity input:

```text
y(t) = Base_Y + (Amplitude * sin(omega * t + phase)) + (Polarity * Polarity_Offset)
```

Where:
- `Base_Y`: Center baseline on the canvas (typically `height * 0.5`).
- `Amplitude`: Vertical oscillation magnitude, scaled by engine compile percentage (typically 35px to 75px).
- `omega`: Angular frequency (`2 * PI * Frequency`).
- `Polarity`: Integer input from the pilot:
  - `+1`: **Crest** (Phase Shift Upwards)
  - `-1`: **Trough** (Phase Shift Downwards)
  - `0`: **Ground / Neutral** (Center baseline alignment)
- `Polarity_Offset`: Vertical offset applied when crest or trough is engaged (typically 40px to 60px).

### 2.2 Polarity Matching & Collision Dynamics
Anomalies spawn on the horizon carrying specific polarities and frequencies:
1. **Crest Anomaly (`+V`)**:
   - Matches: Pilot with `Polarity = +1` (Crest).
   - Outcome on hit: Neutralized, converts to Volts (`+V`) and Hertz (`+Hz`), plays harmonic chime.
   - Outcome on mismatch: Deals `20 HP` damage (or depletes 1 overshield), pushes beam downward.
2. **Trough Anomaly (`-V`)**:
   - Matches: Pilot with `Polarity = -1` (Trough).
   - Outcome on hit: Neutralized, converts to Volts and Baud (`+Bd`), plays sub-harmonic rumble.
   - Outcome on mismatch: Deals `20 HP` damage (or depletes 1 overshield), pushes beam upward.
3. **Data Packet Anomaly (`PKT`)**:
   - Neutralized by direct coordinate collision regardless of polarity. Spawns burst sparks and restores `+5 HP`.

### 2.3 Dynamic Frame Rate & Physics Step Scaling
In Part 2 (Resolutions 1 to 10), the game alters its underlying tick physics and frame rate step dynamically:

```text
Delta_Time = 1 / FPS(Resolution)
```

| Resolution | Target FPS | Step Time (ms) | Visual Rendering Quality |
| :--- | :--- | :--- | :--- |
| **Res 1** | 15 FPS | 66.6 ms | Strobe pixel raster, chunky stepping |
| **Res 2** | 24 FPS | 41.6 ms | Cinematic vintage film cadence |
| **Res 3** | 30 FPS | 33.3 ms | Early console refresh rate |
| **Res 4** | 45 FPS | 22.2 ms | Intermediate CRT scan |
| **Res 5** | 60 FPS | 16.6 ms | Standard desktop display sync |
| **Res 6** | 75 FPS | 13.3 ms | High-refresh phosphor vector display |
| **Res 7** | 90 FPS | 11.1 ms | Smooth arcade cabinet refresh |
| **Res 8** | 120 FPS | 8.33 ms | Ultra-fluid display refresh |
| **Res 9** | 144 FPS | 6.94 ms | Tournament esports tier fluid motion |
| **Res 10** | 240 FPS | 4.16 ms | Cosmic high-frequency maximum precision |

---

## Chapter 3: Story & Resolution Progression Matrix

### 3.1 Overview of Progression
Progression is split into two distinct, equal parts:
- **Part 1 (Bits 0 to 10)**: 1D Line Coordinate Compilation.
- **Part 2 (Resolutions 1 to 10)**: 2D Spatial Frame Rate Compilation.

```text
Stage Index:  0  1  2  3  4  5  6  7  8  9  10 | 11 12 13 14 15 16 17 18 19 20
Milestone:   0D  B1 B2 B3 B4 B5 B6 B7 B8 B9 B10| R1 R2 R3 R4 R5 R6 R7 R8 R9 R10
Boss:                                    Boss 1 |                       Boss 2
```

### 3.2 Full Milestone Reference Table

| Stage Num | Milestone | Part | Cost / Trigger | Key Mechanical Unlock | Boss Encounter |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | `0D Void` | 1 | Initial State | Void exploration, gather initial Hz/V | None |
| **1** | `Bit 1` | 1 | 10 Hz, 5 V | Unlocks first coordinate line segment | None |
| **2** | `Bit 2` | 1 | 25 Hz, 15 V | 2-bit monochrome grid, dual packet bursts | None |
| **3** | `Bit 3` | 1 | 50 Hz, 30 V | 3-bit EGA-style line drawing | None |
| **4** | `Bit 4` | 1 | 90 Hz, 50 V | 16-color horizon line and mountain silhouette | None |
| **5** | `Bit 5` | 1 | 140 Hz, 80 V | Mid-compiler threshold, Baud packet spawning | None |
| **6** | `Bit 6` | 1 | 200 Hz, 120 V | 64-color ceiling raster bars | None |
| **7** | `Bit 7` | 1 | 280 Hz, 170 V | 128-color aurora waveforms | None |
| **8** | `Bit 8` | 1 | 380 Hz, 230 V | High-density packet storms | None |
| **9** | `Bit 9` | 1 | 500 Hz, 300 V | Pre-Boss warning, 100% engine compile | **Boss 1: Corrupted Sovereign** |
| **10** | `Bit 10` | 1 | Defeat Boss 1 | **Part 1 Cleared**. Unlocks **Creative Space (2-Bit)** & Part 2 | Sovereign Defeated |
| **11** | `Res 1` | 2 | Automatic on Bit 10 | 15 FPS mode, Part 2 coordinate plane | None |
| **12** | `Res 2` | 2 | 120 Hz, 80 V, 40 Bd | 24 FPS mode; Creative Space upgrades to **3-Bit** | None |
| **13** | `Res 3` | 2 | 200 Hz, 140 V, 70 Bd | 30 FPS mode; Creative Space upgrades to **4-Bit** | None |
| **14** | `Res 4` | 2 | 300 Hz, 210 V, 110 Bd| 45 FPS mode; Creative Space upgrades to **5-Bit** | None |
| **15** | `Res 5` | 2 | 450 Hz, 300 V, 160 Bd| 60 FPS mode; Creative Space upgrades to **6-Bit** | None |
| **16** | `Res 6` | 2 | 650 Hz, 420 V, 220 Bd| 75 FPS mode; Creative Space upgrades to **7-Bit** | None |
| **17** | `Res 7` | 2 | 900 Hz, 580 V, 300 Bd| 90 FPS mode; Creative Space upgrades to **8-Bit** | None |
| **18** | `Res 8` | 2 | 1200 Hz, 780 V, 400 Bd| 120 FPS mode; Unlocks **Tempo Control Module** | None |
| **19** | `Res 9` | 2 | 1600 Hz, 1050 V, 550 Bd| 144 FPS mode; Unlocks **Frequency Control Module** | **Boss 2: Fracture Sovereign** |
| **20** | `Res 10` | 2 | Defeat Boss 2 | **Game Complete**. 240 FPS; Cosmic Creative Space; FTC Plaque | Sovereign Defeated |

---

## Chapter 4: Game Modes Specification

| Mode | Lives / Health | Starting State | Victory Condition | Leaderboard Ranking Metric |
| :--- | :--- | :--- | :--- | :--- |
| **Story** | 100 HP + Overshields | Resumes save from `game_n_story_save_v2` | Defeat Fracture Sovereign at Res 10 | 1. Total Completions, 2. Furthest Stage Num |
| **Arcade** | 1 Life (2 Lives at N=2) | Bit 1, 100 HP, 0 Resources | Defeat Corrupted Sovereign at Bit 9 | 1. Furthest Stage Num, 2. Run Duration (Fastest) |
| **Speedrun (Solo)** | 100 HP, auto-advance | 0D Void, auto-purchasing | Defeat Fracture Sovereign at Res 10 | Total Run Time (Seconds, lowest wins) |
| **Survival** | 100 HP + 5 Overshields | Starts at Res 10 (240 FPS) | Endless (survive as long as possible) | Total Survival Time (Seconds, highest wins) |
| **Squad Co-Op** | 100 HP per pilot | Synchronized shared room | Co-Op Campaign clear | Synchronized run checkpoint & FTC eligibility |

---

## Chapter 5: Database Schemas & Firestore Security Rules

### 5.1 Collection Architecture

```text
Firestore Database: ai-studio-projectnthedimen-88a03551-f917-4e0a-a747-9618725701e0
├── leaderboards_story/{initials}       (1 consolidated doc per pilot, Top 100 view)
├── leaderboards_arcade/{id}            (Individual arcade run records)
├── leaderboards_speedrun/{id}          (Speedrun clear times)
├── leaderboards_survival/{id}          (Survival run durations)
├── leaderboards_meta/story_ftc         (Single-document First To Complete story record)
├── leaderboards_meta/arcade_ftc        (Single-document First To Complete arcade record)
├── players/{initials}                  (Registered 3-letter initials registry)
└── speedrun_rooms/{roomCode}           (Co-op squad room state documents)
```

### 5.2 Document Schemas

#### 1. Story Mode: `leaderboards_story/{initials}`
- `initials` (string, required): 3 uppercase letters `^[A-Z]{3}$`.
- `completions` (number, required): Integer count of full story completions (`completions >= 0`).
- `stageNum` (number, required): Integer from `0` to `20` representing furthest milestone reached.
- `stageName` (string, required): Display string up to 64 chars (e.g. `"Resolution 6 (75 FPS)"`).
- `bit` (number, optional): Integer `0` to `10`.
- `resolution` (number, optional): Integer `0` to `10`.
- `completed` (boolean, required): `true` if story was beaten at least once.
- `color` (string, optional): One of `'green'`, `'blue'`, `'amber'`, `'azure'`.
- `createdAt` (string, required): ISO 8601 timestamp.
- `updatedAt` (string, optional): ISO 8601 timestamp.

#### 2. Registered Pilot: `players/{initials}`
- `code` (string, required): Exactly matches document ID `initials`.
- `createdAt` (string, required): ISO 8601 timestamp.

#### 3. First To Complete: `leaderboards_meta/story_ftc`
- `initials` (string, required): 3-letter pilot code of the first-ever player to clear Story Mode.
- `completedAt` (string, required): ISO 8601 timestamp.
- `stageName` (string, optional): `"Fracture Sovereign Defeated ★"`.
- `color` (string, optional): Pilot beam color.

### 5.3 Anti-Cheat & Write-Optimization Rules
- **Developer Mode Bypass**: When Developer Tools are enabled, `isDevModeActive()` returns `true`. All Firestore submission methods short-circuit immediately, logging `[Leaderboard] Story score saved to local storage.` This guarantees dev cheats (`+1 Bit`, `+1 Res`, mode unlocks) can never pollute public leaderboards.
- **Write Optimization**: `submitStoryScore` loads local and remote records first; if the incoming `stageNum` and `completions` are not strictly higher than existing values, the write is skipped.
- **Banned Initials**: Enforced via security rules (`firestore.rules`) and client sanitize checks (`src/utils/pilotProfile.ts`).

---

## Chapter 6: Multiplayer Squad Co-Op Networking Protocol

### 6.1 Room Architecture & Lifecycle

```text
Pilot 1 (Host) --------> POST /api/squad/rooms --------> Room Created (Code: ABCD)
                                                                 |
Pilot 2 (Guest) -------> POST /api/squad/rooms/ABCD/join <-------+
                                                                 |
Lobby State <----------- SSE Stream / Firestore Listen <---------+
                                                                 |
Pilot 1 (Host Only) ---> POST /api/squad/rooms/ABCD/action -----> Status: 'active'
                         (Action: 'launch')
                                                                 |
All Pilots Launch -----> Game Mode 'squad' Initializes ----------+
```

### 6.2 Security & Rate Limiting Controls
1. **Rate Limiting**:
   - Handled in `server.ts` by an IP-based sliding window:
   - Max 10 room creations per 5-minute window per IP. Excess requests return HTTP 429 (`Too many squad rooms created`).
2. **Host-Only Run Authorization**:
   - The `/api/squad/rooms/:code/action` endpoint verifies:
     ```typescript
     if (action === 'launch' && pilotId !== room.hostPilotId) {
       return res.status(403).json({ error: 'Only the squad host can launch the run' });
     }
     ```
   - This prevents random joining players from hijacking lobbies or starting games prematurely.
3. **Room Expiry & Cleanup**:
   - Rooms inactive for more than 2 hours are automatically swept from memory.

---

## Chapter 7: Audio Synthesis & Harmonic Pacing Engine

### 7.1 Web Audio API Graph
The game generates all music, stem layers, sound effects, and ambient hums purely via the browser's Web Audio API without downloading external audio files.

```text
[Oscillator Nodes] ----> [Music Gain Bus] ---\
                                              +---> [Biquad Lowpass Filter] ---> [Master Gain] ---> AudioDestination
[SFX Sine / Tri]   ----> [SFX Gain Bus]   ---/      (Freq: 3200 Hz, Q: 1.5)      (Volume: 0.58)
```

### 7.2 Musical Pitch & Scale Formulas
Note frequencies are calculated from the fundamental base frequency:

```text
f_note = f_base * (2 ^ (semitones / 12))
```

- Standard Fundamental: `f_base = 261.63 Hz` (Note C4).
- Semitone Intervals:
  - Natural Minor: `[0, 2, 3, 5, 7, 8, 10, 12]`
  - Natural Major: `[0, 2, 4, 5, 7, 9, 11, 12]`
  - Dorian: `[0, 2, 3, 5, 7, 9, 10, 12]`

### 7.3 Soundtrack Stems & Genres
- **Slow Waltz (3/4 Sway)**:
  - Base Tempo: 78 BPM.
  - Rhythm Pattern: 3 beats per bar (`Crest`, `Rest`, `Trough`). Used for Main Menu and early Story mode.
- **Math Rock (5/4 Syncopation)**:
  - Base Tempo: 118 BPM.
  - Rhythm Pattern: Asymmetric 5-step phrasing with complex syncopated Baud pulses.
- **Arcade Techno (4/4 Driving Pulse)**:
  - Base Tempo: 138 BPM.
  - Rhythm Pattern: 4-on-the-floor kick with high-frequency hi-hat chimes. Used in Arcade and Survival.

---

## Chapter 8: Creative Space — 8-Step Line & Beat Etch-a-Sketch (-8 to +8 Grid)

### 8.1 Core Architecture & Two-Point Coordinate Math
The Creative Space (`src/components/CreativeSpaceModal.tsx`) is an 8-step **Musical Coordinate Etch-a-Sketch** on a `-8` to `+8` Cartesian grid that draws **Emerald Green** straight lines controlled directly by a 4-row drum and bass sequencer:

- **4 Sequencer Rows (`+`, `-`, `0`) -> Two Coordinate Endpoints**:
  - **Point 1 `(X1, Y1) = (Hi-Hat, Kick)`**:
    - **Hi-Hat Row (`X1`)**: Sum of `+1` and `-1` steps across active columns sets Point 1's X-coordinate (`-8` to `+8`).
    - **Kick Row (`Y1`)**: Sum of `+1` and `-1` steps across active columns sets Point 1's Y-coordinate (`-8` to `+8`).
  - **Point 2 `(X2, Y2) = (Snare, Bass Line)`**:
    - **Snare Row (`X2`)**: Sum of `+1` and `-1` steps across active columns sets Point 2's X-coordinate (`-8` to `+8`).
    - **Bass Line Row (`Y2`)**: Sum of `+1` and `-1` steps across active columns sets Point 2's Y-coordinate (`-8` to `+8`).
  - **Line Connection**: A crisp Emerald Green line connects `P1(X1, Y1)` and `P2(X2, Y2)` on the `-8` to `+8` grid.
- **Next Line & Musical Slideshow**:
  - Clicking **Next Line (Save Line)** locks the current green line segment and its 8-step beat pattern onto the canvas while keeping the sequencer intact so the player can adjust beats to draw the next connected or independent line.
  - Clicking **Slideshow** plays back all saved lines and their beat patterns in sequence like an animated musical GIF slideshow.

### 8.2 Resolution 1 to 10 Progression in Creative Space
- **Res 1 to Res 8**: Unlocks **1 sequencer step column per Resolution** (`Res 1 = 1/8 steps` up to `Res 8 = 8/8 steps`), expanding the reachable coordinate range from `[-1, +1]` at Res 1 to the full `[-8, +8]` grid at Res 8.
- **Res 9**: Unlocks the **8-Note Solo Pads (1–8 in Key of C: `C4` to `C5`)** directly underneath the 8 sequencer columns.
- **Res 10**: Unlocks the **3/4 Waltz Time Toggle** (switches meter between 6-step 3/4 Waltz and 8-step 4/4).

---

## Chapter 9: Developer Passcode, Cheats & Diagnostic Commands

### 9.1 Passcode
- **Active Passcode**: `9376`
- **Verification**: Verified client-side in `MainMenuModal.tsx` and `DimensionCanvas.tsx`.

### 9.2 Developer Controls & Key Toggles
- **`devToolsEnabled`**:
  - Unlocks in-canvas dev tools overlay.
  - Displays real-time entity count, compile percentage, and frequency readouts.
- **`unlockAllModesDev`**:
  - Bypasses Story Mode completion check for Survival and Solo Speedrun.
  - Allows immediate testing of all game modes on fresh browsers.
- **In-Game HUD Dev Buttons**:
  - `+1 Bit`: Instantly advances Part 1 progression by 1 Bit (up to Bit 10).
  - `+1 Res`: Instantly advances Part 2 progression by 1 Resolution (up to Res 10).
  - `GRAPHICS & AUDIO PIPELINE`: Slide-over drawer detailing all compiled modules.
- **Score Purge**:
  - `wipeAllSavedScores()`: Clears local high score caches without resetting the player's story progress.

---

## Chapter 10: Master Developer FAQs

### FAQ 1: How are scores tracked in Story Mode vs Arcade?
- **Story Mode**: Does not use point values. Instead, it measures **Progression Depth** (`stageNum` from 0 to 20) and **Total Story Completions** (`completions`). The leaderboard displays the player's furthest level (e.g. `Resolution 6 (75 FPS)` or `Bit 8`).
- **Arcade Mode**: Ranks players first by **Furthest Stage Reached** (`stageNum`), and second by **Run Duration** (fastest time in seconds).

### FAQ 2: Why do leaderboard submissions skip when dev mode is active?
To prevent illegitimate leaderboard submissions when developers or players use cheats (`+1 Bit`, `+1 Res`, mode unlocks), `isDevModeActive()` returns `true` whenever `devToolsEnabled` is toggled on. All leaderboard functions (`submitStoryScore`, `submitArcadeScore`, `submitSpeedrunScore`, `submitSurvivalScore`, `recordStoryFTCIfFirst`) immediately bypass Firestore writes, saving scores exclusively to local storage.

### FAQ 3: How does the 3-letter pilot initials protocol and FTC work?
Upon first launch, players are prompted to register a unique 3-letter code (e.g. `PIL`).
- The code is stored in `localStorage['game_n_player_code_v1']`.
- If the player is the first ever on the server to defeat the Fracture Sovereign at Res 10, `recordStoryFTCIfFirst` creates the document `leaderboards_meta/story_ftc`.
- Once written, security rules forbid modifying or overwriting this document (`allow update: if false;`), permanently etching that pilot's initials on the golden FTC Plaque.

### FAQ 4: What prevents race conditions when two players claim FTC simultaneously?
The `leaderboards_meta/story_ftc` security rule contains an atomic existence check:
```text
allow create: if !exists(/databases/$(database)/documents/leaderboards_meta/story_ftc)
```
If two players defeat the boss within milliseconds of each other, Firestore evaluates the transactions sequentially. The first write creates the document; the second write fails the `!exists` rule and is rejected cleanly.

### FAQ 5: How does the game handle Firestore quota exhaustion?
When daily free-tier Firestore read/write quotas are exhausted, `isQuotaError(err)` detects the `RESOURCE_EXHAUSTED` error code and activates `markFirestoreQuotaExhausted()`. The game seamlessly switches into **Offline Cache Mode**:
- Reading falls back to cached local storage (`bit_resonance_leaderboards_cache_v3`).
- Writing saves scores locally without throwing unhandled network exceptions.
- The UI displays an amber `OFFLINE CACHE` indicator instead of `LIVE FIRESTORE`.

### FAQ 6: How do Bit and Resolution upgrades alter canvas physics and frame rates?
- **Bits (Part 1)**: Expand spatial dimensionality and color palette depth (`2^n` colors), while keeping tick physics at baseline.
- **Resolutions (Part 2)**: Directly modify the requestAnimationFrame delta step `Delta_Time = 1 / FPS(Resolution)`, accelerating physics stepping from 15 FPS up to 240 FPS. At 240 FPS, hitboxes check every 4.16 ms, providing ultra-responsive sub-pixel collision precision.

### FAQ 7: How does the host-only launch security work in Squad Co-Op?
When a squad room is created, the creator's pilot ID is saved as `room.hostPilotId`. All actions sent to `POST /api/squad/rooms/:code/action` require the header `x-pilot-id`. If any other pilot attempts to trigger the `launch` action, the backend rejects it with HTTP 403 (`Only the squad host can launch the run`).

### FAQ 8: What rate limits exist on squad room creation?
In `server.ts`, an IP tracking map logs the timestamp of every room creation. An IP is restricted to creating at most 10 rooms per 5-minute sliding window. Requests beyond this threshold receive HTTP 429 (`Too many squad rooms created`).

### FAQ 9: How does Creative Space upgrade as Resolutions are gathered?
- Unlocking **Bit 10 / Res 1** unlocks Creative Space with **Step 1 (1/8)** and the `-8` to `+8` Emerald Green coordinate grid where `(Hi-Hat, Kick) = P1(X1, Y1)` and `(Snare, Bass) = P2(X2, Y2)`.
- Collecting **Resolutions 1 to 8** unlocks **1 additional step column per Resolution** (up to all 8 steps at Res 8, expanding the coordinate reach from `-1..+1` up to `-8..+8`).
- Collecting **Resolution 9** unlocks the **8-Note Solo Pads (1–8 in C)** under the sequencer for lead synth melodies.
- Collecting **Resolution 10** unlocks the **3/4 Waltz Time Toggle** (6-step Waltz vs 8-step 4/4).

### FAQ 10: Where is player data stored locally and how is it normalized?
All local state lives in `localStorage`:
- `game_n_story_save_v2`: Active story state.
- `game_n_run_data_v1`: Legacy fallback.
- `game_n_player_code_v1`: 3-letter initials.
- `pilot_beam_color`: Chosen color (`green`, `blue`, `amber`, `azure`).
When loaded on startup, `normalizeStoryState()` validates and sanitizes all fields, ensuring missing or corrupted values fall back gracefully to default state.

### FAQ 11: How is sound synthesized without external audio files?
`soundEngine.ts` instantiates a Web Audio `AudioContext`. Background music is driven by a custom 16-step clock sequencer that schedules `OscillatorNode` tones with exponential volume decays. Kicks and percussions use rapid pitch drops on sine oscillators (`setValueCurveAtTime`), creating analog synthesizer sounds with 0 KB download overhead.

### FAQ 12: How do I safely reset or test all game modes during development?
1. Enter passcode `9376` in the Options menu under Developer Settings.
2. Toggle **Dev: Unlock All Modes** to immediately unlock Solo Speedrun and Survival without needing to beat Story Mode.
3. Use the HUD `+1 Bit` and `+1 Res` buttons to jump to any stage instantly.
4. To wipe scores without losing your story campaign, click **Dev: Wipe Saved High Scores** in Options.
