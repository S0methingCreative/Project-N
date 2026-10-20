# Implementation Plan: Developer Passcode Update & Public Player Security Hardening

## Overview
Update the settings developer passcode from `1111` to `9376` and implement defense-in-depth security hardening now that public players are playing the game. This includes protecting global leaderboard integrity by blocking submissions when developer mode is active, enforcing host-only launch permissions in Squad Co-Op, and adding server-side room creation rate limiting to prevent spam.

---

## User Review Required

> [!IMPORTANT]
> - **Developer Passcode**: Updated to `9376` across `MainMenuModal.tsx` and `DimensionCanvas.tsx`.
> - **Leaderboard Anti-Cheat**: If `devToolsEnabled` is active during a run, global leaderboard submissions (Story, Speedrun, Survival, Arcade) will be disabled, with an in-game notice informing the player that records are kept local.
> - **Squad Co-Op Host Authorization**: Only the lobby host (`hostPilotId`) will have permission to launch squad runs, both in the UI and enforced server-side.
> - **Rate Limiting**: `POST /api/squad/rooms` will enforce a sliding window rate limit (max 10 rooms per 5 minutes per IP) to prevent lobby flooding.

---

## Proposed Changes

### 1. Developer Passcode Update (`9376`)
- **`src/components/MainMenuModal.tsx`**:
  - Update `handleVerifyDevCode` passcode check from `'1111'` to `'9376'`.
- **`src/components/DimensionCanvas.tsx`**:
  - Update in-game pause/settings `handleVerifyDevCode` passcode check from `'1111'` to `'9376'`.

### 2. Leaderboard Integrity Guardrails
- **`src/components/DimensionCanvas.tsx`** & **`src/services/leaderboardService.ts`**:
  - Check `userSettings.controls.devToolsEnabled` before dispatching any global leaderboard writes:
    - Story completion / progress updates
    - Speedrun record submissions
    - Survival time & total Hz submissions
    - Arcade stage & score submissions
  - When dev mode is detected during score submission modals:
    - Show a subtle pill or indicator: `DEV MODE ACTIVE — GLOBAL RECORD SUBMISSION DISABLED`
    - Keep local high score persistence intact so the developer can still test features without corrupting public rankings.

### 3. Squad Co-Op Security & Host Enforcement
- **`server.ts`**:
  - In `applyRoomAction`, for the `"launch"` action:
    - Verify `pilotId === room.hostPilotId`. If a non-host client submits `"launch"`, ignore or reject with an error message to prevent strangers in public lobbies from starting runs prematurely.
  - Implement in-memory IP rate limiting middleware on `POST /api/squad/rooms`:
    - Track creation timestamps per client IP.
    - Limit to 10 room creations per 5 minutes per IP address.
    - Return `429 Too Many Requests` if the limit is exceeded.
- **`src/components/TeamSpeedrunModal.tsx`**:
  - Ensure the launch button UI strictly reflects host status:
    - If `pilotId === room.hostPilotId`, enable "LAUNCH SQUAD RUN" when ready.
    - If `pilotId !== room.hostPilotId`, display "WAITING FOR HOST TO LAUNCH..." with a disabled state.

### 4. Firestore Security Rules & Blueprint Verification
- **`firestore.rules`**:
  - Verify speedrun room document writes retain valid structure (room code 4-8 chars, status values `lobby` | `active` | `completed`, pilots map).
  - Confirm leaderboard rules continue to enforce the 3-letter uppercase initials constraint and profanity/GOD filter.

---

## Verification Plan

### Automated & Static Verification
1. **Passcode & Dev Tools Check**:
   - Verify code references to `'1111'` are eliminated in favor of `'9376'`.
2. **Server Rate Limiting & Host Launch Check**:
   - Run tests simulating multiple room creation calls and verify 429 response upon exceeding threshold.
   - Run test sending a `"launch"` action from a non-host `pilotId` and verify it is rejected.
3. **Applet Compilation**:
   - Run `compile_applet` to ensure zero TypeScript errors or broken imports.

### Manual Verification Steps
1. Open settings in Main Menu -> Enter `1111` -> Verify error "Invalid code. Access denied."
2. Enter `9376` -> Verify dev tools unlock successfully.
3. In dev mode with dev tools on, complete a run -> Verify that global leaderboard submission is cleanly blocked with dev notice.
4. Test Squad Co-Op lobby with two pilot handles -> Confirm guest cannot launch run, only host can.
