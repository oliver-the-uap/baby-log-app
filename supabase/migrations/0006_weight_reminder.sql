-- Weight-logging reminder settings.
alter table app_settings add column if not exists weight_reminder_enabled boolean not null default true;
alter table app_settings add column if not exists last_weight_reminder_sent_at timestamptz;
