// Pins the exact format of TypeScript's TS2307 ("Cannot find module")
// diagnostic for a wrong date-fns subpath. Complements the CI gate at
// scripts/verify-ts2307-clarity.mjs by catching format regressions
// during local `bun run test` — long before they reach CI — and by
// asserting the precise file/line/column/module structure with one
// regex, not just substring presence.
//
// Why this matters: our in-app docs ("Sonda TS2307" in the Dependency
// Health panel) instruct contributors to read TS2307 output the
// canonical way (file, line, column, quoted module name). If a future
// tsc version reformats that line — e.g. drops the parens, swaps the
// quotes, or moves the module name — our docs would silently mislead
// users. This test fails loudly in that scenario.
//
// Strategy: write a hermetic .ts probe in /tmp (so a hard test crash
// never pollutes the repo, unlike .ts2307-probe/ at the project root),
// run `bunx tsc --noEmit --pretty false` against an inline tsconfig,
// and parse the FIRST TS2307 line into structured fields.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

// Bogus subpath — must NOT exist under date-fns/. Distinct from the one
// used by scripts/verify-ts2307-clarity.mjs so the two artifacts don't
// collide if both run concurrently.
const BAD_SPECIFIER = "date-fns/__unit_ts2307_format_probe__";

// `<file>(<line>,<col>): error TS2307: Cannot find module '<spec>' or its corresponding type declarations.`
// Capture groups: 1=file path, 2=line, 3=col, 4=module specifier.
// The trailing message phrase is intentionally NOT captured but is
// asserted separately so a one-word tsc copy change still fails this
// test (vs. silently passing a looser regex).
const TS2307_RE =
  /^(.+?)\((\d+),(\d+)\):\s+error\s+TS2307:\s+Cannot find module\s+'([^']+)'/m;

let probeDir;
let probeFile;
let tsconfigFile;
let tscOutput;

beforeAll(() => {
  probeDir = mkdtempSync(join(tmpdir(), "ts2307-fmt-"));
  probeFile = join(probeDir, "probe.ts");
  tsconfigFile = join(probeDir, "tsconfig.probe.json");

  // Two-line probe so we can assert the source frame points at line 2,
  // column past `from "`. Keeps the regression check sharp.
  writeFileSync(
    probeFile,
    `// auto-generated probe — do not edit\n` +
      `import { format } from "${BAD_SPECIFIER}";\n` +
      `export const _ = format;\n`,
    "utf8",
  );
  writeFileSync(
    tsconfigFile,
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
        include: ["probe.ts"],
      },
      null,
      2,
    ),
    "utf8",
  );

  // `--pretty false` → stable, ASCII-only, line-oriented output across
  // tsc versions. `cwd: probeDir` so the path tsc prints is just
  // `probe.ts`, making the file-name assertion deterministic across
  // CI runners and developer machines (no /Users/... or /home/runner/...
  // prefixes leaking into the regex match).
  const r = spawnSync(
    "bunx",
    ["tsc", "--noEmit", "--pretty", "false", "-p", "tsconfig.probe.json"],
    { cwd: probeDir, encoding: "utf8" },
  );
  tscOutput = `${r.stdout || ""}${r.stderr || ""}`;
});

afterAll(() => {
  if (probeDir && existsSync(probeDir)) {
    rmSync(probeDir, { recursive: true, force: true });
  }
});

describe("TS2307 diagnostic format (wrong date-fns subpath)", () => {
  it("emits at least one TS2307 line", () => {
    expect(tscOutput).toMatch(/TS2307/);
  });

  it("matches the canonical `file(line,col): error TS2307: Cannot find module '...'` shape", () => {
    const m = tscOutput.match(TS2307_RE);
    expect(
      m,
      `TS2307 line did not match canonical format. Full tsc output:\n${tscOutput}`,
    ).not.toBeNull();
  });

  it("captures the exact bad module specifier", () => {
    const m = tscOutput.match(TS2307_RE);
    expect(m?.[4]).toBe(BAD_SPECIFIER);
  });

  it("captures the source file as plain `probe.ts` (no absolute path leaking)", () => {
    const m = tscOutput.match(TS2307_RE);
    expect(m?.[1]).toBe("probe.ts");
  });

  it("points to line 2 (the import statement), with a positive column", () => {
    const m = tscOutput.match(TS2307_RE);
    expect(m?.[2]).toBe("2");
    expect(Number(m?.[3])).toBeGreaterThan(0);
  });

  it("includes the `or its corresponding type declarations` tail (catches one-word tsc rewording)", () => {
    expect(tscOutput).toMatch(
      /Cannot find module '[^']+' or its corresponding type declarations\./,
    );
  });
});
