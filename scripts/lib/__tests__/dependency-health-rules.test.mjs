/**
 * Tests for the configurable barrel-rules loader.
 *
 * Behavior under test:
 *   • parseRules — schema validation + helpful error messages
 *   • loadRules — extend vs replace semantics, fingerprint stability,
 *     missing-file fallback to DEFAULT_RULES
 *   • End-to-end: classifySpecifier picks up user-defined rules
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseRules, loadRules, RULES_VERSION } from "../dependency-health-rules.mjs";
import { classifySpecifier, DEFAULT_RULES } from "../tree-shaking-risk.mjs";

let tmp;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "dep-rules-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeRules(payload) {
  const p = join(tmp, ".dependency-health-rules.json");
  writeFileSync(p, JSON.stringify(payload), "utf8");
  return p;
}

describe("parseRules — schema validation", () => {
  it("rejects non-object root", () => {
    expect(() => parseRules(null)).toThrow(/root must be an object/);
    expect(() => parseRules("nope")).toThrow(/root must be an object/);
  });

  it("rejects wrong version", () => {
    expect(() => parseRules({ version: 999, rules: [] })).toThrow(/unsupported version/);
  });

  it("rejects unknown mode", () => {
    expect(() => parseRules({ version: 1, mode: "merge", rules: [] })).toThrow(
      /'mode' must be "extend" or "replace"/,
    );
  });

  it("defaults mode to 'extend' when omitted", () => {
    expect(parseRules({ version: 1, rules: [] }).mode).toBe("extend");
  });

  it("rejects rules without package or barrelPaths", () => {
    expect(() => parseRules({ version: 1, rules: [{ barrelPaths: ["x"] }] })).toThrow(
      /package is required/,
    );
    expect(() => parseRules({ version: 1, rules: [{ package: "x" }] })).toThrow(
      /barrelPaths must be a non-empty array/,
    );
    expect(() =>
      parseRules({ version: 1, rules: [{ package: "x", barrelPaths: [] }] }),
    ).toThrow(/barrelPaths must be a non-empty array/);
  });

  it("rejects barrelPaths not owned by the package (silent-dead-rule guard)", () => {
    expect(() =>
      parseRules({
        version: 1,
        rules: [{ package: "lodash", barrelPaths: ["lodash-es"] }],
      }),
    ).toThrow(/not owned by package "lodash"/);
  });

  it("accepts barrel paths that equal the package or start with package + '/'", () => {
    const out = parseRules({
      version: 1,
      rules: [{ package: "rxjs", barrelPaths: ["rxjs", "rxjs/operators"] }],
    });
    expect(out.rules[0].barrelPaths).toEqual(["rxjs", "rxjs/operators"]);
  });

  it("compiles safeSubpathPattern into a RegExp", () => {
    const out = parseRules({
      version: 1,
      rules: [
        { package: "lodash", barrelPaths: ["lodash"], safeSubpathPattern: "^lodash/[^/]+$" },
      ],
    });
    expect(out.rules[0].safeSubpathRe).toBeInstanceOf(RegExp);
    expect(out.rules[0].safeSubpathRe.test("lodash/get")).toBe(true);
    expect(out.rules[0].safeSubpathRe.test("lodash/fp/get")).toBe(false);
  });

  it("rejects invalid regex syntax in safeSubpathPattern", () => {
    expect(() =>
      parseRules({
        version: 1,
        rules: [{ package: "x", barrelPaths: ["x"], safeSubpathPattern: "[unterminated" }],
      }),
    ).toThrow(/not a valid regex/);
  });
});

describe("loadRules — file resolution + mode semantics", () => {
  it("falls back to DEFAULT_RULES when no file exists", () => {
    const out = loadRules(join(tmp, "missing.json"));
    expect(out.source).toBe("default");
    expect(out.rules).toBe(DEFAULT_RULES);
    expect(out.fingerprint).toBe("default");
  });

  it("throws on invalid JSON with a clear message", () => {
    const p = join(tmp, ".dependency-health-rules.json");
    writeFileSync(p, "{ not json", "utf8");
    expect(() => loadRules(p)).toThrow(/invalid JSON/);
  });

  it("mode=extend appends user rules and keeps date-fns flagged", () => {
    const p = writeRules({
      version: 1,
      mode: "extend",
      rules: [{ package: "lodash", barrelPaths: ["lodash"] }],
    });
    const { rules, mode } = loadRules(p);
    expect(mode).toBe("extend");
    // Both date-fns AND lodash present
    expect(rules.some((r) => r.package === "date-fns")).toBe(true);
    expect(rules.some((r) => r.package === "lodash")).toBe(true);
    // End-to-end: classifier flags both
    expect(classifySpecifier("date-fns", rules)).toBe("barrel");
    expect(classifySpecifier("lodash", rules)).toBe("barrel");
  });

  it("mode=replace drops the defaults entirely", () => {
    const p = writeRules({
      version: 1,
      mode: "replace",
      rules: [{ package: "lodash", barrelPaths: ["lodash"] }],
    });
    const { rules } = loadRules(p);
    expect(rules.some((r) => r.package === "date-fns")).toBe(false);
    expect(classifySpecifier("date-fns", rules)).toBe("unrelated");
    expect(classifySpecifier("lodash", rules)).toBe("barrel");
  });

  it("user rule overrides a default rule for the same package", () => {
    // User declares date-fns/format as ALSO barrel (contrived but valid).
    const p = writeRules({
      version: 1,
      mode: "extend",
      rules: [
        {
          package: "date-fns",
          barrelPaths: ["date-fns", "date-fns/locale", "date-fns/format"],
        },
      ],
    });
    const { rules } = loadRules(p);
    // Only ONE date-fns rule (user's), not duplicated.
    expect(rules.filter((r) => r.package === "date-fns")).toHaveLength(1);
    expect(classifySpecifier("date-fns/format", rules)).toBe("barrel");
    // date-fns/parseISO has no rule → unrelated default in user rule
    // (no safeSubpathRe), but ruleOwnsSpecifier matches so → "safe".
    expect(classifySpecifier("date-fns/parseISO", rules)).toBe("safe");
  });

  it("fingerprint changes when rules change (cache-invalidation contract)", () => {
    const a = loadRules(
      writeRules({ version: 1, rules: [{ package: "lodash", barrelPaths: ["lodash"] }] }),
    ).fingerprint;
    rmSync(tmp, { recursive: true, force: true });
    tmp = mkdtempSync(join(tmpdir(), "dep-rules-"));
    const b = loadRules(
      writeRules({
        version: 1,
        rules: [{ package: "lodash", barrelPaths: ["lodash", "lodash/fp"] }],
      }),
    ).fingerprint;
    expect(a).not.toBe(b);
  });

  it("end-to-end: a custom rxjs rule flags rxjs and rxjs/operators only", () => {
    const p = writeRules({
      version: 1,
      mode: "extend",
      rules: [
        {
          package: "rxjs",
          barrelPaths: ["rxjs", "rxjs/operators"],
          safeSubpathPattern: "^rxjs/(?!operators$)[^/]+$",
        },
      ],
    });
    const { rules } = loadRules(p);
    expect(classifySpecifier("rxjs", rules)).toBe("barrel");
    expect(classifySpecifier("rxjs/operators", rules)).toBe("barrel");
    expect(classifySpecifier("rxjs/of", rules)).toBe("safe");
    expect(classifySpecifier("rxjs-compat", rules)).toBe("unrelated");
  });
});

describe("RULES_VERSION", () => {
  it("is 1 (bump only with a migration plan)", () => {
    expect(RULES_VERSION).toBe(1);
  });
});
