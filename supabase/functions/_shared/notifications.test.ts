/**
 * Regressão: `insertNotification`/`insertNotificationsBatch` resolviam o
 * `tenant_id` por `profiles.id` (PK própria) em vez de `profiles.user_id`.
 * Em prod só 8 dos 12 perfis têm `id = user_id`, então o alerta era descartado
 * como `sem_tenant` para os demais. Rodar:
 *   deno test supabase/functions/_shared/notifications.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { insertNotification, insertNotificationsBatch } from "./notifications.ts";

type Row = Record<string, unknown>;

/** Cliente falso que registra as colunas usadas em `.eq`/`.in` e o insert final. */
function fakeClient(profiles: Row[], insertError: unknown = null) {
  const calls: { table: string; eq?: [string, unknown]; in?: [string, unknown[]] }[] = [];
  const inserted: Row[] = [];
  const client = {
    from(table: string) {
      const call: { table: string; eq?: [string, unknown]; in?: [string, unknown[]] } = { table };
      calls.push(call);
      const builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          call.eq = [col, val];
          return builder;
        },
        in: (col: string, val: unknown[]) => {
          call.in = [col, val];
          return builder;
        },
        limit: () => builder,
        gte: () => builder,
        maybeSingle: () => {
          const [col, val] = call.eq ?? ["", ""];
          const hit = profiles.find((p) => p[col] === val) ?? null;
          return Promise.resolve({ data: hit, error: null });
        },
        insert: (rows: Row | Row[]) => {
          const list = Array.isArray(rows) ? rows : [rows];
          inserted.push(...list);
          return Promise.resolve({ error: insertError });
        },
        then: (resolve: (v: unknown) => unknown) => resolve({ data: profiles, error: null }),
      };
      return builder;
    },
  };
  return { client, calls, inserted };
}

const perfis: Row[] = [
  // id != user_id (caso real que quebrava)
  { user_id: "u-sem-tenant-direto", tenant_id: "tenant-1" },
];

Deno.test("insertNotification resolve tenant por user_id, nao pela PK", async () => {
  const { client, calls, inserted } = fakeClient(perfis);
  const res = await insertNotification(client as never, {
    user_id: "u-sem-tenant-direto",
    type: "sla_overdue",
    title: "t",
    message: "m",
  });
  assertEquals(res.ok, true);
  const lookup = calls.find((c) => c.table === "profiles");
  assertEquals(lookup?.eq, ["user_id", "u-sem-tenant-direto"]);
  assertEquals(inserted[0].tenant_id, "tenant-1");
});

Deno.test("insertNotification nao consulta profiles quando tenant_id vem na origem", async () => {
  const { client, calls, inserted } = fakeClient(perfis);
  const res = await insertNotification(client as never, {
    user_id: "u-qualquer",
    tenant_id: "tenant-origem",
    type: "sla_overdue",
    title: "t",
    message: "m",
  });
  assertEquals(res.ok, true);
  assertEquals(calls.some((c) => c.table === "profiles"), false);
  assertEquals(inserted[0].tenant_id, "tenant-origem");
});

Deno.test("insertNotification devolve sem_tenant quando o perfil nao tem tenant", async () => {
  const { client } = fakeClient([{ user_id: "u-orfao", tenant_id: null }]);
  const res = await insertNotification(client as never, {
    user_id: "u-orfao",
    type: "sla_overdue",
    title: "t",
    message: "m",
  });
  assertEquals(res.ok, false);
  assertEquals(res.skipped, "sem_tenant");
});

Deno.test("insertNotificationsBatch resolve tenants por user_id", async () => {
  const { client, calls, inserted } = fakeClient([
    { user_id: "u1", tenant_id: "tenant-1" },
    { user_id: "u2", tenant_id: "tenant-2" },
    { user_id: "u3", tenant_id: null },
  ]);
  const r = await insertNotificationsBatch(client as never, [
    { user_id: "u1", type: "system_alert", title: "a", message: "m" },
    { user_id: "u2", type: "system_alert", title: "b", message: "m" },
    { user_id: "u3", type: "system_alert", title: "c", message: "m" },
  ]);
  assertEquals(r.inserted, 2);
  assertEquals(r.skipped, 1);
  const lookup = calls.find((c) => c.table === "profiles");
  assertEquals(lookup?.in, ["user_id", ["u1", "u2", "u3"]]);
  assertEquals(inserted.map((i) => i.tenant_id), ["tenant-1", "tenant-2"]);
});