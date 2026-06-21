-- At most one in-progress sleep at a time (mirrors the active-feed index).
-- Separate migration because a new enum value can't be used until committed.
create unique index if not exists one_active_sleep_idx on events (type)
  where type = 'sleep' and sleep_ended_at is null;
