-- Placeholder baby + default settings. Update name/date_of_birth to the real values.
insert into baby (name, date_of_birth)
select 'Baby', '2026-06-01'::date
where not exists (select 1 from baby);

insert into app_settings (feed_reminder_enabled, feed_reminder_hours)
select true, 4
where not exists (select 1 from app_settings);
