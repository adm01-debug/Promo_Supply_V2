#!/usr/bin/env node
/**
 * Generate a short typecheck report artifact summarizing:
 *   - TypeScript compiler version
 *   - tsconfig resolution settings (extends, target, module, moduleResolution,
 *     strict, jsx, paths, include) for each project file
 *   - Pass/fail result of `tsc --noEmit -p <project>` for each project
 *
 * Output: ci-artifacts/typecheck-report.json (machine-readable) + console summary.
 * Exit code: 0 if all projects type-check cleanly, 1 otherwise.
 */
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'ci-artifacts');
const OUT_FILE = resolve(OUT_DIR, 'typecheck-report.json');

const PROJECTS = ['tsconfig.app.json', 'tsconfig.node.json'].filter((p) =>
  existsSync(resolve(ROOT, p)),
);

function tscVersion() {
  try {
    return execSync('bunx tsc --version', { encoding: 'utf8' }).trim();
  } catch {
    try {
      return execSync('npx tsc --version', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }
}

function readResolvedConfig(project) {
  // Use `tsc --showConfig` to get the fully resolved config (after extends).
  const res = spawnSync('bunx', ['tsc', '--showConfig', '-p', project], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    return { error: res.stderr?.trim() || 'failed to resolve config' };
  }
  try {
    const cfg = JSON.parse(res.stdout);
    const co = cfg.compilerOptions || {};
    return {
      extends: cfg.extends ?? null,
      compilerOptions: {
        target: co.target ?? null,
        module: co.module ?? null,
        moduleResolution: co.moduleResolution ?? null,
        jsx: co.jsx ?? null,
        strict: co.strict ?? null,
        strictNullChecks: co.strictNullChecks ?? null,
        noImplicitAny: co.noImplicitAny ?? null,
        noEmit: co.noEmit ?? null,
        skipLibCheck: co.skipLibCheck ?? null,
        isolatedModules: co.isolatedModules ?? null,
        esModuleInterop: co.esModuleInterop ?? null,
        resolveJsonModule: co.resolveJsonModule ?? null,
        paths: co.paths ?? null,
      },
      include: cfg.include ?? null,
      files: cfg.files ?? null,
    };
  } catch (err) {
    return { error: `failed to parse showConfig output: ${err.message}` };
  }
}

function runTypecheck(project) {
  const start = Date.now();
  const res = spawnSync('bunx', ['tsc', '--noEmit', '-p', project], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const durationMs = Date.now() - start;
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  const combined = `${stdout}${stderr}`;
  const errorCount = (combined.match(/error TS\d+:/g) || []).length;
  return {
    exitCode: res.status ?? -1,
    pass: res.status === 0,
    durationMs,
    errorCount,
    // Cap stderr/stdout tail to keep the artifact small.
    outputTail: combined.trim().split('\n').slice(-40).join('\n'),
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform} ${process.arch}`,
  typescriptVersion: tscVersion(),
  projects: PROJECTS.map((project) => ({
    project,
    config: readResolvedConfig(project),
    result: runTypecheck(project),
  })),
};

report.allPassed = report.projects.every((p) => p.result.pass);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf8');

// Human-readable console summary.
const line = (s) => process.stdout.write(s + '\n');
line('');
line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
line(' TypeScript typecheck report');
line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
line(` TypeScript version : ${report.typescriptVersion}`);
line(` Node               : ${report.node}`);
line(` Platform           : ${report.platform}`);
line(` Generated at       : ${report.generatedAt}`);
line(` Artifact           : ${OUT_FILE.replace(ROOT + '/', '')}`);
line('');
for (const p of report.projects) {
  const co = p.config.compilerOptions || {};
  const status = p.result.pass ? '✓ PASS' : '✗ FAIL';
  line(` ${status}  ${p.project}  (${p.result.durationMs}ms, ${p.result.errorCount} error${p.result.errorCount === 1 ? '' : 's'})`);
  line(`        target=${co.target}  module=${co.module}  moduleResolution=${co.moduleResolution}`);
  line(`        strict=${co.strict}  strictNullChecks=${co.strictNullChecks}  noImplicitAny=${co.noImplicitAny}  jsx=${co.jsx}`);
  if (!p.result.pass && p.result.outputTail) {
    line('        ── tail ──');
    for (const ln of p.result.outputTail.split('\n')) {
      line(`        ${ln}`);
    }
  }
}
line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
line(report.allPassed ? '✅ All projects type-checked cleanly.' : '❌ One or more projects failed type-checking.');
line('');

process.exit(report.allPassed ? 0 : 1);
