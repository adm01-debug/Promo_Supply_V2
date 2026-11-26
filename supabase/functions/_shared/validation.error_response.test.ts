// Testes do categorizador de status de errorResponse.
// Regressao coberta: mensagem de auth em portugues ("Nao autorizado") saia como
// 500, o que fazia pedido sem sessao parecer erro de servidor em 3 edges de IA.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { errorResponse } from "./validation.ts";

async function statusDe(message: string): Promise<number> {
  const res = errorResponse(new Error(message));
  await res.body?.cancel();
  return res.status;
}

Deno.test("errorResponse: 'Nao autorizado' sem acento vira 401", async () => {
  assertEquals(await statusDe("Nao autorizado: token ausente"), 401);
});

Deno.test("errorResponse: 'Nao autorizado' com acento vira 401", async () => {
  assertEquals(await statusDe("Não autorizado: token inválido"), 401);
});

Deno.test("errorResponse: unauthorized e sessao invalida virem 401", async () => {
  assertEquals(await statusDe("unauthorized"), 401);
  assertEquals(await statusDe("sessão inválida"), 401);
});

Deno.test("errorResponse: demais categorias seguem iguais", async () => {
  assertEquals(await statusDe("Validation error: campo obrigatorio"), 400);
  assertEquals(await statusDe("isolation violation: tenant"), 403);
  assertEquals(await statusDe("registro not found"), 404);
  assertEquals(await statusDe("falha inesperada ao gravar"), 500);
});