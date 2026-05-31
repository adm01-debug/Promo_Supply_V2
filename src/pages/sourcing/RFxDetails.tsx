import { useParams, useNavigate } from "react-router-dom";
import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Gavel, 
  FileText, 
  Users, 
  ClipboardList,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Brain
} from "lucide-react";
import { useSourcingEventDetails } from "@/hooks/useLicitacoes";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const RFxDetails = memo(() => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { event, loadingEvent } = useSourcingEventDetails(id || null);

  if (loadingEvent) {
    return (
      
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 col-span-2" />
            <Skeleton className="h-48" />
          </div>
        </div>
      
    );
  }

  if (!event) {
    return (
      
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Evento não encontrado</h2>
          <Button onClick={() => navigate("/sourcing")}>Voltar para Lista</Button>
        </div>
      
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'in_progress': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'evaluation': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'awarded': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'published': return 'Publicado';
      case 'in_progress': return 'Em Andamento';
      case 'evaluation': return 'Em Avaliação';
      case 'awarded': return 'Adjudicado';
      default: return status;
    }
  };

  const responseRate = (event.invitations && event.invitations.length > 0)
    ? Math.round((event.responses?.length || 0) / (event.invitations?.length || 1) * 100) 
    : 0;

  return (
    
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sourcing")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono">{event.numero}</Badge>
              <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
              <Badge variant="secondary" className="uppercase text-[10px]">{event.type}</Badge>
            </div>
            <h1 className="text-2xl font-bold mt-1">{event.title}</h1>
          </div>
          {event.type === 'auction' && event.status === 'in_progress' && (
            <Button className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => navigate(`/sourcing/${id}/auction`)}>
              <Gavel className="w-4 h-4" />
              Ver Sala de Leilão
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Visão Geral</TabsTrigger>
                <TabsTrigger value="items" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Itens e Lotes</TabsTrigger>
                <TabsTrigger value="responses" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">
                  Respostas
                  <Badge variant="secondary" className="ml-2">{event.responses?.length || 0}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Descrição</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description || "Nenhuma descrição fornecida."}
                  </p>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      Critérios de Seleção
                    </h3>
                    <div className="space-y-4">
                      {event.criteria?.map((c: { id: string; nome: string; peso: number }) => (
                        <div key={c.id} className="flex items-center justify-between">
                          <span className="text-sm">{c.nome}</span>
                          <Badge variant="secondary">{c.peso}%</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Datas Importantes
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lançamento:</span>
                        <span className="font-medium">{new Date(event.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fechamento:</span>
                        <span className="font-medium text-destructive">{new Date(event.closes_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Adjudicação Estimada:</span>
                        <span className="font-medium">{event.award_deadline ? new Date(event.award_deadline).toLocaleDateString('pt-BR') : '-'}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="items" className="mt-6">
                <div className="space-y-4">
                  {event.lots?.map((lot: any) => (
                    <Card key={lot.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{lot.nome}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{lot.descricao}</p>
                        </div>
                        {lot.preco_referencia && (
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block uppercase font-semibold">Preço Referência</span>
                            <span className="text-lg font-bold">
                              {lot.preco_referencia.toLocaleString('pt-BR', { style: 'currency', currency: event.currency })}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="responses" className="mt-6">
                <div className="space-y-4">
                  {event.responses && event.responses.length > 0 ? (
                    event.responses.map((resp: any) => (
                      <Card key={resp.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{resp.fornecedor?.razao_social}</h4>
                              <p className="text-xs text-muted-foreground">Submetido em {new Date(resp.created_at).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-6">
                            <div>
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Valor Total</span>
                              <span className="font-bold">{resp.total_preco?.toLocaleString('pt-BR', { style: 'currency', currency: event.currency })}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Score</span>
                              <Badge>{resp.total_score?.toFixed(1) || '0.0'}</Badge>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-muted/30 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground">Aguardando as primeiras propostas dos fornecedores convidados.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Engajamento</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Respostas:</span>
                    <span className="font-bold">{event.responses?.length || 0} / {event.invitations?.length || 0}</span>
                  </div>
                  <Progress value={responseRate} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <span className="text-xs text-muted-foreground block">Visualizações</span>
                    <span className="text-lg font-bold">{event.invitations?.filter((i: { viewed_at: string | null }) => i.viewed_at).length || 0}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Declinados</span>
                    <span className="text-lg font-bold text-destructive">{event.invitations?.filter((i: { declined_at: string | null }) => i.declined_at).length || 0}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Ações</h3>
              <div className="space-y-2">
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Users className="w-4 h-4" />
                  Gerenciar Convites
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <MessageSquare className="w-4 h-4" />
                  Chat com Fornecedores
                </Button>
                <Button className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10" variant="ghost">
                  <AlertCircle className="w-4 h-4" />
                  Cancelar Evento
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-2">Resumo Financeiro</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span>{event.budget_estimate?.toLocaleString('pt-BR', { style: 'currency', currency: event.currency })}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-foreground">Melhor Oferta:</span>
                  <span className="text-emerald-600">
                    {event.responses && event.responses.length > 0 
                      ? Math.min(...event.responses.map((r: any) => r.total_preco || 0)).toLocaleString('pt-BR', { style: 'currency', currency: event.currency })
                      : '-'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-violet-500/20 bg-violet-500/5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" />
                Inteligência de Compras
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs text-muted-foreground mb-2">Análise de IA:</p>
                  <p className="text-[13px] leading-relaxed">
                    {event.responses && event.responses.length > 0 
                      ? `Identificamos que o fornecedor ${[...event.responses].sort((a,b) => a.valor_total - b.valor_total)[0]?.fornecedor?.razao_social} possui a melhor oferta financeira, com um saving de ${(((event.budget_estimate || 0) - Math.min(...event.responses.map((r: any) => r.valor_total))) / (event.budget_estimate || 1) * 100).toFixed(1)}% em relação ao budget.`
                      : "Aguardando propostas para realizar análise comparativa de Lead Time e Preço."}
                  </p>
                </div>
                <Button className="w-full gap-2 bg-violet-600 hover:bg-violet-700 h-9 text-xs">
                  Gerar Tabela Comparativa Automática
                </Button>
                <Button variant="outline" className="w-full gap-2 h-9 text-xs">
                  Cobrar Fornecedores Pendentes (WhatsApp)
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    
  );
});

export default RFxDetails;