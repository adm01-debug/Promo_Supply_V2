-- Enable pg_cron if not already enabled (usually requires superuser or being in a specific schema)
-- We assume it's already enabled as checked before.

-- Schedule the weekly report for every Monday at 8 AM
SELECT cron.schedule(
    'weekly-summary-report-job',
    '0 8 * * 1',
    $$ SELECT net.http_post(
        url := 'https://apuzcrkeqodktmpwobnz.supabase.co/functions/v1/weekly-summary-report',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) $$
);

-- Note: In Supabase, the service_role_key is usually available via current_setting if configured.
-- If not, it can be hardcoded or managed via secrets.
