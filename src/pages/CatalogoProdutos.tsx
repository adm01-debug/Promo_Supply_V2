import { useState, useMemo } from "react";
import {
  Package, Search, Plus, Edit2, Tag, Building2, DollarSign,
  TrendingUp, TrendingDown, Filter, X, Grid3X3, List,
} from "lucide-react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useProdutos, type Produto } from "@/hooks/useProdutos";
import { PageHeader } from "@/components/ui/page-header";

const formatCurrency = (v: number | null) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const emptyProduct: Partial<Produto> = {
  codigo: "",
  nome: "",
  descricao: "",
  unidade: "un",
  preco_referencia: 0,
  estoque_minimo: 0,
  ativo: true,
  tags: [],
};

const CatalogoProdutos = () => {
  const { produtos, isLoading, categorias, createProduto, updateProduto } = useProdutos();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Produto> | null>(null);
  const [formData, setFormData] = useState<Partial<Produto>>(emptyProduct);

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      const matchesSearch =
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (p.descricao || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.categoria_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [produtos, search, categoryFilter]);

  const stats = useMemo(() => ({
    total: produtos.length,
    active: produtos.filter((p) => p.ativo).length,
    withRef: produtos.filter((p) => (p.preco_referencia || 0) > 0).length,
    avgPrice: produtos.length > 0
      ? produtos.reduce((s, p) => s + (p.preco_medio || 0), 0) / produtos.filter(p => (p.preco_medio || 0) > 0).length || 0
      : 0,
  }), [produtos]);

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyProduct);
    setModalOpen(true);
  };

  const openEdit = (p: Produto) => {
    setEditing(p);
    setFormData({ ...p });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome || !formData.codigo) return;
    if (editing?.id) {
      updateProduto.mutate({ id: editing.id, ...formData });
    } else {
      createProduto.mutate(formData);
    }
    setModalOpen(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const priceVariation = (p: Produto) => {
    if (!p.preco_referencia || !p.ultimo_preco || p.preco_referencia === 0) return null;
    return ((p.ultimo_preco - p.preco_referencia) / p.preco_referencia) * 100;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Catálogo de Produtos"
        description="Gerencie produtos com preços de referência e histórico"
        icon={Package}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Produtos", value: stats.total, icon: Package },
          { label: "Ativos", value: stats.active, icon: Tag },
          { label: "Com Ref. Preço", value: stats.withRef, icon: DollarSign },
          { label: "Preço Médio", value: formatCurrency(stats.avgPrice), icon: TrendingUp },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <kpi.icon className="w-4 h-4" />
              {kpi.label}
            </div>
            <p className="text-xl font-bold">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
            <List className="w-4 h-4" />
          </Button>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const variation = priceVariation(p);
            return (
              <Card
                key={p.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openEdit(p)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.codigo}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7">
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {p.categoria_nome && (
                  <Badge variant="outline" className="text-xs mb-2">{p.categoria_nome}</Badge>
                )}

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ref:</span>
                    <span className="font-medium">{formatCurrency(p.preco_referencia)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Último:</span>
                    <span className="font-medium">{formatCurrency(p.ultimo_preco)}</span>
                  </div>
                  {variation !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Variação:</span>
                      <span className={cn(
                        "text-xs font-medium flex items-center gap-0.5",
                        variation > 0 ? "text-destructive" : "text-kpi-success"
                      )}>
                        {variation > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(variation).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {p.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">{tag}</Badge>
                    ))}
                  </div>
                )}

                {!p.ativo && (
                  <Badge variant="destructive" className="mt-2 text-xs">Inativo</Badge>
                )}
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum produto encontrado</p>
              <p className="text-sm">Tente ajustar os filtros ou crie um novo produto</p>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <ScrollArea className="max-h-[600px]">
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço Ref.</TableHead>
                  <TableHead className="text-right">Último Preço</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const variation = priceVariation(p);
                  return (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(p)}>
                      <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.categoria_nome || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.preco_referencia)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.ultimo_preco)}</TableCell>
                      <TableCell className="text-right">
                        {variation !== null ? (
                          <span className={cn("text-xs font-medium", variation > 0 ? "text-destructive" : "text-kpi-success")}>
                            {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{p.unidade}</TableCell>
                      <TableCell>
                        <Badge variant={p.ativo ? "default" : "secondary"} className="text-xs">
                          {p.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent aria-describedby="dialog-desc" className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {editing?.id ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input value={formData.codigo || ""} onChange={(e) => updateField("codigo", e.target.value)} placeholder="PROD-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={formData.unidade || "un"} onValueChange={(v) => updateField("unidade", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["un", "cx", "kg", "m", "l", "pct", "frd", "rl"].map((u) => (
                      <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase">UNSPSC</Label>
                <Input value={formData.codigo_unspsc || ""} onChange={(e) => updateField("codigo_unspsc", e.target.value)} placeholder="8 dígitos" className="text-xs h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase">CNAE</Label>
                <Input value={formData.codigo_cnae || ""} onChange={(e) => updateField("codigo_cnae", e.target.value)} placeholder="Atividade" className="text-xs h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase">NCM</Label>
                <Input value={formData.codigo_ncm || ""} onChange={(e) => updateField("codigo_ncm", e.target.value)} placeholder="Fiscal" className="text-xs h-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={formData.nome || ""} onChange={(e) => updateField("nome", e.target.value)} placeholder="Nome do produto" />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={formData.descricao || ""} onChange={(e) => updateField("descricao", e.target.value)} rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={formData.categoria_id || ""} onValueChange={(v) => updateField("categoria_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço de Referência</Label>
                <Input type="number" step="0.01" value={formData.preco_referencia || ""} onChange={(e) => updateField("preco_referencia", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Estoque Mínimo</Label>
                <Input type="number" value={formData.estoque_minimo || ""} onChange={(e) => updateField("estoque_minimo", parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createProduto.isPending || updateProduto.isPending}>
              {createProduto.isPending || updateProduto.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default CatalogoProdutos;
