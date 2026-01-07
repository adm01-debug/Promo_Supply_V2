import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { FornecedorModal } from "@/components/compras/FornecedorModal";
import { HistoricoComprasModal } from "@/components/compras/HistoricoComprasModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { SupplierRiskAnalysis } from "@/components/compras/SupplierRiskAnalysis";
import { PriceComparator } from "@/components/compras/PriceComparator";
import { FornecedorMobileCard } from "@/components/fornecedores/FornecedorMobileCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton, CardGridSkeleton, KPICardSkeleton } from "@/components/ui/contextual-skeletons";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Edit, 
  History, 
  Star, 
  Phone, 
  Mail, 
  MessageCircle,
  Plug,
  Building2,
  Users,
  TrendingUp
} from "lucide-react";
import { useFornecedores, useFornecedoresKPIs, type Fornecedor } from "@/hooks/useFornecedores";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/lib/feedbackToast";

// Legacy adapter types
interface LegacyFornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  tipo: "IMPORTADORA" | "FABRICANTE" | "DISTRIBUIDORA";
  ramos: string[];
  vendeProduto: "LISO" | "PERSONALIZADO" | "AMBOS";
  email: string;
  telefone: string;
  whatsapp: string;
  apiIntegrada: boolean;
  rating: number;
  totalMes: number;
  ultimaCompra: string;
}

// Map DB fornecedor to legacy format
const adaptToLegacy = (f: Fornecedor): LegacyFornecedor => ({
  id: f.id,
  razaoSocial: f.razao_social,
  nomeFantasia: f.nome_fantasia || f.razao_social,
  cnpj: f.cnpj || '',
  tipo: f.tipo === 'internacional' ? 'IMPORTADORA' : f.tipo === 'local' ? 'DISTRIBUIDORA' : 'FABRICANTE',
  ramos: f.segmento ? [f.segmento] : [],
  vendeProduto: 'AMBOS',
  email: f.email || '',
  telefone: f.telefone || '',
  whatsapp: f.telefone || '',
  apiIntegrada: f.integrado_api,
  rating: Math.round(f.avaliacao),
  totalMes: 0,
  ultimaCompra: '-',
});

