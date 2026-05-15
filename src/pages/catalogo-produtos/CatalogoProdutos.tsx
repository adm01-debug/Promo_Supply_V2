import { useState, useMemo } from "react";
import {
  Package, Search, Plus, Edit2, Tag, Building2, DollarSign,
  TrendingUp, TrendingDown, Filter, X, Grid3X3, List,
} from "lucide-react";
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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    <div className="space-y-4">
      <PageHeader
        icon={Package}
        title={t("catalog.title", "Catálogo de Produtos")}
        description={t("catalog.subtitle", "Gerencie produtos, preços e categorias")}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("common.new", "Novo")}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <Tag className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Com preço ref.</p>
              <p className="text-2xl font-bold">{stats.withRef}</p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Preço médio</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.avgPrice)}</p>
            </div>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código ou descrição..."
              className="pl-9"
              aria-label="Buscar produtos"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-56" aria-label="Filtrar por categoria">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Visualizar em grade"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="Visualizar em lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum produto encontrado.
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const variation = priceVariation(p);
            return (
              <Card key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.codigo}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(p)}
                    aria-label={`Editar ${p.nome}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                {p.descricao && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.descricao}</p>
                )}
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ref:</span>
                  <span className="font-medium">{formatCurrency(p.preco_referencia)}</span>
                </div>
                {variation != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Último:</span>
                    <span className={cn("flex items-center gap-1 font-medium", variation > 0 ? "text-destructive" : "text-success")}>
                      {variation > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {variation.toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant={p.ativo ? "default" : "secondary"}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Preço Ref.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{p.unidade}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.preco_referencia)}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo ? "default" : "secondary"}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(p)}
                        aria-label={`Editar ${p.nome}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo || ""}
                onChange={(e) => updateField("codigo", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome || ""}
                onChange={(e) => updateField("nome", e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao || ""}
                onChange={(e) => updateField("descricao", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                value={formData.unidade || ""}
                onChange={(e) => updateField("unidade", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preco">Preço Referência</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                value={formData.preco_referencia ?? 0}
                onChange={(e) => updateField("preco_referencia", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select
                value={formData.categoria_id || ""}
                onValueChange={(v) => updateField("categoria_id", v)}
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estoque_min">Estoque Mínimo</Label>
              <Input
                id="estoque_min"
                type="number"
                value={formData.estoque_minimo ?? 0}
                onChange={(e) => updateField("estoque_minimo", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nome || !formData.codigo}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogoProdutos;
