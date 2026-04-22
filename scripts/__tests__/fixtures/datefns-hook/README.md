# Captured failure-log fixtures for `scripts/hooks/datefns-precommit.sh`

These files are **real-shape captures** of the stdout/stderr the pre-push hook
records to its log files when a step fails. They exist so the failure-mode
detector (`detect_generator_failure_mode` / `detect_tsc_failure_mode`) and the
date-fns import extractor can be regression-tested in CI against the exact
formats Node and `tsc` actually emit — not just hand-written one-liners.

Each fixture has two companion files:

| File                                   | Purpose                                              |
| -------------------------------------- | ---------------------------------------------------- |
| `<name>.log`                           | The captured log content (stdout+stderr combined).   |
| `<name>.expected.json`                 | Expected detector output for the log.                |

`<name>.expected.json` schema:

```json
{
  "step": "generator" | "tsc",     // which detector to invoke
  "exitCode": 1,                   // simulated exit code passed to the detector
  "failureModeContains": ["..."],  // every string MUST appear in the failure-mode line
  "failureModeBucket": "GEN_NODE_CRASH",  // the bucket prefix (before " — ")
  "imports": ["date-fns/locale/pt-BR"]    // expected offending imports (subset OK)
}
```

The driver — `scripts/__tests__/datefns-hook-fixtures.test.sh` — iterates every
`*.expected.json`, sources the hook script to import the shell functions, and
asserts:

1. The chosen bucket prefix matches `failureModeBucket`.
2. Every substring in `failureModeContains` appears in the detector output.
3. The detector output passes the same sanitizer guarantees enforced for the
   live hook (non-empty, ≥8 chars, no `<…>`/`TODO`/`tbd`/ellipsis, contains
   at least one letter).
4. Every import in `imports` is present in `extract_datefns_imports` output.

## Adding a new fixture

1. Capture a real failing log: `bash scripts/hooks/datefns-precommit.sh` then
   copy the contents of `.git/hook-logs/datefns-{generator,tsc-smoke}.log`.
2. Save it as `scripts/__tests__/fixtures/datefns-hook/<name>.log`.
3. Add a sibling `<name>.expected.json` describing the expected detector
   output.
4. Re-run `bun run test:hook:datefns:fixtures`.
