import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, ShoppingCart, TrendingUp, Calendar, Sparkles, Loader2, CheckCircle, X, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/features/auth";

const RecompraInteligente = () => {
  const queryClient = useQueryClient();
  const { tenantId, organizationId } = useAuth();
  const activeTenantId = tenantId ?? organizationId;

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["repurchase-suggestions", activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repurchase_suggestions")
        .select("*, produto:produtos(nome, codigo, unidade), fornecedor:fornecedores(razao_social, nome_fantasia)")
        .eq("status", "sugerido")
        .order("proxima_compra_estimada", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: Boolean(activeTenantId),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!activeTenantId) {
        throw new Error("Organização ativa não identificada");
      }

      // Analyze purchase history to generate suggestions
      const { data: pedidoItens, error: piError } = await supabase
        .from("pedido_itens")
        .select("*, pedido:pedidos(fornecedor_id, data_emissao, status)")
        .eq("tenant_id", activeTenantId)
        .limit(500);
      if (piError) throw piError;

      // Group by product to find patterns
      type PedidoRef = { fornecedor_id: string | null; data_emissao: string | null; status: string | null } | null;
      type PedidoItemRow = {
        produto_id: string | null;
        descricao: string | null;
        quantidade: number;
        valor_unitario: number | string;
        pedido: PedidoRef;
      };
      type NewSuggestion = {
        tenant_id: string;
        produto_id: string | null;
        fornecedor_id: string | null;
        quantidade_sugerida: number;
        preco_estimado: number;
        frequencia_dias: number;
        proxima_compra_estimada: string;
        confianca_score: number;
        status: string;
      };

      const rows = (pedidoItens ?? []) as unknown as PedidoItemRow[];
      const productMap = new Map<string, PedidoItemRow[]>();
      rows.forEach(pi => {
        const key = pi.produto_id || pi.descricao;
        if (!key) return;
        if (!productMap.has(key)) productMap.set(key, []);
        productMap.get(key)!.push(pi);
      });

      const emissao = (pi: PedidoItemRow) => pi.pedido?.data_emissao ?? null;
      const newSuggestions: NewSuggestion[] = [];
      for (const [, items] of productMap) {
        if (items.length < 2) continue;

        const sorted = items
          .filter(i => Boolean(emissao(i)))
          .sort((a, b) => new Date(emissao(a)!).getTime() - new Date(emissao(b)!).getTime());

        if (sorted.length < 2) continue;

        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const diff = (new Date(emissao(sorted[i])!).getTime() - new Date(emissao(sorted[i - 1])!).getTime()) / (1000 * 60 * 60 * 24);
          intervals.push(diff);
        }

        const avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
        const lastDate = new Date(emissao(sorted[sorted.length - 1])!);
        const nextDate = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000);
        const avgQty = Math.round(sorted.reduce((a, b) => a + b.quantidade, 0) / sorted.length);
        const avgPrice = sorted.reduce((a, b) => a + Number(b.valor_unitario), 0) / sorted.length;

        if (nextDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
          newSuggestions.push({
            tenant_id: activeTenantId,
            produto_id: sorted[0].produto_id ?? null,
            fornecedor_id: sorted[sorted.length - 1].pedido?.fornecedor_id ?? null,
            quantidade_sugerida: avgQty,
            preco_estimado: Math.round(avgPrice * avgQty * 100) / 100,
            frequencia_dias: avgInterval,
            proxima_compra_estimada: nextDate.toISOString().split("T")[0],
            confianca_score: Math.min(95, 50 + sorted.length * 10),
            status: "sugerido",
          });
        }
      }

      if (newSuggestions.length > 0) {
        // Remove existing pending suggestions to avoid duplicates
        await supabase.from("repurchase_suggestions").delete().eq("status", "sugerido").eq("tenant_id", activeTenantId);
        const { error } = await supabase.from("repurchase_suggestions").insert(newSuggestions);
        if (error) throw error;
      }

      return newSuggestions.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions", activeTenantId] });
      toast.success(`${count} sugestão(ões) de recompra gerada(s)!`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar sugestões");
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("repurchase_suggestions")
        .update({ status: "descartado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions", activeTenantId] });
      toast.success("Sugestão descartada");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("repurchase_suggestions")
        .update({ status: "aceito" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repurchase-suggestions", activeTenantId] });
      toast.success("Sugestão aceita! Crie a solicitação.");
    },
  });

  return (
    
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Recompra Inteligente</h1>
              <p className="text-sm text-muted-foreground">Sugestões automáticas baseadas no histórico de compras</p>
            </div>
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Gerar Sugestões</>
            )}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{suggestions?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Sugestões Ativas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">
                  {suggestions?.filter(s => {
                    const d = s.proxima_compra_estimada;
                    return d && new Date(d) <= new Date();
                  }).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Vencidas (Urgente)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  R$ {(suggestions?.reduce((a, s) => a + Number(s.preco_estimado || 0), 0) || 0).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">Valor Estimado Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sugestões de Recompra</CardTitle>
            <CardDescription>Produtos com padrão de compra recorrente detectado</CardDescription>
          </CardHeader>
          <CardContent>
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-center">Qtd Sugerida</TableHead>
                  <TableHead className="text-right">Preço Est.</TableHead>
                  <TableHead className="text-center">Frequência</TableHead>
                  <TableHead>Próxima Compra</TableHead>
                  <TableHead className="text-center">Confiança</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions?.map(s => {
                  const row = s as typeof s & {
                    produto?: { nome?: string | null } | null;
                    fornecedor?: { razao_social?: string | null } | null;
                  };
                  const isOverdue = s.proxima_compra_estimada && new Date(s.proxima_compra_estimada) <= new Date();
                  return (
                    <TableRow key={s.id} className={isOverdue ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{row.produto?.nome || "Produto"}</TableCell>
                      <TableCell className="text-sm">{row.fornecedor?.razao_social || "-"}</TableCell>
                      <TableCell className="text-center">{s.quantidade_sugerida}</TableCell>
                      <TableCell className="text-right">R$ {Number(s.preco_estimado).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-center text-sm">{s.frequencia_dias} dias</TableCell>
                      <TableCell>
                        {s.proxima_compra_estimada ? (
                          <Badge variant={isOverdue ? "destructive" : "secondary"}>
                            {formatDate(s.proxima_compra_estimada)}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={Number(s.confianca_score) > 70 ? "default" : "secondary"}>
                          {Number(s.confianca_score).toFixed(0)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" className="h-7" onClick={() => acceptMutation.mutate(s.id)}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => dismissMutation.mutate(s.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!suggestions || suggestions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Clique em "Gerar Sugestões" para analisar o histórico de compras
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    
  );
};

export default RecompraInteligente;
