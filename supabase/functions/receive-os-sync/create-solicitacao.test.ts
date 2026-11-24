import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createSolicitacao } from "./create-solicitacao.ts";
import type { OsPayload } from "./mapping.ts";

const OS_ID = "8a1b0f43-2c1e-4d5a-9f77-1c2d3e4f5a6b";
const TENANT = "11111111-1111-4111-8111-111111111111";

function payload(): OsPayload {
  return {
    os_id: OS_ID,
    os_number: "OS-2026-001",
    produto: "Caneca porcelana 325ml",
    quantidade: 10,
    unidade: "un",
    empresa: "Acme LTDA",
    source: "promo_champions",
  };
}

interface InsertResult {
  data?: Record<string, unknown> | null;
  error?: { code?: string; message: string } | null;
}

/**
 * Admin falso: entrega os numeros e as respostas de INSERT na ordem em que foram
 * programados e conta as chamadas, para o teste provar quantas tentativas houve.
 */
function fakeAdmin(roteiro: {
  numeros: string[];
  inserts: InsertResult[];
  existente?: Record<string, unknown> | null;
}) {
  const chamadas = { rpc: 0, insert: 0, existente: 0 };

  const client = {
    rpc: (_nome: string, _args: unknown) => {
      const numero = roteiro.numeros[chamadas.rpc];
      chamadas.rpc += 1;
      return Promise.resolve({ data: numero, error: null });
    },
    from: (_tabela: string) => ({
      insert: (_row: Record<string, unknown>) => ({
        select: (_cols: string) => ({
          single: () => {
            const r = roteiro.inserts[chamadas.insert] ??
              roteiro.inserts[roteiro.inserts.length - 1];
            chamadas.insert += 1;
            return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
          },
        }),
      }),
      select: (_cols: string) => ({
        eq: (_col: string, _valor: unknown) => ({
          maybeSingle: () => {
            chamadas.existente += 1;
            return Promise.resolve({ data: roteiro.existente ?? null, error: null });
          },
        }),
      }),
    }),
  };

  return { client: client as unknown as SupabaseClient, chamadas };
}

const COLISAO_DE_NUMERO: InsertResult = {
  error: {
    code: "23505",
    message: 'duplicate key value violates unique constraint "solicitacoes_numero_key"',
  },
};

Deno.test("numero em colisao e regerado: a entrega nao morre em 500", async () => {
  const { client, chamadas } = fakeAdmin({
    numeros: ["SOL-000123", "SOL-000124"],
    inserts: [COLISAO_DE_NUMERO, { data: { id: "sol-nova", numero: "SOL-000124" } }],
    existente: null,
  });

  const r = await createSolicitacao(client, payload(), TENANT);

  assertEquals(r, { id: "sol-nova", numero: "SOL-000124" });
  assertEquals(chamadas.rpc, 2);
  assertEquals(chamadas.insert, 2);
});

Deno.test("reenvio idempotente devolve a solicitacao existente sem regerar numero", async () => {
  const { client, chamadas } = fakeAdmin({
    numeros: ["SOL-000123"],
    inserts: [COLISAO_DE_NUMERO],
    existente: { id: "sol-existente", numero: "SOL-000123" },
  });

  const r = await createSolicitacao(client, payload(), TENANT);

  assertEquals(r, { id: "sol-existente", numero: "SOL-000123" });
  assertEquals(chamadas.rpc, 1);
  assertEquals(chamadas.insert, 1);
});

Deno.test("erro que nao e colisao sobe na primeira tentativa", async () => {
  const { client, chamadas } = fakeAdmin({
    numeros: ["SOL-000123"],
    inserts: [{ error: { code: "23514", message: "new row violates check constraint" } }],
  });

  await assertRejects(
    () => createSolicitacao(client, payload(), TENANT),
    Error,
    "insert solicitacoes: new row violates check constraint",
  );
  assertEquals(chamadas.rpc, 1);
  assertEquals(chamadas.insert, 1);
});

Deno.test("colisao que nao cede desiste depois de 5 tentativas", async () => {
  const { client, chamadas } = fakeAdmin({
    numeros: ["SOL-1", "SOL-2", "SOL-3", "SOL-4", "SOL-5"],
    inserts: [COLISAO_DE_NUMERO],
    existente: null,
  });

  await assertRejects(
    () => createSolicitacao(client, payload(), TENANT),
    Error,
    "apos 5 tentativas de numero",
  );
  assertEquals(chamadas.rpc, 5);
  assertEquals(chamadas.insert, 5);
});