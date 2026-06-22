-- Daily vitamin D drop: a logged event type + its reminder settings.
alter type event_type add value if not exists 'vitamin_d';
alter table app_settings add column if not exists vitd_reminder_enabled boolean not null default true;
alter table app_settings add column if not exists last_vitd_reminder_sent_at timestamptz;
