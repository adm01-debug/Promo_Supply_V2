export interface SourcingRecordLike {
  productId?: string;
  productName: string;
  productCategory: string;
  supplierId?: string;
  supplierName: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  status?: "pending" | "shipped" | "delivered" | "returned";
  deliveryDate?: string;
  orderNumber?: string;
  orderId?: string;
}

export interface SupplierLike {
  id: string;
  name: string;
  onTimeRate: number;
  qualityScore: number;
  returnRate: number;
  totalOrders: number;
  totalSpent: number;
  bestDiscount: number;
  avgDeliveryDays: number;
}

export interface RepurchasePrediction {
  productKey: string;
  productName: string;
  lastPurchase: string;
  intervaloMedioDias: number | null;
  proximaCompra: string | null;
  diasRestantes: number | null;
  confianca: number;
  amostras: number;
  precoMedio: number;
  precoUltimo: number;
  tendencia: "subindo" | "caindo" | "estavel";
  tendenciaPct: number;
}

export interface CategoryBenchmark {
  categoria: string;
  precoMedioNos: number;
  registros: number;
  melhoresFornecedores: { nome: string; precoMedio: number; registros: number }[];
  spreadPct: number | null;
  status: "Otimizado" | "Rever Sourcing" | "Critico" | "Sem Base";
}

export interface TrendPoint {
  periodo: string;
  label: string;
  valor: number;
  pedidos: number;
}

const DAY_MS = 86_400_000;

const toTime = (value: string | undefined | null): number | null => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
};

const round2 = (value: number) => Math.round(value * 100) / 100;
const round1 = (value: number) => Math.round(value * 10) / 10;

export const productKeyOf = (record: Pick<SourcingRecordLike, "productId" | "productName">): string => {
  const id = (record.productId || "").trim();
  if (id) return id;
  return `nome:${(record.productName || "").trim().toLowerCase()}`;
};

const groupByProduct = (records: SourcingRecordLike[]) => {
  const map = new Map<string, SourcingRecordLike[]>();
  records.forEach((record) => {
    const key = productKeyOf(record);
    const list = map.get(key) || [];
    list.push(record);
    map.set(key, list);
  });
  return map;
};

const sortByDate = (records: SourcingRecordLike[]) =>
  [...records].sort((a, b) => (toTime(a.purchaseDate) ?? 0) - (toTime(b.purchaseDate) ?? 0));

export function buildRepurchasePredictions(
  records: SourcingRecordLike[],
  now: Date = new Date()
): RepurchasePrediction[] {
  const nowTime = now.getTime();
  const predictions: RepurchasePrediction[] = [];

  groupByProduct(records).forEach((group, productKey) => {
    const ordered = sortByDate(group).filter((r) => toTime(r.purchaseDate) !== null);
    if (ordered.length === 0) return;

    const ultima = ordered[ordered.length - 1];
    const ultimaTime = toTime(ultima.purchaseDate)!;

    const intervalos: number[] = [];
    for (let i = 1; i < ordered.length; i += 1) {
      const anterior = toTime(ordered[i - 1].purchaseDate)!;
      const atual = toTime(ordered[i].purchaseDate)!;
      const dias = (atual - anterior) / DAY_MS;
      if (dias > 0) intervalos.push(dias);
    }

    const intervaloMedio =
      intervalos.length > 0 ? intervalos.reduce((s, d) => s + d, 0) / intervalos.length : null;

    const precos = ordered.map((r) => (r.unitPrice > 0 ? r.unitPrice : r.totalPrice)).filter((p) => p > 0);
    const precoMedio = precos.length > 0 ? precos.reduce((s, p) => s + p, 0) / precos.length : 0;
    const precoUltimo = precos.length > 0 ? precos[precos.length - 1] : 0;

    let tendencia: RepurchasePrediction["tendencia"] = "estavel";
    let tendenciaPct = 0;
    if (precos.length >= 2 && precoMedio > 0) {
      tendenciaPct = round1(((precoUltimo - precoMedio) / precoMedio) * 100);
      if (tendenciaPct >= 2) tendencia = "subindo";
      else if (tendenciaPct <= -2) tendencia = "caindo";
    }

    const proximaTime = intervaloMedio !== null ? ultimaTime + intervaloMedio * DAY_MS : null;
    const diasRestantes = proximaTime !== null ? Math.round((proximaTime - nowTime) / DAY_MS) : null;
    const confianca =
      intervaloMedio !== null ? Math.max(40, Math.min(98, 50 + ordered.length * 12)) : 0;

    predictions.push({
      productKey,
      productName: ultima.productName,
      lastPurchase: ultima.purchaseDate,
      intervaloMedioDias: intervaloMedio !== null ? Math.round(intervaloMedio) : null,
      proximaCompra: proximaTime !== null ? new Date(proximaTime).toISOString() : null,
      diasRestantes,
      confianca,
      amostras: ordered.length,
      precoMedio: round2(precoMedio),
      precoUltimo: round2(precoUltimo),
      tendencia,
      tendenciaPct,
    });
  });

  return predictions
    .filter((p) => p.diasRestantes !== null)
    .sort((a, b) => (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0));
}

