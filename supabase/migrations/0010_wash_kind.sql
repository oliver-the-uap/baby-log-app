-- Distinguish bath vs shower for wash (type='bath') events.
alter table events add column if not exists wash_kind text check (wash_kind in ('bath', 'shower'));
