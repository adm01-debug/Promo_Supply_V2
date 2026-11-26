import { formatCurrency } from "@/lib/utils";
export interface PriceQuote {
  supplierId: string;
  supplierName: string;
  /** Preco unitario conhecido (contratado ou cotado). null = sem fonte. */
  unitPrice: number | null;
  totalPrice: number | null;
  /** Prazo em dias: lead time contratado, prazo cadastrado ou media cotada. */
  deliveryDays: number | null;
  /** Condicao de pagamento cadastrada no fornecedor. */
  paymentTerms: string | null;
  /** Prazo medio de entrega cadastrado no fornecedor. */
  stock: number | null;
  /** Nota do fornecedor (0-5). */
  rating: number | null;
  /** Conformidade de prazo ainda nao e coletada por este fluxo. */
  onTimeDelivery: number | null;
  /** Origem do preco exibido, sem inventar valor. */
  priceSource: 'contratado' | 'cotado' | 'ausente';
  savings: number | null;
  savingsPercent: number | null;
  recommended: boolean;
  pros: string[];
  cons: string[];
}

export interface ComparisonResult {
  product: string;
  quantity: number;
  quotes: PriceQuote[];
  bestPrice: string | null;
  bestDelivery: string | null;
  bestOverall: string | null;
  /** Media apenas das cotacoes com preco conhecido. */
  averagePrice: number | null;
  priceRange: { min: number; max: number } | null;
  insights: string[];
  /** Quantos fornecedores tem preco e quantos ficaram sem fonte. */
  coverage: { withPrice: number; withoutPrice: number };
}

interface FornecedorLike {
  id: string;
  nome_fantasia?: string | null;
  razao_social: string;
  prazo_medio_entrega?: number | null;
  condicoes_pagamento?: string | null;
  avaliacao?: number | string | null;
}

interface LinkedSupplierLike {
  fornecedor_id: string;
  preco_custo?: number | null;
  lead_time_estimado?: number | null;
}

interface QuotedPriceLike {
  fornecedor_id: string;
  valor_unitario?: number | null;
  prazo_entrega?: number | string | null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDays(value: unknown): number | null {
  const direct = toNumber(value);
  if (direct !== null) return direct;
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) return Number(match[0]);
  }
  return null;
}

/**
 * Monta a comparacao de precos usando somente dado existente: preco contratado
 * em produto_fornecedores, cotacoes registradas e os campos do fornecedor.
 * Quando nao ha preco, a cotacao fica com unitPrice null e o fornecedor e
 * listado em `coverage.withoutPrice` em vez de receber um valor aleatorio.
 */
