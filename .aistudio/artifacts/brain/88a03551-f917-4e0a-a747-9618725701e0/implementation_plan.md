# Arcade Mode Progression: Bit 6 Hard Waltz & 3/4 Triplet Wave Bursts

Upgrade the pacing, difficulty, and wave variety of **Bit 6** in Arcade Mode from an overly gentle 128 BPM medium waltz to an energetic **156 BPM Hard Waltz** featuring **3/4 triplet wave bursts with syncopated spacing**, rhythmic polarity patterns, and accented downbeat wave dynamics.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following design and pacing decisions during Phase 1:
> - **Waltz Speed & Zone**: Hard Waltz at 156 BPM (`zone: 'hard'`) with elevated pulse velocity (`-4.4` to `-4.8` base speed).
> - **Wave Pattern Variation**: Rhythmic 3/4 triplet wave bursts with syncopated beat intervals (`[42, 18, 18]` frame cadence) and dynamic crest/trough measure arrangements.

---

## 1. Overview & Core Concept

Currently in Arcade Mode, Bit 6 unlocks the 64-color palette at 32 Hz / 32 V, but uses standard Medium difficulty (`128 BPM`) with a predictable alternating 8-pulse cycle that feels too slow and easy compared to the intense Math Rock of Bit 3 and Techno of Bit 4.

This update transforms Bit 6 into a thrilling, dance-like rhythm challenge:
- **Audio Acceleration**: Shifts Bit 6 to the **Hard Speed Zone (156 BPM)**, delivering a driving, fast-tempo classical waltz.
- **Waltz Triplet Measure Mechanics**: Pulse spawning abandons flat intervals in favor of a true **3/4 time signature burst** (ONE-two-three / Downbeat-offbeat-offbeat).
- **Rhythmic Polarity Modulation**: Measures alternate through distinct crest/trough motifs (Crest-Trough-Trough, Trough-Crest-Crest, and syncopated cross-beats) with downbeat visual accents.

---

## 2. User Experience & Visual Design

### Flow & Audio-Visual Feel
1. **Compilation Transition into Bit 6**:
   - As soon as the player auto-compiles Bit 6 (32 Hz, 32 V), the synthesizer seamlessly accelerates into the **156 BPM Hard Waltz**.
   - An arcade HUD combat toast announces: `🕹️ ARCADE PROGRESSION: Bit 6 [HARD] -> FAST WALTZ (156 BPM)!`.
2. **Triplet Wave Motion**:
   - Waves arrive in distinct 3-pulse measures:
     - **Beat 1 (Downbeat)**: Pronounced wave with larger amplitude (32px), arriving after a measure pause.
     - **Beat 2 (Offbeat 1)**: Rapid follow-up pulse (18 frame gap).
     - **Beat 3 (Offbeat 2)**: Crisp resolution pulse (18 frame gap).
3. **Player Movement & Reflexes**:
   - The player must flick between crest and trough in quick succession to match the waltz cadence, maintaining dynamic tension before the next measure arrives.

---

## 3. Technical Architecture & Component Changes

```
┌────────────────────────────────────────────────────────┐
│                   Arcade Mode Pacing                   │
│                                                        │
│  Bit 5 (16 Hz/V)   -->  Bit 6 (32 Hz/V)                │
│  Genre Cycling          Hard Waltz (156 BPM)           │
│  Easy (78-128 BPM)      Zone: 'hard'                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            Pulse Spawning Engine (Bit 6)               │
│                                                        │
│  Measure Cadence:  [Beat 1: 42f] -> [Beat 2: 18f]     │
│                    -> [Beat 3: 18f]                    │
│                                                        │
│  Measure Motifs:                                       │
│  M1: [Top (32px)]   -> [Bottom]    -> [Bottom]         │
│  M2: [Bottom (32px)]-> [Top]       -> [Top]            │
│  M3: [Top (32px)]   -> [Top]       -> [Bottom]         │
│  M4: [Bottom (32px)]-> [Bottom]    -> [Top]            │
└────────────────────────────────────────────────────────┘
```

### Key Code Updates

1. **`getArcadePacing` in `src/components/DimensionCanvas.tsx`**:
   - Update Bit 6 return value from `{ genre: 'slow_waltz', zone: 'medium' }` to `{ genre: 'slow_waltz', zone: 'hard' }`.
2. **Pulse Cooldown & Spawning Logic**:
   - When in Arcade Mode with `bitsRef.current === 6` and `targetGenre === 'slow_waltz'`:
     - Maintain a 3-step waltz measure counter: `waltzStep = pulseCount % 3`.
     - Cooldown threshold alternates: `waltzStep === 0 ? 42 : 18` frames.
     - Pulse velocity scaled for hard zone (`pulseSpeed = -4.6`).
3. **Polarity Pattern & Amplitude Accents**:
   - Determine wave polarity based on 4 rotating measure motifs to prevent repetitiveness:
     - Measure 0: `['top', 'bottom', 'bottom']`
     - Measure 1: `['bottom', 'top', 'top']`
     - Measure 2: `['top', 'top', 'bottom']`
     - Measure 3: `['bottom', 'bottom', 'top']`
   - Downbeat pulse (`waltzStep === 0`) receives `amplitude: 32` (standard is `28`) for visual punch on the heavy beat.

---

## 4. Verification Plan

1. **Build & Type Check**:
   - Run `lint_applet` (`tsc --noEmit`) and `compile_applet` to ensure zero compilation or type regressions.
2. **Gameplay Testing**:
   - Launch Arcade Mode.
   - Advance to Bit 6 and observe:
     - Audio engine switches to 156 BPM Hard Waltz.
     - Pulses arrive in distinct 3-pulse syncopated measures (1 heavy downbeat followed by 2 quick offbeats).
     - Rhythmic polarity variation prevents monotony while rewarding skilled flicking.
