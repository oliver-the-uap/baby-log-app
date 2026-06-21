-- Bath/shower reminder settings.
alter table app_settings add column if not exists bath_reminder_enabled boolean not null default true;
alter table app_settings add column if not exists last_bath_reminder_sent_at timestamptz;