export function generateQuotesFromSuppliers(
  fornecedores: FornecedorLike[],
  productName: string,
  qty: number,
  linkedProductSuppliers: LinkedSupplierLike[] = [],
  quotedPrices: QuotedPriceLike[] = []
): ComparisonResult {
  const quotes: PriceQuote[] = fornecedores.map((f) => {
    const linked = linkedProductSuppliers.find((ls) => ls.fornecedor_id === f.id);
    const quoted = quotedPrices.find((q) => q.fornecedor_id === f.id);

    const contracted = toNumber(linked?.preco_custo);
    const quotedPrice = toNumber(quoted?.valor_unitario);
    const unitPrice = contracted ?? quotedPrice;
    const priceSource: PriceQuote['priceSource'] =
      contracted !== null ? 'contratado' : quotedPrice !== null ? 'cotado' : 'ausente';

    const totalPrice = unitPrice === null ? null : Number((unitPrice * qty).toFixed(2));

    const deliveryDays =
      toNumber(linked?.lead_time_estimado) ??
      parseDays(quoted?.prazo_entrega) ??
      toNumber(f.prazo_medio_entrega);

    return {
      supplierId: f.id,
      supplierName: f.nome_fantasia || f.razao_social,
      unitPrice,
      totalPrice,
      deliveryDays,
      paymentTerms: f.condicoes_pagamento || null,
      stock: null,
      rating: toNumber(f.avaliacao),
      onTimeDelivery: null,
      priceSource,
      savings: null,
      savingsPercent: null,
      recommended: false,
      pros: priceSource === 'ausente' ? [] : [priceSource === 'contratado' ? 'Preco contratado em sistema' : 'Preco cotado registrado'],
      cons: priceSource === 'ausente' ? ['Sem preco contratado nem cotacao registrada'] : [],
    };
  });

  // Ordena a lista exibida: menor preco primeiro, sem preco no fim.
  quotes.sort((a, b) => {
    if (a.totalPrice === null && b.totalPrice === null) return 0;
    if (a.totalPrice === null) return 1;
    if (b.totalPrice === null) return -1;
    return a.totalPrice - b.totalPrice;
  });

  const priced = quotes
    .filter((q): q is PriceQuote & { totalPrice: number } => q.totalPrice !== null)
    .sort((a, b) => a.totalPrice - b.totalPrice);

  const bestPriceTotal = priced.length > 0 ? priced[0].totalPrice : null;
  if (priced.length > 0) {
    quotes.forEach((q) => {
      if (q.totalPrice === null || bestPriceTotal === null) return;
      q.savings = Number((q.totalPrice - bestPriceTotal).toFixed(2));
    });
    priced[0].recommended = true;
  }

  const withDelivery = quotes
    .filter((q): q is PriceQuote & { deliveryDays: number } => q.deliveryDays !== null)
    .sort((a, b) => a.deliveryDays - b.deliveryDays);
  const bestDeliveryQuote = withDelivery[0] ?? null;

  const scored = quotes
    .filter((q) => q.rating !== null && q.totalPrice !== null)
    .sort((a, b) => {
      const aScore = (a.rating as number) * 20 - Math.min(50, (a.totalPrice as number) / 100);
      const bScore = (b.rating as number) * 20 - Math.min(50, (b.totalPrice as number) / 100);
      return bScore - aScore;
    });
  const bestOverallQuote = scored[0] ?? priced[0] ?? null;

  const averagePrice =
    priced.length > 0
      ? Number((priced.reduce((sum, q) => sum + q.totalPrice, 0) / priced.length).toFixed(2))
      : null;

  const insights: string[] = [];
  if (priced.length > 1) {
    const gap = Number(((priced[priced.length - 1].totalPrice ?? 0) - (priced[0].totalPrice ?? 0)).toFixed(2));
    insights.push(`Diferenca de ate ${formatCurrency(gap)} entre a maior e a menor cotacao com preco registrado`);
  } else if (priced.length === 1) {
    insights.push('Apenas um fornecedor tem preco registrado: registre cotacoes para comparar de verdade');
  } else {
    insights.push('Nenhum fornecedor tem preco contratado ou cotacao registrada para este produto');
  }
  if (bestDeliveryQuote) {
    insights.push(`${bestDeliveryQuote.supplierName} tem o menor prazo informado (${bestDeliveryQuote.deliveryDays} dias)`);
  } else {
    insights.push('Nenhum fornecedor tem prazo de entrega cadastrado');
  }
  const rated = quotes.filter((q) => q.rating !== null);
  if (rated.length > 0) {
    const avgRating = rated.reduce((sum, q) => sum + (q.rating as number), 0) / rated.length;
    insights.push(`Media de avaliacao dos fornecedores: ${avgRating.toFixed(1)} estrelas`);
  } else {
    insights.push('Nenhum fornecedor tem avaliacao cadastrada');
  }

  return {
    product: productName,
    quantity: qty,
    quotes,
    bestPrice: priced.length > 0 ? priced[0].supplierName : null,
    bestDelivery: bestDeliveryQuote ? bestDeliveryQuote.supplierName : null,
    bestOverall: bestOverallQuote ? bestOverallQuote.supplierName : null,
    averagePrice,
    priceRange:
      priced.length > 0
        ? {
            min: Math.min(...priced.map((q) => q.totalPrice)),
            max: Math.max(...priced.map((q) => q.totalPrice)),
          }
        : null,
    insights,
    coverage: { withPrice: priced.length, withoutPrice: quotes.length - priced.length },
  };
}
