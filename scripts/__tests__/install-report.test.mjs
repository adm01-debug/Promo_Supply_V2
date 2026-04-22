#!/usr/bin/env node
/**
 * Unit tests for scripts/install-report.mjs --json-file behavior.
 *
 * We exercise the script as a subprocess against an isolated fake project
 * directory (temp dir with a synthetic package.json + bun.lock + a fake
 * node_modules/date-fns/package.json). This keeps the tests hermetic: they
 * don't depend on the real repo's installed date-fns version, and they can
 * deterministically assert alignment / drift detection.
 *
 * Coverage:
 *   - --json-file writes JSON in BOTH --json and non---json modes
 *   - Non---json mode still prints the human report to stdout
 *   - --json-file=PATH and `--json-file PATH` (space-separated) both work
 *   - Parent directories are created when missing
 *   - Payload shape: dateFns.{spec,locked,installed}, alignment.aligned, etc.
 *   - --strict + drift exits 1 (only relevant in --json mode here; non-json
 *     drift also exits 1 under --strict)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(process.cwd(), "scripts/install-report.mjs");

function makeFakeProject({ spec, locked, installed }) {
  const dir = mkdtempSync(join(tmpdir(), "install-report-test-"));
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fake", dependencies: { "date-fns": spec } }, null, 2),
  );
  // Minimal bun text-lock snippet. resolveLockedVersion's first-priority
  // pattern matches the literal `"date-fns@<version>"` key, so a plain
  // single-line entry is enough.
  writeFileSync(
    join(dir, "bun.lock"),
    `"date-fns@${locked}": {\n  "integrity": "sha-fake"\n}\n`,
  );
  const dfDir = join(dir, "node_modules", "date-fns");
  mkdirSync(dfDir, { recursive: true });
  writeFileSync(
    join(dfDir, "package.json"),
    JSON.stringify({ name: "date-fns", version: installed }, null, 2),
  );
  return dir;
}

function runScript(cwd, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: "utf8",
  });
}

describe("install-report --json-file", () => {
  let dir;

  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  it("writes JSON file in --json mode (aligned)", () => {
    dir = makeFakeProject({ spec: "^3.6.0", locked: "3.6.0", installed: "3.6.0" });
    const out = join(dir, "report.json");
    const res = runScript(dir, ["--json", `--json-file=${out}`]);
    expect(res.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    const payload = JSON.parse(readFileSync(out, "utf8"));
    expect(payload.dateFns.spec).toBe("^3.6.0");
    expect(payload.dateFns.specNormalized).toBe("3.6.0");
    expect(payload.dateFns.locked).toBe("3.6.0");
    expect(payload.dateFns.installed).toBe("3.6.0");
    expect(payload.alignment.aligned).toBe(true);
    // In --json mode stdout is the JSON payload itself.
    expect(JSON.parse(res.stdout).alignment.aligned).toBe(true);
  });

  it("writes JSON file in non---json (human) mode and still prints human report", () => {
    dir = makeFakeProject({ spec: "^3.6.0", locked: "3.6.0", installed: "3.6.0" });
    const out = join(dir, "report.json");
    const res = runScript(dir, [`--json-file=${out}`]);
    expect(res.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    const payload = JSON.parse(readFileSync(out, "utf8"));
    expect(payload.alignment.aligned).toBe(true);
    // Human report goes to stdout
    expect(res.stdout).toContain("Install verification report");
    expect(res.stdout).toContain("date-fns spec");
    // Confirmation message goes to stderr
    expect(res.stderr).toContain("[install-report] wrote JSON");
    expect(res.stderr).toContain(out);
  });

  it("supports space-separated --json-file PATH form", () => {
    dir = makeFakeProject({ spec: "^3.6.0", locked: "3.6.0", installed: "3.6.0" });
    const out = join(dir, "report.json");
    const res = runScript(dir, ["--json-file", out]);
    expect(res.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    const payload = JSON.parse(readFileSync(out, "utf8"));
    expect(payload.dateFns.installed).toBe("3.6.0");
  });

  it("creates parent directories when --json-file path is nested", () => {
    dir = makeFakeProject({ spec: "^3.6.0", locked: "3.6.0", installed: "3.6.0" });
    const out = join(dir, "ci-artifacts", "nested", "deep", "report.json");
    const res = runScript(dir, ["--json", `--json-file=${out}`]);
    expect(res.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    const payload = JSON.parse(readFileSync(out, "utf8"));
    expect(payload.alignment.aligned).toBe(true);
  });

  it("writes JSON file even when drift is detected (non---json mode)", () => {
    dir = makeFakeProject({ spec: "^3.6.0", locked: "3.6.0", installed: "3.7.1" });
    const out = join(dir, "report.json");
    const res = runScript(dir, [`--json-file=${out}`]);
    // Non-strict: exit 0 even with drift
    expect(res.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    const payload = JSON.parse(readFileSync(out, "utf8"));
    expect(payload.alignment.aligned).toBe(false);
    expect(payload.alignment.specEqLocked).toBe(true);
    expect(payload.alignment.lockedEqInstalled).toBe(false);
    expect(payload.dateFns.installed).toBe("3.7.1");
    // Human report still includes drift section
    expect(res.stdout).toContain("DRIFT");
    expect(res.stdout).toContain("Mismatch detail");
  });

  it("writes JSON file then exits 1 with --strict --json on drift", () => {
    dir = makeFakeProject({ spec: "^3.6.0", locked: "3.6.0", installed: "3.7.1" });
    const out = join(dir, "report.json");
    const res = runScript(dir, ["--strict", "--json", `--json-file=${out}`]);
    expect(res.status).toBe(1);
    // File must still be written before the strict exit
    expect(existsSync(out)).toBe(true);
    const payload = JSON.parse(readFileSync(out, "utf8"));
    expect(payload.alignment.aligned).toBe(false);
    expect(payload.strict).toBe(true);
  });

  it("does not emit the [install-report] stderr line in --json mode", () => {
    dir = makeFakeProject({ spec: "^3.6.0", locked: "3.6.0", installed: "3.6.0" });
    const out = join(dir, "report.json");
    const res = runScript(dir, ["--json", `--json-file=${out}`]);
    expect(res.status).toBe(0);
    // In --json mode the script suppresses the human-friendly "wrote JSON"
    // line so the JSON payload on stdout stays the only structured channel.
    expect(res.stderr).not.toContain("[install-report] wrote JSON");
  });
});
