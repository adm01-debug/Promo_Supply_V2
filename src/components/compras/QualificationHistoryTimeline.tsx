import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, CheckCircle2, XCircle, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

const ACTION_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  qualified: { icon: CheckCircle2, color: 'text-success', label: 'Qualificado' },
  disqualified: { icon: XCircle, color: 'text-destructive', label: 'Desqualificado' },
  document_approved: { icon: FileText, color: 'text-success', label: 'Doc. Aprovado' },
  document_rejected: { icon: FileText, color: 'text-destructive', label: 'Doc. Rejeitado' },
  score_updated: { icon: RefreshCw, color: 'text-primary', label: 'Score Atualizado' },
  review: { icon: ShieldCheck, color: 'text-info', label: 'Revisão' },
};

interface Props {
  fornecedorId?: string;
}

export const QualificationHistoryTimeline = ({ fornecedorId }: Props) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['qualification-history', fornecedorId],
    queryFn: async () => {
      let query = supabase
        .from('qualification_history')
        .select('*, fornecedor:fornecedores(razao_social, nome_fantasia)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fornecedorId) {
        query = query.eq('fornecedor_id', fornecedorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) {
    return <Card><CardContent className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Histórico de Qualificação
        </CardTitle>
        <CardDescription>{history.length} evento(s) registrados</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum histórico de qualificação</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

            {history.map((item: any, idx: number) => {
              const config = ACTION_CONFIG[item.action_type] || { icon: History, color: 'text-muted-foreground', label: item.action_type };
              const Icon = config.icon;
              return (
                <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className={`relative z-10 w-10 h-10 rounded-full border-2 border-background bg-card flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{config.label}</Badge>
                      {!fornecedorId && item.fornecedor && (
                        <span className="text-sm font-medium truncate">
                          {item.fornecedor.nome_fantasia || item.fornecedor.razao_social}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                    {(item.old_value || item.new_value) && (
                      <div className="flex gap-2 mt-1 text-xs">
                        {item.old_value && <span className="text-muted-foreground line-through">{item.old_value}</span>}
                        {item.new_value && <span className="font-medium text-foreground">{item.new_value}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
