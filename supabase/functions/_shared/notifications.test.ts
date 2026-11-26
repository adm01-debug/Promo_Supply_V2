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
/**
 * EDG-07: `send-push-notification` estava completa e sem chamador. Estes testes
 * fixam o fio: notificacao HIGH/CRITICAL com inscricao ativa dispara a edge, e
 * nada mais dispara (prioridade baixa, preferencia desligada, sem inscricao e
 * notificacao que ja veio de um push nao podem virar laco).
 */
function fakePushClient(opts: { prefs?: Row | null; subscricoes?: Row[]; insertError?: unknown }) {
  const inserted: Row[] = [];
  const client = {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        limit: () => builder,
        gte: () => builder,
        maybeSingle: () =>
          Promise.resolve({
            data: table === "notification_preferences" ? opts.prefs ?? null : null,
            error: null,
          }),
        insert: (rows: Row | Row[]) => {
          const list = Array.isArray(rows) ? rows : [rows];
          inserted.push(...list);
          return Promise.resolve({ error: opts.insertError ?? null });
        },
        then: (resolve: (v: unknown) => unknown) =>
          resolve({
            data: table === "push_subscriptions" ? opts.subscricoes ?? [] : [],
            error: null,
          }),
      };
      return builder;
    },
  };
  return { client, inserted };
}

async function comFetchStub(fn: (chamadas: Array<{ url: string; body: Row }>) => Promise<void>) {
  const chamadas: Array<{ url: string; body: Row }> = [];
  const original = globalThis.fetch;
  Deno.env.set("SUPABASE_URL", "https://projeto.supabase.co");
  Deno.env.set("CRON_SECRET", "segredo-de-teste");
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    chamadas.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) as Row });
    return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
  }) as typeof fetch;
  try {
    await fn(chamadas);
  } finally {
    globalThis.fetch = original;
  }
}

const baseNotif = {
  user_id: "u-push",
  tenant_id: "tenant-1",
  type: "sla_overdue",
  title: "SLA estourado",
  message: "Pedido atrasado",
};

Deno.test("EDG-07: notificacao high com inscricao dispara a edge sem duplicar o in-app", async () => {
  const { client, inserted } = fakePushClient({ prefs: null, subscricoes: [{ id: "s1" }] });
  await comFetchStub(async (chamadas) => {
    const res = await insertNotification(client as never, { ...baseNotif, priority: "high" });
    assertEquals(res.ok, true);
    assertEquals(chamadas.length, 1);
    assertEquals(chamadas[0].url.endsWith("/functions/v1/send-push-notification"), true);
    assertEquals(chamadas[0].body.user_ids, ["u-push"]);
    assertEquals(chamadas[0].body.skip_in_app, true);
    assertEquals(chamadas[0].body.priority, "high");
    assertEquals(inserted.length, 1);
  });
});

Deno.test("EDG-07: prioridade medium nao dispara push", async () => {
  const { client } = fakePushClient({ prefs: null, subscricoes: [{ id: "s1" }] });
  await comFetchStub(async (chamadas) => {
    await insertNotification(client as never, { ...baseNotif, priority: "medium" });
    assertEquals(chamadas.length, 0);
  });
});

Deno.test("EDG-07: preferencia push_notifications=false respeitada", async () => {
  const { client } = fakePushClient({ prefs: { push_notifications: false }, subscricoes: [{ id: "s1" }] });
  await comFetchStub(async (chamadas) => {
    await insertNotification(client as never, { ...baseNotif, priority: "critical" });
    assertEquals(chamadas.length, 0);
  });
});

Deno.test("EDG-07: usuario sem inscricao nao gera chamada HTTP", async () => {
  const { client } = fakePushClient({ prefs: null, subscricoes: [] });
  await comFetchStub(async (chamadas) => {
    await insertNotification(client as never, { ...baseNotif, priority: "critical" });
    assertEquals(chamadas.length, 0);
  });
});

Deno.test("EDG-07: notificacao criada por push nao redispara (sem laco)", async () => {
  const { client } = fakePushClient({ prefs: null, subscricoes: [{ id: "s1" }] });
  await comFetchStub(async (chamadas) => {
    await insertNotification(client as never, { ...baseNotif, priority: "critical", sent_push: true });
    assertEquals(chamadas.length, 0);
  });
});