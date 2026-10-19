# 4-Player Co-Op Knockout & Team Wipe Mechanics Plan (Beta Story Mode)

This design specification outlines the **Knockout & Team Wipe Mechanics** for 4-player co-op in the Beta storyline, based on the **Fast 4 to 5 Second High-Pressure Timer** with automatic passive countdown.

---

## 1. Timing Rationale & Rhythm Wave Metrics

| Game Phase / Tempo | Beat Interval | 4.5s Knockout Window | Rhythm Impact & Gameplay Feel |
| :---: | :---: | :---: | :---: |
| **Bit 1–2 (Slow Waltz)**<br>78 BPM (3/4 time) | $\sim 0.77\text{s}$ per beat | $\sim 6$ beats / $3\text{–}4$ waves | A single mistake knocks out a player; the remaining 3 pilots must cover the line for 4 wave cycles. |
| **Bit 3–4 (Math Rock)**<br>128–156 BPM (odd-meter) | $\sim 0.40\text{s}$ per beat | $\sim 11$ beats / $6\text{–}8$ waves | Intense pressure. If 2 or 3 pilots go down in a wave cluster, the lone survivor has to execute a high-speed clutch dodge. |
| **Bit 5 (Corrupted Sovereign)**<br>168 BPM (Boss Battle) | $\sim 0.35\text{s}$ per beat | $\sim 13$ beats / $8\text{–}10$ waves | Maximum adrenaline. Boss sinusoidal barrages require at least 1 conscious pilot deflecting projectiles to prevent a wipe. |

---

## 2. Downed Player State Machine & Visuals

```
[ Active Pilot ] (100% HP)
       │
       ▼ (Integrity reaches 0)
[ Unconscious / Rebooting ]
       ├── Holographic countdown ring: 4.5s -> 0.0s
       ├── Pilot bead dims to 30% ghost wireframe
       ├── Cannot deflect waves or switch polarity
       │
       ├── IF All 4 Players Unconscious:
       │       └── TRIGGER TEAM WIPE (Bit Restarts)
       │
       ▼ (Countdown reaches 0.0s)
[ Reboot & Re-entry ]
       ├── Auto-revives with 50% HP
       ├── 1.5s Invulnerability / Phasing shield (translucent cyan ring)
       └── Ascending reboot audio chirp
```

### Player HUD & Feedback during Knockout:
1. **Reboot Circular Gauge**: A circular progress ring over the downed pilot's avatar winding down from $4.5\text{s}$ to $0\text{s}$.
2. **Team Status Readout**: Top-left player indicators showing live state for each of the 4 pilots:
   - `P1 (Emerald): ACTIVE`
   - `P2 (Cobalt): DOWN (3.2s)`
   - `P3 (Amber): ACTIVE`
   - `P4 (Azure): DOWN (1.8s)`
3. **Clutch Warning**: If 3 players are down simultaneously, a high-priority banner pulses:
   `⚠️ LAST PILOT STANDING — HOLD THE LINE!`

---

## 3. Team Wipe Condition & Bit Restart Flow

- **Trigger Condition**:
  ```ts
  const isTeamWiped = teamPilots.every(pilot => pilot.state === 'unconscious');
  ```
- **Consequences & Execution**:
  1. The audio drops into a visceral fracture drone (`soundEngine.playBossDamageChord` + tape-stop effect).
  2. Red vector warning flashes across the screen: `✦ HARMONIC DESYNCHRONIZATION — TEAM WIPED ✦`.
  3. The team restarts the current Bit attempt from the beginning of that Bit's wave cycle with 100% integrity restored.
  4. Previously compiled Bits and banked upgrades remain permanently saved.

---

## 4. Integration into Beta Bootstrap Package

Add this 4-player co-op specification into `BETA_STORY_BOOTSTRAP.md` under **Multiplayer Architecture** so the new project AI has exact rules for handling player states, synchronization, and revival timers.
