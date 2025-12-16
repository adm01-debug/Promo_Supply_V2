import { useState } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  LayoutGrid, 
  List, 
  Search, 
  Filter,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  CreditCard,
  FileText,
  AlertTriangle
} from "lucide-react";
import { solicitacoesMock, getStatusLabel, getTipoLabel } from "@/data/mockData";
import { PedidoTimeline } from "@/components/compras/PedidoTimeline";
import { KanbanBoard } from "@/components/compras/KanbanBoard";

type ViewMode = 'kanban' | 'timeline';

const Acompanhamento = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState("");
  const [pedidos, setPedidos] = useState(solicitacoesMock);

  const filteredPedidos = pedidos.filter(pedido => 
    pedido.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.empresa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const stats = {
    total: pedidos.length,
    emAndamento: pedidos.filter(p => !['ENTREGUE'].includes(p.status)).length,
    atrasados: pedidos.filter(p => new Date(p.prazoEntrega) < new Date() && p.status !== 'ENTREGUE').length,
    concluidos: pedidos.filter(p => p.status === 'ENTREGUE').length,
  };

  const handleStatusChange = (pedidoId: string, newStatus: string) => {
    setPedidos(prev => prev.map(p => 
      p.id === pedidoId ? { ...p, status: newStatus as any } : p
    ));
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Acompanhamento de Pedidos
            </h1>
            <p className="text-muted-foreground text-sm">
              Visualize e acompanhe o progresso de todas as solicitações
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className="gap-2"
            >
              <List className="w-4 h-4" />
              Timeline
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Pedidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.emAndamento}</p>
                  <p className="text-xs text-muted-foreground">Em Andamento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.atrasados}</p>
                  <p className="text-xs text-muted-foreground">Atrasados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.concluidos}</p>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto, item ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        {/* Content */}
        {viewMode === 'kanban' ? (
          <KanbanBoard 
            pedidos={filteredPedidos} 
            onStatusChange={handleStatusChange}
          />
        ) : (
          <PedidoTimeline pedidos={filteredPedidos} />
        )}
      </div>
    </MainLayout>
  );
};

export default Acompanhamento;
