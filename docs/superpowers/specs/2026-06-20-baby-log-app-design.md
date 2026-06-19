# baby-log-app — Design Spec

**Date:** 2026-06-20
**Status:** Approved design, pending spec review
**Repo:** https://github.com/oliver-the-uap/baby-log-app

## 1. Overview

A simple, mobile-first **web app** for two parents (Oliver and Rach) to log and review their baby's day-to-day care: nappies, baths, feeds, and growth stats. Installed as a PWA on Android phones, behind a login, with all data private to the two of them. Includes a "you haven't logged a feed in a while" reminder.

## 2. Goals & non-goals

**Goals**
- Fast to log a routine event in a couple of taps.
- Both parents sign in (separate logins) and see the same shared data.
- Review history as a chronological feed; review growth as a chart.
- Get reminded when a feed is overdue, even when the app is closed.
- Free to host and run.

**Non-goals (v1 — deliberately out of scope)**
- Sleep tracking, photos, notes on events.
- Multiple babies (single baby only).
- Unit switching (metric only).
- Offline writing / offline queue (needs connectivity to save).
- iOS support (Android Chrome only).
- Public self-service signup (only two pre-created accounts ever exist).

## 3. Tech stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS. Mobile-first.
- **Backend:** Supabase — Auth (email + password), Postgres with Row-Level Security (RLS).
- **Charts:** Recharts.
- **PWA:** web manifest + icons + minimal service worker (also hosts the push handler).
- **Push:** Web Push (VAPID) via the `web-push` library, triggered by a scheduled check.
- **Scheduler:** Supabase `pg_cron` (+ `pg_net`) calling a secured Next.js API route every ~15 minutes.
- **Hosting:** Vercel (frontend + API routes) + Supabase (DB/auth). All free tier.

## 4. Auth & privacy model

- **Supabase Auth, email + password.** Exactly **two accounts**, created manually in the Supabase dashboard (Oliver, Rach). **Self-signup disabled** in Auth settings — no registration path exists in the app; only a login page.
- **Single shared dataset.** One `baby` row (name + date of birth); both users read/write the same rows.
- **RLS on every table:** only authenticated users may read/write. Because only two accounts can ever exist, "authenticated = allowed" is the policy. (A future allowlist table is possible but unnecessary now.)
- **Date of birth** is stored in the `baby` table behind RLS, served only over HTTPS to a logged-in session — protected the same as all other data. No additional app-level encryption in v1.
- Every event stores **`created_by`** (the logging user) so the timeline can show who logged what.

## 5. Data model

### `baby` (single row)
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `date_of_birth` | date | used to compute age on the growth chart |
| `created_at` | timestamptz default now() | |

### `events`
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `type` | text | `nappy` \| `bath` \| `feed` \| `body_stat` |
| `occurred_at` | timestamptz | timeline timestamp; auto-set to now on create, **user-editable**. For feeds this is the start time. |
| `created_by` | uuid → auth.users | who logged it |
| `created_at` | timestamptz default now() | immutable audit stamp |
| `nappy_contents` | text null | `wee` \| `poo` \| `both` (nappy only) |
| `feed_method` | text null | `breast` \| `bottle` (feed only) |
| `breast_side` | text null | `left` \| `right` \| `both` (breast feeds only) |
| `feed_ended_at` | timestamptz null | null = feed in progress; set on stop |
| `bottle_amount_ml` | integer null | optional, bottle feeds only |
| `stat_type` | text null | `weight` \| `height` (body_stat only) |
| `stat_value` | numeric null | kg for weight, cm for height |

- Type-specific columns are validated at the application layer (and optionally a DB `CHECK`) so each `type` only populates its relevant fields. Bath rows carry no extra fields.
- Index on `(occurred_at DESC)` for the timeline; partial index on feeds where `feed_ended_at IS NULL` to find an active feed fast.

### `app_settings` (single shared row)
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `feed_reminder_enabled` | boolean default true | master on/off for the reminder |
| `feed_reminder_hours` | numeric default 4 | threshold N; editable in Settings |
| `last_feed_reminder_sent_at` | timestamptz null | anti-spam bookkeeping |

### `push_subscriptions`
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → auth.users | |
| `endpoint` | text unique | from the browser Push subscription |
| `p256dh` | text | subscription key |
| `auth` | text | subscription key |
| `created_at` | timestamptz default now() | |

One row per device that has granted notification permission. Stale endpoints are deleted when a push returns 404/410.

## 6. Feed flow (state machine)

