---
name: add-game-role
description: >-
  Use this skill when the user wants to design, add, modify, or balance a secret Role Card,
  Subquest objective, or Active Persuasion Power in Split the Room.
---

# Adding or Modifying a Game Role

Follow this checklist whenever adding a new role or modifying an existing role in **Split the Room**.

## Step 1: Register the Role ID & Types (`shared/types.ts`)

1. Add the new role identifier to the `RoleId` union in `shared/types.ts`.
2. If the role introduces a new active power mechanic during Phase 3 (`PHASE3_PERSUASION`), add the power identifier to `ActivePowerType` and any required payload fields to the `USE_ACTIVE_POWER` variant of `ClientToServerMessage`.

## Step 2: Define the Role in the Catalog (`shared/roles.ts`)

1. Add the `RoleDefinition` entry to `ROLES_CATALOG` in `shared/roles.ts`:
   - Set `category: 'passive'` (objective only) or `category: 'active'` (includes `activePower`).
   - Keep `tagline` concise (under 50 characters) and `objectiveDescription` clear so players can read their card in 5 seconds.
   - Set `replacesBasePoints: true` only if the role overrides the standard $+2$ base points for landing on the Judge's chosen side (like `double_agent`).
2. If the role requires round-start target assignment (like `accomplice`), update `dealRolesForRound()` in `shared/roles.ts`.
3. Update `generateBotStatement()` in `shared/roles.ts` if bots with this role should use custom bluffing heuristics.

## Step 3: Implement Scoring Logic (`shared/scoring.ts`)

1. In `calculateRoundSummary()` inside `shared/scoring.ts`, add a `case '<role_id>':` branch to evaluate whether the player fulfilled their bonus objective.
2. Populate a clear, human-readable `bonusReason` string (e.g., `"The Baiter: Judge picked an empty side (+3)"`) so Phase 5 (`RevealView`) explains why points were awarded.

## Step 4: Implement Active Power & Privacy Rules (`shared/engine.ts`)

If the role has an `activePower`:
1. Add the handler inside `handleUseActivePower()` in `shared/engine.ts`.
2. Set `assignment.powerLogSummary` so the action is summarized in Phase 5.
3. **Privacy Check**: Verify in `getStateForPlayer()` that using the power does not prematurely leak hidden information to other players during Phases 3 and 4.
4. Optionally add bot usage logic in `enterPersuasionPhase()` so AI Bots can exercise the power.

## Step 5: Wire UI Controls (`src/components/PersuasionBoard.tsx`)

If the role has a new `ActivePowerType`:
1. Add the interactive control block inside the Active Role Power Console in `src/components/PersuasionBoard.tsx`.

## Step 6: Write Tests & Verify (`tests/game.test.ts`)

1. Add a unit test in `tests/game.test.ts` covering both the role's scoring condition and (if applicable) its active power + privacy masking.
2. Run validation:
   ```bash
   npm run lint:fix && npm run check
   ```
