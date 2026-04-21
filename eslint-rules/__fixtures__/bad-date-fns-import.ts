// Intentional violation — used by eslint-rules/__tests__/date-fns-subpath.test.ts
// to prove `local/date-fns-subpath` reports on barrel imports.
// DO NOT FIX. DO NOT IMPORT FROM RUNTIME CODE.
// eslint-disable-next-line
import { format } from "date-fns";
// eslint-disable-next-line
import { ptBR } from "date-fns/locale";

export const _sample = format(new Date(), "yyyy-MM-dd", { locale: ptBR });
