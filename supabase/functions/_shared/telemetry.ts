import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function logTelemetry(entry: {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
  requestId?: string;
  userId?: string;
  url?: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("telemetry_logs").insert({
      level: entry.level,
      message: `[Edge Function] ${entry.message}`,
      context: entry.context,
      request_id: entry.requestId,
      user_id: entry.userId,
      url: entry.url || "edge-function",
    });
    if (error) console.error("Failed to log telemetry from Edge Function:", error);
  } catch (err) {
    console.error("Critical error in Edge Function telemetry:", err);
  }
}

export async function withTelemetry<T>(
  name: string,
  fn: () => Promise<T>,
  context: any = {}
): Promise<T> {
  const start = performance.now();
  const requestId = crypto.randomUUID();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Log performance for slow functions (> 2s)
    if (duration > 2000) {
      await logTelemetry({
        level: 'warn',
        message: `${name} execution slow`,
        context: { ...context, duration: `${duration.toFixed(2)}ms`, requestId },
        requestId,
      });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    await logTelemetry({
      level: 'error',
      message: `${name} execution failed`,
      context: { 
        ...context, 
        error: error.message, 
        stack: error.stack,
        duration: `${duration.toFixed(2)}ms`,
        requestId 
      },
      requestId,
    });
    throw error;
  }
}
