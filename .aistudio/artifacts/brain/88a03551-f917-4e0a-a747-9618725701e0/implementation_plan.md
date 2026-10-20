# Express & WebSocket Multiplayer Engine for Squad Co-Op

Migrate **Squad Co-Op** room creation, shareable link initiation (`?speedrunRoom=CODE`), pilot lobby slots, and live co-op gameplay synchronization entirely off Firestore onto the application's built-in **Node.js + Express + WebSocket** server. This makes Squad Co-Op links and cross-device multiplayer work immediately without waiting for Firestore quota resets and preserves 100% of your daily Firestore quota for solo high-score leaderboards.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> All core architectural choices have been confirmed and are ready for implementation upon your approval.

- **Confirmed Decision 1 — Backend Architecture**: Switch Squad Co-Op completely to the built-in **Express Server & WebSockets** (`ws` + REST API fallback), eliminating all Firestore reads and writes from Squad Co-Op.
- **Confirmed Decision 2 — Room Retention**: Keep active, paused, and lobby Squad rooms in server memory for **24 hours** (automatic TTL garbage collection for rooms idle > 24 hours) so squads can pause a run and resume via their room code or shareable link later that day.

---

### 1. Overview & Core Concept

- **What It Does**: Hosts an authoritative in-memory Squad Room Registry and real-time WebSocket hub directly on the Node.js server alongside the existing Express + Vite stack.
- **Target Audience / Persona**: Up to 4 co-op pilots joining a shared Squad session across different devices, browsers, or tabs via a 4-character room code or direct invite URL (`?speedrunRoom=ABCD`).
- **Key Value**:
  - **Zero Firestore Quota**: Creating rooms, joining via shareable links, toggling ready states, streaming pilot coordinates, pooling resources (`Hz`, `V`, `Baud`), compiling shared Bits/Resolutions, and damaging Bosses consume **0 Firestore reads/writes**.
  - **Works Immediately**: Even when Firestore's daily free tier is exhausted, Squad Co-Op room links and real-time multiplayer operate at full speed across all devices.
  - **True Cross-Device Low-Latency Sync**: Replaces same-browser-only `BroadcastChannel` limitations with server-authoritative WebSocket broadcasts (`< 20ms` latency across devices) while retaining `BroadcastChannel` + `localStorage` as an instant local cache.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Host Creates Squad**: Clicking **Create Squad Room** in the Squad Co-Op modal sends a request to the Express server, generates a 4-character room code, opens a persistent WebSocket room subscription, and displays the shareable invite link (`?speedrunRoom=CODE`).
  2. **Teammate Joins via Shareable Link or Code**: Opening the shareable URL on any phone, tablet, or desktop immediately fetches and joins the room from the Express server, assigns a fixed Pilot Slot (`Slot 1–4`), and broadcasts the updated roster to all connected squad members in real time.
  3. **Live Co-Op Gameplay & Checkpoints**: When the host launches the run, all connected browsers transition simultaneously into the dimensional canvas. Pilot positions, knockdowns/revives, pooled wave resources, upgrade compilations, boss HP, and squad wipe/continue votes synchronize live via WebSockets.
- **Visual Identity & Theme**:
  - Preserves the existing **1440px** dark cybernetic arena aesthetic (`#020617` obsidian canvas, `#0f172a` structural panels, `#22d3ee` cyan squad accents, and tabular monospace telemetry `tabular-nums`).
  - Removes any Firestore quota warning lockouts from the Squad Co-Op lobby since Squad Co-Op no longer depends on Firestore.
  - Displays a clean, real-time connection indicator in the Pilot Room header showing live server link status.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: WebSocket + HTTP REST Dual-Transport on Port 3000**
  - *Chosen Approach*: Attach a WebSocket server (`ws` on path `/ws/squad`) directly to the existing Node.js HTTP server on port 3000, paired with REST endpoints (`/api/squad/rooms/*`) for atomic room creation, joining, and state mutations.
  - *Why*: Sharing port 3000 guarantees compatibility with the cloud proxy environment without needing separate ports or CORS rules. Pairing REST mutations with WebSocket broadcasts ensures that even if a mobile browser briefly backgrounds its WebSocket, HTTP actions and automatic WebSocket reconnection immediately reconcile the full room state.
  - *Alternatives Considered*: Firestore-only sync (consumes hundreds of writes per run and fails during quota exhaustion) or WebRTC peer-to-peer (requires external TURN servers for symmetric NAT traversal).
