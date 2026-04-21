// TEMPORARY FIXTURE — run via `bash eslint-rules/__fixtures__/run-import-validity.sh`.
// EXPECTED to fail `import/no-unresolved` because `date-fns/this-subpath-does-not-exist`
// is not a real subpath in the installed date-fns package.
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
//
// Expected ESLint output (excerpt):
//   error  Unable to resolve path to module 'date-fns/this-subpath-does-not-exist'  import/no-unresolved
//
// @ts-nocheck
import { format } from "date-fns/this-subpath-does-not-exist";

export const _broken = format;
