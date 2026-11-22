import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  faltamCamposObrigatorios,
  normalizeExtraction,
  parseGatewayContent,
  extractionUnavailable,
} from "./extraction.ts";

Deno.test("normaliza numeros e datas do formato brasileiro", () => {
  const inv = normalizeExtraction({
    numero_nf: "000.123.456",
    chave_acesso: "3524 0712 3456 7800 0190 5500 1000 0001 2345 6789 0123",
    data_emissao: "21/11/2026",
    valor_total: "R$ 1.250,50",
    valor_produtos: 1200.0,
    valor_frete: "50,50",
    cnpj_emitente: "12.345.678/0001-90",
  });

  assertEquals(inv.numero_nf, "000123456");
  assertEquals(inv.chave_acesso?.length, 44);
  assertEquals(inv.data_emissao, "2026-11-21");
  assertEquals(inv.valor_total, 1250.5);
  assertEquals(inv.valor_produtos, 1200);
  assertEquals(inv.valor_frete, 50.5);
  assertEquals(inv.cnpj_emitente, "12345678000190");
  assertEquals(inv.campos_ausentes, []);
});

Deno.test("nao inventa campo ausente e reporta no campos_ausentes", () => {
  const inv = normalizeExtraction({ numero_nf: "123", valor_total: 99.9 });

  assertEquals(inv.valor_total, 99.9);
  assertEquals(inv.chave_acesso, null);
  assertEquals(inv.valor_produtos, null);
  assertEquals(inv.fonte, "ia");
  assertEquals(inv.campos_ausentes.sort(), [
    "chave_acesso", "cnpj_emitente", "data_emissao", "numero_nf", "valor_frete", "valor_produtos",
  ].filter((c) => c !== "numero_nf").sort());
});

Deno.test("chave de acesso incompleta vira null em vez de zero-padded", () => {
  const inv = normalizeExtraction({ chave_acesso: "12345", valor_total: 10 });
  assertEquals(inv.chave_acesso, null);
  assertEquals(inv.campos_ausentes.includes("chave_acesso"), true);
});

Deno.test("identifica campos obrigatorios faltantes", () => {
  assertEquals(faltamCamposObrigatorios(normalizeExtraction({ numero_nf: "1", valor_total: 1 })), []);
  assertEquals(faltamCamposObrigatorios(extractionUnavailable()), ["numero_nf", "valor_total"]);
});

Deno.test("parseGatewayContent tolera cerca markdown e texto ao redor", () => {
  assertEquals(parseGatewayContent('```json\n{"numero_nf":"1"}\n```'), { numero_nf: "1" });
  assertEquals(parseGatewayContent('Resultado: {"valor_total":10} fim'), { valor_total: 10 });
});

Deno.test("parseGatewayContent falha quando nao ha JSON", () => {
  let erro = "";
  try {
    parseGatewayContent("nao consegui ler o documento");
  } catch (e) {
    erro = (e as Error).message;
  }
  assertEquals(erro, "resposta_sem_json");
});
