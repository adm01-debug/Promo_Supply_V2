import { useState, useMemo } from "react";
import { 
  Boxes, Search, Plus, ArrowUpRight, ArrowDownLeft, 
  History, AlertTriangle, MapPin, Package, Filter,
  TrendingUp, TrendingDown, ClipboardList
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { useEstoque } from "@/hooks/useEstoque";
import { useProdutos } from "@/hooks/useProdutos";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/feedbackToast";

const GestaoEstoque = () => {
  const { estoque, isLoading, movimentar, criarItemEstoque } = useEstoque();
  const { produtos } = useProdutos();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [movimentacaoOpen, setMovimentacaoOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    produto_id: "",
    localizacao: "Geral",
    estoque_minimo: 0,
  });

  const [movData, setMovData] = useState({
    tipo: "entrada" as "entrada" | "saida",
    quantidade: 0,
    motivo: "",
  });

  const filtered = useMemo(() => {
    return estoque.filter(item => 
      item.produto_nome?.toLowerCase().includes(search.toLowerCase()) ||
      item.produto_codigo?.toLowerCase().includes(search.toLowerCase()) ||
      item.localizacao.toLowerCase().includes(search.toLowerCase())
    );
  }, [estoque, search]);

  const stats = useMemo(() => {
    const totalItems = filtered.length;
    const alertItems = filtered.filter(i => i.quantidade_atual <= (i.estoque_minimo || 0)).length;
    const totalEstoque = filtered.reduce((acc, i) => acc + Number(i.quantidade_atual), 0);
    
    return { totalItems, alertItems, totalEstoque };
  }, [filtered]);

  const handleCreate = async () => {
    if (!formData.produto_id) {
      toast.error("Selecione um produto");
      return;
    }
    await criarItemEstoque.mutateAsync(formData);
    setModalOpen(false);
  };

  const handleMovimentar = async () => {
    if (movData.quantidade <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }
    await movimentar.mutateAsync({
      estoque_id: selectedItem.id,
      tipo: movData.tipo,
      quantidade: movData.quantidade,
      motivo: movData.motivo,
      referencia_tipo: "ajuste_manual",
      referencia_id: null
    });
    setMovimentacaoOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Boxes}
        title="Gestão de Estoque 10/10"
        description="Monitoramento neural de inventário e rastreabilidade logística"
        actions={[
          {
            label: "Novo Item",
            icon: Plus,
            onClick: () => setModalOpen(true),
          },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-background to-muted/30 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total de SKUs</p>
              <p className="text-3xl font-bold tracking-tight">{stats.totalItems}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-background to-destructive/5 border-destructive/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Abaixo do Mínimo</p>
              <p className="text-3xl font-bold text-destructive tracking-tight">{stats.alertItems}</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-background to-success/5 border-success/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Saldo Total</p>
              <p className="text-3xl font-bold text-success tracking-tight">{stats.totalEstoque.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-background to-blue-500/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Localizações</p>
              <p className="text-3xl font-bold text-blue-500 tracking-tight">
                {new Set(estoque.map(e => e.localizacao)).size}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <MapPin className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar SKU, nome do produto ou localização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/20 border-border/50 focus:border-primary/50 transition-all"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros Avançados
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/50">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Produto</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Saldo Atual</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-48 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-16 mx-auto bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-12 ml-auto bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell><div className="h-4 w-12 ml-auto bg-muted animate-pulse rounded" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhum item de estoque encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const percent = Math.min((Number(item.quantidade_atual) / (Number(item.estoque_minimo || 1) * 2)) * 100, 100);
                  const isLow = Number(item.quantidade_atual) <= Number(item.estoque_minimo || 0);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors group">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.produto_nome}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {item.produto_codigo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {item.localizacao}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isLow ? "destructive" : "secondary"} className="animate-in fade-in zoom-in duration-300">
                          {isLow ? "Crítico" : "Normal"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("font-bold text-lg", isLow ? "text-destructive" : "text-foreground")}>
                            {Number(item.quantidade_atual).toLocaleString()}
                          </span>
                          <Progress value={percent} className={cn("h-1 w-20", isLow ? "bg-destructive/20" : "bg-primary/20")} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-muted-foreground">
                        {Number(item.estoque_minimo || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedItem(item);
                            setMovimentacaoOpen(true);
                          }}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Modal Novo Item */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Vincular Produto ao Estoque</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <select 
                className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.produto_id}
                onChange={(e) => setFormData(prev => ({ ...prev, produto_id: e.target.value }))}
              >
                <option value="">Selecione um produto...</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input 
                value={formData.localizacao}
                onChange={(e) => setFormData(prev => ({ ...prev, localizacao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input 
                type="number"
                value={formData.estoque_minimo}
                onChange={(e) => setFormData(prev => ({ ...prev, estoque_minimo: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={criarItemEstoque.isPending}>
              {criarItemEstoque.isPending ? "Criando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Movimentação */}
      <Dialog open={movimentacaoOpen} onOpenChange={setMovimentacaoOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Movimentação Manual: {selectedItem?.produto_nome}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-2">
              <Button 
                variant={movData.tipo === 'entrada' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setMovData(prev => ({ ...prev, tipo: 'entrada' }))}
              >
                <ArrowUpRight className="h-4 w-4" /> Entrada
              </Button>
              <Button 
                variant={movData.tipo === 'saida' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setMovData(prev => ({ ...prev, tipo: 'saida' }))}
              >
                <ArrowDownLeft className="h-4 w-4" /> Saída
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input 
                type="number"
                value={movData.quantidade}
                onChange={(e) => setMovData(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo / Observação</Label>
              <Input 
                value={movData.motivo}
                onChange={(e) => setMovData(prev => ({ ...prev, motivo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleMovimentar} disabled={movimentar.isPending}>
              {movimentar.isPending ? "Processando..." : "Registrar Movimentação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestaoEstoque;
