-- Feed-reminder scheduler.
-- Apply this AFTER deploying, replacing <APP_URL> with the live URL and
-- <CRON_SECRET> with the value from the environment. For production, store the
-- secret in Supabase Vault rather than inlining it.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('feed-reminder-check', '*/15 * * * *', $$
  select net.http_post(
    url := '<APP_URL>/api/feed-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);
