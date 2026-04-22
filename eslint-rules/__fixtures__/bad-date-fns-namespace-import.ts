// Intentional violation — used by eslint-rules/__tests__/date-fns-subpath.behavior.test.ts
// to prove `local/date-fns-subpath` reports (without autofixing) namespace
// imports, which have no per-subpath equivalent.
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
// eslint-disable-next-line local/date-fns-subpath
import * as dateFns from "date-fns";

export const _sample = dateFns.format(new Date(), "yyyy-MM-dd");
