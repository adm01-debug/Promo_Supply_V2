// TEMPORARY FIXTURE — run via `bash eslint-rules/__fixtures__/run-import-validity.sh`.
// EXPECTED to fail `import/named` because `react` resolves but does NOT export
// a named member called `notARealReactExport`.
//
// We use `react` (not date-fns) here because `eslint-plugin-import`'s `named`
// rule requires the resolver to know the module's named exports. date-fns
// subpaths use complex export maps that the resolver can't always introspect,
// so a stable npm package with a typed named-export shape (react) gives a
// reliable assertion that `import/named` is wired up correctly.
//
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
//
// Expected ESLint output (excerpt):
//   error  notARealReactExport not found in 'react'  import/named
//
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error intentional broken import for fixture validation
import { notARealReactExport } from "react";

export const _broken = notARealReactExport;
