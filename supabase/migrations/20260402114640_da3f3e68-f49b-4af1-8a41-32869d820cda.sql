-- Enable pg_cron and pg_net extensions (needed for HTTP calls from cron)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Weekly report - every Monday at 8:00 AM BRT (11:00 UTC)
SELECT cron.schedule(
  'weekly-procurement-report',
  '0 11 * * 1',
  $$SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/weekly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );$$
);

-- Cotação follow-up - daily at 9:00 AM BRT (12:00 UTC)
SELECT cron.schedule(
  'cotacao-followup-check',
  '0 12 * * *',
  $$SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-cotacao-followup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );$$
);

-- SLA alerts - every 30 minutes
SELECT cron.schedule(
  'sla-alerts-check',
  '*/30 * * * *',
  $$SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-sla-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );$$
);

-- Expiry alerts - daily at 7:00 AM BRT (10:00 UTC)
SELECT cron.schedule(
  'expiry-alerts-check',
  '0 10 * * *',
  $$SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-expiry-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );$$
);

-- Approval escalation - every 15 minutes
SELECT cron.schedule(
  'approval-escalation-check',
  '*/15 * * * *',
  $$SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-approval-escalations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  );$$
);