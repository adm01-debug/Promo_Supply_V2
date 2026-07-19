/**
 * F-052: Cron heartbeat utility.
 *
 * Call `recordCronHeartbeat` at the end of every cron edge function to register
 * last-run state. Uses `upsert_cron_heartbeat` RPC (SECURITY DEFINER) so the
 * service-role client can write without bypassing RLS explicitly.
 *
 * Usage:
 *   import { recordCronHeartbeat } from "../_shared/cronHealth.ts";
 *   // at the end of the handler, before returning:
 *   await recordCronHeartbeat(adminClient, "my-cron-job");
 *   // on error path:
 *   await recordCronHeartbeat(adminClient, "my-cron-job", err.message);
 */

type AdminClient = {
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ error: unknown }>;
};

/**
 * Upserts a heartbeat row for the given cron job name.
 * @param admin    Service-role Supabase client.
 * @param jobName  Stable identifier matching the seed in `cron_heartbeats`.
 * @param errorMsg If provided, status is recorded as 'error'; otherwise 'success'.
 */
export async function recordCronHeartbeat(
  admin: AdminClient,
  jobName: string,
  errorMsg?: string,
): Promise<void> {
  const status = errorMsg ? "error" : "success";
  const { error } = await admin.rpc("upsert_cron_heartbeat", {
    p_job_name: jobName,
    p_status: status,
    p_error: errorMsg ?? null,
  });
  if (error) {
    // Non-blocking — log but never throw; heartbeat failure must not kill the cron run.
    console.warn(JSON.stringify({
      level: "WARN",
      event: "cron_heartbeat_failed",
      job: jobName,
      error: String(error),
    }));
  }
}
