---
name: dev-and-deploy
description: >-
  Use this skill when the user wants to run the game locally, test multiplayer rooms,
  troubleshoot PartyKit or Vite servers, or deploy the game to PartyKit's free edge tier.
---

# Local Development, Testing & Free Edge Deployment

## 1. Running Locally

Start both the PartyKit edge WebSocket server (port `1999`) and the Vite frontend dev server (port `5173`) concurrently:

```bash
npm run dev
```

### Ways to Test Multiplayer Flows on One Machine
1. **Multiple Browser Tabs (Live WebSocket)**:
   - Each tab generates an isolated `sessionStorage` player ID (`split_room_player_id`).
   - Open 3+ tabs at `http://localhost:5173` and join the same 4-letter Room Code to test real-time WebSocket state masking.
   - Or pass `?room=ABCD&pid=custom_id` in the URL to force a specific player identity.
2. **AI Bots**:
   - In any Lobby, the Host can click **+ Add AI Bot** to populate up to 10 total players. Bots automatically write questions when Judge, lock in choices, post statements, and use active powers.
3. **Local Multi-Seat Sandbox (No Backend Needed)**:
   - Click **Launch Local Sandbox** on the landing screen to run `RoomGameEngine` in-memory with a top **Multi-Seat Switcher Bar** that lets you switch between human player perspectives in a single tab.

## 2. Pre-Deploy Validation

Before deploying or committing, run the full quality gate:

```bash
npm run lint:fix
npm run check
npm run build
```

- `npm run check` runs Biome (`biome check .`), TypeScript (`tsc --noEmit`), and Vitest (`vitest run`).
- `npm run build` compiles the production SPA bundle into `dist/`.

## 3. Deploying to PartyKit (Free Tier)

`partykit.json` is configured with `"serve": { "path": "dist", "singlePageApp": true }`, which deploys both the authoritative `party/server.ts` Durable Object backend and the static React frontend in one command:

```bash
npm run deploy
```

- On first run, `npx partykit deploy` opens a browser window to authenticate with GitHub (no credit card required).
- Once deployed, PartyKit outputs the live URL (`https://room-split-game.<username>.partykit.dev`).
