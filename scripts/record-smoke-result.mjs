#!/usr/bin/env node
/**
 * Records the latest smoke test result into public/dependency-health.json.
 * Idempotent and safe to run on both `push` (main) and `pull_request` CI runs.
 *
 * Usage:
 *   node scripts/record-smoke-result.mjs --status pass --duration-ms 1234
 *   node scripts/record-smoke-result.mjs --status fail --duration-ms 4200
 *
 * Reads GitHub-provided env vars when available so the admin UI can deep-link
 * to the exact run / PR that produced the result.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, copyFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_PATH = resolve(ROOT, "public", "dependency-health.json");
const LOG_DIR = resolve(ROOT, "public", "logs");
const LOG_DEST_NAME = "smoke-date-fns-latest.log";
const LOG_DEST = resolve(LOG_DIR, LOG_DEST_NAME);
// Keep tail short enough to embed in JSON without bloating the snapshot.
const TAIL_BYTES = 4096;

function arg(name, fallback = "") {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

const status = (arg("status", "unknown") || "unknown").toLowerCase();
const durationMsRaw = arg("duration-ms", "");
const durationMs = durationMsRaw ? Number(durationMsRaw) : undefined;
const testFile = arg("test-file", "src/test/dateFns.smoke.test.ts");
const logFileArg = arg("log-file", "");

if (!["pass", "fail", "unknown"].includes(status)) {
  console.error(`✗ record-smoke-result: invalid --status "${status}" (expected pass|fail|unknown)`);
  process.exit(2);
}

// Persist the full log into public/logs/ so the admin UI can deep-link to it.
let logMeta = null;
if (logFileArg) {
  const src = resolve(ROOT, logFileArg);
  if (existsSync(src)) {
    try {
      mkdirSync(LOG_DIR, { recursive: true });
      copyFileSync(src, LOG_DEST);
      const st = statSync(LOG_DEST);
      const buf = readFileSync(LOG_DEST);
      const tail = buf.length > TAIL_BYTES
        ? buf.subarray(buf.length - TAIL_BYTES).toString("utf8")
        : buf.toString("utf8");
      logMeta = {
        path: `/${relative(resolve(ROOT, "public"), LOG_DEST).split(/\\/g).join("/")}`,
        sizeBytes: st.size,
        capturedAt: new Date().toISOString(),
        tail,
      };
      console.log(`✓ Copied smoke log → ${logMeta.path} (${st.size} bytes)`);
    } catch (err) {
      console.warn(`! Failed to copy smoke log from ${src}: ${err.message}`);
    }
  } else {
    console.warn(`! Smoke log not found at ${src}, skipping copy`);
  }
}

const ghServer = process.env.GITHUB_SERVER_URL || "https://github.com";
const ghRepo = process.env.GITHUB_REPOSITORY || "";
const ghRunId = process.env.GITHUB_RUN_ID || "";
const ghRunAttempt = process.env.GITHUB_RUN_ATTEMPT || "";
const ghWorkflow = process.env.GITHUB_WORKFLOW || "";
const ghEvent = process.env.GITHUB_EVENT_NAME || "";
const ghRef = process.env.GITHUB_REF || "";
const ghHeadRef = process.env.GITHUB_HEAD_REF || "";
const ghSha = process.env.GITHUB_SHA || "";

// PR number is available on pull_request events as refs/pull/<n>/merge
const prMatch = ghRef.match(/^refs\/pull\/(\d+)\//);
const prNumber = prMatch ? Number(prMatch[1]) : undefined;

const ci = ghRepo && ghRunId
  ? {
      provider: "github-actions",
      repository: ghRepo,
      workflow: ghWorkflow || null,
      event: ghEvent || null,
      runId: ghRunId,
      runAttempt: ghRunAttempt || null,
      runUrl: `${ghServer}/${ghRepo}/actions/runs/${ghRunId}${
        ghRunAttempt ? `/attempts/${ghRunAttempt}` : ""
      }`,
      branch: ghHeadRef || (ghRef.startsWith("refs/heads/") ? ghRef.slice(11) : null),
      commitSha: ghSha || null,
      ...(prNumber
        ? {
            prNumber,
            prUrl: `${ghServer}/${ghRepo}/pull/${prNumber}`,
          }
        : {}),
    }
  : null;

const smokeTest = {
  status,
  ranAt: new Date().toISOString(),
  testFile,
  ...(Number.isFinite(durationMs) ? { durationMs } : {}),
  ...(ci ? { ci } : {}),
};

let snapshot = {};
if (existsSync(OUT_PATH)) {
  try {
    snapshot = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  } catch {
    snapshot = {};
  }
}

snapshot.smokeTest = smokeTest;

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

console.log(
  `✓ Recorded smoke result: status=${status}` +
    (Number.isFinite(durationMs) ? ` durationMs=${durationMs}` : "") +
    (prNumber ? ` pr=#${prNumber}` : "") +
    (ghRunId ? ` run=${ghRunId}` : ""),
);
