# Split the Room — Online Social Deduction & Persuasion Game

An in-browser social deduction and persuasion party game for **3–10 players**, built with **PartyKit (Cloudflare Durable Objects)**, **React 18**, **Vite**, and **TypeScript**.

---

## Core Gameplay Loop

1. **Phase 1 — The Dilemma (Judge Prompt)**:
   - One player rotates into the role of **The Judge** and writes a completely free-form **2-Choice Question (Option A vs. Option B)** to split the room.
   - All $N$ non-Judge players are dealt a **secret Role Card** for that round.
2. **Phase 2 — Secret Lock-In**:
   - Every non-Judge player secretly locks in **Option A** or **Option B**.
3. **Phase 3 — Persuasion & Active Powers**:
   - Players post signed **Statement / Pitch Cards** onto the shared board (and argue over Discord/voice) to manipulate which option the Judge chooses.
   - Players dealt an **Active Power Role** (*The Wiretapper*, *The Forger*, *The Turncoat*, or *The Saboteur*) can trigger their 1-time secret ability during this phase.
4. **Phase 4 — The Verdict**:
   - The Judge picks **Option A** or **Option B**.
5. **Phase 5 — Reveal & Scoring**:
   - Let $k$ be the number of voters on the side chosen by the Judge ($0 \le k \le N$):
     - **Judge Score**: Scores $(N - k)$ points if $1 \le k < N$, or **$0$ points** if baited into an empty side ($k = 0$) or a unanimous room ($k = N$)!
     - **Voter Base Score**: $+2$ points if the Judge picked your final locked option (unless your role replaces base points, like *The Double Agent*).
     - **Role Bonus Points**: $+1$ to $+3$ bonus points for fulfilling your secret Role Card objective!

---

## Starter Roles Catalog

| Role | Type | Bonus Objective | Active Power (Phase 3) |
| :--- | :--- | :--- | :--- |
| **The Baiter** | Passive | **+3 pts** if the Judge picks an empty side ($k = 0$). | — |
| **The Lone Wolf** | Passive | **+3 pts** if you are the sole voter ($k = 1$) on the Judge's chosen side. | — |
| **The Union Boss** | Passive | **+2 pts** if a majority of voters ($k > N/2$) are on the Judge's chosen side. | — |
| **The Accomplice** | Passive | **+2 pts** if you and your assigned secret partner lock in the exact same final option. | — |
| **The Double Agent** | Passive | Replaces base points: **+2 pts** if the Judge picks the *opposite* side of your locked choice. | — |
| **The Wiretapper** | Active | **+1 pt** on Judge's side. | **Wiretap Peek**: Secretly inspect 1 voter's locked choice. |
| **The Forger** | Active | **+1 pt** on Judge's side. | **Plant Forged Card**: Post an Anonymous Rumor or forge a statement card under another voter's name (unmasked in Phase 5!). |
| **The Turncoat** | Active | **+1 pt** if you use Late Flip and land on the Judge's side. | **Late Flip**: Secretly flip your own locked vote ($A \leftrightarrow B$) during Persuasion. |
| **The Saboteur** | Active | **+2 pts** if the Judge scores $\le 1$ point this round. | **Secret Nudge**: Secretly swap 1 target voter's locked vote ($A \leftrightarrow B$) during Persuasion without notifying them until Phase 5! |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start both the local PartyKit WebSocket edge server (port 1999) and Vite frontend (port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser.
- **Testing across multiple browser tabs**: Each browser tab automatically generates its own `sessionStorage` player identity, so opening 3–4 tabs on your computer lets you simulate 3–4 separate players in the same 4-letter Room Code!
- **Testing in a single tab**: Click **Launch Local Sandbox** on the home screen to use the **Multi-Seat Switcher Bar** at the top of the screen, or click **+ Add AI Bot** inside any Lobby!

---

## 1-Command Free Deployment (PartyKit + Cloudflare Edge)

This project is configured in `partykit.json` (`"serve": { "path": "dist", "singlePageApp": true }`) to host **both** the authoritative WebSocket room servers and the compiled React SPA on PartyKit's free tier (no credit card required, instant room spin-up, zero cold-start delay):

```bash
npm run deploy
```

The first time you run `npm run deploy`, PartyKit will prompt you to sign in with GitHub in your browser and will publish your live game to `https://room-split-game.<your-username>.partykit.dev`.
