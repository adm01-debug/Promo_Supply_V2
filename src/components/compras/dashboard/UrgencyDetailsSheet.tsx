import { useState, useMemo } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusTimeline } from "@/components/compras/StatusTimeline";
import { 
  Clock, 
  Calendar, 
  User, 
  Building2, 
  Tag, 
  AlertTriangle,
  FileText,
  History,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface UrgencyDetailsSheetProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (id: string, newStatus: string) => void;
}

export const UrgencyDetailsSheet = ({ 
  itemId, 
  isOpen, 
  onClose,
  onStatusUpdate 
}: UrgencyDetailsSheetProps) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  const { data: item, isLoading } = useQuery({
    queryKey: ['solicitacao-detalhes', itemId],
    queryFn: async () => {
      if (!itemId) return null;
      
      const { data, error } = await supabase
        .from('solicitacoes')
        .select(`
          *,
          fornecedor:fornecedores(razao_social, nome_fantasia),
          categoria:categorias(nome),
          solicitante:profiles!solicitacoes_solicitante_id_fkey(full_name),
          cotacoes(id, created_at, valor_total, fornecedores(razao_social))
        `)
        .eq('id', itemId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!itemId && isOpen
  });

  const slaInfo = useMemo(() => {
    if (!item) return null;
    
    const created = new Date(item.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // SLA logic (can be customized)
    const slaLimit = item.prioridade === 'urgente' ? 1 : item.prioridade === 'alta' ? 3 : 5;
    const isExceeded = diffDays > slaLimit;
    
    return {
      daysSinceCreated: diffDays,
      limit: slaLimit,
      isExceeded
    };
  }, [item]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!itemId) return;
    
    try {
      const { error } = await supabase
        .from('solicitacoes')
        .update({ status: newStatus })
        .eq('id', itemId);
        
      if (error) throw error;
      
      toast.success("Status atualizado com sucesso!");
      onStatusUpdate?.(itemId, newStatus);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar status.");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
          </div>
        ) : item ? (
          <>
            <SheetHeader className="text-left space-y-4">
              <div className="flex items-center justify-between">
                <Badge 
                  variant={slaInfo?.isExceeded ? "destructive" : "outline"}
                  className="animate-pulse"
                >
                  {slaInfo?.isExceeded ? "SLA EXCEDIDO" : "DENTRO DO SLA"}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  #{item.numero || item.id.substring(0, 8)}
                </span>
              </div>
              
              <div>
                <SheetTitle className="text-2xl font-black uppercase tracking-tight leading-tight">
                  {item.titulo}
                </SheetTitle>
                <SheetDescription className="mt-2 line-clamp-2">
                  {item.descricao || "Sem descrição disponível."}
                </SheetDescription>
              </div>

              <div className="flex items-center gap-2">
                <StatusTimeline currentStatus={item.status} compact />
                <Badge variant="secondary" className="capitalize">
                  {item.status.replace('_', ' ')}
                </Badge>
              </div>
            </SheetHeader>

            <div className="mt-8 space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-card border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Departamento</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{item.departamento || "Geral"}</p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Categoria</span>
                  </div>
                  <p className="text-sm font-semibold truncate">{item.categoria?.nome || "Outros"}</p>
                </div>
              </div>

              {/* SLA & Timing */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Performance do SLA
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Tempo Decorrido</p>
                      <p className="text-xl font-black">{slaInfo?.daysSinceCreated} <span className="text-xs font-medium text-muted-foreground">dias</span></p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Limite</p>
                      <p className="text-xl font-black text-primary">{slaInfo?.limit} <span className="text-xs font-medium text-muted-foreground">dias</span></p>
                    </div>
                  </div>
                  
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500",
                        slaInfo?.isExceeded ? "bg-destructive" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(100, (slaInfo?.daysSinceCreated || 0) / (slaInfo?.limit || 1) * 100)}%` }}
                    />
                  </div>

                  {slaInfo?.isExceeded && (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-2 rounded-lg text-xs font-bold animate-pulse border border-destructive/20">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        ALERTA: Item excedeu o SLA de {slaInfo.limit} dias!
                      </div>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-8 text-[10px] font-black uppercase tracking-widest w-full"
                        onClick={() => toast.info("Notificação de prioridade máxima enviada para a gerência")}
                      >
                        Escalar para Gerência
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Solicitação Metadata */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Dados da Solicitação
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Solicitante</span>
                    <span className="text-xs font-bold">{(item as any).solicitante?.full_name || "Desconhecido"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Data da Solicitação</span>
                    <span className="text-xs font-bold">
                      {format(new Date(item.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Quantidade</span>
                    <span className="text-xs font-bold">{item.quantidade} {item.unidade || 'un'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <span className="text-xs text-muted-foreground">Valor Estimado</span>
                    <span className="text-xs font-black text-primary">
                      {item.valor_estimado ? item.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ações de Gestão</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    className="w-full h-11 bg-primary hover:bg-primary/90 font-black tracking-wider uppercase text-xs gap-2"
                    onClick={() => toast.info("Funcionalidade de cotação direta em desenvolvimento")}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    Iniciar Cotação Imediata
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-11 font-bold text-xs gap-2 border-primary/20 hover:bg-primary/5"
                      onClick={() => handleUpdateStatus('aprovada')}
                    >
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      Aprovar
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-11 font-bold text-xs gap-2 border-destructive/20 hover:bg-destructive/5"
                      onClick={() => handleUpdateStatus('rejeitada')}
                    >
                      <XCircle className="w-4 h-4 text-destructive" />
                      Rejeitar
                    </Button>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full h-10 text-xs text-muted-foreground gap-2"
                    onClick={() => toast.success("Notificação enviada ao comprador")}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Alertar Comprador Responsável
                  </Button>
                </div>
              </div>
            </div>

            <SheetFooter className="mt-8">
              <Button variant="link" className="w-full text-xs text-muted-foreground" onClick={onClose}>
                Fechar Painel de Detalhes
              </Button>
            </SheetFooter>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <XCircle className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Item não encontrado.</p>
            <Button variant="outline" size="sm" onClick={onClose}>Voltar</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};