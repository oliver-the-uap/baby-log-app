# baby-log-app

A simple, mobile-first **PWA** for two parents to log and review a baby's day-to-day care — nappies, baths, feeds, and growth — with a configurable "no feed in N hours" reminder (in-app banner + background push). Built to be installed on an Android phone and shared by two private logins.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** — Postgres + Auth (email/password, signups disabled) + Row-Level Security
- **Recharts** for the growth chart
- **Web Push** (VAPID, `web-push`) driven by a scheduled check (Supabase `pg_cron`)
- Deployed on **Vercel** (free tier) + Supabase (free tier)

Design docs live in [`docs/superpowers/`](docs/superpowers/) (spec + implementation plan).

## Features

- Log **nappies** (wee / poo / both), **baths**, **feeds** (breast w/ side, or bottle w/ optional ml), and **body stats** (weight kg / height cm). Times auto-log and are editable.
- Stateful **feed flow**: start a feed (shows the last breast side), then stop it later (duration tracked; bottle ml optional).
- **Timeline** of all events, newest first, with infinite scroll; tap any entry to edit its time or delete it.
- **Growth chart** combining weight + height against age since birth (days / weeks / months toggle).
- **Feed reminder**: in-app banner + background push when no feed has been logged for N hours (default 4, configurable, can be switched off in Settings).

## Local development

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API (anon/publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service_role secret) — **server only** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | same value as `VAPID_PUBLIC_KEY` |
| `CRON_SECRET` | any random string (e.g. `openssl rand -hex 24`) |

### 3. Database

The schema lives in [`supabase/migrations/`](supabase/migrations/). Apply `0001_init.sql`, then run `supabase/seed.sql` (creates a placeholder baby + default settings — update the name/DOB to the real values).

### 4. Auth users (one-time)

Self-signup is intentionally disabled — only two accounts exist. In the Supabase dashboard:

1. **Authentication → Providers → Email**: turn **off** "Enable Sign-ups".
2. **Authentication → Users → Add user**: create the two logins (with `email_confirm` on so they can sign in immediately).

### 5. Run

```bash
npm run dev      # http://localhost:3000
npm run test     # unit + RLS tests (Vitest)
npm run e2e      # Playwright happy-path (needs E2E_EMAIL / E2E_PASSWORD + `npx playwright install`)
npm run build    # production build
```

## Deployment

1. **Vercel**: import this repo, set every variable from `.env.example` (production values), deploy.
2. **Schedule the reminder**: in `supabase/migrations/0002_cron.sql`, replace `<APP_URL>` with the deployed Vercel URL and `<CRON_SECRET>` with the production secret, then apply it (enables `pg_cron`/`pg_net` and schedules the 15-minute check).
3. **On your phone (Android Chrome)**: open the URL, sign in, "Add to home screen", and enable notifications in Settings.

## Notes

- RLS uses an "any authenticated user has full access" model on purpose: only two accounts can ever exist (signups disabled), and they share one baby's data. The Supabase linter flags the `USING (true)` write policies — that's expected here, not a leak.
- Push targets **Android** only (per the project brief); iOS is out of scope.
