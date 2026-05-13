import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Gavel, 
  FileText, 
  ClipboardCheck, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Filter,
  Search as SearchIcon
} from "lucide-react";
import { useSourcingEvents } from "@/hooks/useLicitacoes";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const Sourcing = () => {
  const navigate = useNavigate();
  const { events, isLoading } = useSourcingEvents();
  const [activeTab, setActiveTab] = useState("all");

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
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Strategic Sourcing (RFx)</h1>
            <p className="text-muted-foreground">Gerencie eventos complexos de RFI, RFP, RFQ e Leilões Reversos.</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Evento
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Eventos Ativos</p>
              <p className="text-xl font-bold">12</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Aguardando Avaliação</p>
              <p className="text-xl font-bold">4</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Adjudicados (Mês)</p>
              <p className="text-xl font-bold">28</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Saving Total</p>
              <p className="text-xl font-bold">R$ 142k</p>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por número, título ou fornecedor..." />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtros
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Todos</TabsTrigger>
              <TabsTrigger value="rfp" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">RFPs</TabsTrigger>
              <TabsTrigger value="rfq" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">RFQs</TabsTrigger>
              <TabsTrigger value="auction" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Leilões</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
              ) : events.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {events.map((event: any) => (
                    <Card key={event.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px]">{event.numero}</Badge>
                            <Badge className={getStatusColor(event.status)}>{getStatusLabel(event.status)}</Badge>
                            <Badge variant="secondary" className="capitalize">{event.type}</Badge>
                          </div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Categoria: {event.category?.nome || 'Geral'}</span>
                            <span>•</span>
                            <span>Fecha em: {new Date(event.closes_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="text-xs text-muted-foreground">Estimativa</div>
                          <div className="font-bold text-lg">
                            {event.budget_estimate?.toLocaleString('pt-BR', { style: 'currency', currency: event.currency })}
                          </div>
                          <Button variant="ghost" size="sm" className="gap-2">
                            Ver Detalhes
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center space-y-4 border-dashed">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Gavel className="w-6 h-6 text-primary" />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <h3 className="font-semibold text-lg">Nenhum evento encontrado</h3>
                    <p className="text-sm text-muted-foreground">Comece criando um novo Request for Proposal ou Quote para seus fornecedores.</p>
                  </div>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Evento
                  </Button>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default Sourcing;