# baby-log-app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first PWA for two parents to log a baby's nappies, baths, feeds, and growth stats, with a configurable "no feed in N hours" reminder (in-app + background push), backed by Supabase.

**Architecture:** Next.js (App Router) + TypeScript + Tailwind frontend on Vercel; Supabase Postgres + Auth (email/password, signups disabled) with Row-Level Security. Pure domain logic (feed state, reminder rules, formatting) lives in framework-free modules unit-tested with Vitest. Background push uses Web Push (VAPID, `web-push`) sent from a secured Next.js API route triggered by Supabase `pg_cron`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, @supabase/supabase-js, @supabase/ssr, Recharts, web-push, Vitest + @testing-library/react, Playwright.

---

## File Structure

```
src/
  lib/
    domain/
      feed.ts            # active-feed detection, last-breast-side, duration (pure)
      reminder.ts        # overdue test + anti-spam shouldSend (pure)
      age.ts             # age-since-birth in days/weeks/months (pure)
      format.ts          # event summaries, units (pure)
      types.ts           # shared TS types: EventType, FeedMethod, etc.
    supabase/
      client.ts          # browser client
      server.ts          # server client (@supabase/ssr, cookies)
      service.ts         # service-role client (server-only, for cron route)
    data/
      events.ts          # event queries + mutations (create/edit/delete, keyset page)
      settings.ts        # app_settings read/update
      baby.ts            # baby read
      push.ts            # push_subscriptions upsert/delete
  app/
    layout.tsx           # root layout, PWA meta
    globals.css
    login/page.tsx
    (app)/layout.tsx     # auth-guarded shell + bottom nav
    (app)/page.tsx       # Home/Log: quick-add + banners + timeline
    (app)/growth/page.tsx
    (app)/settings/page.tsx
    api/feed-reminder/route.ts   # POST: cron-triggered push check
  components/
    QuickAdd.tsx
    NappyDialog.tsx
    FeedFlow.tsx
    BodyStatDialog.tsx
    ActiveFeedBanner.tsx
    OverdueFeedBanner.tsx
    Timeline.tsx
    EventRow.tsx
    EditEventDialog.tsx
    GrowthChart.tsx
    NotificationToggle.tsx
  middleware.ts          # refresh session, redirect unauthenticated
public/
  manifest.webmanifest
  sw.js                  # service worker: push + notificationclick
  icons/ (192,512)
supabase/
  migrations/0001_init.sql
  seed.sql
tests/
  domain/*.test.ts
  rls.test.ts
  e2e/*.spec.ts
```

**Functional after Phase 6** (auth, logging, timeline, chart). Phases 7–8 add the reminder/push layer and PWA polish.

---

## Phase 0 — Project setup

### Task 0.1: Scaffold Next.js app

**Files:** repo root (creates `package.json`, `src/app/*`, `tailwind`, configs)

- [ ] **Step 1: Scaffold**

Run from repo root (it already contains `README.md`, `.gitignore`, `docs/`):
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```
When prompted about the non-empty directory, keep existing files.

- [ ] **Step 2: Install runtime + test deps**

```bash
npm install @supabase/supabase-js @supabase/ssr recharts web-push
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test @types/web-push
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test"
}
```

- [ ] **Step 4: Configure Vitest** — Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./tests/setup.ts'] },
})
```

Create `tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Verify build + empty test run**

Run: `npm run test`
Expected: PASS (no tests found / 0 failures).
Run: `npm run build`
Expected: Next.js builds the default scaffold with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js + Tailwind + test tooling"
```

### Task 0.2: Environment config & Supabase clients

**Files:** Create `.env.example`, `.env.local`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/service.ts`

- [ ] **Step 1: `.env.example`** (committed; never commit `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
CRON_SECRET=
```

- [ ] **Step 2: Browser client** — `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

- [ ] **Step 3: Server client** — `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    },
  )
}
```

- [ ] **Step 4: Service-role client** — `src/lib/supabase/service.ts` (server-only, bypasses RLS, used only by the cron route):

```ts
import { createClient as createSb } from '@supabase/supabase-js'

export function createServiceClient() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: add env template and Supabase clients"
```

