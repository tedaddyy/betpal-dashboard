# BetPal · Mission Control

The team/admin command centre for running BetPal end-to-end — a web dashboard that
acts as the single source of truth for product, marketing, and day-to-day decisions.
On-brand with BetPal: a **light** scheme (pale sage canvas, white cards, ink text,
green `#00DF81` accent), the square logo mark, the two-tone **BetPal** wordmark
("Bet" ink / "Pal" green), and the Sora typeface. Theme tokens live in
`app/globals.css`.

Branding assets in `public/`: `logo-icon.png` (square mark — sidebar/login/favicon).
For social-post graphics, drop the horizontal wordmark at `public/logo-wordmark.png`
and it's used automatically; until then the renderer draws the wordmark as text.

This is a **separate web app** (Next.js) that talks to the existing
**betpal-backend** (Node/Express + SQLite on Render) via a self-contained
"Mission Control" module — it never touches the mobile app's user data or schema.

## Sections

1. **Overview** — business health at a glance: key metrics, what needs attention
   (open P0/P1s), backlog snapshot, upcoming posts, top ideas, pending AI drafts.
2. **Backlog** — living to-do board (kanban). Add/edit items, set priority,
   category, assignee; drag cards across Backlog → To do → In progress → Review →
   Done. Completing an item auto-logs it to the change log.
3. **Marketing** — 2-week content calendar + composer. Plan posts per platform
   (X, Instagram, TikTok, Reddit, YouTube, blog) with copy, hashtags, schedule.
4. **Social Posts** — generate branded, downloadable post graphics from a prompt.
   Claude writes the on-image copy + caption and picks a layout/format; the
   dashboard renders the real artwork on a canvas (BetPal logo + theme) so the
   on-screen mockup and the **downloaded PNG** are identical. Edit copy/format/
   colour inline. Never renders fabricated odds — bookmaker **names** only.
5. **Activity** — running change log (features/fixes/decisions/releases) plus a
   live team activity feed.
6. **Ideas** — brainstorm board: post ideas, discuss in shared threads, upvote.
   When the team is ready, **"Generate implementation prompt"** asks Claude to
   pick the right surface — **Claude Code** (build), **Claude Design** (UI/visual),
   or **Claude Cowork** (research/marketing/ops) — and writes a ready-to-paste,
   self-contained prompt for it.
7. **AI Queue** — Claude drafts backlog items + marketing posts on demand. Every
   draft lands here for human **approve/reject** — nothing is auto-applied.
8. **Team** — invite teammates (role-based: owner / admin / contributor), manage
   roles, change your password.

## Architecture

```
betpal-dashboard (this repo, Next.js 14)        betpal-backend (existing)
  app/(dash)/* .................. sections        missionControl.js  ← all dashboard API + AI
  lib/api.ts .................... fetch + JWT      mission_control.db ← team data (separate file)
  next.config.js ............... /api/dashboard/* rewrite → BACKEND_ORIGIN
```

- **Auth**: separate `team_users` table with bcrypt passwords + JWT (7-day).
  Distinct from the mobile app's accounts. Roles: owner > admin > contributor.
- **AI**: reuses the backend's `@anthropic-ai/sdk` + `ANTHROPIC_API_KEY`
  (`claude-sonnet-4-6` by default). Prompts bake in BetPal's standing rules —
  **real data only, never fabricate odds/predictions, 18+/responsible-gambling
  framing**.
- **DB**: `mission_control.db` (better-sqlite3), created automatically on boot in
  `DATA_DIR` (the Render persistent disk in prod), gitignored.

## Run locally

**1. Backend** (in `betpal-backend`):
```bash
npm install        # already installed
node server.js     # http://localhost:4000  → mounts /api/dashboard/*
```
On first boot it seeds the owner account and prints credentials. Set these in
`betpal-backend/.env` to control them:
```
DASHBOARD_JWT_SECRET=<random 64 hex>
DASHBOARD_OWNER_EMAIL=danielte9@outlook.com
DASHBOARD_OWNER_PASSWORD=<your password>      # else a temp one is printed once
DASHBOARD_URL=http://localhost:3000           # base for invite links
DASHBOARD_AI_MODEL=claude-sonnet-4-6          # optional
```

**2. Frontend** (this repo):
```bash
npm install
npm run dev        # http://localhost:3000
```
`next.config.js` proxies `/api/dashboard/*` to `BACKEND_ORIGIN`
(default `http://localhost:4000`). Sign in at `/login`.

## Deploy

- **Backend**: already on Render — just redeploy `betpal-backend` (the new
  `missionControl.js` is wired into `server.js`). Add the `DASHBOARD_*` env vars.
  Ensure `DATA_DIR` points at the persistent disk so `mission_control.db`
  survives redeploys.
- **Frontend**: deploy this repo to Vercel/Render as a Next.js app. Set
  `BACKEND_ORIGIN` to the Render backend URL and `DASHBOARD_URL` (backend) to the
  deployed dashboard URL so invite links resolve.

## Roles

| Capability                         | Owner | Admin | Contributor |
|------------------------------------|:-----:|:-----:|:-----------:|
| View everything                    |  ✓    |  ✓    |     ✓       |
| Add/edit todos, marketing, ideas   |  ✓    |  ✓    |     ✓       |
| Run AI drafts, approve/reject      |  ✓    |  ✓    |     ✓       |
| Invite/remove members, set roles   |  ✓    |  ✓    |             |
| Edit business metrics              |  ✓    |  ✓    |             |

## Notes / next steps

- **Invites** currently generate a shareable link (copy/paste). Wiring an email
  sender (e.g. Resend/Postmark) to auto-deliver them is a clean next step.
- **Metrics** on the Overview are editable by admins; hooking them to live data
  (installs, MRR from RevenueCat, active users) is a follow-up integration.
- AI drafting is **on-demand** (you click "Generate"). A scheduled weekly
  auto-refresh of the backlog + marketing plan can be added as a cron later.
