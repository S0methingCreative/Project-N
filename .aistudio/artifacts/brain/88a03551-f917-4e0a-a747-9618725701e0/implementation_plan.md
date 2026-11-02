# Persistent Bit 8 Landscape & Depth-Layered Resolution Background

Restores the background to the exact Bit 8 pixel landscape immediately upon defeating the first boss (`Res = 0`), maintains the full Bit 1–8 generated world through the end of Story Mode, and integrates the Resolution (`Res 1–10`) cosmic and subatomic visual upgrades into a depth-ordered scene where sky phenomena appear behind the pixel mountains and foreground particle/telemetry effects appear in front.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions have been confirmed and govern the Part Two background rendering architecture:

- **Confirmed Decision 1 — Base Canvas Color in Part Two**: Keep the Bit 8 deep emerald-void base color (`#022015`) throughout Part Two (`Res 0–10`) and layer all Resolution cosmic/nebula effects translucently so the Bit 1–8 palette remains cohesive.
- **Confirmed Decision 2 — Depth-Ordered Scene Layering**: Place deep-sky Resolution additions (distant cosmic stars, rotating spiral galaxies, and Orion Nebula volumetric clouds/filaments) **behind** the Bit 4 chunky pixel mountains and Bit 8 layered pixel hills, while rendering foreground Resolution additions (stardust motes, subatomic particle streams, the far-right Nucleon Core, scanline refresh sweeps, and sector markers) **in front** of the terrain.
- **Confirmed Decision 3 — Pure Bit 8 Reset at `Res = 0`**: Immediately after defeating Corrupted Sovereign (`subPart === 2, resolution === 0`), render strictly the Bit 1–8 background with zero Resolution overlays until `Res 1` is compiled.

---

## 1. Overview & Core Concept

- **What It Does**: Unifies the visual progression of Story Mode so the 8-bit world built by the player during Part One (Bits 1–8) is never discarded in Part Two. Instead, defeating the Bit 10 boss clears the temporary boss/transcendence overlays back to the pure Bit 8 landscape at `Res = 0`, and each compiled Resolution (`Res 1` to `Res 10`) progressively enriches that same world with deep-sky cosmic phenomena behind the mountains and subatomic/frame-rate effects in the foreground.
- **Target Audience / Persona**: Story Mode players progressing from the Bit era into the Resolution era who expect visual continuity and cumulative world-building.
- **Key Value**: Preserves the player's earned Bit 1–8 visual milestones all the way to the finale while creating natural parallax depth between the retro pixel terrain and the high-resolution cosmic awakening.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Bits 1–8 (Part One Build-Up)**: Each Bit adds its signature pixel layer (horizon datum, stepped floor, constellations, mountains, dithered nebula, pixel sunrise, aurora ribbons, and layered hills with star crosses).
  2. **Bits 9–10 (Boss Encounter & Victory)**: Bit 9 applies the diminished corrupted veil and siege spikes; Bit 10 shows the harmonized beacon celebration until Boss 1 is defeated.
  3. **Post-Boss Transition (`Res = 0`)**: As soon as Boss 1 is defeated and Part Two begins at `Res = 0`, the temporary Bit 9/10 overlays clear and the canvas returns to the exact, unadulterated **Bit 8** pixel landscape.
  4. **Resolution Awakening (`Res 1` – `Res 10`)**: As the player compiles `Res 1` through `Res 10`, deep-space stars, spiral galaxies, and translucent Orion Nebula clouds emerge in the sky behind the pixel mountain range, while subatomic particle streams, the Nucleon Core, frame-rate scanlines, and sector telemetry render in the foreground over the scene.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Cumulative retro-to-cosmic synthesis — chunky 8-bit pixel topography anchored against translucent volumetric nebula clouds and relativistic subatomic telemetry.
  - *Color Palette & Mood*: Dominant Bit 8 emerald-void canvas (`#022015`), phosphor-green pixel horizon and mountains (`rgba(25, 95, 45, 0.32)` / `rgba(50, 180, 95, 0.22)`), layered with translucent `[O III]` cyan-jade (`rgba(0, 235, 220, ...)`) and `Hα` crimson-magenta (`rgba(245, 45, 135, ...)`) nebular gasses.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Unified Painter's Algorithm Pipeline Instead of Separate Part 1 / Part 2 Branches**
  - *Chosen Approach*: Replace the early-return `subPart === 2` background branch with a single unified depth-sorted rendering pipeline where `effectiveBits = subPart === 2 ? 8 : currentBits`.
  - *Why*: Guarantees zero code duplication for the Bit 1–8 layers, ensures `Res = 0` is 100% identical to Bit 8, and allows sky-level `Res 1–10` effects to be drawn between the Bit sky layers and the Bit mountain/hill silhouettes.
  - *Alternatives Considered*: Drawing all `Res` layers after all `Bit` layers, which was passed over because nebula clouds and distant galaxies would wash over the pixel mountain silhouettes instead of sitting naturally in the sky behind them.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   Dynamic Void Background Renderer                      │
