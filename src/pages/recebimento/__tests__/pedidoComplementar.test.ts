import { describe, it, expect } from "vitest";
import { buildPendingLines, defaultForecastDate } from "../recebimentoHelpers";
import type { PendingOrder } from "../recebimentoHelpers";

const itens: PendingOrder["itens"] = [
  { id: "A", descricao: "Caneta", quantidade: 10, quantidade_recebida: 0, unidade: "un", valor_unitario: 2 },
  { id: "B", descricao: "Caderno", quantidade: 5, quantidade_recebida: 0, unidade: null, valor_unitario: 10 },
];

describe("buildPendingLines", () => {
  it("gera uma linha por item com saldo, com a quantidade restante", () => {
    const lines = buildPendingLines(itens, { A: 4, B: 0 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ descricao: "Caneta", quantidade: 6, valor_total: 12 });
    expect(lines[1]).toMatchObject({ descricao: "Caderno", quantidade: 5, valor_total: 50 });
  });

  it("ignora itens totalmente recebidos", () => {
    expect(buildPendingLines(itens, { A: 10, B: 5 })).toHaveLength(0);
  });

  it("ignora item recebido acima do pedido, sem gerar saldo negativo", () => {
    const lines = buildPendingLines(itens, { A: 12, B: 5 });
    expect(lines).toHaveLength(0);
  });

  it("usa 'un' quando o item nao tem unidade", () => {
    expect(buildPendingLines(itens, { A: 10, B: 1 })[0].unidade).toBe("un");
  });
});

describe("defaultForecastDate", () => {
  it("devolve a data de 7 dias a frente em YYYY-MM-DD", () => {
    expect(defaultForecastDate(new Date("2026-01-01T12:00:00Z"))).toBe("2026-01-08");
  });
});