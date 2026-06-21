-- Sleep tracking: a start/stop event like a feed, with its own end column.
alter type event_type add value if not exists 'sleep';
alter table events add column if not exists sleep_ended_at timestamptz;
