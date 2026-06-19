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
