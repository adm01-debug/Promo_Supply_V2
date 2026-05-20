import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

// ── Types ──
export interface PurchaseRecord {
  id: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productCategory: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  status: "pending" | "shipped" | "delivered" | "returned";
  deliveryDate?: string;
  deliveredOnTime?: boolean;
  qualityRating?: number;
  solicitacaoId?: string;
  solicitacaoTitle?: string;
  departamento?: string;
  centroCusto?: string;
}

export interface ProductHistory {
  id: string;
  name: string;
  sku: string;
  category: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  totalPurchases: number;
  totalQuantity: number;
  totalSpent: number;
  qualityAvg: number;
  priceHistory: { date: string; price: number }[];
}

export interface SupplierHistory {
  id: string;
  name: string;
  cnpj: string;
  category?: string;
  avgDeliveryDays: number;
  onTimeRate: number;
  qualityScore: number;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  averageDiscount: number;
  bestDiscount: number;
  productCount: number;
  returnRate: number;
  monthlyVolume: { month: string; value: number; orders: number }[];
}

// ── Status Mapping (DB → UI) ──
const STATUS_MAP: Record<string, PurchaseRecord["status"]> = {
  pendente: "pending",
  aprovado: "pending",
  enviado: "shipped",
  em_transito: "shipped",
  entregue: "delivered",
  parcial: "delivered",
  cancelado: "returned",
  concluido: "returned",
};

