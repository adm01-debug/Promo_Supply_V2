/**
 * Vitest reporter that appends an auto-fix preview to any failing test whose
 * file name matches a date-fns / pin pattern. Triggers on demand only — when
 * the suite passes there is zero overhead beyond hooking the reporter.
 *
 * Wire-up (in vitest.config.ts):
 *
 *   import DateFnsFixPreviewReporter from "./src/test/reporters/datefnsFixPreview";
 *   ...
 *   reporters: ["default", new DateFnsFixPreviewReporter()],
 *
 * Why a reporter (not a global teardown / afterAll): we need the result of
 * each test file to decide whether to run the (slowish) bun install preview.
 * Running it once per failing FILE — not per failing assertion — keeps the
 * cost bounded even when many locales fail at once.
 */
import type { Reporter, File, Task } from "vitest";
// The fix-preview lib is plain ESM JS (no declarations). Cast through `any`
// at the import boundary; the local `FixPreview`/`Builder` types below pin
// down the surface we actually consume so the reporter body stays typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fixPreviewMod = (await import(
  /* @vite-ignore */ "../../../scripts/lib/datefns-fix-preview.mjs"
)) as any;
const buildFixPreview: (opts?: {
  rootDir?: string;
  packages?: string[];
  timeoutMs?: number;
}) => FixPreview = fixPreviewMod.buildFixPreview;
const renderFixPreview: (
  preview: FixPreview,
  opts?: { color?: boolean; maxDiffLines?: number },
) => string = fixPreviewMod.renderFixPreview;

interface FixPreview {
  command: string;
  packages: Array<{
    name: string;
    installed: string | null;
    wouldInstall: string | null;
    declared: string | null;
    status:
      | "unchanged"
      | "would-change"
      | "missing-locally"
      | "would-be-removed"
      | "missing-from-lockfile";
  }>;
  lockfileDiff: string;
  lockfileChanged: boolean;
  warnings: string[];
  elapsedMs: number;
}

const FILE_PATTERN = /(dateFns|datefns)/i;

function collectFailedTasks(tasks: Task[], out: Task[] = []): Task[] {
  for (const t of tasks) {
    if (t.result?.state === "fail") out.push(t);
    if ("tasks" in t && Array.isArray((t as File).tasks)) {
      collectFailedTasks((t as File).tasks, out);
    }
  }
  return out;
}

export default class DateFnsFixPreviewReporter implements Reporter {
  private rendered = false;

  onFinished(files: File[] = []) {
    if (this.rendered) return;
    const failedFiles = files.filter(
      (f) => FILE_PATTERN.test(f.name) && f.result?.state === "fail",
    );
    if (failedFiles.length === 0) return;

    this.rendered = true;
    const failedTasks = failedFiles.flatMap((f) => collectFailedTasks(f.tasks));
    const summary = failedTasks
      .slice(0, 8)
      .map((t) => `    • ${t.file?.name ?? "?"} › ${t.name}`)
      .join("\n");

    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        "════════════════════════════════════════════════════════════════",
        " ❌ date-fns related tests failed — generating auto-fix preview",
        "════════════════════════════════════════════════════════════════",
        ` Failed files: ${failedFiles.length}`,
        ` Failed tests: ${failedTasks.length}${
          failedTasks.length > 8 ? " (showing first 8)" : ""
        }`,
        summary,
        "",
      ].join("\n"),
    );

    try {
      const preview = buildFixPreview({ rootDir: process.cwd() });
      // eslint-disable-next-line no-console
      console.log(renderFixPreview(preview, { color: !!process.stdout.isTTY }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(
        `\n  ⚠ Could not generate auto-fix preview: ${
          err instanceof Error ? err.message : String(err)
        }\n  Run manually: node scripts/datefns-fix-preview.mjs\n`,
      );
    }
  }
}
