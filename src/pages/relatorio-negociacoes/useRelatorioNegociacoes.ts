import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HistoricoMensal = {
  mes: string;
  economia: number;
  volume: number;
  percentual: number;
  cotacoes: number;
};

export type Comprador = {
  id: string;
  nome: string;
  economia: number;
  percentual: number;
  cotacoes: number;
  melhorPreco: number;
  tendencia: "up" | "down";
  avatar: string;
};

export type EconomiaCategoria = {
  categoria: string;
  economia: number;
  percentual: number;
};

export type EconomiaFornecedor = {
  fornecedor: string;
  economia: number;
  negociacoes: number;
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useRelatorioNegociacoes(periodo: string) {
  const months = useMemo(() => {
    if (periodo === "1m") return 1;
    if (periodo === "3m") return 3;
    if (periodo === "12m") return 12;
    return 6;
  }, [periodo]);

  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString();
  }, [months]);

  const cotacoesQuery = useQuery({
    queryKey: ["rel-neg-cotacoes", dateFrom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes")
        .select(
          "id, numero, solicitacao_id, fornecedor_id, valor_total, valor_unitario, desconto_percentual, status, selecionada, avaliador_id, created_at, prazo_entrega",
        )
        .gte("created_at", dateFrom)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const fornecedoresQuery = useQuery({
    queryKey: ["rel-neg-fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome_fantasia, razao_social");
      if (error) throw error;
      return data || [];
    },
  });

  const avaliadoresQuery = useQuery({
    queryKey: ["rel-neg-avaliadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email");
      if (error) throw error;
      return data || [];
    },
  });

  const solicitacoesQuery = useQuery({
    queryKey: ["rel-neg-solicitacoes", dateFrom],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitacoes")
        .select("id, produto_id, valor_estimado, created_at")
        .gte("created_at", dateFrom);
      if (error) throw error;
      return data || [];
    },
  });

  const produtosQuery = useQuery({
    queryKey: ["rel-neg-produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, categoria_id");
      if (error) throw error;
      return data || [];
    },
  });

  const categoriasQuery = useQuery({
    queryKey: ["rel-neg-categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome");
      if (error) throw error;
      return data || [];
    },
  });

  const data = useMemo(() => {
    if (!cotacoesQuery.data) return null;

    const cotacoes = cotacoesQuery.data;
    const fornecedores = fornecedoresQuery.data || [];
    const avaliadores = avaliadoresQuery.data || [];
    const solicitacoes = solicitacoesQuery.data || [];
    const produtos = produtosQuery.data || [];
    const categorias = categoriasQuery.data || [];

    const fornById = new Map(fornecedores.map((f) => [f.id, f]));
    const avalById = new Map(avaliadores.map((p) => [p.id, p]));
    const catById = new Map(categorias.map((c) => [c.id, c.nome]));
    const prodById = new Map(produtos.map((p) => [p.id, p]));
    const solById = new Map(solicitacoes.map((s) => [s.id, s]));

    const iniciadas = cotacoes.filter((c) => c.status !== "aprovada");
    const economiaPorCotacao = (c: (typeof cotacoes)[number]) => {
      const vu = Number(c.valor_unitario) || 0;
      const desconto = Number(c.desconto_percentual) || 0;
      return Number(c.valor_total) - vu * (desconto / 100);
    };

    // 1) Historico mensal
    const byMonth = new Map<string, { volume: number; economia: number; cotacoes: number; desc: number }>();
    for (const c of cotacoes) {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = byMonth.get(key) || { volume: 0, economia: 0, cotacoes: 0, desc: 0 };
      cur.volume += Number(c.valor_total) || 0;
      cur.economia += economiaPorCotacao(c);
      cur.cotacoes += 1;
      cur.desc += Number(c.desconto_percentual) || 0;
      byMonth.set(key, cur);
    }
    const historicoMensal: HistoricoMensal[] = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [, mm] = key.split("-");
        const idx = Math.max(0, Math.min(11, Number(mm) - 1));
        const vol = v.volume || 1;
        return {
          mes: MESES[idx],
          economia: Math.round(v.economia),
          volume: Math.round(v.volume),
          percentual: Number(((v.economia / vol) * 100).toFixed(1)),
          cotacoes: v.cotacoes,
        };
      });

    // 2) Comparativo compradores (avaliadores)
    const byAval = new Map<string, { economia: number; cotacoes: number; volume: number; precos: number[] }>();
    for (const c of cotacoes) {
      if (!c.avaliador_id) continue;
      const cur = byAval.get(c.avaliador_id) || { economia: 0, cotacoes: 0, volume: 0, precos: [] };
      cur.economia += economiaPorCotacao(c);
      cur.cotacoes += 1;
      cur.volume += Number(c.valor_total) || 0;
      if (c.selecionada) cur.precos.push(Number(c.score_total) || 0);
      byAval.set(c.avaliador_id, cur);
    }
    const comparativoCompradores: Comprador[] = Array.from(byAval.entries())
      .map(([id, v]) => {
        const prof = avalById.get(id);
        const fullName = prof?.full_name || prof?.display_name || prof?.email || "Usuário";
        const initials = fullName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w[0]?.toUpperCase() || "")
          .join("") || "U";
        const vol = v.volume || 1;
        return {
          id,
          nome: fullName,
          economia: Math.round(v.economia),
          percentual: Number(((v.economia / vol) * 100).toFixed(1)),
          cotacoes: v.cotacoes,
          melhorPreco: v.precos.length
            ? Math.round(v.precos.reduce((a, b) => a + b, 0) / v.precos.length)
            : Math.round((v.economia / vol) * 100),
          tendencia: "up" as const,
          avatar: initials,
        };
      })
      .sort((a, b) => b.economia - a.economia)
      .slice(0, 8);

    // 3) Economia por categoria (via solicitacao -> produto -> categoria)
    const byCat = new Map<string, { economia: number; volume: number }>();
    for (const c of cotacoes) {
      const sol = c.solicitacao_id ? solById.get(c.solicitacao_id) : undefined;
      if (!sol) continue;
      const prod = sol.produto_id ? prodById.get(sol.produto_id) : undefined;
      const catId = prod?.categoria_id || "sem-categoria";
      const catNome = prod?.categoria_id ? catById.get(prod.categoria_id) || "Outros" : "Sem categoria";
      const cur = byCat.get(catId) || { economia: 0, volume: 0 };
      cur.economia += economiaPorCotacao(c);
      cur.volume += Number(c.valor_total) || 0;
      byCat.set(catId, { ...cur, _nome: catNome } as any);
    }
    const economiaPorCategoria: EconomiaCategoria[] = Array.from(byCat.entries())
      .map(([id, v]: any) => {
        const vol = v.volume || 1;
        return {
          categoria: v._nome || id,
          economia: Math.round(v.economia),
          percentual: Number(((v.economia / vol) * 100).toFixed(1)),
        };
      })
      .sort((a, b) => b.economia - a.economia)
      .slice(0, 8);

    // 4) Economia por fornecedor
    const byForn = new Map<string, { economia: number; negociacoes: number }>();
    for (const c of cotacoes) {
      if (!c.fornecedor_id) continue;
      const cur = byForn.get(c.fornecedor_id) || { economia: 0, negociacoes: 0 };
      cur.economia += economiaPorCotacao(c);
      cur.negociacoes += 1;
      byForn.set(c.fornecedor_id, cur);
    }
    const economiaPorFornecedor: EconomiaFornecedor[] = Array.from(byForn.entries())
      .map(([id, v]) => {
        const f = fornById.get(id);
        return {
          fornecedor: f?.nome_fantasia || f?.razao_social || "Fornecedor",
          economia: Math.round(v.economia),
          negociacoes: v.negociacoes,
        };
      })
      .sort((a, b) => b.economia - a.economia)
      .slice(0, 8);

    return {
      historicoMensal,
      comparativoCompradores,
      economiaPorCategoria,
      economiaPorFornecedor,
      totalCotacoes: cotacoes.length,
    };
  }, [cotacoesQuery.data, fornecedoresQuery.data, avaliadoresQuery.data, solicitacoesQuery.data, produtosQuery.data, categoriasQuery.data]);

  const isLoading =
    cotacoesQuery.isLoading ||
    fornecedoresQuery.isLoading ||
    avaliadoresQuery.isLoading ||
    solicitacoesQuery.isLoading;

  return { data, isLoading };
}
