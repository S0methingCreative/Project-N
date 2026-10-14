# High Scores & First To Complete (FTC) Modernization Plan

Modernize the Game N High Scores Vault, First To Complete (FTC) challenge tracking, and player identity system to align with the provided specification and spreadsheet rules.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the interactive clarification phase:
> - **Startup Prompt**: When a player boots the game without a stored 3-letter code, an opt-in/mandatory initials prompt will appear on the title screen so they are registered to compete in FTC challenges.
> - **Code Uniqueness**: Enforced via real-time Firestore check against registered player handles and existing leaderboard documents to avoid duplicates.
> - **FTC Banner Display**: In both Story and Arcade modes, the banner displays `⚡FTC: ???` initially, automatically updating to `⚡FTC: [INITIALS]` (e.g., `⚡FTC: NEO`) as soon as the first player clears the mode.
> - **Zero Scores Discipline**: The legacy numeric points/score system is completely removed across all modes in favor of authentic game metrics (Stage Completed, Duration, and Total HZ).

---

## 1. Overview & Core Concept

- **What It Does**: Unifies player identity under a unique 3-letter arcade code (e.g. `NEO`, `ADA`) and revamps the High Scores Vault across the 4 game modes in strict order: **Story**, **Arcade**, **Speed run**, **Survival**.
- **Player Code Identity**: Saves all personal run completions and deaths under this code without prompting every single round. Players can modify their code anytime via a gear icon located immediately to the left of the "Refresh Leaderboards" button.
- **Beat-Ready Filler Records**: Replaces legacy filler scores with obviously beatable records using codes `AAA` through `JJJ`, with `99:99.9` for modes where faster times win, and `00:00.1` / `0 HZ` where higher duration or collection wins.
- **Mode-Specific Progression**:
  - **Story**: Tracks furthest stage completed (`stageName`, `bit`, `resolution`), removing time and score. Includes a compact `⚡FTC: ???` banner alongside the live Firestore status indicator.
  - **Arcade**: Tracks furthest stage completed, duration, and **Total HZ**, ranked by furthest stage reached then duration. Includes a compact `⚡FTC: ???` banner.
  - **Speed run**: Ranks only full completions by fastest time (labeled `(fastest)`), removing stage and score.
  - **Survival**: Ranks by longest time survived and tracks **Total HZ**, removing stage and score.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **First-Time Launch (Initials Modal)**:
   - When entering the game without a stored code, an ambient modal welcomes the player: `"ENTER YOUR 3-LETTER FTC CODE"`.
   - 3 interactive letter slots with keyboard arrow/character typing and on-screen cycle buttons.
   - Real-time Firestore uniqueness validation: displays instant error state if the code is already taken, or an emerald checkmark if available.
   - Stored in persistent browser storage (`game_n_player_code`) and synced to Firestore's `players` collection.

2. **Global High Scores Vault**:
   - Header top bar:
     - Title: `HIGH SCORES VAULT`
     - Live indicator badge: `● LIVE FIRESTORE`
     - **Mode FTC Banner**: A compact badge immediately to the right of the live indicator:
       - Story: `⚡FTC: ???` or `⚡FTC: NEO`
       - Arcade: `⚡FTC: ???` or `⚡FTC: ADA`
     - Action buttons:
       - **Gear Icon button** (`Settings`) positioned directly to the left of the refresh button.
       - **Refresh Leaderboard button** (`RotateCw`).
       - **Close button** (`X`).
   - Tabs (strictly ordered left-to-right):
     1. `Story`
     2. `Arcade`
     3. `Speed run`
     4. `Survival`
   - Table Columns per Mode:
     - **Story**: `RANK` · `INITIALS` · `STAGE COMPLETED` · `DATE`
     - **Arcade**: `RANK` · `INITIALS` · `STAGE REACHED` · `DURATION` · `TOTAL HZ` · `DATE`
     - **Speed run**: `RANK` · `INITIALS` · `COMPLETION TIME (fastest)` · `RUNS` · `DATE`
     - **Survival**: `RANK` · `INITIALS` · `TIME SURVIVED` · `TOTAL HZ` · `DATE`

3. **Changing Player Code**:
   - Clicking the gear icon in the High Scores modal opens a compact `"UPDATE FTC CODE"` modal.
   - Player inputs a new 3-letter code. If unique, saves immediately, updates local storage, and refreshes the user's active code without disrupting game state.

---

## 3. Key Product Decisions & Trade-Offs

- **No Points / Score System**: As requested, all legacy `"score"` fields are removed from the UI and sorting algorithms. Progression is measured solely by game-authentic milestones (Bit/Resolution stages, Duration, and Hertz collected).
- **Filler Record Overhaul**: Replace high numbers with obviously placeholder benchmarks:
  - Initials: `AAA`, `BBB`, `CCC`, `DDD`, `EEE`, `FFF`, `GGG`, `HHH`, `III`, `JJJ`.
  - For lowest-time modes (Speedrun): time defaults to `99:99.9` (5999.9s).
  - For longest-time modes (Survival / Arcade): duration defaults to `00:00.1` (0.1s) and `0 HZ`.
  - For stage progression (Story / Arcade): stage defaults to lowest starting point (`0D Void` or `Bit 1`).
