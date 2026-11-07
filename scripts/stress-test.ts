import { performance } from "perf_hooks";

/**
 * Stress Test Script for Freight Quest Edge Functions
 * Simulates concurrent traffic and measures performance metrics.
 *
 * Uso:
 *   bun run scripts/stress-test.ts
 *   bun run scripts/stress-test.ts --concurrency 100 --requests 1000
 *   bun run scripts/stress-test.ts --endpoint https://.../functions/v1/workflow-engine
 *   bun run scripts/stress-test.ts --confirm   # confirma execução contra produção
 *
 * 401/403 são respostas de auth válidas (não contam como falha de infra).
 */

const ENDPOINT = process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL}/functions/v1/workflow-engine` : "http://localhost:54321/functions/v1/workflow-engine";
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "anon";

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const CONCURRENCY = Number(arg("--concurrency", "50"));
const TOTAL_REQUESTS = Number(arg("--requests", "500"));
const CONFIRM = process.argv.includes("--confirm");

const isProd = /https:\/\/[a-z0-9]+\.supabase\.co/.test(ENDPOINT);
if (isProd && !CONFIRM) {
  console.error("⚠️  Endpoint de produção detectado. Re-execute com --confirm para prosseguir.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "apikey": ANON_KEY,
  "Authorization": `Bearer ${ANON_KEY}`,
};

const payload = {
  action: "start_workflow",
  template_id: "00000000-0000-0000-0000-000000000001",
  entity_type: "pedido",
  entity_id: "00000000-0000-0000-0000-000000000002"
};

async function runRequest() {
  const start = performance.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const end = performance.now();
    // 401/403 = auth rejeitada (esperado como anon); não é falha de infra.
    const success = res.status < 500 && res.status !== 0;
    return {
      status: res.status,
      latency: end - start,
      success,
      authRejected: res.status === 401 || res.status === 403
    };
  } catch (error) {
    const end = performance.now();
    return {
      status: 0,
      latency: end - start,
      success: false,
      authRejected: false,
      error: error.message
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

async function startStressTest() {
  console.log(`🚀 Starting Stress Test on ${ENDPOINT}`);
  console.log(`Concurrency: ${CONCURRENCY} | Total Requests: ${TOTAL_REQUESTS}`);

  const results = [];
  const queue = Array(TOTAL_REQUESTS).fill(null);

  const workers = Array(CONCURRENCY).fill(null).map(async () => {
    while (queue.length > 0) {
      queue.pop();
      const result = await runRequest();
      results.push(result);
    }
  });

  await Promise.all(workers);

  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const totalLatency = latencies.reduce((a, b) => a + b, 0);
  const avgLatency = totalLatency / results.length;
  const p95 = percentile(latencies, 0.95);
  const p99 = percentile(latencies, 0.99);
  const infraFailures = results.filter(r => !r.success && !r.authRejected).length;
  const authRejected = results.filter(r => r.authRejected).length;
  const failureRate = (infraFailures / results.length) * 100;

  console.log("\n📊 Stress Test Results:");
  console.log(`- Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`- P95 Latency: ${p95.toFixed(2)}ms`);
  console.log(`- P99 Latency: ${p99.toFixed(2)}ms`);
  console.log(`- Auth Rejected (401/403): ${authRejected}`);
  console.log(`- Infra Failure Rate: ${failureRate.toFixed(2)}% (${infraFailures}/${results.length})`);

  if (failureRate > 5) {
    console.error("❌ FAILURE: Stress test exceeded 5% infra failure rate threshold.");
    process.exit(1);
  } else {
    console.log("✅ SUCCESS: System stable under load.");
  }
}

startStressTest();
