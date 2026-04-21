// TEMPORARY FIXTURE — run via `bash eslint-rules/__fixtures__/run-import-validity.sh`.
// EXPECTED to fail `import/named` because `date-fns/format` resolves but
// does NOT export a member named `notARealExport`.
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
//
// Expected ESLint output (excerpt):
//   error  notARealExport not found in 'date-fns/format'  import/named
//
// @ts-nocheck
import { notARealExport } from "date-fns/format";

export const _broken = notARealExport;