export function buildMonthlyTrend(records: SourcingRecordLike[], meses = 6): TrendPoint[] {
  const mapa = new Map<string, { valor: number; pedidos: Set<string> }>();
  records.forEach((record) => {
    const time = toTime(record.purchaseDate);
    if (time === null) return;
    const periodo = record.purchaseDate.substring(0, 7);
    const atual = mapa.get(periodo) || { valor: 0, pedidos: new Set<string>() };
    atual.valor += record.totalPrice || 0;
    atual.pedidos.add(record.purchaseDate + "|" + record.supplierName + "|" + record.productName);
    mapa.set(periodo, atual);
  });

  return Array.from(mapa.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-meses)
    .map(([periodo, dados]) => ({
      periodo,
      label: new Date(`${periodo}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      valor: round2(dados.valor),
      pedidos: dados.pedidos.size,
    }));
}

export function buildCategoryBenchmark(records: SourcingRecordLike[]): CategoryBenchmark[] {
  const porCategoria = new Map<string, SourcingRecordLike[]>();
  records.forEach((record) => {
    const categoria = (record.productCategory || "Geral").trim() || "Geral";
    const list = porCategoria.get(categoria) || [];
    list.push(record);
    porCategoria.set(categoria, list);
  });

  return Array.from(porCategoria.entries())
    .map(([categoria, lista]) => {
      const precos = lista.map((r) => (r.unitPrice > 0 ? r.unitPrice : r.totalPrice)).filter((p) => p > 0);
      const precoMedioNos = precos.length > 0 ? precos.reduce((s, p) => s + p, 0) / precos.length : 0;

      const porFornecedor = new Map<string, number[]>();
      lista.forEach((r) => {
        const preco = r.unitPrice > 0 ? r.unitPrice : r.totalPrice;
        if (preco <= 0) return;
        const list = porFornecedor.get(r.supplierName) || [];
        list.push(preco);
        porFornecedor.set(r.supplierName, list);
      });

      const melhoresFornecedores = Array.from(porFornecedor.entries())
        .map(([nome, valores]) => ({
          nome,
          precoMedio: round2(valores.reduce((s, v) => s + v, 0) / valores.length),
          registros: valores.length,
        }))
        .sort((a, b) => a.precoMedio - b.precoMedio)
        .slice(0, 3);

      const maior = precos.length > 0 ? Math.max(...precos) : 0;
      const menor = precos.length > 0 ? Math.min(...precos) : 0;
      const spreadPct = menor > 0 ? round1(((maior - menor) / menor) * 100) : null;

      let status: CategoryBenchmark["status"] = "Sem Base";
      if (precos.length > 0) {
        if (spreadPct === null || spreadPct <= 15) status = "Otimizado";
        else if (spreadPct <= 40) status = "Rever Sourcing";
        else status = "Critico";
      }

      return {
        categoria,
        precoMedioNos: round2(precoMedioNos),
        registros: lista.length,
        melhoresFornecedores,
        spreadPct,
        status,
      };
    })
    .sort((a, b) => b.registros - a.registros);
}

export function buildSourcingMatrix(records: SourcingRecordLike[]) {
  const total = records.length;
  const porProduto = groupByProduct(records);
  let estrategicos = 0;
  let criticos = 0;
  let alavancagem = 0;
  let rotineiros = 0;

  porProduto.forEach((group) => {
    const fornecedores = new Set(group.map((r) => r.supplierName)).size;
    const gasto = group.reduce((s, r) => s + (r.totalPrice || 0), 0);
    const multiFornecedor = fornecedores > 1;
    if (gasto >= 5000 && !multiFornecedor) estrategicos += 1;
    else if (gasto >= 5000 && multiFornecedor) criticos += 1;
    else if (multiFornecedor) alavancagem += 1;
    else rotineiros += 1;
  });

  return {
    estrategicos,
    criticos,
    alavancagem,
    rotineiros,
    totalProdutos: porProduto.size,
    totalRegistros: total,
  };
}

export function buildSupplierConcentration(records: SourcingRecordLike[]) {
  const mapa = new Map<string, { valor: number; pedidos: Set<string> }>();
  records.forEach((record) => {
    const fornecedor = (record.supplierName || "Desconhecido").trim() || "Desconhecido";
    const atual = mapa.get(fornecedor) || { valor: 0, pedidos: new Set<string>() };
    atual.valor += record.totalPrice || 0;
    atual.pedidos.add(record.orderId || `${record.purchaseDate}|${record.orderNumber ?? ""}`);
    mapa.set(fornecedor, atual);
  });
  const total = Array.from(mapa.values()).reduce((s, v) => s + v.valor, 0);
  return Array.from(mapa.entries())
    .map(([fornecedor, dados]) => ({
      fornecedor,
      valor: round2(dados.valor),
      pedidos: dados.pedidos.size,
      percentual: total > 0 ? round1((dados.valor / total) * 100) : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

export function buildCategorySpend(records: SourcingRecordLike[]) {
  const mapa = new Map<string, number>();
  records.forEach((record) => {
    const categoria = (record.productCategory || "Geral").trim() || "Geral";
    mapa.set(categoria, (mapa.get(categoria) || 0) + (record.totalPrice || 0));
  });
  const total = Array.from(mapa.values()).reduce((s, v) => s + v, 0);
  return Array.from(mapa.entries())
    .map(([categoria, valor]) => ({
      categoria,
      valor: round2(valor),
      percentual: total > 0 ? round1((valor / total) * 100) : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}

export function buildHealthIndex(suppliers: SupplierLike[]) {
  const comBase = suppliers.filter((s) => s.totalOrders > 0);
  if (comBase.length === 0) {
    return { indice: 0, pontualidade: 0, qualidade: 0, devolucao: 0, base: 0 };
  }
  const media = (fn: (s: SupplierLike) => number) =>
    comBase.reduce((s, item) => s + fn(item), 0) / comBase.length;

  const pontualidade = media((s) => s.onTimeRate);
  const qualidade = media((s) => Math.min(100, (s.qualityScore || 0) * 20));
  const devolucao = media((s) => s.returnRate);

  const indice = Math.max(0, Math.min(100, pontualidade * 0.45 + qualidade * 0.45 + (100 - devolucao) * 0.1));

  return {
    indice: round1(indice),
    pontualidade: round1(pontualidade),
    qualidade: round1(qualidade),
    devolucao: round1(devolucao),
    base: comBase.length,
  };
}

export function buildSavings(records: SourcingRecordLike[]) {
  const brutos = records.reduce((s, r) => s + (r.totalPrice || 0), 0);
  const descontos = records.reduce((s, r) => s + ((r.totalPrice || 0) * ((r.discount || 0) / 100)), 0);
  return {
    bruto: round2(brutos),
    desconto: round2(descontos),
    liquido: round2(brutos - descontos),
    descontoPct: brutos > 0 ? round1((descontos / brutos) * 100) : 0,
  };
}

export function buildSupplierPerformance(suppliers: SupplierLike[]) {
  return suppliers
    .filter((s) => s.totalOrders > 0)
    .map((s) => {
      const qualidade = Math.min(100, (s.qualityScore || 0) * 20);
      const preco = s.bestDiscount > 0 ? Math.min(100, 60 + s.bestDiscount * 2) : 60;
      const risco = Math.max(0, 100 - s.onTimeRate - s.returnRate);
      const indice = round1(qualidade * 0.4 + s.onTimeRate * 0.35 + preco * 0.25);
      return {
        id: s.id,
        nome: s.name,
        pedidos: s.totalOrders,
        gasta: round2(s.totalSpent),
        pontualidade: round1(s.onTimeRate),
        qualidade: round1(qualidade),
        preco: round1(preco),
        risco: round1(risco),
        indice,
        leadTimeDias: round1(s.avgDeliveryDays),
      };
    })
    .sort((a, b) => b.indice - a.indice);
}

export function buildSupplierTrend(records: SourcingRecordLike[]) {
  const porFornecedor = new Map<string, { recente: number; anterior: number; pedidos: number }>();
  const agora = Date.now();
  const seisMeses = 182 * DAY_MS;

  records.forEach((record) => {
    const time = toTime(record.purchaseDate);
    if (time === null) return;
    const chave = (record.supplierName || "Desconhecido").trim() || "Desconhecido";
    const atual = porFornecedor.get(chave) || { recente: 0, anterior: 0, pedidos: 0 };
    const idade = agora - time;
    if (idade <= seisMeses) atual.recente += record.totalPrice || 0;
    else if (idade <= seisMeses * 2) atual.anterior += record.totalPrice || 0;
    atual.pedidos += 1;
    porFornecedor.set(chave, atual);
  });

  const resultado = new Map<string, { variacaoPct: number | null; recente: number; anterior: number }>();
  porFornecedor.forEach((dados, fornecedor) => {
    const variacaoPct =
      dados.anterior > 0
        ? round1(((dados.recente - dados.anterior) / dados.anterior) * 100)
        : dados.recente > 0
          ? null
          : 0;
    resultado.set(fornecedor, { variacaoPct, recente: round2(dados.recente), anterior: round2(dados.anterior) });
  });
  return resultado;
}

export function buildCategoryPriceIndex(records: SourcingRecordLike[]) {
  const porCategoria = new Map<string, SourcingRecordLike[]>();
  records.forEach((record) => {
    const categoria = (record.productCategory || "Geral").trim() || "Geral";
    const list = porCategoria.get(categoria) || [];
    list.push(record);
    porCategoria.set(categoria, list);
  });

  const resultado = new Map<string, number>();
  porCategoria.forEach((lista, categoria) => {
    const ordenados = sortByDate(lista).filter((r) => toTime(r.purchaseDate) !== null);
    const precos = ordenados.map((r) => (r.unitPrice > 0 ? r.unitPrice : r.totalPrice)).filter((p) => p > 0);
    if (precos.length < 2) {
      resultado.set(categoria, 0);
      return;
    }
    const primeiro = precos[0];
    const ultimo = precos[precos.length - 1];
    resultado.set(categoria, primeiro > 0 ? round1(((ultimo - primeiro) / primeiro) * 100) : 0);
  });
  return resultado;
}

export function supplierLeadTimeLabel(dias: number): string {
  if (!Number.isFinite(dias) || dias <= 0) return "Sem dados";
  return `~${round1(dias)} dias`;
}