const Fornecedores = () => {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<LegacyFornecedor | null>(null);

  // Use real data from Supabase
  const { 
    fornecedores: dbFornecedores, 
    loading, 
    createFornecedor, 
    updateFornecedor, 
    refetch 
  } = useFornecedores({ search: search || undefined });

  const { kpis } = useFornecedoresKPIs();

  // Adapt to legacy format
  const fornecedores = useMemo(() => {
    return dbFornecedores.map(adaptToLegacy);
  }, [dbFornecedores]);

  const filteredFornecedores = useMemo(() => {
    return fornecedores.filter(f => {
      const matchSearch = !search || 
        f.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
        f.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
        f.cnpj.includes(search);
      
      const dbTipo = tipoFilter === 'IMPORTADORA' ? 'internacional' : 
                     tipoFilter === 'DISTRIBUIDORA' ? 'local' : 
                     tipoFilter === 'FABRICANTE' ? 'nacional' : null;
      const matchTipo = tipoFilter === "todos" || f.tipo === tipoFilter;
      
      return matchSearch && matchTipo;
    });
  }, [fornecedores, search, tipoFilter]);

  const handleOpenModal = (fornecedor?: LegacyFornecedor) => {
    setSelectedFornecedor(fornecedor || null);
    setModalOpen(true);
  };

  const handleOpenHistorico = (fornecedor: LegacyFornecedor) => {
    setSelectedFornecedor(fornecedor);
    setHistoricoModalOpen(true);
  };

  const handleSaveFornecedor = async (data: Partial<LegacyFornecedor>) => {
    if (selectedFornecedor) {
      // Find original DB record
      const dbRecord = dbFornecedores.find(f => f.id === selectedFornecedor.id);
      if (dbRecord) {
        await updateFornecedor(dbRecord.id, {
          razao_social: data.razaoSocial || dbRecord.razao_social,
          nome_fantasia: data.nomeFantasia,
          cnpj: data.cnpj,
          email: data.email,
          telefone: data.telefone,
          tipo: data.tipo === 'IMPORTADORA' ? 'internacional' : 
                data.tipo === 'DISTRIBUIDORA' ? 'local' : 'nacional',
          segmento: data.ramos?.[0],
        });
      }
    } else {
      await createFornecedor({
        razao_social: data.razaoSocial || 'Novo Fornecedor',
        nome_fantasia: data.nomeFantasia,
        cnpj: data.cnpj,
        email: data.email,
        telefone: data.telefone,
        tipo: data.tipo === 'IMPORTADORA' ? 'internacional' : 
              data.tipo === 'DISTRIBUIDORA' ? 'local' : 'nacional',
        segmento: data.ramos?.[0],
      });
    }
    setModalOpen(false);
  };

  const getTipoLabel = (tipo: LegacyFornecedor["tipo"]) => {
    const labels = { IMPORTADORA: "Importadora", FABRICANTE: "Fabricante", DISTRIBUIDORA: "Distribuidora" };
    return labels[tipo];
  };

  const getTipoBadgeColor = (tipo: LegacyFornecedor["tipo"]) => {
    const colors = { 
      IMPORTADORA: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      FABRICANTE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      DISTRIBUIDORA: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    };
    return colors[tipo];
  };

  const getProdutoLabel = (produto: LegacyFornecedor["vendeProduto"]) => {
    const labels = { LISO: "Liso", PERSONALIZADO: "Personalizado", AMBOS: "Liso + Personalizado" };
    return labels[produto];
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-10 w-40 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>
          <CardGridSkeleton cards={1} columns={1} />
          <TableSkeleton rows={6} columns={7} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro e gestão de fornecedores ({dbFornecedores.length} registros)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AISupplierSuggestion />
            <SupplierRiskAnalysis />
            <PriceComparator />
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Fornecedor
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fornecedores</p>
                <p className="text-2xl font-bold text-foreground">{kpis.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Plug className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">APIs Integradas</p>
                <p className="text-2xl font-bold text-foreground">{kpis.integradosApi}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
                <p className="text-2xl font-bold text-foreground">
                  {kpis.mediaAvaliacao.toFixed(1)} ★
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, razão social ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="IMPORTADORA">Importadora</SelectItem>
                <SelectItem value="FABRICANTE">Fabricante</SelectItem>
                <SelectItem value="DISTRIBUIDORA">Distribuidora</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Mobile Cards View */}
        {isMobile && (
          <div className="space-y-3">
            {filteredFornecedores.map((fornecedor) => (
              <FornecedorMobileCard
                key={fornecedor.id}
                fornecedor={fornecedor}
                onEdit={() => handleOpenModal(fornecedor)}
                onHistory={() => handleOpenHistorico(fornecedor)}
              />
            ))}
            {filteredFornecedores.length === 0 && !loading && (
              <IllustratedEmptyState
                type="users"
                title={dbFornecedores.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum fornecedor encontrado"}
                description={dbFornecedores.length === 0 
                  ? "Comece cadastrando seu primeiro fornecedor para gerenciar suas compras"
                  : "Tente ajustar os filtros de busca para encontrar o fornecedor desejado"
                }
                action={dbFornecedores.length === 0 ? { label: "Novo Fornecedor", onClick: () => handleOpenModal() } : undefined}
              />
            )}
          </div>
        )}

        {/* Desktop Table View */}
        {!isMobile && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ramos</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">API</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{fornecedor.nomeFantasia}</p>
                          <p className="text-xs text-muted-foreground">{fornecedor.cnpj || 'Sem CNPJ'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTipoBadgeColor(fornecedor.tipo)}>
                          {getTipoLabel(fornecedor.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {fornecedor.ramos.slice(0, 2).map(ramo => (
                            <Badge key={ramo} variant="secondary" className="text-xs">
                              {ramo}
                            </Badge>
                          ))}
                          {fornecedor.ramos.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{fornecedor.ramos.length - 2}
                            </Badge>
                          )}
                          {fornecedor.ramos.length === 0 && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getProdutoLabel(fornecedor.vendeProduto)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {fornecedor.email && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => window.open(`mailto:${fornecedor.email}`)}
                            >
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {fornecedor.telefone && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => window.open(`tel:${fornecedor.telefone}`)}
                            >
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          {fornecedor.whatsapp && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => window.open(`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g, '')}`)}
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < fornecedor.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} 
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {fornecedor.apiIntegrada ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <Plug className="w-3 h-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Manual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleOpenHistorico(fornecedor)}
                            title="Ver histórico"
                          >
                            <History className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleOpenModal(fornecedor)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredFornecedores.length === 0 && !loading && (
              <IllustratedEmptyState
                type="users"
                title={dbFornecedores.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum fornecedor encontrado"}
                description={dbFornecedores.length === 0 
                  ? "Comece cadastrando seu primeiro fornecedor para gerenciar suas compras"
                  : "Tente ajustar os filtros de busca para encontrar o fornecedor desejado"
                }
                action={dbFornecedores.length === 0 ? { label: "Novo Fornecedor", onClick: () => handleOpenModal() } : undefined}
              />
            )}
          </Card>
        )}
      </div>

      {/* Modals */}
      <FornecedorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        fornecedor={selectedFornecedor}
        onSave={handleSaveFornecedor}
      />

      <HistoricoComprasModal
        open={historicoModalOpen}
        onOpenChange={setHistoricoModalOpen}
        fornecedor={selectedFornecedor}
      />
    </MainLayout>
  );
};

export default Fornecedores;