- **FTC Challenge Banners**: Placed directly in the header adjacent to the live status indicator as a sleek inline pill-badge matching the size and shape of the Firestore indicator, keeping the layout compact and clean.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App / DimensionCanvas                           │
│  - Startup check for `localStorage['game_n_player_code']`             │
│  - Prompts InitialsRegistrationModal if unassigned                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Firestore & Leaderboard Service                     │
│  Collections:                                                          │
│  - `players/{code}`: { code: string, createdAt: timestamp }            │
│  - `leaderboards_meta/story_ftc`: { initials, completedAt, stage }    │
│  - `leaderboards_meta/arcade_ftc`: { initials, completedAt, stage }   │
│  - `leaderboards_story`: { initials, stageName, bit, res, stageNum }   │
│  - `leaderboards_arcade`: { initials, stageName, stageNum, dur, hz }   │
│  - `leaderboards_speedrun`: { initials, timeSeconds, runs, date }      │
│  - `leaderboards_survival`: { initials, survivalSeconds, hz, date }    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      GlobalLeaderboardModal                            │
│  - Gear button [Settings] -> EditCodeModal                             │
│  - Tabs: [Story] [Arcade] [Speed run] [Survival]                       │
│  - Header FTC banner: `⚡FTC: ???` / `⚡FTC: [CODE]`                   │
│  - Beatable filler fallback (AAA-JJJ, 99:99.9 / 00:00.1)               │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Schema Changes

1. **`players` collection**:
   - `id`: 3-character uppercase string (e.g. `NEO`).
   - `code`: 3-character uppercase string.
   - `createdAt`: server timestamp or ISO string.
   - *Duplicate Prevention*: querying `doc(db, 'players', code)` or checking across collections guarantees instant 1-read uniqueness check.

2. **`leaderboards_meta/story_ftc` & `leaderboards_meta/arcade_ftc`**:
   - Stored in Firestore to track the immortal First To Complete challenge winners.
   - If document does not exist, modal renders `⚡FTC: ???`.

3. **`leaderboardService.ts` Updates**:
   - Redefine interfaces (`StoryScoreEntry`, `ArcadeScoreEntry`, `SpeedrunScoreEntry`, `SurvivalScoreEntry`) removing all `score` attributes.
   - Add `totalHz` to `ArcadeScoreEntry` and `SurvivalScoreEntry`.
   - Update sorting functions:
     - Story: sorted by `stageNum` descending.
     - Arcade: sorted by `stageNum` descending, then `survivalSeconds` descending.
     - Speedrun: sorted by `timeSeconds` ascending (fastest).
     - Survival: sorted by `survivalSeconds` descending (longest).
   - Update default/fallback seed arrays to use `AAA` through `JJJ` with clearly beatable statistics.

4. **`GlobalLeaderboardModal.tsx` Updates**:
   - Reorder tabs: `['story', 'arcade', 'speedrun', 'survival']`.
   - Add Gear icon button (`Settings`) immediately left of `handleRefresh`.
   - Render compact `⚡FTC: ???` banner next to the live Firestore status pill.
   - Remove Score column; add Total HZ to Arcade and Survival.
   - Label Speedrun duration as `COMPLETION TIME (fastest)`.

5. **`InitialsRegistrationModal.tsx` & Player Code Hook**:
   - On game mount, if no player code exists, trigger the registration modal.
   - Provide an edit modal triggered via the gear icon in the High Scores modal.
   - Automatically prefill high score submissions with the player's registered code without manual re-entry on each death/victory.

---

## 5. Execution Plan & Verification

1. **Service Layer**:
   - Update `src/services/leaderboardService.ts` with revised schemas, beatable filler records, FTC tracking for both Story and Arcade, and player code verification functions.
   - Update `firebase-blueprint.json` and `firestore.rules` to reflect the updated schema and permissions.
2. **Components Layer**:
   - Create/update `src/components/InitialsRegistrationModal.tsx` for initial onboarding and gear-triggered code changes.
   - Update `src/components/GlobalLeaderboardModal.tsx` with reordered tabs, gear button, compact FTC banners, and revised table columns.
   - Update `src/components/DimensionCanvas.tsx` to integrate the automatic code association and pass saved player code to score submissions.
3. **Verification**:
   - Verify TypeScript compilation via `npx tsc --noEmit`.
   - Verify applet compilation via `compile_applet`.
   - Verify that default fallback scores display `AAA`–`JJJ`, `99:99.9` for Speedrun, and `00:00.1` for Survival/Arcade.
   - Confirm unique code registration, gear button editing, and clean tab ordering.
