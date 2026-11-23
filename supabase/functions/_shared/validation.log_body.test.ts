// Teste do que o log recebe quando validateBody recusa o corpo.

import { assertRejects, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { z } from "https://esm.sh/zod@3.22.4";
import { validateBody } from "./validation.ts";

type Captura = { erro?: Record<string, unknown>; aviso?: Record<string, unknown> };

function loggerEspiao(cap: Captura) {
  return {
    error: (_m: string, ctx?: Record<string, unknown>) => { cap.erro = ctx; },
    warn: (_m: string, ctx?: Record<string, unknown>) => { cap.aviso = ctx; },
    info: () => {},
    debug: () => {},
    getRequestId: () => "req_test",
  } as never;
}

Deno.test("validateBody: corpo invalido nao vaza os valores para o log", async () => {
  const cap: Captura = {};
  const req = new Request("http://x/", {
    method: "POST",
    body: JSON.stringify({ password: "s3cr3t", cpf: "123.456.789-00" }),
  });

  await assertRejects(() => validateBody(req, z.object({ nome: z.string() }), loggerEspiao(cap)));

  const aviso = cap.aviso!;
  assertEquals("body" in aviso, false);
  assertEquals(aviso.bodyKeys, ["password", "cpf"]);
  assertEquals(JSON.stringify(aviso).includes("s3cr3t"), false);
  assertEquals(JSON.stringify(aviso).includes("123.456.789-00"), false);
});

Deno.test("validateBody: JSON malformado loga a causa e mantem a mensagem", async () => {
  const cap: Captura = {};
  const req = new Request("http://x/", { method: "POST", body: "{nao-e-json" });

  const erro = await assertRejects(() => validateBody(req, z.object({}), loggerEspiao(cap)));
  assertEquals((erro as Error).message, "Invalid JSON body");
  assertEquals(typeof cap.erro?.error, "string");
  assertEquals(String(cap.erro!.error).length > 0, true);
});