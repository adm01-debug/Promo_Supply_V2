// TEMPORARY FIXTURE — run via `bash eslint-rules/__fixtures__/run-import-validity.sh`.
// EXPECTED to fail `import/no-unresolved` because the locale subpath is wrong
// (real subpath would be `date-fns/locale/pt-BR`, not `date-fns/locale/pt-INVALID`).
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
//
// Expected ESLint output (excerpt):
//   error  Unable to resolve path to module 'date-fns/locale/pt-INVALID'  import/no-unresolved
//
// @ts-nocheck
import { ptINVALID } from "date-fns/locale/pt-INVALID";

export const _broken = ptINVALID;
