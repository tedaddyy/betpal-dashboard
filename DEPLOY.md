# Shipping BetPal Mission Control to your team

This takes the dashboard from local to a live URL your teammates can log into.
You'll end up with **two Render services**:

```
betpal-dashboard  (Next.js, this repo)  ──proxies /api/dashboard/*──▶  betpal-backend (existing)
   team logs in here                                                    Mission Control API + DB
```

Everything that runs in your accounts is below — I've already made the code +
config changes and committed them locally (not pushed).

---

## Part A — Put the dashboard API live on your backend

The backend changes are committed on `betpal-backend` (`missionControl.js`,
`server.js`, `render.yaml`). They only ADD the `/api/dashboard/*` routes — your
existing app endpoints are untouched.

> **Order matters.** Set the env vars **before** you push. Your owner account is
> seeded on the *first boot of the new code* using these vars — if you push first
> with them unset, it seeds a random password (printed once in the logs) and
> setting your password afterward won't take effect (the account already exists).
> You never click "build" — Render auto-redeploys on both a save and a push.

1. **Add the dashboard env vars FIRST** in Render → `betpal-backend` →
   **Environment** → **Save Changes** (this redeploys the *current* code, which
   harmlessly ignores them):

   | Key | Value |
   |---|---|
   | `DASHBOARD_JWT_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
   | `DASHBOARD_OWNER_EMAIL` | your email (seeds the owner account) |
   | `DASHBOARD_OWNER_PASSWORD` | a strong password (your first login) |
   | `DASHBOARD_URL` | leave blank for now — you'll set it in Part C |
   | `DASHBOARD_AI_MODEL` | `claude-sonnet-4-6` (optional) |

   `ANTHROPIC_API_KEY` is already set (it powers the analyst) — the dashboard
   reuses it for AI drafting.

2. **Then push the backend** (Render auto-deploys the new code; on this boot the
   vars are present, so your owner account is seeded with the email + password
   you chose):
   ```bash
   cd ~/Documents/betpal-backend
   git push origin main
   ```
   After ~1–2 min, check the deploy **Logs** for
   `Mission Control dashboard routes mounted at /api/dashboard`. (If auto-deploy
   is off, hit **Manual Deploy → Deploy latest commit**.)

3. The dashboard's data (team accounts, todos, posts, ideas…) lives in
   `mission_control.db` on the **same persistent disk** as the app DB
   (`DATA_DIR=/data`), so it survives redeploys. No extra setup.

   > Already pushed before setting the vars? No harm — the DB is empty. Just set
   > the vars, then in the Render **Shell** run `rm /data/mission_control.db*` and
   > redeploy; the owner re-seeds with your chosen credentials. (Or grab the temp
   > password from the first deploy's logs and change it after logging in.)

---

## Part B — Deploy the dashboard frontend (new Render service)

The frontend isn't on GitHub yet (I git-init'd + committed it locally).

1. **Create the repo on GitHub** (e.g. `tedaddyy/betpal-dashboard`), then push:
   ```bash
   cd ~/Documents/betpal-dashboard
   git remote add origin git@github.com:tedaddyy/betpal-dashboard.git
   git push -u origin main
   ```

2. In **Render → New + → Blueprint**, connect `betpal-dashboard`. It reads
   `render.yaml` and creates a `betpal-dashboard` web service. When prompted, set:

   | Key | Value |
   |---|---|
   | `BACKEND_ORIGIN` | your backend URL, e.g. `https://betpal-backend.onrender.com` |

   (Or **New + → Web Service** manually: build `npm install && npm run build`,
   start `npm run start`, health-check path `/login`, add `BACKEND_ORIGIN`.)

3. Render builds and gives you a URL like `https://betpal-dashboard.onrender.com`.

---

## Part C — Connect the two

1. Back in Render → `betpal-backend` → **Environment**, set `DASHBOARD_URL` to the
   dashboard URL from Part B (e.g. `https://betpal-dashboard.onrender.com`). This
   is what teammate **invite links** are built from. Save (it redeploys).

That's it — the product is live.

---

## Part D — First login & invite your team

1. Go to your dashboard URL → **Sign in** with `DASHBOARD_OWNER_EMAIL` /
   `DASHBOARD_OWNER_PASSWORD`.
2. **Team → Change my password** (set your own; rotate off the seed password).
3. **Team → Invite teammate** → enter their email + role
   (**admin** = can manage team/metrics, **contributor** = everything else) →
   **Create invite link** → copy it → send it to them (Slack/email/etc).
4. They open the link, pick a name + password, and they're in — ready to work in
   the backlog, marketing, social posts, and ideas board.

> Invite delivery is copy/paste links for now (no email sender wired). That's
> enough to onboard the team today; wiring Resend/Postmark to auto-email invites
> is a small follow-up if you want it.

---

## Notes

- **Costs**: each Render web service on the `starter` plan is paid; the backend
  disk also requires a paid plan. The dashboard service needs no disk of its own.
- **Security**: use strong, unique values for `DASHBOARD_JWT_SECRET` and the owner
  password. Logins are bcrypt + JWT (7-day), with rate limiting on auth + AI.
- **Updating later**: push to each repo's `main` → Render auto-redeploys.
- **Run locally anytime**: backend `node server.js` (port 4000), dashboard
  `npm run dev` (port 3000). Copy `.env.local.example` → `.env.local` if your
  backend isn't on `localhost:4000`.
- **AI features** (drafting backlog/marketing/social, idea implementation prompts)
  require `ANTHROPIC_API_KEY` on the backend — already set.