│            (effectiveBits = subPart === 2 ? 8 : currentBits)            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Base Canvas Fill                                                     │
│    • Part 1: voidBases[currentBits]  |  Part 2: voidBases[8] (#022015)  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Bit Sky & Horizon Foundation (Bits 1–3, 5–7)                         │
│    • Bit 1 Horizon Datum & Seed Coordinates                             │
│    • Bit 2 Stepped Perspective Floor & Twinkling Pixel Stars            │
│    • Bit 3 Pixel Constellation Nodes & Connectors                       │
│    • Bit 5 Checkerboard Dithered Sky Nebula                             │
│    • Bit 6 Ceiling Raster Bars & 8-Bit Horizon Sunrise Disk             │
│    • Bit 7 Stepped Pixel Aurora Ribbons                                 │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Deep-Sky Resolution Layer (Only when subPart === 2 && res >= 1)      │
│    • Distant Cosmic Pinpoint Starfield (Res 1+)                         │
│    • Rotating Translucent Spiral Galaxies (Res 2+)                      │
│    • Orion Nebula Volumetric Clouds & Gossamer Filaments (Res 1+ / 2+)  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. Midground Pixel Terrain & Mote Layer (Bits 4, 5, 8)                  │
│    • Bit 4 Chunky Stepped Pixel Mountains (occludes sky nebula edges)   │
│    • Bit 8 Layered Foreground Pixel Hills & 3x3 Sparkling Star Crosses  │
│    • Bit 4 Drifting Dust Motes & Bit 5 Rising Data Packets              │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. Foreground Resolution & Part 1 Event Layer                           │
│    • If Part 1 (Bit 9 / 10): Corrupted Siege Veil or Transcendence Grid │
│    • If Part 2 (Res >= 1):                                              │
│      - Nebular Stardust Motes (Res 2+)                                  │
│      - Subatomic Particle Stream (Res 1+) & Nucleon Core (Res 2+)       │
│      - Frame-Rate Scanline Sweep (15–240 FPS)                           │
│      - Sector Telemetry (Res 6–8), Spotlight (Res 9), Arcs (Res 10)     │
│    • Contextual Touch Guides (Polarizer Tap & Drag-Move Guides)         │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Uses existing `subPart` (`1 | 2`), `currentBits` (`0..10`), and `resolution` (`0..10`) parameters passed to the background rendering routine.
  - When `subPart === 2`, `effectiveBits` evaluates to `8`, locking in all Bit 1–8 layers while bypassing the Bit 9 and Bit 10 special event overlays.
- **Interactive Component & State Mapping**:
  - **Boss 1 Defeat (`subPart` transitions `1 -> 2`, `resolution = 0`)**: The renderer immediately switches `effectiveBits` from `10` to `8` and skips all `resolution >= 1` layers, returning the visual field to the exact Bit 8 state.
  - **Mission Briefing Continue / Resolution Upgrades (`resolution = 1..10`)**: Each increment of `resolution` activates the corresponding deep-sky and foreground Resolution passes around the persistent Bit 8 terrain through the end of Story Mode.