**Start a feed:**
1. Ask **breast or bottle**.
2. If **breast** → ask **left / right / both**. The screen shows *"Last feed: Right breast, 2h 40m ago"* derived from the most recent breast feed, to help decide.
3. If **bottle** → no side asked.
4. Create a `feed` event: `occurred_at = now`, `feed_method`, `breast_side` (breast only), `feed_ended_at = null`.

**While in progress:**
- At most **one active feed** at a time (a feed with `feed_ended_at IS NULL`).
- A pinned banner on the Home screen shows the active feed with elapsed time and a **Stop** button.

**Stop a feed:**
- Set `feed_ended_at = now` (duration = `feed_ended_at − occurred_at`).
- If it was a **bottle**, optionally enter **ml drunk** (`bottle_amount_ml`).

## 7. Feed reminder

**Behavior:** if more than **N hours** (default 4, configurable) pass without a feed being recorded, remind both parents — both as an **in-app banner** (when the app is open) and as a **background push notification** (when it's closed). The whole feature can be switched off in Settings.

- **Reference time:** the `occurred_at` (start) of the most recent feed event. If a feed is currently in progress, no reminder (feeding is happening now).
- **Overdue test:** `now − last_feed_occurred_at > feed_reminder_hours` AND `feed_reminder_enabled`.
- **In-app banner:** the client re-checks on load and on a ~1-minute interval; shows a dismissible "No feed logged in over Nh" banner when overdue.
- **Background push:** a scheduled check (`pg_cron` every ~15 min → `pg_net` POST to a secured Next.js API route) evaluates the overdue test and sends Web Push (VAPID, `web-push`) to all rows in `push_subscriptions`.
- **Anti-spam:** notify once when first overdue, then at most **once per hour** while still overdue; logging a feed resets the cycle. Tracked via `last_feed_reminder_sent_at`.
- **Opt-in per device:** each phone enables notifications (grants permission + registers a subscription) from Settings. The master toggle in Settings disables reminders for everyone.

## 8. Screens

Mobile-first PWA, two main pages plus Settings, all behind login:

- **Login** — email + password only. No registration.
- **Home / Log** —
  - Quick-add buttons: **Nappy · Bath · Feed · Body stat**.
    - Nappy → tap **wee / poo / both** → logged instantly (auto time).
    - Bath → one tap → logged instantly.
    - Feed → start/stop flow per §6.
    - Body stat → choose **weight / height** → enter value → save.
  - **Active-feed banner** pinned at top when a feed is in progress.
  - **Overdue-feed banner** when applicable (§7).
  - **Timeline** below: reverse-chronological (newest at top), **infinite scroll** (keyset pagination on `occurred_at`). Each row: icon, summary, time, who logged it; tap to edit/delete.
- **Growth** — combined chart (§9).
- **Settings** — reminder on/off, threshold N (hours), enable notifications on this device, sign out.

## 9. Growth chart

- A **single combined chart** showing **weight** and **height** over time (two series / dual axis, whichever reads cleaner on a phone).
- **X-axis = age since birth**, with a **days / weeks / months** toggle (computed from the stored DOB).
- Points come from `body_stat` events; weight in kg, height in cm.
- Built with Recharts.

## 10. Edit & delete

- Tap any timeline row to **edit** its `occurred_at` time (the common fix when logged late) and its type-specific fields, or **delete** it.
- `created_at` remains as the immutable record of when the entry was actually made.

## 11. PWA & deployment

- **Installable PWA:** web manifest + app icons + a minimal service worker; opens full-screen with a home-screen icon on Android. The service worker also handles incoming push and notification clicks.
- **Env/config:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY` (for the scheduled job), `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, and a shared secret for the cron→API call.
- **Deploy:** Vercel (app + API routes) and Supabase (DB/auth). All free tier.

## 12. Error handling

- Form validation on all inputs (required fields, numeric ranges for stats/ml).
- Clear success/error toasts on logging actions; loading states on async actions.
- Push: delete subscriptions that return 404/410; failures in the scheduled job are logged, never surfaced to the user.
- No silent failures — a failed save tells the user and does not appear in the timeline.

## 13. Testing

Proportionate coverage:
- **Unit:** feed start/stop logic; overdue/anti-spam reminder logic; age + unit formatting.
- **Security:** a test confirming RLS blocks unauthenticated reads/writes.
- **E2E (Playwright):** login → log a feed (start + stop) → see it at the top of the timeline; log a body stat → see it on the growth chart.

## 14. Open implementation choices (to settle in the plan)

- Exact cron host (Supabase `pg_cron`+`pg_net` is the default; revisit if a simpler option fits).
- Combined-chart presentation: dual Y-axis vs normalized — pick whichever is clearest on a phone during build.
- Whether to add DB `CHECK` constraints per `type` or rely on the app layer.
