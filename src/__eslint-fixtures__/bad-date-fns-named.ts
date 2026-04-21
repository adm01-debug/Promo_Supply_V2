// TEMPORARY FIXTURE — run via `bash eslint-rules/__fixtures__/run-import-validity.sh`.
// EXPECTED to fail `tsc` (TS2305) because `react` resolves but does NOT export
// a named member called `notARealReactExport`.
//
// We use `react` (not date-fns) here because `eslint-plugin-import`'s `named`
// rule does NOT type-check TypeScript files by default — it only inspects ES
// module export syntax. The runner therefore enforces this fixture via tsc,
// which reads the .d.ts shape and reports TS2305 ("has no exported member").
//
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
//
// Expected tsc output (excerpt):
//   src/__eslint-fixtures__/bad-date-fns-named.ts(NN,N): error TS2305:
//     Module '"react"' has no exported member 'notARealReactExport'.
import { notARealReactExport } from "react";

export const _broken = notARealReactExport;
