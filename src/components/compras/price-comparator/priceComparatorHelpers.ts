export interface PriceQuote {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number;
  paymentTerms: string;
  stock: number;
  rating: number;
  onTimeDelivery: number;
  savings: number;
  savingsPercent: number;
  recommended: boolean;
  pros: string[];
  cons: string[];
}

export interface ComparisonResult {
  product: string;
  quantity: number;
  quotes: PriceQuote[];
  bestPrice: string;
  bestDelivery: string;
  bestOverall: string;
  averagePrice: number;
  priceRange: { min: number; max: number };
  insights: string[];
}

export function generateQuotesFromSuppliers(
  fornecedores: any[],
  productName: string,
  qty: number
): ComparisonResult {
  const quotes: PriceQuote[] = fornecedores.slice(0, 6).map((f, index) => {
    const basePrice = 25 + Math.random() * 50;
    const unitPrice = Number((basePrice * (0.85 + Math.random() * 0.3)).toFixed(2));
    const totalPrice = Number((unitPrice * qty).toFixed(2));
    const avgPrice = 40 * qty;
    const savings = Number((avgPrice - totalPrice).toFixed(2));
    const savingsPercent = Number(((savings / avgPrice) * 100).toFixed(1));

    return {
      supplierId: f.id,
      supplierName: f.nome_fantasia || f.razao_social,
      unitPrice,
      totalPrice,
      deliveryDays: f.prazo_medio_entrega || Math.floor(3 + Math.random() * 12),
      paymentTerms: f.condicoes_pagamento || ['30 dias', '28/56 dias', 'À vista -5%', '30/60/90 dias'][Math.floor(Math.random() * 4)],
      stock: Math.floor(50 + Math.random() * 500),
      rating: Number(f.avaliacao || (3.5 + Math.random() * 1.5).toFixed(1)),
      onTimeDelivery: Math.floor(85 + Math.random() * 15),
      savings,
      savingsPercent,
      recommended: index === 0,
      pros: [
        'Bom histórico de entregas',
        'Preço competitivo',
        'Qualidade consistente',
      ].slice(0, 2 + Math.floor(Math.random() * 2)),
      cons: [
        'Prazo de entrega longo',
        'Estoque limitado',
      ].slice(0, Math.floor(Math.random() * 2)),
    };
  });

  quotes.sort((a, b) => a.totalPrice - b.totalPrice);
  quotes[0].recommended = true;

  const bestPriceQuote = quotes[0];
  const bestDeliveryQuote = quotes.reduce((prev, curr) =>
    curr.deliveryDays < prev.deliveryDays ? curr : prev
  );
  const bestOverallQuote = quotes.reduce((prev, curr) => {
    const prevScore = prev.rating * 20 + prev.onTimeDelivery - prev.totalPrice / 100;
    const currScore = curr.rating * 20 + curr.onTimeDelivery - curr.totalPrice / 100;
    return currScore > prevScore ? curr : prev;
  });

  return {
    product: productName,
    quantity: qty,
    quotes,
    bestPrice: bestPriceQuote.supplierName,
    bestDelivery: bestDeliveryQuote.supplierName,
    bestOverall: bestOverallQuote.supplierName,
    averagePrice: Number((quotes.reduce((sum, q) => sum + q.totalPrice, 0) / quotes.length).toFixed(2)),
    priceRange: {
      min: Math.min(...quotes.map(q => q.totalPrice)),
      max: Math.max(...quotes.map(q => q.totalPrice)),
    },
    insights: [
      `Economia potencial de até R$ ${(Math.max(...quotes.map(q => q.totalPrice)) - Math.min(...quotes.map(q => q.totalPrice))).toFixed(2)} escolhendo o melhor preço`,
      `${bestDeliveryQuote.supplierName} oferece a entrega mais rápida (${bestDeliveryQuote.deliveryDays} dias)`,
      `Média de avaliação dos fornecedores: ${(quotes.reduce((sum, q) => sum + q.rating, 0) / quotes.length).toFixed(1)} estrelas`,
    ],
  };
}