> **Manual setup (record in README):** create a Supabase project, copy URL + anon key + service-role key into `.env.local`, and generate VAPID keys with `npx web-push generate-vapid-keys` (store public key in both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`). Set a random `CRON_SECRET`.

---

## Phase 1 — Database schema & RLS

### Task 1.1: Schema migration

**Files:** Create `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Enums
create type event_type as enum ('nappy', 'bath', 'feed', 'body_stat');
create type nappy_contents as enum ('wee', 'poo', 'both');
create type feed_method as enum ('breast', 'bottle');
create type breast_side as enum ('left', 'right', 'both');
create type stat_type as enum ('weight', 'height');

-- baby (single row)
create table baby (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_of_birth date not null,
  created_at timestamptz not null default now()
);

-- events
create table events (
  id uuid primary key default gen_random_uuid(),
  type event_type not null,
  occurred_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  nappy_contents nappy_contents,
  feed_method feed_method,
  breast_side breast_side,
  feed_ended_at timestamptz,
  bottle_amount_ml integer,
  stat_type stat_type,
  stat_value numeric
);
create index events_occurred_at_idx on events (occurred_at desc);
create unique index one_active_feed_idx on events (type)
  where type = 'feed' and feed_ended_at is null;

-- app_settings (single row)
create table app_settings (
  id uuid primary key default gen_random_uuid(),
  feed_reminder_enabled boolean not null default true,
  feed_reminder_hours numeric not null default 4,
  last_feed_reminder_sent_at timestamptz
);

-- push subscriptions
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- RLS: authenticated users only (only two accounts can ever exist)
alter table baby enable row level security;
alter table events enable row level security;
alter table app_settings enable row level security;
alter table push_subscriptions enable row level security;

create policy "auth read baby" on baby for select to authenticated using (true);
create policy "auth write baby" on baby for all to authenticated using (true) with check (true);
create policy "auth read events" on events for select to authenticated using (true);
create policy "auth write events" on events for all to authenticated using (true) with check (true);
create policy "auth read settings" on app_settings for select to authenticated using (true);
create policy "auth write settings" on app_settings for all to authenticated using (true) with check (true);
create policy "auth read push" on push_subscriptions for select to authenticated using (true);
create policy "auth write push" on push_subscriptions for all to authenticated using (true) with check (true);
```

> Note: the `one_active_feed_idx` unique partial index enforces "at most one in-progress feed" at the DB level.

- [ ] **Step 2: Apply migration**

Apply via the Supabase MCP `apply_migration` tool (name `0001_init`) or `supabase db push` if using the CLI.
Expected: tables visible via `list_tables`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: initial database schema with RLS"
```

### Task 1.2: Seed data & disable signups

**Files:** Create `supabase/seed.sql`; manual dashboard step

- [ ] **Step 1: Disable signups** — In Supabase dashboard → Authentication → Providers → Email: turn **off** "Enable Sign-ups" (or set `GOTRUE_DISABLE_SIGNUP=true`). Record this in README.

- [ ] **Step 2: Create the two users** — Dashboard → Authentication → Users → "Add user" twice (Oliver, Rach) with chosen passwords. (No app registration path exists.)

- [ ] **Step 3: Seed baby + settings** — `supabase/seed.sql`:

```sql
insert into baby (name, date_of_birth)
select 'Baby', '2026-06-01'::date
where not exists (select 1 from baby);

insert into app_settings (feed_reminder_enabled, feed_reminder_hours)
select true, 4
where not exists (select 1 from app_settings);
```

Apply via MCP `execute_sql`. Update the real name/DOB later in-app or via SQL.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: seed baby and app settings"
```

### Task 1.3: RLS verification test

**Files:** Create `tests/rls.test.ts`

- [ ] **Step 1: Write the failing test** (uses anon client; expects no rows / blocked)

```ts
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

describe('RLS', () => {
  it('blocks anonymous reads of events', async () => {
    const sb = createClient(url, anon)
    const { data } = await sb.from('events').select('*')
    expect(data ?? []).toHaveLength(0)
  })
  it('blocks anonymous inserts of events', async () => {
    const sb = createClient(url, anon)
    const { error } = await sb.from('events').insert({ type: 'bath' })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run** — `npx vitest run tests/rls.test.ts` with env loaded (`dotenv`-style or via shell). Expected: PASS (anon is blocked).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test: verify RLS blocks anonymous access"
```

---

## Phase 2 — Domain logic (pure, TDD)

> These modules have **no** framework/Supabase imports so they unit-test instantly. Build them before UI.

### Task 2.1: Shared types

**Files:** Create `src/lib/domain/types.ts`

- [ ] **Step 1: Define types**

```ts
export type EventType = 'nappy' | 'bath' | 'feed' | 'body_stat'
export type NappyContents = 'wee' | 'poo' | 'both'
export type FeedMethod = 'breast' | 'bottle'
export type BreastSide = 'left' | 'right' | 'both'
export type StatType = 'weight' | 'height'

export interface BabyEvent {
  id: string
  type: EventType
  occurred_at: string // ISO
  created_by: string
  created_at: string
  nappy_contents: NappyContents | null
  feed_method: FeedMethod | null
  breast_side: BreastSide | null
  feed_ended_at: string | null
  bottle_amount_ml: number | null
  stat_type: StatType | null
  stat_value: number | null
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: domain types"`

### Task 2.2: Feed helpers

**Files:** Create `src/lib/domain/feed.ts`, `tests/domain/feed.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { activeFeed, lastBreastSide, feedDurationMinutes } from '@/lib/domain/feed'
import type { BabyEvent } from '@/lib/domain/types'

const base: BabyEvent = {
  id: '1', type: 'feed', occurred_at: '2026-06-20T10:00:00Z', created_by: 'u', created_at: '',
  nappy_contents: null, feed_method: 'breast', breast_side: 'left',
  feed_ended_at: null, bottle_amount_ml: null, stat_type: null, stat_value: null,
}

describe('feed helpers', () => {
  it('finds the active (un-ended) feed', () => {
    expect(activeFeed([base])?.id).toBe('1')
  })
  it('returns null when all feeds ended', () => {
    expect(activeFeed([{ ...base, feed_ended_at: '2026-06-20T10:20:00Z' }])).toBeNull()
  })
  it('returns last breast side from most recent breast feed', () => {
    const older = { ...base, id: 'a', breast_side: 'right' as const, occurred_at: '2026-06-20T08:00:00Z', feed_ended_at: '2026-06-20T08:20:00Z' }
    const newer = { ...base, id: 'b', breast_side: 'left' as const, occurred_at: '2026-06-20T10:00:00Z', feed_ended_at: '2026-06-20T10:20:00Z' }
    expect(lastBreastSide([older, newer])).toEqual({ side: 'left', at: newer.occurred_at })
  })
  it('computes duration in minutes', () => {
    expect(feedDurationMinutes({ ...base, feed_ended_at: '2026-06-20T10:25:00Z' })).toBe(25)
  })
})
```

- [ ] **Step 2: Run** — `npx vitest run tests/domain/feed.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — `src/lib/domain/feed.ts`:

```ts
import type { BabyEvent, BreastSide } from './types'

export function activeFeed(events: BabyEvent[]): BabyEvent | null {
  return events.find((e) => e.type === 'feed' && e.feed_ended_at === null) ?? null
}

export function lastBreastSide(events: BabyEvent[]): { side: BreastSide; at: string } | null {
  const breastFeeds = events
    .filter((e) => e.type === 'feed' && e.feed_method === 'breast' && e.breast_side)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  const last = breastFeeds[0]
  return last ? { side: last.breast_side as BreastSide, at: last.occurred_at } : null
}

export function feedDurationMinutes(feed: BabyEvent): number | null {
  if (!feed.feed_ended_at) return null
  const ms = new Date(feed.feed_ended_at).getTime() - new Date(feed.occurred_at).getTime()
  return Math.round(ms / 60000)
}
```

- [ ] **Step 4: Run** — `npx vitest run tests/domain/feed.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: feed domain helpers"`

### Task 2.3: Reminder logic

**Files:** Create `src/lib/domain/reminder.ts`, `tests/domain/reminder.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { isFeedOverdue, shouldSendReminder } from '@/lib/domain/reminder'

const now = new Date('2026-06-20T14:00:00Z')

describe('reminder logic', () => {
  it('is overdue when last feed start older than N hours', () => {
    expect(isFeedOverdue('2026-06-20T09:00:00Z', 4, now)).toBe(true)   // 5h
    expect(isFeedOverdue('2026-06-20T11:00:00Z', 4, now)).toBe(false)  // 3h
  })
  it('is not overdue when no feed has ever been logged is treated as overdue? -> not overdue (null)', () => {
    expect(isFeedOverdue(null, 4, now)).toBe(false)
  })
  it('sends the first time it becomes overdue', () => {
    expect(shouldSendReminder({ overdue: true, lastSentAt: null, lastFeedAt: '2026-06-20T09:00:00Z' }, now)).toBe(true)
  })
  it('does not resend within an hour', () => {
    expect(shouldSendReminder({ overdue: true, lastSentAt: '2026-06-20T13:30:00Z', lastFeedAt: '2026-06-20T09:00:00Z' }, now)).toBe(false)
  })
  it('resends after an hour while still overdue', () => {
    expect(shouldSendReminder({ overdue: true, lastSentAt: '2026-06-20T12:30:00Z', lastFeedAt: '2026-06-20T09:00:00Z' }, now)).toBe(true)
  })
  it('does not send when not overdue', () => {
    expect(shouldSendReminder({ overdue: false, lastSentAt: null, lastFeedAt: '2026-06-20T13:00:00Z' }, now)).toBe(false)
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** — `src/lib/domain/reminder.ts`:

```ts
export function isFeedOverdue(lastFeedAt: string | null, hours: number, now: Date): boolean {
  if (!lastFeedAt) return false
  const diffH = (now.getTime() - new Date(lastFeedAt).getTime()) / 3_600_000
  return diffH > hours
}

export function shouldSendReminder(
  s: { overdue: boolean; lastSentAt: string | null; lastFeedAt: string | null },
  now: Date,
): boolean {
  if (!s.overdue) return false
  if (!s.lastSentAt) return true
  // Resend if the last reminder predates the current feed window, or >1h since last reminder.
  if (s.lastFeedAt && new Date(s.lastSentAt) < new Date(s.lastFeedAt)) return true
  return now.getTime() - new Date(s.lastSentAt).getTime() > 3_600_000
}
```

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: feed reminder domain logic"`

### Task 2.4: Age + formatting

**Files:** Create `src/lib/domain/age.ts`, `src/lib/domain/format.ts`, `tests/domain/age.test.ts`, `tests/domain/format.test.ts`

- [ ] **Step 1: Write failing tests** — `tests/domain/age.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ageSinceBirth } from '@/lib/domain/age'

describe('ageSinceBirth', () => {
  const dob = '2026-06-01'
  it('days', () => expect(ageSinceBirth(dob, '2026-06-15', 'days')).toBe(14))
  it('weeks', () => expect(ageSinceBirth(dob, '2026-06-15', 'weeks')).toBe(2))
  it('months (approx 30.44d)', () => expect(ageSinceBirth(dob, '2026-08-01', 'months')).toBe(2))
})
```

`tests/domain/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { eventSummary } from '@/lib/domain/format'
import type { BabyEvent } from '@/lib/domain/types'
const e = (p: Partial<BabyEvent>): BabyEvent => ({
  id: '', type: 'nappy', occurred_at: '', created_by: '', created_at: '',
  nappy_contents: null, feed_method: null, breast_side: null, feed_ended_at: null,
  bottle_amount_ml: null, stat_type: null, stat_value: null, ...p,
})
describe('eventSummary', () => {
  it('nappy', () => expect(eventSummary(e({ type: 'nappy', nappy_contents: 'both' }))).toBe('Nappy — wee & poo'))
  it('bath', () => expect(eventSummary(e({ type: 'bath' }))).toBe('Bath'))
  it('breast feed', () => expect(eventSummary(e({ type: 'feed', feed_method: 'breast', breast_side: 'left' }))).toBe('Feed — left breast'))
  it('bottle feed with amount', () => expect(eventSummary(e({ type: 'feed', feed_method: 'bottle', bottle_amount_ml: 90 }))).toBe('Feed — bottle, 90ml'))
  it('weight stat', () => expect(eventSummary(e({ type: 'body_stat', stat_type: 'weight', stat_value: 4.2 }))).toBe('Weight — 4.2 kg'))
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** — `src/lib/domain/age.ts`:

```ts
export type AgeUnit = 'days' | 'weeks' | 'months'

export function ageSinceBirth(dob: string, at: string, unit: AgeUnit): number {
  const days = (new Date(at).getTime() - new Date(dob).getTime()) / 86_400_000
  if (unit === 'days') return Math.floor(days)
  if (unit === 'weeks') return Math.floor(days / 7)
  return Math.floor(days / 30.44)
}
```

`src/lib/domain/format.ts`:
```ts
import type { BabyEvent } from './types'

export function eventSummary(e: BabyEvent): string {
  switch (e.type) {
    case 'nappy': {
      const m = { wee: 'wee', poo: 'poo', both: 'wee & poo' } as const
      return `Nappy — ${m[e.nappy_contents ?? 'wee']}`
    }
    case 'bath':
      return 'Bath'
    case 'feed':
      if (e.feed_method === 'breast') return `Feed — ${e.breast_side} breast`
      return e.bottle_amount_ml != null ? `Feed — bottle, ${e.bottle_amount_ml}ml` : 'Feed — bottle'
    case 'body_stat': {
      const unit = e.stat_type === 'weight' ? 'kg' : 'cm'
      const label = e.stat_type === 'weight' ? 'Weight' : 'Height'
      return `${label} — ${e.stat_value} ${unit}`
    }
  }
}
```

- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: age and formatting helpers"`

---

## Phase 3 — Auth

### Task 3.1: Session middleware

**Files:** Create `src/middleware.ts`

- [ ] **Step 1: Implement** (refresh session; redirect unauthenticated users to `/login`; let `/login` and `/api/*` through):

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = req.nextUrl
  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/_next')
  if (!user && !isPublic) return NextResponse.redirect(new URL('/login', req.url))
  if (user && pathname === '/login') return NextResponse.redirect(new URL('/', req.url))
  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js).*)'] }
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: auth session middleware"`

### Task 3.2: Login page

**Files:** Create `src/app/login/page.tsx`

- [ ] **Step 1: Implement** (client component; email + password; no signup link):

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/')
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-center">Baby Log</h1>
        <input className="w-full border rounded-lg p-3" type="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded-lg p-3" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="w-full bg-black text-white rounded-lg p-3 disabled:opacity-50" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Manual verify** — `npm run dev`, visit `/login`, sign in with a seeded user → redirected to `/`. (The `(app)` shell in Phase 4 renders the home page.)
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: login page"`

### Task 3.3: Auth-guarded app shell + nav

**Files:** Create `src/app/(app)/layout.tsx`

- [ ] **Step 1: Implement** (server component; double-checks auth; bottom nav Log / Growth / Settings; sign-out):

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-dvh pb-16">
      {children}
      <nav className="fixed bottom-0 inset-x-0 border-t bg-white grid grid-cols-3 text-center text-sm">
        <Link className="py-3" href="/">Log</Link>
        <Link className="py-3" href="/growth">Growth</Link>
        <Link className="py-3" href="/settings">Settings</Link>
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: auth-guarded app shell with nav"`

---

## Phase 4 — Data layer & logging UI

### Task 4.1: Event data access

**Files:** Create `src/lib/data/events.ts`, `src/lib/data/baby.ts`, `src/lib/data/settings.ts`

- [ ] **Step 1: Implement** — `src/lib/data/events.ts`:

```ts
import { createClient } from '@/lib/supabase/client'
import type { BabyEvent } from '@/lib/domain/types'

const PAGE = 30

export async function pageEvents(before?: string): Promise<BabyEvent[]> {
  let q = createClient().from('events').select('*').order('occurred_at', { ascending: false }).limit(PAGE)
  if (before) q = q.lt('occurred_at', before)
  const { data, error } = await q
  if (error) throw error
  return data as BabyEvent[]
}

export async function recentForState(): Promise<BabyEvent[]> {
  const { data, error } = await createClient().from('events').select('*')
    .order('occurred_at', { ascending: false }).limit(50)
  if (error) throw error
  return data as BabyEvent[]
}

export async function createEvent(e: Partial<BabyEvent>): Promise<BabyEvent> {
  const { data: { user } } = await createClient().auth.getUser()
  const { data, error } = await createClient().from('events')
    .insert({ ...e, created_by: user!.id }).select('*').single()
  if (error) throw error
  return data as BabyEvent
}

export async function updateEvent(id: string, patch: Partial<BabyEvent>): Promise<void> {
  const { error } = await createClient().from('events').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await createClient().from('events').delete().eq('id', id)
  if (error) throw error
}

export async function lastFeedStart(): Promise<string | null> {
  const { data } = await createClient().from('events').select('occurred_at')
    .eq('type', 'feed').order('occurred_at', { ascending: false }).limit(1)
  return data?.[0]?.occurred_at ?? null
}
```

`src/lib/data/baby.ts`:
```ts
import { createClient } from '@/lib/supabase/client'
export async function getBaby() {
  const { data, error } = await createClient().from('baby').select('*').single()
  if (error) throw error
  return data as { id: string; name: string; date_of_birth: string }
}
```

`src/lib/data/settings.ts`:
```ts
import { createClient } from '@/lib/supabase/client'
export async function getSettings() {
  const { data, error } = await createClient().from('app_settings').select('*').single()
  if (error) throw error
  return data as { id: string; feed_reminder_enabled: boolean; feed_reminder_hours: number; last_feed_reminder_sent_at: string | null }
}
export async function updateSettings(patch: Partial<{ feed_reminder_enabled: boolean; feed_reminder_hours: number }>) {
  const s = await getSettings()
  const { error } = await createClient().from('app_settings').update(patch).eq('id', s.id)
  if (error) throw error
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: data access layer"`

### Task 4.2: Quick-add — Nappy, Bath, Body stat

**Files:** Create `src/components/NappyDialog.tsx`, `src/components/BodyStatDialog.tsx`, `src/components/QuickAdd.tsx`

- [ ] **Step 1: Implement `NappyDialog.tsx`** (three buttons → instant create):

```tsx
'use client'
import { createEvent } from '@/lib/data/events'
import type { NappyContents } from '@/lib/domain/types'

export function NappyDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  async function log(contents: NappyContents) {
    await createEvent({ type: 'nappy', nappy_contents: contents })
    onDone()
  }
  return (
    <Sheet title="Nappy" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        {(['wee', 'poo', 'both'] as const).map((c) => (
          <button key={c} onClick={() => log(c)} className="rounded-xl border p-4 capitalize">{c === 'both' ? 'Wee & poo' : c}</button>
        ))}
      </div>
    </Sheet>
  )
}
```

> Add a small shared `Sheet` presentational component (bottom sheet/modal) in `src/components/Sheet.tsx` with `{ title, onClose, children }`. Keep it minimal: a fixed overlay + panel.

- [ ] **Step 2: Implement `BodyStatDialog.tsx`** (choose weight/height → numeric input → save):

```tsx
'use client'
import { useState } from 'react'
import { createEvent } from '@/lib/data/events'
import type { StatType } from '@/lib/domain/types'
import { Sheet } from './Sheet'

export function BodyStatDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [statType, setStatType] = useState<StatType>('weight')
  const [value, setValue] = useState('')
  async function save() {
    const v = parseFloat(value)
    if (Number.isNaN(v)) return
    await createEvent({ type: 'body_stat', stat_type: statType, stat_value: v })
    onDone()
  }
  return (
    <Sheet title="Body stat" onClose={onClose}>
      <div className="flex gap-2 mb-3">
        {(['weight', 'height'] as const).map((t) => (
          <button key={t} onClick={() => setStatType(t)}
            className={`flex-1 rounded-lg border p-2 capitalize ${statType === t ? 'bg-black text-white' : ''}`}>{t}</button>
        ))}
      </div>
      <input className="w-full border rounded-lg p-3" inputMode="decimal" placeholder={statType === 'weight' ? 'kg' : 'cm'}
        value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={save} className="w-full bg-black text-white rounded-lg p-3 mt-3">Save</button>
    </Sheet>
  )
}
```

- [ ] **Step 3: Implement `QuickAdd.tsx`** (the four buttons; opens the right dialog; bath logs instantly):

```tsx
'use client'
import { useState } from 'react'
import { createEvent } from '@/lib/data/events'
import { NappyDialog } from './NappyDialog'
import { BodyStatDialog } from './BodyStatDialog'
import { FeedFlow } from './FeedFlow'
import type { BabyEvent } from '@/lib/domain/types'

export function QuickAdd({ events, onChange }: { events: BabyEvent[]; onChange: () => void }) {
  const [open, setOpen] = useState<null | 'nappy' | 'feed' | 'stat'>(null)
  async function bath() { await createEvent({ type: 'bath' }); onChange() }
  return (
    <>
      <div className="grid grid-cols-2 gap-3 p-4">
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('nappy')}>Nappy</button>
        <button className="rounded-xl border p-5 text-lg" onClick={bath}>Bath</button>
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('feed')}>Feed</button>
        <button className="rounded-xl border p-5 text-lg" onClick={() => setOpen('stat')}>Body stat</button>
      </div>
      {open === 'nappy' && <NappyDialog onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />}
      {open === 'stat' && <BodyStatDialog onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />}
      {open === 'feed' && <FeedFlow events={events} onClose={() => setOpen(null)} onDone={() => { setOpen(null); onChange() }} />}
    </>
  )
}
```

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: quick-add nappy/bath/body-stat"`

### Task 4.3: Feed flow (start/stop)

**Files:** Create `src/components/FeedFlow.tsx`, `src/components/ActiveFeedBanner.tsx`

- [ ] **Step 1: Implement `FeedFlow.tsx`** (uses `activeFeed`/`lastBreastSide`; start path asks breast/bottle then side; if a feed is active, this opens directly into stop):

```tsx
'use client'
import { useState } from 'react'
import { createEvent, updateEvent } from '@/lib/data/events'
import { activeFeed, lastBreastSide } from '@/lib/domain/feed'
import type { BabyEvent, BreastSide } from '@/lib/domain/types'
import { Sheet } from './Sheet'

export function FeedFlow({ events, onClose, onDone }: { events: BabyEvent[]; onClose: () => void; onDone: () => void }) {
  const active = activeFeed(events)
  const last = lastBreastSide(events)
  const [method, setMethod] = useState<'breast' | 'bottle' | null>(null)
  const [amount, setAmount] = useState('')

  async function startBreast(side: BreastSide) {
    await createEvent({ type: 'feed', feed_method: 'breast', breast_side: side }); onDone()
  }
  async function startBottle() {
    await createEvent({ type: 'feed', feed_method: 'bottle' }); onDone()
  }
  async function stop() {
    const patch: Partial<BabyEvent> = { feed_ended_at: new Date().toISOString() }
    if (active!.feed_method === 'bottle' && amount) patch.bottle_amount_ml = parseInt(amount, 10)
    await updateEvent(active!.id, patch); onDone()
  }

  if (active) {
    return (
      <Sheet title="Stop feed" onClose={onClose}>
        {active.feed_method === 'bottle' && (
          <input className="w-full border rounded-lg p-3 mb-3" inputMode="numeric" placeholder="ml drunk (optional)"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
        )}
        <button onClick={stop} className="w-full bg-black text-white rounded-lg p-3">Stop feed</button>
      </Sheet>
    )
  }

  if (!method) {
    return (
      <Sheet title="Start feed" onClose={onClose}>
        {last && <p className="text-sm text-gray-600 mb-3">Last feed: {last.side} breast</p>}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMethod('breast')} className="rounded-xl border p-4">Breast</button>
          <button onClick={startBottle} className="rounded-xl border p-4">Bottle</button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Which side?" onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        {(['left', 'right', 'both'] as const).map((s) => (
          <button key={s} onClick={() => startBreast(s)} className="rounded-xl border p-4 capitalize">{s}</button>
        ))}
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 2: Implement `ActiveFeedBanner.tsx`** (pinned banner when a feed is active; opens stop flow):

```tsx
'use client'
import { activeFeed, feedDurationMinutes } from '@/lib/domain/feed'
import type { BabyEvent } from '@/lib/domain/types'

export function ActiveFeedBanner({ events, onStop }: { events: BabyEvent[]; onStop: () => void }) {
  const active = activeFeed(events)
  if (!active) return null
  const mins = feedDurationMinutes({ ...active, feed_ended_at: new Date().toISOString() })
  return (
    <button onClick={onStop} className="w-full bg-amber-100 text-amber-900 p-3 text-left">
      Feeding in progress ({active.feed_method}) — {mins} min · tap to stop
    </button>
  )
}
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: feed start/stop flow + active banner"`

---

## Phase 5 — Timeline & Home page

### Task 5.1: Event row + edit/delete

**Files:** Create `src/components/EventRow.tsx`, `src/components/EditEventDialog.tsx`

- [ ] **Step 1: Implement `EventRow.tsx`** (summary via `eventSummary`, time, tap to edit):

```tsx
'use client'
import { eventSummary } from '@/lib/domain/format'
import type { BabyEvent } from '@/lib/domain/types'

export function EventRow({ event, onEdit }: { event: BabyEvent; onEdit: () => void }) {
  const time = new Date(event.occurred_at).toLocaleString()
  const inProgress = event.type === 'feed' && event.feed_ended_at === null
  return (
    <button onClick={onEdit} className="w-full text-left border-b p-3 flex justify-between">
      <span>{eventSummary(event)}{inProgress ? ' (in progress)' : ''}</span>
      <span className="text-xs text-gray-500">{time}</span>
    </button>
  )
}
```

- [ ] **Step 2: Implement `EditEventDialog.tsx`** (edit `occurred_at` via datetime-local; delete):

```tsx
'use client'
import { useState } from 'react'
import { updateEvent, deleteEvent } from '@/lib/data/events'
import type { BabyEvent } from '@/lib/domain/types'
import { Sheet } from './Sheet'

function toLocalInput(iso: string) { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }

export function EditEventDialog({ event, onClose, onDone }: { event: BabyEvent; onClose: () => void; onDone: () => void }) {
  const [when, setWhen] = useState(toLocalInput(event.occurred_at))
  async function save() { await updateEvent(event.id, { occurred_at: new Date(when).toISOString() }); onDone() }
  async function remove() { await deleteEvent(event.id); onDone() }
  return (
    <Sheet title="Edit event" onClose={onClose}>
      <label className="block text-sm mb-1">Time</label>
      <input type="datetime-local" className="w-full border rounded-lg p-3" value={when} onChange={(e) => setWhen(e.target.value)} />
      <div className="flex gap-3 mt-4">
        <button onClick={save} className="flex-1 bg-black text-white rounded-lg p-3">Save</button>
        <button onClick={remove} className="flex-1 border border-red-500 text-red-600 rounded-lg p-3">Delete</button>
      </div>
    </Sheet>
  )
}
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: event row + edit/delete dialog"`

### Task 5.2: Timeline with infinite scroll

**Files:** Create `src/components/Timeline.tsx`

- [ ] **Step 1: Implement** (keyset pagination via `IntersectionObserver`; edit hook):

```tsx
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { pageEvents } from '@/lib/data/events'
import type { BabyEvent } from '@/lib/domain/types'
import { EventRow } from './EventRow'
import { EditEventDialog } from './EditEventDialog'

export function Timeline({ refreshKey, onChange }: { refreshKey: number; onChange: () => void }) {
  const [items, setItems] = useState<BabyEvent[]>([])
  const [done, setDone] = useState(false)
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const sentinel = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    const before = items[items.length - 1]?.occurred_at
    const next = await pageEvents(before)
    setItems((prev) => [...prev, ...next])
    if (next.length === 0) setDone(true)
  }, [items])

  useEffect(() => { setItems([]); setDone(false); pageEvents().then(setItems) }, [refreshKey])

  useEffect(() => {
    if (done || !sentinel.current) return
    const ob = new IntersectionObserver((e) => { if (e[0].isIntersecting) loadMore() })
    ob.observe(sentinel.current)
    return () => ob.disconnect()
  }, [loadMore, done])

  return (
    <div>
      {items.map((e) => <EventRow key={e.id} event={e} onEdit={() => setEditing(e)} />)}
      {!done && <div ref={sentinel} className="h-10" />}
      {editing && <EditEventDialog event={editing} onClose={() => setEditing(null)}
        onDone={() => { setEditing(null); onChange() }} />}
    </div>
  )
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: timeline with infinite scroll"`

### Task 5.3: Home page wiring

**Files:** Create `src/app/(app)/page.tsx`, `src/components/OverdueFeedBanner.tsx`

- [ ] **Step 1: Implement `OverdueFeedBanner.tsx`** (in-app reminder; uses `isFeedOverdue`; re-checks each minute):

```tsx
'use client'
import { useEffect, useState } from 'react'
import { isFeedOverdue } from '@/lib/domain/reminder'
import { activeFeed } from '@/lib/domain/feed'
import type { BabyEvent } from '@/lib/domain/types'

export function OverdueFeedBanner({ events, lastFeedAt, enabled, hours }:
  { events: BabyEvent[]; lastFeedAt: string | null; enabled: boolean; hours: number }) {
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(id) }, [])
  if (!enabled || activeFeed(events)) return null
  if (!isFeedOverdue(lastFeedAt, hours, new Date())) return null
  return <div className="w-full bg-red-100 text-red-800 p-3">No feed logged in over {hours}h.</div>
}
```

- [ ] **Step 2: Implement `src/app/(app)/page.tsx`** (client page that loads recent events + settings, renders banners, quick-add, timeline):

```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { recentForState, lastFeedStart } from '@/lib/data/events'
import { getSettings } from '@/lib/data/settings'
import { QuickAdd } from '@/components/QuickAdd'
import { Timeline } from '@/components/Timeline'
import { ActiveFeedBanner } from '@/components/ActiveFeedBanner'
import { OverdueFeedBanner } from '@/components/OverdueFeedBanner'
import { FeedFlow } from '@/components/FeedFlow'
import type { BabyEvent } from '@/lib/domain/types'

export default function HomePage() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [lastFeed, setLastFeed] = useState<string | null>(null)
  const [settings, setSettings] = useState({ feed_reminder_enabled: true, feed_reminder_hours: 4 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [stopOpen, setStopOpen] = useState(false)

  const refresh = useCallback(async () => {
    const [evs, lf, s] = await Promise.all([recentForState(), lastFeedStart(), getSettings()])
    setEvents(evs); setLastFeed(lf); setSettings(s); setRefreshKey((k) => k + 1)
  }, [])
  useEffect(() => { refresh() }, [refresh])

  return (
    <main>
      <ActiveFeedBanner events={events} onStop={() => setStopOpen(true)} />
      <OverdueFeedBanner events={events} lastFeedAt={lastFeed}
        enabled={settings.feed_reminder_enabled} hours={settings.feed_reminder_hours} />
      <QuickAdd events={events} onChange={refresh} />
      <Timeline refreshKey={refreshKey} onChange={refresh} />
      {stopOpen && <FeedFlow events={events} onClose={() => setStopOpen(false)} onDone={() => { setStopOpen(false); refresh() }} />}
    </main>
  )
}
```

- [ ] **Step 3: Manual verify** — log a nappy, a bath, a breast feed (start + stop), a bottle feed with ml, a weight; confirm each appears newest-first; edit a time; delete one.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: home page with banners, quick-add and timeline"`

---

## Phase 6 — Growth chart

### Task 6.1: Combined growth chart

**Files:** Create `src/components/GrowthChart.tsx`, `src/app/(app)/growth/page.tsx`

- [ ] **Step 1: Implement `GrowthChart.tsx`** (Recharts; dual Y-axis weight+height; x = age via `ageSinceBirth`; unit toggle):

```tsx
'use client'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { ageSinceBirth, type AgeUnit } from '@/lib/domain/age'
import type { BabyEvent } from '@/lib/domain/types'

export function GrowthChart({ events, dob }: { events: BabyEvent[]; dob: string }) {
  const [unit, setUnit] = useState<AgeUnit>('weeks')
  const stats = events.filter((e) => e.type === 'body_stat')
  const data = stats.map((e) => ({
    age: ageSinceBirth(dob, e.occurred_at, unit),
    weight: e.stat_type === 'weight' ? e.stat_value : null,
    height: e.stat_type === 'height' ? e.stat_value : null,
  })).sort((a, b) => a.age - b.age)

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        {(['days', 'weeks', 'months'] as const).map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className={`flex-1 rounded-lg border p-2 capitalize ${unit === u ? 'bg-black text-white' : ''}`}>{u}</button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <XAxis dataKey="age" label={{ value: unit, position: 'insideBottom', offset: -4 }} />
          <YAxis yAxisId="w" orientation="left" />
          <YAxis yAxisId="h" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="w" type="monotone" dataKey="weight" name="Weight (kg)" connectNulls stroke="#000" />
          <Line yAxisId="h" type="monotone" dataKey="height" name="Height (cm)" connectNulls stroke="#888" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/app/(app)/growth/page.tsx`**:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { recentForState } from '@/lib/data/events'
import { getBaby } from '@/lib/data/baby'
import { GrowthChart } from '@/components/GrowthChart'
import type { BabyEvent } from '@/lib/domain/types'

export default function GrowthPage() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [dob, setDob] = useState<string | null>(null)
  useEffect(() => {
    recentForState().then(setEvents)
    getBaby().then((b) => setDob(b.date_of_birth))
  }, [])
  if (!dob) return <p className="p-4">Loading…</p>
  return <GrowthChart events={events} dob={dob} />
}
```

> Note: `recentForState()` caps at 50 events; for growth, add a dedicated `allBodyStats()` query in `events.ts` (`.eq('type','body_stat').order('occurred_at')`) and use it here so older stats aren't dropped.

- [ ] **Step 3: Add `allBodyStats()` to `events.ts`** and use it in the growth page:

```ts
export async function allBodyStats(): Promise<BabyEvent[]> {
  const { data, error } = await createClient().from('events').select('*')
    .eq('type', 'body_stat').order('occurred_at', { ascending: true })
  if (error) throw error
  return data as BabyEvent[]
}
```

- [ ] **Step 4: Manual verify** — add weight/height entries, confirm both plot and the day/week/month toggle re-scales the x-axis.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: combined growth chart"`

---

## Phase 7 — Settings, push subscriptions & background reminder

### Task 7.1: Push data access + service worker

**Files:** Create `src/lib/data/push.ts`, `public/sw.js`

- [ ] **Step 1: Implement `src/lib/data/push.ts`**:

```ts
import { createClient } from '@/lib/supabase/client'

export async function saveSubscription(sub: PushSubscriptionJSON) {
  const { data: { user } } = await createClient().auth.getUser()
  const { error } = await createClient().from('push_subscriptions').upsert({
    user_id: user!.id, endpoint: sub.endpoint!,
    p256dh: sub.keys!.p256dh, auth: sub.keys!.auth,
  }, { onConflict: 'endpoint' })
  if (error) throw error
}
```

- [ ] **Step 2: Implement `public/sw.js`** (push display + click focus):

```js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(self.registration.showNotification(data.title || 'Baby Log', {
    body: data.body || '', icon: '/icons/icon-192.png', tag: 'feed-reminder',
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window' }).then((c) => c[0]?.focus() ?? clients.openWindow('/')))
})
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: push subscription storage + service worker"`

### Task 7.2: Notification toggle + Settings page

**Files:** Create `src/components/NotificationToggle.tsx`, `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Implement `NotificationToggle.tsx`** (register SW, request permission, subscribe, save):

```tsx
'use client'
import { useState } from 'react'
import { saveSubscription } from '@/lib/data/push'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function NotificationToggle() {
  const [status, setStatus] = useState('')
  async function enable() {
    const reg = await navigator.serviceWorker.register('/sw.js')
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') { setStatus('Permission denied'); return }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })
    await saveSubscription(sub.toJSON())
    setStatus('Notifications enabled on this device')
  }
  return (
    <div>
      <button onClick={enable} className="w-full border rounded-lg p-3">Enable notifications on this device</button>
      {status && <p className="text-sm text-gray-600 mt-2">{status}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Implement `src/app/(app)/settings/page.tsx`** (reminder on/off, hours, notification toggle, sign out):

```tsx
'use client'
import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '@/lib/data/settings'
import { NotificationToggle } from '@/components/NotificationToggle'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [enabled, setEnabled] = useState(true)
  const [hours, setHours] = useState(4)
  useEffect(() => { getSettings().then((s) => { setEnabled(s.feed_reminder_enabled); setHours(Number(s.feed_reminder_hours)) }) }, [])
  async function save() { await updateSettings({ feed_reminder_enabled: enabled, feed_reminder_hours: hours }) }
  async function signOut() { await createClient().auth.signOut(); router.replace('/login') }
  return (
    <main className="p-4 space-y-5">
      <h1 className="text-xl font-semibold">Settings</h1>
      <label className="flex items-center justify-between">
        <span>Feed reminder</span>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </label>
      <label className="flex items-center justify-between">
        <span>Remind after (hours)</span>
        <input type="number" min={1} step={0.5} className="border rounded-lg p-2 w-24" value={hours}
          onChange={(e) => setHours(parseFloat(e.target.value))} />
      </label>
      <button onClick={save} className="w-full bg-black text-white rounded-lg p-3">Save</button>
      <NotificationToggle />
      <button onClick={signOut} className="w-full border rounded-lg p-3">Sign out</button>
    </main>
  )
}
```

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: settings page + notification opt-in"`

### Task 7.3: Reminder API route (background push)

**Files:** Create `src/app/api/feed-reminder/route.ts`

- [ ] **Step 1: Implement** (auth via `CRON_SECRET`; reuse `isFeedOverdue`/`shouldSendReminder`; send web-push; prune dead endpoints; update `last_feed_reminder_sent_at`):

```ts
import { NextResponse, type NextRequest } from 'next/server'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'
import { isFeedOverdue, shouldSendReminder } from '@/lib/domain/reminder'

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  webpush.setVapidDetails('mailto:oliver@theuap.com', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  const sb = createServiceClient()
  const now = new Date()

  const { data: settings } = await sb.from('app_settings').select('*').single()
  if (!settings?.feed_reminder_enabled) return NextResponse.json({ skipped: 'disabled' })

  const { data: lastFeed } = await sb.from('events').select('occurred_at')
    .eq('type', 'feed').order('occurred_at', { ascending: false }).limit(1)
  const lastFeedAt = lastFeed?.[0]?.occurred_at ?? null

  const overdue = isFeedOverdue(lastFeedAt, Number(settings.feed_reminder_hours), now)
  const send = shouldSendReminder({ overdue, lastSentAt: settings.last_feed_reminder_sent_at, lastFeedAt }, now)
  if (!send) return NextResponse.json({ sent: 0 })

  const { data: subs } = await sb.from('push_subscriptions').select('*')
  const payload = JSON.stringify({ title: 'Feed reminder', body: `No feed logged in over ${settings.feed_reminder_hours}h.` })
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      sent++
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) await sb.from('push_subscriptions').delete().eq('id', s.id)
    }
  }
  await sb.from('app_settings').update({ last_feed_reminder_sent_at: now.toISOString() }).eq('id', settings.id)
  return NextResponse.json({ sent })
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: background feed-reminder push route"`

### Task 7.4: Schedule the check

**Files:** `supabase/migrations/0002_cron.sql` (or run via MCP `execute_sql`)

- [ ] **Step 1: Enable extensions + schedule** (replace `<APP_URL>` and `<CRON_SECRET>` with real values; store secret in Supabase Vault for production):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('feed-reminder-check', '*/15 * * * *', $$
  select net.http_post(
    url := '<APP_URL>/api/feed-reminder',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
$$);
```

- [ ] **Step 2: Manual verify** — temporarily set the schedule to `* * * * *`, set `feed_reminder_hours` low, ensure no recent feed, confirm a notification arrives on an enabled Android device; then restore `*/15`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "chore: schedule feed-reminder cron"`

---

## Phase 8 — PWA polish & deploy

### Task 8.1: Manifest, icons, install metadata

**Files:** Create `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`; modify `src/app/layout.tsx`

- [ ] **Step 1: `public/manifest.webmanifest`**

```json
{
  "name": "Baby Log",
  "short_name": "Baby Log",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Add icons** — place 192px and 512px PNGs in `public/icons/` (simple solid-colour placeholder icons are fine for v1).

- [ ] **Step 3: Link manifest in `src/app/layout.tsx`** — add to the exported `metadata`:

```ts
export const metadata = {
  title: 'Baby Log',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Baby Log' },
}
export const viewport = { themeColor: '#000000' }
```

- [ ] **Step 4: Register the service worker on app load** — in `src/app/(app)/layout.tsx` add a small client component that calls `navigator.serviceWorker.register('/sw.js')` on mount (so push works without visiting Settings first). Create `src/components/RegisterSW.tsx`:

```tsx
'use client'
import { useEffect } from 'react'
export function RegisterSW() {
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}) }, [])
  return null
}
```

Render `<RegisterSW />` inside the app shell.

- [ ] **Step 5: Manual verify** — Chrome on Android → "Add to home screen" appears; app opens standalone.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: PWA manifest, icons, SW registration"`

### Task 8.2: E2E happy path

**Files:** Create `tests/e2e/log-feed.spec.ts`, `playwright.config.ts`

- [ ] **Step 1: Playwright config** — `playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true },
})
```

- [ ] **Step 2: Write the e2e test** (requires a seeded test user in env: `E2E_EMAIL`, `E2E_PASSWORD`):

```ts
import { test, expect } from '@playwright/test'

test('log a breast feed end-to-end', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type=email]', process.env.E2E_EMAIL!)
  await page.fill('input[type=password]', process.env.E2E_PASSWORD!)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL('/')
  await page.click('button:has-text("Feed")')
  await page.click('button:has-text("Breast")')
  await page.click('button:has-text("Left")')
  await expect(page.locator('text=Feed — left breast')).toBeVisible()
})
```

- [ ] **Step 3: Run** — `npm run e2e` → PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "test: e2e happy path for logging a feed"`

### Task 8.3: Deploy

**Files:** none (platform config) — update `README.md`

- [ ] **Step 1: Vercel** — import the GitHub repo, set all env vars from `.env.example` (production values), deploy.
- [ ] **Step 2: Point cron** — set `<APP_URL>` in the cron schedule to the deployed Vercel URL.
- [ ] **Step 3: Smoke test** — sign in on an Android phone, install to home screen, enable notifications, log a feed, confirm it appears; verify the reminder fires after the threshold.
- [ ] **Step 4: Update README** with setup + deploy notes; commit.

```bash
git add -A && git commit -m "docs: deployment and setup notes"
```

---

## Self-Review

**1. Spec coverage:**
- Auth (email/password, signups off, 2 users) → Tasks 1.2, 3.1–3.3. ✓
- Single shared dataset + RLS + DOB storage → Tasks 1.1, 1.3, 4.1. ✓
- Nappy/bath/feed/body-stat logging → Tasks 4.2, 4.3. ✓
- Feed flow (breast/bottle, side, last-side hint, stop, bottle ml) → Task 4.3 + domain 2.2. ✓
- Timeline reverse-chronological + infinite scroll → Tasks 5.1–5.3. ✓
- Edit time + delete → Task 5.1. ✓
- Combined growth chart, age toggle, DOB → Task 6.1. ✓
- Reminder in-app + background push, settings on/off + N hours, anti-spam → Tasks 2.3, 7.1–7.4. ✓
- PWA installable (Android) → Task 8.1. ✓
- Free-tier hosting → Task 8.3. ✓
- Testing (unit/RLS/e2e) → domain tests, 1.3, 8.2. ✓

**2. Placeholder scan:** No "TBD/TODO/handle edge cases" left; each code step shows real code. The only intentional fill-ins are real-world secrets/URLs (`<APP_URL>`, `<CRON_SECRET>`, DOB/name in seed) which are environment values, not logic gaps.

**3. Type consistency:** `BabyEvent`/`EventType`/`BreastSide`/`StatType`/`AgeUnit` defined in `types.ts`/`age.ts` and used consistently. `activeFeed`, `lastBreastSide`, `feedDurationMinutes`, `isFeedOverdue`, `shouldSendReminder`, `eventSummary`, `ageSinceBirth`, and the `events.ts` data functions keep the same names throughout. `recentForState()` cap noted and addressed for growth via `allBodyStats()` (Task 6.1 Step 3).
