import { performance } from "perf_hooks";

/**
 * Stress Test Script for Freight Quest Edge Functions
 * Simulates concurrent traffic and measures performance metrics.
 */

const ENDPOINT = process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL}/functions/v1/workflow-engine` : "http://localhost:54321/functions/v1/workflow-engine";
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "anon";
const CONCURRENCY = 50; // Simultaneous requests
const TOTAL_REQUESTS = 500;

const headers = {
  "Content-Type": "application/json",
  "apikey": ANON_KEY,
  "Authorization": `Bearer ${ANON_KEY}`,
  "x-tenant-id": "00000000-0000-0000-0000-000000000000"
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
    return {
      status: res.status,
      latency: end - start,
      success: res.status < 500
    };
  } catch (error) {
    const end = performance.now();
    return {
      status: 0,
      latency: end - start,
      success: false,
      error: error.message
    };
  }
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

  // Analysis
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const totalLatency = latencies.reduce((a, b) => a + b, 0);
  const avgLatency = totalLatency / results.length;
  const p95 = latencies[Math.floor(results.length * 0.95)];
  const p99 = latencies[Math.floor(results.length * 0.99)];
  const failureCount = results.filter(r => !r.success).length;
  const failureRate = (failureCount / results.length) * 100;

  console.log("\n📊 Stress Test Results:");
  console.log(`- Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`- P95 Latency: ${p95.toFixed(2)}ms`);
  console.log(`- P99 Latency: ${p99.toFixed(2)}ms`);
  console.log(`- Failure Rate: ${failureRate.toFixed(2)}% (${failureCount}/${results.length})`);

  if (failureRate > 5) {
    console.error("❌ FAILURE: Stress test exceeded 5% failure rate threshold.");
    process.exit(1);
  } else {
    console.log("✅ SUCCESS: System stable under load.");
  }
}

startStressTest();
