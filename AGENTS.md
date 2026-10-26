# Split the Room — Agent Guidelines & Architecture Rules

## Project Architecture

- **`shared/` (Pure Isomorphic Game Engine)**:
  - `shared/types.ts`: Canonical protocol types, phases (`GamePhase`), roles (`RoleId`), WebSocket payloads (`ClientToServerMessage`, `ServerToClientMessage`), and privacy-filtered client state (`ClientRoomState`).
  - `shared/roles.ts`: Role definitions (`ROLES_CATALOG`), round role dealing (`dealRolesForRound`), and AI Bot prompt/bluff generators.
  - `shared/scoring.ts`: Pure scoring functions (`calculateJudgePoints`, `calculateRoundSummary`).
  - `shared/engine.ts`: Authoritative state machine (`RoomGameEngine`) used both by the PartyKit edge server and by the in-browser Local Multi-Seat Sandbox.
- **`party/server.ts` (PartyKit Edge Server)**:
  - Thin WebSocket adapter (`SplitTheRoomServer`) around `RoomGameEngine`. Maps connections to persistent `playerId` tokens and broadcasts per-player filtered state snapshots.
- **`src/` (React + Vite Frontend)**:
  - `src/hooks/useRoomConnection.ts`: Manages `PartySocket` connection, per-tab `sessionStorage` player identity, and Local Sandbox fallback.
  - `src/components/`: Phase-specific UI views (`LobbyView`, `JudgePromptView`, `LockInView`, `PersuasionBoard`, `RevealView`, `PostGameView`, `RoleCardBanner`).
- **`tests/` (Vitest Suite)**:
  - `tests/game.test.ts` & `tests/server.test.ts`: Unit and multi-client WebSocket tests.

## Critical Game & Privacy Invariants

1. **Zero Information Leakage Before Phase 5 (`getStateForPlayer`)**:
   - Never expose another player's secret `roleId`, `initialChoices`, or `finalChoices` during `PHASE1_JUDGE_QUESTION` through `PHASE4_JUDGE_DECISION` (unless revealed to a single viewer via the *Wiretapper* `PEEK` power).
   - **Forger Masking**: Statement cards with `isForged: true` must have `trueAuthorId`, `trueAuthorName`, and `isForged` masked to match `displayedAuthorId`/`displayedAuthorName` for all other players until `PHASE5_REVEAL_AND_SCORE`.
   - **Saboteur Nudge Masking**: Track `playerKnownChoices` separately from canonical `finalChoices`. When a player's vote is secretly flipped by another player (e.g. *Saboteur* `NUDGE`), update `finalChoices[targetId]` without mutating `playerKnownChoices[targetId]` so the target's own UI does not tip them off during Phase 3/4.
2. **Non-Zero Minority Judge Scoring**:
   - With $N$ active non-Judge voters and $k$ voters on the Judge's chosen option:
     - $k = 0$ (empty side) $\rightarrow 0\text{ pts}$
     - $k = N$ (unanimous side) $\rightarrow 0\text{ pts}$
     - $1 \le k < N \rightarrow (N - k)\text{ pts}$

## Code Quality & Verification Workflow

- **Formatter & Linter**: This repository uses **Biome** (`@biomejs/biome`). Do not install ESLint or Prettier.
- **Required Pre-Completion Check**: After making any code changes, always run:
  ```bash
  npm run lint:fix && npm run check
  ```
  (`npm run check` runs `biome check .`, `tsc --noEmit`, and `vitest run`). All checks must pass with zero errors and zero warnings.
