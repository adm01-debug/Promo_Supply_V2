/**
 * Cobre a resolucao de destinatarios do escalate-solicitacao: o fan-out errado
 * entrega alerta silencioso para quem nao resolve nada, e o fan-out amplo
 * vaza notificacao entre tenants.
 *   deno test supabase/functions/escalate-solicitacao/recipients.test.ts
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildMensagem,
  buildTitulo,
  diasDeEspera,
  resolveRecipients,
} from "./recipients.ts";

type Row = Record<string, unknown>;

/** Cliente falso: tabela -> linhas; respeita `.in` e `.eq` dos filtros usados. */
function fakeAdmin(tables: Record<string, Row[]>, compradorId: string | null = null) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      // deno-lint-ignore no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          filters[col] = val;
          return builder;
        },
        in: (col: string, vals: unknown[]) => {
          filters[col] = vals;
          return builder;
        },
        not: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === "pedidos") {
            return Promise.resolve({
              data: compradorId ? { comprador_id: compradorId } : null,
              error: null,
            });
          }
          const rows = tables[table] ?? [];
          const hit = rows.find((r) =>
            Object.entries(filters).every(([k, v]) => r[k] === v)
          ) ?? null;
          return Promise.resolve({ data: hit, error: null });
        },
        then: (resolve: (v: unknown) => unknown) => {
          const rows = (tables[table] ?? []).filter((r) =>
            Object.entries(filters).every(([k, v]) =>
              Array.isArray(v) ? v.includes(r[k]) : r[k] === v
            )
          );
          return resolve({ data: rows, error: null });
        },
      };
      return builder;
    },
  };
}

const TENANT = "11111111-1111-1111-1111-111111111111";
const OUTRO_TENANT = "22222222-2222-2222-2222-222222222222";
const ACTOR = "actor-1";

function gestores() {
  return {
    user_roles: [
      { user_id: "admin-1", role: "admin" },
      { user_id: "coord-1", role: "coordinator" },
      { user_id: "buyer-1", role: "buyer" },
      { user_id: "admin-outro-tenant", role: "admin" },
    ],
    profiles: [
      { user_id: "admin-1", tenant_id: TENANT },
      { user_id: "coord-1", tenant_id: TENANT },
      { user_id: "buyer-1", tenant_id: TENANT },
      { user_id: "admin-outro-tenant", tenant_id: OUTRO_TENANT },
    ],
  };
}

Deno.test("gerencia: notifica admin e coordinator do tenant, sem vazar outro tenant", async () => {
  const admin = fakeAdmin(gestores());
  const { destinatarios } = await resolveRecipients(admin, {
    target: "gerencia",
    solicitacaoId: "sol-1",
    tenantId: TENANT,
    actorId: ACTOR,
  });
  assertEquals(destinatarios.sort(), ["admin-1", "coord-1"]);
});

Deno.test("gerencia: o proprio autor da acao nao recebe a notificacao", async () => {
  const admin = fakeAdmin(gestores());
  const { destinatarios } = await resolveRecipients(admin, {
    target: "gerencia",
    solicitacaoId: "sol-1",
    tenantId: TENANT,
    actorId: "admin-1",
  });
  assertEquals(destinatarios, ["coord-1"]);
});

Deno.test("comprador: usa o comprador do pedido quando existe", async () => {
  const admin = fakeAdmin(gestores(), "buyer-do-pedido");
  const { destinatarios, compradorResolvido } = await resolveRecipients(admin, {
    target: "comprador",
    solicitacaoId: "sol-1",
    tenantId: TENANT,
    actorId: ACTOR,
  });
  assertEquals(compradorResolvido, "buyer-do-pedido");
  assertEquals(destinatarios, ["buyer-do-pedido"]);
});

Deno.test("comprador: sem pedido cai nos buyers do tenant, ignorando outro tenant", async () => {
  const tables = gestores();
  tables.profiles.push({ user_id: "buyer-outro", tenant_id: OUTRO_TENANT });
  tables.user_roles.push({ user_id: "buyer-outro", role: "buyer" });
  const admin = fakeAdmin(tables, null);
  const { destinatarios, compradorResolvido } = await resolveRecipients(admin, {
    target: "comprador",
    solicitacaoId: "sol-1",
    tenantId: TENANT,
    actorId: ACTOR,
  });
  assertEquals(compradorResolvido, null);
  assertEquals(destinatarios, ["buyer-1"]);
});

Deno.test("comprador: sem tenant de referencia nao amplia escopo", async () => {
  const admin = fakeAdmin(gestores(), null);
  const { destinatarios } = await resolveRecipients(admin, {
    target: "comprador",
    solicitacaoId: "sol-1",
    tenantId: null,
    actorId: ACTOR,
  });
  assertEquals(destinatarios, []);
});

Deno.test("texto e assunto mudam por alvo", () => {
  assertEquals(buildTitulo("gerencia", "042"), "Escalonamento: solicitacao #042");
  assertEquals(buildTitulo("comprador", "042"), "Acao necessaria: solicitacao #042");
  assertEquals(
    buildMensagem("gerencia", "Compra de EPI", 3),
    'A solicitacao "Compra de EPI" esta aberta ha 3 dia(s) e foi escalada para a gerencia.',
  );
  assertEquals(buildMensagem("gerencia", "X", 3, "  motivo  "), "motivo");
});

Deno.test("diasDeEspera arredonda para cima e nunca fica negativo", () => {
  const agora = Date.parse("2026-11-23T12:00:00Z");
  assertEquals(diasDeEspera("2026-11-23T11:00:00Z", agora), 1);
  assertEquals(diasDeEspera("2026-11-21T12:00:00Z", agora), 2);
  assertEquals(diasDeEspera("2026-11-25T12:00:00Z", agora), 0);
});