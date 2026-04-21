// Time-zone guard: ensures deterministic date-fns output across local dev & CI.
// Default expected TZ is "UTC". Override locally with EXPECTED_TZ + TZ env vars:
//   EXPECTED_TZ=America/Sao_Paulo TZ=America/Sao_Paulo bunx vitest run src/test/dateFns.timezone.test.ts
import { describe, it, expect } from "vitest";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

describe("date-fns runtime time zone guard", () => {
  const runtimeTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const expectedTz = process.env.EXPECTED_TZ ?? "UTC";
  const processTz = process.env.TZ ?? "<unset>";

  // eslint-disable-next-line no-console
  console.log(
    `[date-fns tz guard] runtime TZ="${runtimeTz}" expected TZ="${expectedTz}" process.env.TZ="${processTz}"`,
  );

  it("Intl is available and resolves a non-empty time zone", () => {
    expect(typeof Intl).toBe("object");
    expect(typeof runtimeTz).toBe("string");
    expect(runtimeTz.length).toBeGreaterThan(0);
  });

  it(`runtime TZ matches expected ("${expectedTz}")`, () => {
    expect(
      runtimeTz,
      `Runtime TZ "${runtimeTz}" does not match expected "${expectedTz}". ` +
        `Set TZ=${expectedTz} (and optionally EXPECTED_TZ to override) before running tests. ` +
        `process.env.TZ="${processTz}".`,
    ).toBe(expectedTz);
  });

  it("date-fns format output is deterministic under UTC", () => {
    if (expectedTz !== "UTC") {
      // Skip the exact-value check when the contributor opts into a non-UTC zone;
      // the TZ-name check above is the actual guard. Log for visibility.
      // eslint-disable-next-line no-console
      console.log(
        `[date-fns tz guard] skipping UTC value-equality check because EXPECTED_TZ="${expectedTz}".`,
      );
      return;
    }
    const ref = new Date("2025-01-15T23:30:00Z");
    const formatted = format(ref, "yyyy-MM-dd HH:mm", { locale: ptBR });
    expect(
      formatted,
      `Expected UTC-stable output "2025-01-15 23:30" but got "${formatted}". ` +
        `This usually means TZ is not UTC at runtime even though Intl reports UTC — check process.env.TZ.`,
    ).toBe("2025-01-15 23:30");
  });
});
