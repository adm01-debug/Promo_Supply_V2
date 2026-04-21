
## Plan: Add date-fns smoke test

### Goal
Catch any regression where a `date-fns` function we rely on stops being importable (e.g. accidental upgrade to v4 + barrel import, or a missing subpath).

### File
Create `src/test/dateFns.smoke.test.ts`.

### What it does
Imports every `date-fns` function and locale currently used across the codebase via the **subpath** form (the pattern we standardized on), then exercises each one with a trivial call to confirm it's a real function. If any export goes missing, the test fails at import time — before CI/build.

### Coverage (derived from current `src/` usage)
Functions: `format`, `formatDistanceToNow`, `parseISO`, `differenceInDays`, `differenceInHours`, `isPast`, `isToday`, `isSameDay`, `isSameMonth`, `startOfMonth`, `endOfMonth`, `startOfWeek`, `eachDayOfInterval`, `addDays`, `addMonths`, `addWeeks`, `subDays`, `subMonths`.
Locale: `ptBR` from `date-fns/locale/pt-BR`.

### Test shape
```ts
import { describe, it, expect } from "vitest";
import { format } from "date-fns/format";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
// ...one import per function
import { ptBR } from "date-fns/locale/pt-BR";

describe("date-fns subpath imports smoke test", () => {
  const ref = new Date("2025-01-15T12:00:00Z");

  it("exports are all callable functions", () => {
    for (const fn of [format, formatDistanceToNow, parseISO, /* ... */]) {
      expect(typeof fn).toBe("function");
    }
  });

  it("format works with ptBR locale", () => {
    expect(format(ref, "dd/MM/yyyy", { locale: ptBR })).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("date math helpers return Dates / numbers", () => {
    expect(addDays(ref, 1)).toBeInstanceOf(Date);
    expect(differenceInDays(addDays(ref, 5), ref)).toBe(5);
  });
});
```

### Notes
- No source/code changes. Single new test file (~60 lines).
- Runs under existing Vitest config — no config edits required.
- Will fail loudly if `date-fns` is ever upgraded to a version that drops a subpath we use.
