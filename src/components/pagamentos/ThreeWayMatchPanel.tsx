import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Link2, FileText, ShoppingCart, CreditCard } from "lucide-react";
import { format } from "date-fns/format";
import type { Pagamento } from "@/hooks/usePagamentos";
import { formatCurrency } from "@/lib/utils";

interface Props {
  pagamento: Pagamento;
}

export const ThreeWayMatchPanel = ({ pagamento }: Props) => {
  // Fetch linked fiscal document
  const { data: nf } = useQuery({
    queryKey: ['fiscal-match', pagamento.numero_nf],
    queryFn: async () => {
      if (!pagamento.numero_nf) return null;
      const { data } = await supabase
        .from('fiscal_documents')
        .select('*')
        .eq('numero_nf', pagamento.numero_nf)
        .maybeSingle();
      return data;
    },
    enabled: !!pagamento.numero_nf,
  });

  // Fetch linked pedido
  const { data: pedido } = useQuery({
    queryKey: ['pedido-match', pagamento.pedido_id],
    queryFn: async () => {
      if (!pagamento.pedido_id) return null;
      const { data } = await supabase
        .from('pedidos')
        .select('id, numero, valor_total, status')
        .eq('id', pagamento.pedido_id)
        .maybeSingle();
      return data;
    },
    enabled: !!pagamento.pedido_id,
  });

  const matchStatus = useMemo(() => {
    const items = [
      { label: 'Pedido (PO)', icon: ShoppingCart, found: !!pedido, valor: pedido?.valor_total, numero: pedido?.numero },
      { label: 'Nota Fiscal', icon: FileText, found: !!nf, valor: nf?.valor_total, numero: nf?.numero_nf },
      { label: 'Pagamento', icon: CreditCard, found: true, valor: pagamento.valor, numero: pagamento.numero },
    ];

    // Check value divergence
    const valores = items.filter(i => i.found && i.valor).map(i => i.valor!);
    const allMatch = valores.length > 1 && valores.every(v => Math.abs(v - valores[0]) < 0.01);
    const hasDivergence = valores.length > 1 && !allMatch;

    return { items, allMatch, hasDivergence, matchCount: items.filter(i => i.found).length };
  }, [pedido, nf, pagamento]);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Three-Way Match</span>
        {matchStatus.allMatch && (
          <Badge variant="outline" className="bg-success/10 text-success text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" /> Reconciliado
          </Badge>
        )}
        {matchStatus.hasDivergence && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs gap-1">
            <AlertTriangle className="h-3 w-3" /> Divergência
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {matchStatus.items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${item.found ? 'text-success' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-xs font-medium">{item.label}</p>
                  {item.found && item.numero && (
                    <p className="text-[10px] text-muted-foreground font-mono">{item.numero}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {item.found ? (
                  <span className="text-xs font-bold">{item.valor ? formatCurrency(item.valor) : '-'}</span>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Não vinculado</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {matchStatus.hasDivergence && (
        <div className="p-2 rounded bg-destructive/5 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-xs text-destructive dark:text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Valores divergentes entre documentos. Verifique antes de confirmar.
          </p>
        </div>
      )}
    </Card>
  );
};
