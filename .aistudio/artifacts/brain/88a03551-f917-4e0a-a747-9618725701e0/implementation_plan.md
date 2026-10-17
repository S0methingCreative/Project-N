# Block Global High Score Recording for Pilot Code GOD [COMPLETED & VERIFIED]

Enforce strict database-level security rules in Firestore to prevent any score submissions, progression tracking, or leaderboard records for pilot code **`GOD`** across all game modes, while allowing local/offline play.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed during the Phase 1 clarification interview:
> - **Play Experience**: Allow local play with code `GOD`, but reject all global database uploads.
> - **Enforcement Boundary**: **Database security rules only** (`firestore.rules`). Client code remains unchanged, ensuring the restriction is enforced at the network & database authority level.

---

### 1. Overview & Core Concept

- **Objective**: Ensure that any attempt to save high scores, stage completions, survival times, speedrun records, or First-To-Complete (⚡FTC) plaques for pilot code `GOD` is firmly rejected with `PERMISSION_DENIED` by Cloud Firestore rules.
- **Affected Collections**:
  1. `leaderboards_story` (Story Mode progression)
  2. `leaderboards_speedrun` (Speedrun Mode completion times)
  3. `leaderboards_survival` (Survival Mode duration & Hz)
  4. `leaderboards_arcade` (Arcade Mode bit progression & duration)
  5. `leaderboards_meta` (`story_ftc`, `arcade_ftc`, `story_pioneer`)
  6. `players` (Remote handle registration)

---

### 2. Security Architecture & Rule Design

- **Leaderboard Guard Primitive**:
  Define a dedicated rule helper function in `firestore.rules`:
  ```javascript
  function isBlockedInitials(str) {
    return str == 'GOD' || isBannedInitials(str);
  }
  ```
- **Rule Integration**:
  - Update `isValidStoryEntry`: enforce `!isBlockedInitials(data.initials)`.
  - Update `isValidSpeedrunEntry`: enforce `!isBlockedInitials(data.initials)`.
  - Update `isValidSurvivalEntry`: enforce `!isBlockedInitials(data.initials)`.
  - Update `isValidArcadeEntry`: enforce `!isBlockedInitials(data.initials)`.
  - Update `leaderboards_story/{id}`: explicitly disallow `id == 'GOD'` on `create` and `update`.
  - Update `leaderboards_meta`: disallow `isBlockedInitials(request.resource.data.initials)`.
  - Update `players/{code}`: disallow `code == 'GOD'` on remote handle registration.

---

### 3. Technical Implementation & Deployment Plan

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Action (Pilot: "GOD")                │
│             Finishes run / updates progression             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Firestore Security Rules                  │
│       isBlockedInitials(initials) == true ('GOD')           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION_DENIED                        │
│   Database write rejected; zero records stored in Cloud DB  │
└─────────────────────────────────────────────────────────────┘
```

1. **Modify `firestore.rules`**:
   - Add `isBlockedInitials` helper.
   - Guard entry validators against `isBlockedInitials`.
   - Explicitly block `id == 'GOD'` and `code == 'GOD'`.
2. **Deploy Rules**:
   - Run `deploy_firebase` to deploy the updated `firestore.rules` to the production Firestore database (`ai-studio-projectnthedimen-88a03551-f917-4e0a-a747-9618725701e0`).
3. **Automated Verification**:
   - Run integration verification script attempting writes to all leaderboard collections under code `GOD`.
   - Confirm all writes fail with `PERMISSION_DENIED`.
   - Confirm valid pilot handles (e.g., `DEV`, `JEF`) continue to write without issue.