export function usePurchaseHistory() {
  // Fetch pedidos with items
  const {
    data: rawPedidos,
    isLoading: loadingPedidos,
    error: errorPedidos,
  } = useQuery({
    queryKey: ["purchase-history-pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, status, valor_total, valor_frete, desconto, data_emissao, data_previsao, data_entrega, fornecedor_id, solicitacao_id, created_at")
        .order("data_emissao", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 120_000,
  });

  const { data: rawItens } = useQuery({
    queryKey: ["purchase-history-itens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_itens")
        .select("id, pedido_id, descricao, produto_id, quantidade, valor_unitario, valor_total, quantidade_recebida");
      if (error) throw error;
      return data || [];
    },
    staleTime: 120_000,
  });

  const { data: rawFornecedores } = useQuery({
    queryKey: ["purchase-history-fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, razao_social, nome_fantasia, cnpj, avaliacao, segmento, status");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: rawProdutos } = useQuery({
    queryKey: ["purchase-history-produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, codigo, nome, categoria_id, preco_medio, unidade");
      if (error) throw error;
      return data || [];
    },
    staleTime: 300_000,
  });

  const { data: rawCategorias } = useQuery({
    queryKey: ["purchase-history-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id, nome");
      if (error) throw error;
      return data || [];
    },
    staleTime: 600_000,
  });

  const { data: rawSolicitacoes } = useQuery({
    queryKey: ["purchase-history-solicitacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitacoes").select("id, titulo, departamento, centro_custo, cost_center_id");
      if (error) throw error;
      return data || [];
    },
    staleTime: 600_000,
  });

  const { data: rawCostCenters } = useQuery({
    queryKey: ["purchase-history-cost-centers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cost_centers").select("id, name, code, description");
      if (error) throw error;
      return data || [];
    },
    staleTime: 600_000,
  });

  // ── Derived Data ──
  const computed = useMemo(() => {
    const pedidos = rawPedidos || [];
    const itens = rawItens || [];
    const fornecedores = rawFornecedores || [];
    const produtos = rawProdutos || [];
    const categorias = rawCategorias || [];
    const solicitacoes = rawSolicitacoes || [];

    const fornMap = new Map(fornecedores.map((f) => [f.id, f]));
    const prodMap = new Map(produtos.map((p) => [p.id, p]));
    const catMap = new Map(categorias.map((c) => [c.id, c.nome]));
    const solMap = new Map(solicitacoes.map((s) => [s.id, s]));
    const itensByPedido = new Map<string, typeof itens>();
    itens.forEach((item) => {
      const list = itensByPedido.get(item.pedido_id || "") || [];
      list.push(item);
      itensByPedido.set(item.pedido_id || "", list);
    });

    // Build PurchaseRecords — one per pedido_item (or one per pedido if no items)
    const purchaseRecords: PurchaseRecord[] = [];
    pedidos.forEach((ped) => {
      const forn = fornMap.get(ped.fornecedor_id);
      const sol = solMap.get(ped.solicitacao_id || "");
      const pedItens = itensByPedido.get(ped.id) || [];
      const uiStatus = STATUS_MAP[ped.status] || "pending";
      const onTime =
        ped.data_entrega && ped.data_previsao ? ped.data_entrega <= ped.data_previsao : undefined;
      const discountPct =
        ped.valor_total > 0 ? ((Number(ped.desconto) || 0) / (Number(ped.valor_total) + (Number(ped.desconto) || 0))) * 100 : 0;

      if (pedItens.length === 0) {
        // No line items — create a single record per pedido
        purchaseRecords.push({
          id: ped.id,
          orderNumber: ped.numero,
          productId: "",
          productName: "Sem itens detalhados",
          productCategory: "Geral",
          supplierId: ped.fornecedor_id,
          supplierName: forn?.nome_fantasia || forn?.razao_social || "Desconhecido",
          purchaseDate: ped.data_emissao,
          quantity: 1,
          unitPrice: Number(ped.valor_total) || 0,
          totalPrice: Number(ped.valor_total) || 0,
          discount: Math.round(discountPct * 10) / 10,
          status: uiStatus,
          deliveryDate: ped.data_entrega || undefined,
          deliveredOnTime: onTime ?? undefined,
          qualityRating: Number(forn?.avaliacao) || 0,
          solicitacaoId: ped.solicitacao_id ?? undefined,
          solicitacaoTitle: sol?.titulo ?? undefined,
          departamento: sol?.departamento ?? undefined,
          centroCusto: sol?.centro_custo ?? undefined,
        });
      } else {
        pedItens.forEach((item) => {
          const prod = item.produto_id ? prodMap.get(item.produto_id) : null;
          const catName = prod?.categoria_id ? catMap.get(prod.categoria_id) || "Geral" : "Geral";
          purchaseRecords.push({
            id: item.id,
            orderNumber: ped.numero,
            productId: item.produto_id || item.id,
            productName: prod?.nome || item.descricao || "Produto",
            productCategory: catName,
            supplierId: ped.fornecedor_id,
            supplierName: forn?.nome_fantasia || forn?.razao_social || "Desconhecido",
            purchaseDate: ped.data_emissao,
            quantity: item.quantidade,
            unitPrice: Number(item.valor_unitario) || 0,
            totalPrice: Number(item.valor_total) || 0,
            discount: Math.round(discountPct * 10) / 10,
            status: uiStatus,
            deliveryDate: ped.data_entrega || undefined,
            deliveredOnTime: onTime ?? undefined,
            qualityRating: Number(forn?.avaliacao) || 0,
            solicitacaoId: ped.solicitacao_id ?? undefined,
            solicitacaoTitle: sol?.titulo ?? undefined,
            departamento: sol?.departamento ?? undefined,
            centroCusto: sol?.centro_custo ?? undefined,
          });
        });
      }
    });

    // Build product categories list
    const productCategories = Array.from(new Set(purchaseRecords.map((r) => r.productCategory))).sort();

    // Build ProductHistory
    const productGrouped = new Map<string, PurchaseRecord[]>();
    purchaseRecords.forEach((r) => {
      if (!r.productId) return;
      const list = productGrouped.get(r.productId) || [];
      list.push(r);
      productGrouped.set(r.productId, list);
    });

    const productsHistory: ProductHistory[] = Array.from(productGrouped.entries()).map(
      ([prodId, records]) => {
        const prices = records.map((r) => r.unitPrice).filter((p) => p > 0);
        const totalQty = records.reduce((s, r) => s + r.quantity, 0);
        const totalSpent = records.reduce((s, r) => s + r.totalPrice, 0);
        const qualityRatings = records.map((r) => r.qualityRating).filter((q): q is number => !!q && q > 0);
        const priceHistory = records
          .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))
          .map((r) => ({ date: r.purchaseDate.substring(0, 7), price: r.unitPrice }));

        return {
          id: prodId,
          name: records[0].productName,
          sku: prodMap.get(prodId)?.codigo || prodId.substring(0, 8),
          category: records[0].productCategory,
          avgPrice: prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : 0,
          minPrice: prices.length > 0 ? Math.min(...prices) : 0,
          maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
          totalPurchases: records.length,
          totalQuantity: totalQty,
          totalSpent,
          qualityAvg: qualityRatings.length > 0 ? qualityRatings.reduce((s, q) => s + q, 0) / qualityRatings.length : 0,
          priceHistory,
        };
      }
    );

    // Build SupplierHistory
    const supplierGrouped = new Map<string, PurchaseRecord[]>();
    purchaseRecords.forEach((r) => {
      const list = supplierGrouped.get(r.supplierId) || [];
      list.push(r);
      supplierGrouped.set(r.supplierId, list);
    });

    const suppliersHistory: SupplierHistory[] = Array.from(supplierGrouped.entries()).map(
      ([suppId, records]) => {
        const forn = fornMap.get(suppId);
        const delivered = records.filter((r) => r.status === "delivered");
        const onTimeCount = delivered.filter((r) => r.deliveredOnTime).length;
        const returnedCount = records.filter((r) => r.status === "returned").length;
        const discounts = records.map((r) => r.discount).filter((d) => d > 0);
        const totalSpent = records.reduce((s, r) => s + r.totalPrice, 0);
        const productIds = new Set(records.map((r) => r.productId));

        // Monthly volume
        const monthMap = new Map<string, { value: number; orders: number }>();
        records.forEach((r) => {
          const month = r.purchaseDate.substring(0, 7);
          const existing = monthMap.get(month) || { value: 0, orders: 0 };
          existing.value += r.totalPrice;
          existing.orders += 1;
          monthMap.set(month, existing);
        });
        const monthlyVolume = Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({
            month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short" }),
            value: data.value,
            orders: data.orders,
          }));

        return {
          id: suppId,
          name: forn?.nome_fantasia || forn?.razao_social || "Desconhecido",
          cnpj: forn?.cnpj || "",
          category: forn?.segmento || undefined,
          avgDeliveryDays: 0, // Would need tracking data
          onTimeRate: delivered.length > 0 ? Math.round((onTimeCount / delivered.length) * 100) : 0,
          qualityScore: Number(forn?.avaliacao) || 0,
          totalOrders: records.length,
          totalSpent,
          averageOrderValue: records.length > 0 ? Math.round(totalSpent / records.length) : 0,
          averageDiscount: discounts.length > 0 ? Math.round((discounts.reduce((s, d) => s + d, 0) / discounts.length) * 10) / 10 : 0,
          bestDiscount: discounts.length > 0 ? Math.max(...discounts) : 0,
          productCount: productIds.size,
          returnRate: records.length > 0 ? Math.round((returnedCount / records.length) * 1000) / 10 : 0,
          monthlyVolume,
        };
      }
    );

    return { purchaseRecords, productsHistory, suppliersHistory, productCategories };
  }, [rawPedidos, rawItens, rawFornecedores, rawProdutos, rawCategorias, rawSolicitacoes]);

  return {
    ...computed,
    isLoading: loadingPedidos,
    error: errorPedidos,
  };
}
