# Story Mode High Score Milestone Submissions & Single-Entry Replacement

## Title & Summary
Implement real-time milestone high score updates for Story Mode that log immediately upon compiling a new Bit or Resolution, removing duplicate death-screen score submissions and replacing each player's previous Story record with their highest milestone achieved.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following design decisions were confirmed in Phase 1:

- **Confirmed Decision 1 (Recording Trigger)**: Story Mode high scores will be submitted immediately upon compiling a new Bit or Resolution (and upon defeating Boss 2 for final victory), rather than logging on death or game over.
- **Confirmed Decision 2 (Replacement Scope)**: Single-entry replacement (one persistent record per 3-letter pilot code) will apply specifically to Story Mode (`leaderboards_story`). Arcade, Speedrun, and Survival modes retain their individual run leaderboards.
- **Confirmed Decision 3 (Dev Environment Guard)**: Development environments will continue to bypass all live Firestore submissions to protect the clean production leaderboard.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Removes the automatic story score submission currently executed in `handleDeath`. Dying in Story Mode without unlocking a new upgrade will no longer create redundant leaderboard entries.
  2. Hooks directly into the compiler upgrade purchase handlers (`handlePurchaseUpgrade`, automatic Bit/Res compilation, and the Boss 2 victory sequence) to immediately persist new milestones.
  3. Uses a deterministic document ID (`leaderboards_story/{initials}`) or in-place upsert logic so each player has at most one record in the Story Mode Hall of Fame. If a player reaches a higher stage, their existing document is updated with the new milestone.
- **Target Audience**: Players advancing through the 10-Bit and 10-Resolution campaign who want an accurate, uncluttered global ranking reflecting their furthest engineering milestone.
- **Key Value**: Eliminates duplicate entries per player, prevents deaths from polluting rankings with stagnant scores, and provides instant positive feedback the moment a new Bit or Resolution is compiled.

---

## 2. User Experience & Visual Design

- **Milestone Unlock Trigger**:
  - The instant a player spends Hertz/Volts to compile a new Bit (e.g. Bit 4: 16 Colors) or Resolution (e.g. Res 8: 120 FPS), or defeats Boss 2 (Fracture Sovereign), a high score payload is generated.
  - An inline log notification or subtle audio cue confirms: `✦ MILESTONE REACHED: [Stage Name] REGISTERED TO GLOBAL STORY RANKINGS`.
- **Global Leaderboard Representation**:
  - In the Global Leaderboards modal (`GlobalLeaderboardModal.tsx`), each pilot initials code (e.g., `AAA`, `JCS`) appears exactly once in the Story Mode list.
  - If a player advances from Bit 5 to Bit 7, their entry cleanly advances in-place on the leaderboard, pushing lower milestones down the ladder without duplicate ghost rows.
- **Death Screen Experience**:
  - Perishing on an already-unlocked Bit/Resolution simply prompts to retry or upgrade without logging redundant attempts.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Document Keying by Player Initials in Story Mode (`leaderboards_story/{initials}`)**
  - *Chosen Approach*: Key Story Mode leaderboard documents by the player's 3-letter code (e.g. `leaderboards_story/JCS`) with an `upsert` (`setDoc(..., { merge: true })` or conditional check).
  - *Why*: Guarantees mathematical uniqueness per player at the database level. Prevents race conditions and multiple documents per pilot.
  - *Alternatives Considered*: Storing random UUIDs and doing client-side deduplication. Rejected because old records would waste database read quota and fill the collection with obsolete duplicates.
- **Decision 2: Remove Death-Screen Logging for Story Mode**
  - *Chosen Approach*: Only compile events and Boss 2 victory trigger `saveRunRecord('story', ...)`.
  - *Why*: In Story Mode, player progression is tied strictly to engine hardware tier (Bits 1–10 and Resolutions 1–10). Dying with the same hardware tier provides zero new progression information.
  - *Alternatives Considered*: Logging on death if `currentStage > previousStage`. Compiling immediately is cleaner and guarantees credit even if a player closes the browser before dying.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│               Story Campaign Gameplay                   │
└──────────────────────────┬──────────────────────────────┘
                           │
             Player Compiles Bit or Res
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              handlePurchaseUpgrade()                    │
│   - Advances bitsRef / resolutionRef                    │
│   - Immediately calls saveRunRecord('story', ...)       │
└──────────────────────────┬──────────────────────────────┘
                           │
       isDevelopmentEnvironment() check
            ┌──────────────┴──────────────┐
     [Dev Mode]                     [Production]
            │                             │
    Bypass submission              submitStoryScore()
    Log console notice             Keyed: /leaderboards_story/{initials}
                                   Updates milestone in-place
```

### Component & File Modification Plan

1. **`src/services/leaderboardService.ts`**:
   - Update `submitStoryScore`:
     - Key document by `cleanInitials`: `doc(db, 'leaderboards_story', cleanInitials)`.
     - Fetch or inspect existing document; only update if `newStageNum >= existingStageNum`.
     - Update local cache (`story_scores_v3`) by replacing any existing entry with the same initials.
2. **`firestore.rules`**:
   - Update `match /leaderboards_story/{id}`:
     - Allow `create` and `update` when `id == request.resource.data.initials` and valid schema is provided.
     - Deploy updated rules via `rpc_action DeployRules`.
3. **`src/components/DimensionCanvas.tsx`**:
   - In `handleDeath`: Remove the automatic `saveRunRecord('story', ...)` call.
   - In `handlePurchaseUpgrade`: When compiling a Bit (`target === 'bit'`) or Resolution (`target === 'resolution'`), immediately invoke `saveRunRecord('story', ...)` with the new stage name and stage number.
   - In Boss 2 defeat handler: Retain the victory milestone submission (`stageNum: 20`, `Fracture Sovereign Defeated ★`).

### Verification & Testing Plan
- Compile and type-check with `npx tsc --noEmit`.
- Verify compilation with `compile_applet`.
- Verify that compiling a bit in Story Mode updates the player's single record without creating duplicate entries.
- Verify that dying without compiling does not trigger a score write.
