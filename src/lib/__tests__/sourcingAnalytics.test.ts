import { describe, expect, it } from "vitest";
import {
  buildCategoryBenchmark,
  buildCategorySpend,
  buildHealthIndex,
  buildMonthlyTrend,
  buildRepurchasePredictions,
  buildSavings,
  buildSourcingMatrix,
  productKeyOf,
  type SourcingRecordLike,
} from "@/lib/sourcingAnalytics";

const registro = (over: Partial<SourcingRecordLike>): SourcingRecordLike => ({
  productId: "p1",
  productName: "Cimento CP II",
  productCategory: "Obras",
  supplierName: "Fornecedor A",
  purchaseDate: "2026-01-10",
  quantity: 10,
  unitPrice: 100,
  totalPrice: 1000,
  discount: 0,
  ...over,
});

describe("sourcingAnalytics", () => {
  it("calcula intervalo médio e próxima compra a partir das datas reais", () => {
    const predicoes = buildRepurchasePredictions(
      [
        registro({ purchaseDate: "2026-01-01", unitPrice: 100, totalPrice: 1000 }),
        registro({ purchaseDate: "2026-01-31", unitPrice: 100, totalPrice: 1000 }),
        registro({ purchaseDate: "2026-03-02", unitPrice: 100, totalPrice: 1000 }),
      ],
      new Date("2026-03-10T00:00:00Z")
    );

    expect(predicoes).toHaveLength(1);
    expect(predicoes[0].intervaloMedioDias).toBe(30);
    expect(predicoes[0].amostras).toBe(3);
    expect(predicoes[0].diasRestantes).toBe(22);
    expect(predicoes[0].confianca).toBe(86);
    expect(predicoes[0].proximaCompra).toBe("2026-04-01T00:00:00.000Z");
  });

  it("não inventa previsão quando o item tem apenas uma compra", () => {
    const predicoes = buildRepurchasePredictions([registro({})], new Date("2026-02-01T00:00:00Z"));
    expect(predicoes).toHaveLength(0);
  });

  it("detecta tendência de preço unitário", () => {
    const predicoes = buildRepurchasePredictions(
      [
        registro({ purchaseDate: "2026-01-01", unitPrice: 100, totalPrice: 1000 }),
        registro({ purchaseDate: "2026-02-01", unitPrice: 130, totalPrice: 1300 }),
        registro({ purchaseDate: "2026-03-01", unitPrice: 140, totalPrice: 1400 }),
      ],
      new Date("2026-03-05T00:00:00Z")
    );

    expect(predicoes[0].tendencia).toBe("subindo");
    expect(predicoes[0].tendenciaPct).toBe(13.5);
    expect(predicoes[0].precoMedio).toBe(123.33);
  });

  it("agrupa o volume por mês e limita a janela pedida", () => {
    const serie = buildMonthlyTrend(
      [
        registro({ purchaseDate: "2026-01-05", totalPrice: 500 }),
        registro({ purchaseDate: "2026-02-05", totalPrice: 700 }),
        registro({ purchaseDate: "2026-02-20", totalPrice: 300 }),
        registro({ purchaseDate: "2026-03-05", totalPrice: 100 }),
      ],
      2
    );

    expect(serie.map((p) => p.periodo)).toEqual(["2026-02", "2026-03"]);
    expect(serie[0]).toMatchObject({ valor: 1000, pedidos: 2 });
    expect(serie[1]).toMatchObject({ valor: 100, pedidos: 1 });
  });

  it("classifica o benchmark por spread real de preço da categoria", () => {
    const [otimizado] = buildCategoryBenchmark([
      registro({ supplierName: "A", unitPrice: 100, totalPrice: 1000 }),
      registro({ supplierName: "B", unitPrice: 110, totalPrice: 1100 }),
    ]);
    expect(otimizado.status).toBe("Otimizado");
    expect(otimizado.precoMedioNos).toBe(105);
    expect(otimizado.spreadPct).toBe(10);
    expect(otimizado.melhoresFornecedores[0]).toMatchObject({ nome: "A", precoMedio: 100 });

    const [critico] = buildCategoryBenchmark([
      registro({ supplierName: "A", unitPrice: 100, totalPrice: 1000 }),
      registro({ supplierName: "B", unitPrice: 200, totalPrice: 2000 }),
    ]);
    expect(critico.status).toBe("Critico");
    expect(critico.spreadPct).toBe(100);
  });

  it("calcula o health index apenas com fornecedores que têm pedidos", () => {
    const saude = buildHealthIndex([
      { id: "1", name: "A", onTimeRate: 100, qualityScore: 5, returnRate: 0, totalOrders: 2, totalSpent: 0, bestDiscount: 0, avgDeliveryDays: 3 },
      { id: "2", name: "B", onTimeRate: 50, qualityScore: 3, returnRate: 10, totalOrders: 4, totalSpent: 0, bestDiscount: 0, avgDeliveryDays: 5 },
      { id: "3", name: "C", onTimeRate: 0, qualityScore: 0, returnRate: 0, totalOrders: 0, totalSpent: 0, bestDiscount: 0, avgDeliveryDays: 0 },
    ]);

    expect(saude.base).toBe(2);
    expect(saude.pontualidade).toBe(75);
    expect(saude.qualidade).toBe(80);
    expect(saude.devolucao).toBe(5);
    expect(saude.indice).toBe(79.3);
  });

  it("não divide por zero quando não há fornecedor com pedido", () => {
    expect(buildHealthIndex([])).toMatchObject({ indice: 0, base: 0 });
  });

  it("soma a economia real aplicando o desconto de cada registro", () => {
    const economia = buildSavings([
      registro({ totalPrice: 1000, discount: 10 }),
      registro({ totalPrice: 500, discount: 0 }),
    ]);

    expect(economia.bruto).toBe(1500);
    expect(economia.desconto).toBe(100);
    expect(economia.liquido).toBe(1400);
    expect(economia.descontoPct).toBe(6.7);
  });

  it("distribui o spend por categoria em percentual fechado", () => {
    const spend = buildCategorySpend([
      registro({ productCategory: "Obras", totalPrice: 750 }),
      registro({ productCategory: "TI", totalPrice: 250 }),
    ]);

    expect(spend[0]).toMatchObject({ categoria: "Obras", percentual: 75 });
    expect(spend[1]).toMatchObject({ categoria: "TI", percentual: 25 });
  });

  it("classifica a matriz de sourcing pelo gasto e número de fornecedores", () => {
    const matriz = buildSourcingMatrix([
      registro({ productId: "a", totalPrice: 6000 }),
      registro({ productId: "b", totalPrice: 6000, supplierName: "Fornecedor B" }),
      registro({ productId: "b", totalPrice: 100, supplierName: "Fornecedor C" }),
      registro({ productId: "c", totalPrice: 50 }),
    ]);

    expect(matriz).toMatchObject({ estrategicos: 1, criticos: 1, rotineiros: 1, totalProdutos: 3 });
  });

  it("usa o nome normalizado como chave quando o produto não tem id", () => {
    expect(productKeyOf({ productId: "", productName: "  Cimento CP II " })).toBe("nome:cimento cp ii");
    expect(productKeyOf({ productId: "abc", productName: "Cimento" })).toBe("abc");
  });
});
