import { useState, useMemo } from "react";
import {
  Package, Search, Tag, Building2, DollarSign,
  TrendingUp, TrendingDown, Grid3X3, List, ImageIcon, Eye
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ProductSupplierManager } from "@/components/compras/ProductSupplierManager";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";

const formatCurrency = (v: number | null) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const CatalogoProdutos = () => {
  const { produtos, isLoading, categorias } = useProdutos();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<Produto | null>(null);

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

  const openDetails = (p: Produto) => {
    setSelected(p);
    setDetailsOpen(true);
  };

  const priceVariation = (p: Produto) => {
    if (!p.preco_referencia || !p.ultimo_preco || p.preco_referencia === 0) return null;
    return ((p.ultimo_preco - p.preco_referencia) / p.preco_referencia) * 100;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Package}
        title={t("catalog.title")}
        description={t("catalog.subtitle")}
      />

      <Card className="p-3 text-sm text-muted-foreground">
        Cadastro e edição de produtos são feitos no PIM (Promo Gifts V4). Esta tela é
        somente leitura; o vínculo com fornecedores segue editável em "Detalhes".
      </Card>

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
              <Card key={p.id} className="p-0 overflow-hidden group hover:border-primary/50 transition-colors">
                {p.imagem_url ? (
                  <div className="aspect-video w-full relative overflow-hidden bg-muted">
                    <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="aspect-video w-full flex items-center justify-center bg-muted/30">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.codigo}</p>
                    </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDetails(p)}
                    aria-label={`Detalhes de ${p.nome}`}
                  >
                    <Eye className="h-4 w-4" />
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
                        onClick={() => openDetails(p)}
                        aria-label={`Detalhes de ${p.nome}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.nome ?? "Detalhes do produto"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Código</p>
                  <p className="font-mono">{selected.codigo}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Unidade</p>
                  <p>{selected.unidade}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Preço referência</p>
                  <p>{formatCurrency(selected.preco_referencia)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={selected.ativo ? "default" : "secondary"}>
                    {selected.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-muted-foreground">Descrição</p>
                  <p>{selected.descricao || "—"}</p>
                </div>
              </div>
              <Separator />
              <ProductSupplierManager
                produtoId={selected.id}
                produtoNome={selected.nome || ""}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CatalogoProdutos;