- **Decision 2: Server-Authoritative Atomic Resource & Boss Math with 24-Hour TTL**
  - *Chosen Approach*: The Express server maintains the canonical room state in a `Map<string, SpeedrunRoom>` with atomic handlers for resource contributions, upgrade cost deductions, boss damage, slot assignment, and ready votes, pruning rooms only after 24 hours of inactivity.
  - *Why*: Prevents race conditions when two pilots collect reflected waves or compile an upgrade at the exact same millisecond, while allowing squads to take breaks and resume their run via link within 24 hours.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSERS (PILOTS 1–4)                        │
│                                                                            │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌────────────────┐  │
│  │   URL Link Handler   │   │  Squad Co-Op Modal   │   │ DimensionCanvas│  │
│  │ (?speedrunRoom=CODE) │   │ (Lobby & Pilot Room) │   │ (Co-Op Arena)  │  │
│  └──────────┬───────────┘   └──────────┬───────────┘   └────────┬───────┘  │
│             └──────────────────────────┼────────────────────────┘          │
│                                        ▼                                   │
│                    ┌───────────────────────────────────────┐               │
│                    │   Squad Multiplayer Client Service    │               │
│                    │ (WebSocket Client + REST + LocalSync) │               │
│                    └───────────┬───────────────┬───────────┘               │
└────────────────────────────────┼───────────────┼───────────────────────────┘
                                 │               │
         REST Mutations & Init   │               │ Real-Time Bi-Directional
         (/api/squad/rooms/*)    │               │ WebSocket (/ws/squad)
                                 ▼               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   EXPRESS + WEBSOCKET SERVER (PORT 3000)                   │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │             Authoritative In-Memory Squad Room Registry              │  │
│  │         Map<RoomCode, SpeedrunRoom> (24-Hour Inactive TTL GC)        │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ • Atomic Slot Assignment (Host=Slot 0, Teammates=Slots 1–3)          │  │
│  │ • Atomic Resource Pooling (Hz / V / Baud) & Upgrade Deductions       │  │
│  │ • Shared Boss HP Scaling & Damage Reconciliation                     │  │
│  │ • Simultaneous Wipe Checkpoints & All-Pilot Continue Voting          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `SpeedrunRoom`: Stores the 4-character `code`, `hostPilotId`, `status` (`lobby` | `active` | `paused` | `wiped` | `completed`), `pilots` map (up to 4 `TeamPilot` records with fixed `slotIndex`, `initials`, `color`, `integrity`, `x`, `polarity`, `isReady`, `readyToContinue`), `sharedState` (`totalHz`, `totalV`, `totalBaud`, `act1Bits`, `act1Resolution`, `act1SubPart`, `boss1Hp`, `boss2Hp`, `speedrunTime`, `runNumber`), and `updatedAt` timestamp (used for 24-hour TTL eviction).
- **Interactive Component & State Mapping**:
  - **Room Creation & Direct Link Join (`POST /api/squad/rooms`, `POST /api/squad/rooms/:code/join`)**: Creates or joins the room on the server, assigns a deterministic `slotIndex` (`0–3`), broadcasts `ROOM_UPDATE` to all WebSocket subscribers in that room, and returns the authoritative `SpeedrunRoom` object.
  - **WebSocket Subscription & Auto-Reconnect (`/ws/squad?room=CODE&pilotId=ID`)**: On connection (or reconnection after network drop), the server immediately pushes the current `ROOM_UPDATE` snapshot. Clients send high-frequency `TELEMETRY` frames (`x`, `polarity`, `integrity`, `isKnocked`) over the WebSocket, which the server merges and relays to all room peers.
  - **Co-Op Gameplay Actions (`POST /api/squad/rooms/:code/action` & WebSocket `ACTION` events)**: Handles `launch`, `ready`, `contribute`, `compile`, `damageBoss`, `wipe`, `voteContinue`, `continue`, `pause`, `resume`, `returnToLobby`, and `leave` atomically on the server and broadcasts the updated room state to every pilot.
