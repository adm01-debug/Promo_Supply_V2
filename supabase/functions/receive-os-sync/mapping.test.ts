import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildSolicitacaoDraft,
  OsPayloadError,
  validateOsPayload,
  type OsPayload,
} from "./mapping.ts";

const OS_ID = "8a1b0f43-2c1e-4d5a-9f77-1c2d3e4f5a6b";

function payload(over: Partial<OsPayload> = {}): OsPayload {
  return {
    os_id: OS_ID,
    os_number: "OS-2026-001",
    produto: "Caneca porcelana 325ml",
    produto_sku: "SKU-1",
    quantidade: 10,
    unidade: "un",
    tecnica: "SublimaÃ§Ã£o - Caneca",
    material: "Porcelana",
    empresa: "Acme LTDA",
    prazo_entrega: "2026-12-01",
    observacoes: "arte aprovada",
    source: "promo_design",
    ...over,
  };
}

const opts = { numero: "SOL-000123", tenantId: "11111111-1111-4111-8111-111111111111" };

// â”€â”€ Valores que o CHECK do banco aceita â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ï¿½ï¿½â”€â”€â”€â”€â”€â”€

Deno.test("tipo material e status pendente: unicos valores aceitos pelo schema vivo", () => {
  const d = buildSolicitacaoDraft(payload(), opts);
  assertEquals(d.tipo, "material");
  assertEquals(d.status, "pendente");
  assertEquals(d.prioridade, "alta");
});

Deno.test("external_ref = os_id: chave de idempotencia da origem", () => {
  const d = buildSolicitacaoDraft(payload(), opts);
  assertEquals(d.external_ref, OS_ID);
});

Deno.test("numero e tenant vem do chamador, nao do payload", () => {
  const d = buildSolicitacaoDraft(
    payload({ tenant_id: "99999999-9999-4999-8999-999999999999" }),
    opts,
  );
  assertEquals(d.numero, "SOL-000123");
  assertEquals(d.tenant_id, opts.tenantId);
});

// â”€â”€ Conteudo da solicitacao â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Deno.test("titulo cita a OS e o produto", () => {
  const d = buildSolicitacaoDraft(payload(), opts);
  assertEquals(d.titulo.includes("OS-2026-001"), true);
  assertEquals(d.titulo.includes("Caneca porcelana 325ml"), true);
});

Deno.test("descricao carrega tecnica, material, SKU e cliente", () => {
  const d = buildSolicitacaoDraft(payload(), opts);
  for (const trecho of ["SublimaÃ§Ã£o - Caneca", "Porcelana", "SKU-1", "Acme LTDA", "10"]) {
    assertEquals(d.descricao.includes(trecho), true, `faltou ${trecho}`);
  }
});

Deno.test("observacoes marcam a origem e o os_id", () => {
  const d = buildSolicitacaoDraft(payload(), opts);
  assertEquals(d.observacoes.includes("Promo Design"), true);
  assertEquals(d.observacoes.includes(OS_ID), true);
});

Deno.test("prazo_entrega vira data_necessidade em YYYY-MM-DD", () => {
  assertEquals(buildSolicitacaoDraft(payload(), opts).data_necessidade, "2026-12-01");
});

Deno.test("prazo invalido vira null em vez de derrubar o insert", () => {
  assertEquals(
    buildSolicitacaoDraft(payload({ prazo_entrega: "amanha" }), opts).data_necessidade,
    null,
  );
  assertEquals(
    buildSolicitacaoDraft(payload({ prazo_entrega: null }), opts).data_necessidade,
    null,
  );
});

// â”€â”€ Normalizacao de quantidade â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Deno.test("quantidade decimal e arredondada e nunca abaixo de 1", () => {
  assertEquals(buildSolicitacaoDraft(payload({ quantidade: 2.6 }), opts).quantidade, 3);
  assertEquals(buildSolicitacaoDraft(payload({ quantidade: 0.2 }), opts).quantidade, 1);
  assertEquals(buildSolicitacaoDraft(payload({ quantidade: "15" }), opts).quantidade, 15);
});

Deno.test("sem unidade assume 'un'", () => {
  assertEquals(buildSolicitacaoDraft(payload({ unidade: null }), opts).unidade, "un");
});

// â”€â”€ Payload invalido => 422, nao 500 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Deno.test("os_id ausente ou nao-UUID e erro de payload", () => {
  assertThrows(() => validateOsPayload(payload({ os_id: undefined })), OsPayloadError);
  assertThrows(() => validateOsPayload(payload({ os_id: "OS-123" })), OsPayloadError);
});

Deno.test("os_number e produto sao obrigatorios", () => {
  assertThrows(() => validateOsPayload(payload({ os_number: "  " })), OsPayloadError);
  assertThrows(() => validateOsPayload(payload({ produto: null })), OsPayloadError);
});

Deno.test("quantidade zero ou negativa e erro de payload", () => {
  assertThrows(() => validateOsPayload(payload({ quantidade: 0 })), OsPayloadError);
  assertThrows(() => validateOsPayload(payload({ quantidade: -3 })), OsPayloadError);
  assertThrows(() => validateOsPayload(payload({ quantidade: "abc" })), OsPayloadError);
});

Deno.test("erro de payload carrega o campo culpado", () => {
  try {
    validateOsPayload(payload({ produto: null }));
    throw new Error("deveria ter lancado");
  } catch (err) {
    assertEquals(err instanceof OsPayloadError, true);
    assertEquals((err as OsPayloadError).field, "produto");
  }
});

// â”€â”€ Texto longo nao estoura o limite da coluna â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Deno.test("campos de texto sao truncados no limite da coluna", () => {
  const d = buildSolicitacaoDraft(
    payload({ produto: "x".repeat(2000), observacoes: "y".repeat(5000) }),
    opts,
  );
  assertEquals(d.titulo.length <= 200, true);
  assertEquals(d.descricao.length <= 4000, true);
  assertEquals(d.observacoes.length <= 2000, true);
});

Deno.test("origem Promo Champions: texto fala de pedido, nao de OS do Design", () => {
  const d = buildSolicitacaoDraft(
    payload({ source: "promo_champions", os_number: "PED-000007" }),
    opts,
  );
  assertEquals(d.titulo.toLowerCase().includes("pedido"), true);
  assertEquals(d.titulo.includes("OS"), false);
  assertEquals(d.descricao.includes("Promo Champions"), true);
  assertEquals(d.descricao.includes("Promo Design"), false);
  assertEquals(d.observacoes.includes("Promo Champions"), true);
  assertEquals(d.external_ref, OS_ID);
});

Deno.test("origem ausente ou desconhecida cai no Promo Design (comportamento anterior)", () => {
  const semSource = buildSolicitacaoDraft(payload({ source: undefined }), opts);
  assertEquals(semSource.descricao.includes("Promo Design"), true);
  assertEquals(semSource.titulo.includes("OS"), true);

  const desconhecida = buildSolicitacaoDraft(payload({ source: "outro_sistema" }), opts);
  assertEquals(desconhecida.descricao.includes("Promo Design"), true);
});
