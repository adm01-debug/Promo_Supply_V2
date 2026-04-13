import { useState, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import { MainLayout } from "@/components/compras/MainLayout";
import { FornecedorModal } from "@/components/compras/FornecedorModal";
import { HistoricoComprasModal } from "@/components/compras/HistoricoComprasModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { SupplierRiskAnalysis } from "@/components/compras/SupplierRiskAnalysis";
import { PriceComparator } from "@/components/compras/PriceComparator";
import { FornecedorMobileCard } from "@/components/fornecedores/FornecedorMobileCard";
import { OnboardingTour, fornecedorTourSteps } from "@/components/onboarding/OnboardingTour";
import { useTourPreferences } from "@/hooks/useTourPreferences";
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
import { normalizeText } from "@/hooks/useFuseSearch";

import { 
  type LegacyFornecedor, adaptToLegacy, 
  getTipoLabel, getTipoBadgeColor, getProdutoLabel 
} from './fornecedores/fornecedorHelpers';
const Fornecedores = () => {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<LegacyFornecedor | null>(null);

  // Tour preferences
  const { isOpen: isTourOpen, complete: completeTour, skip: skipTour, isLoading: isTourLoading } = useTourPreferences('fornecedor');

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

  // Fuse.js for fuzzy search
  const fornecedoresFuse = useMemo(() => {
    const preparedFornecedores = fornecedores.map(f => ({
      ...f,
      normalizedNomeFantasia: normalizeText(f.nomeFantasia),
      normalizedRazaoSocial: normalizeText(f.razaoSocial),
    }));
    return new Fuse(preparedFornecedores, {
      isCaseSensitive: false,
      includeScore: true,
      threshold: 0.4,
      keys: [
        { name: 'nomeFantasia', weight: 2.0 },
        { name: 'razaoSocial', weight: 1.8 },
        { name: 'cnpj', weight: 1.5 },
        { name: 'normalizedNomeFantasia', weight: 1.8 },
        { name: 'normalizedRazaoSocial', weight: 1.5 },
      ],
    });
  }, [fornecedores]);

  const filteredFornecedores = useMemo(() => {
    let filtered = fornecedores;

    // Fuzzy search
    if (search.trim()) {
      const normalizedSearch = normalizeText(search);
      const fuseResults = fornecedoresFuse.search(search);
      const normalizedFuseResults = fornecedoresFuse.search(normalizedSearch);
      
      // Merge results
      const seenIds = new Set<string>();
      const merged: LegacyFornecedor[] = [];
      
      [...fuseResults, ...normalizedFuseResults].forEach(r => {
        if (!seenIds.has(r.item.id)) {
          seenIds.add(r.item.id);
          merged.push(r.item);
        }
      });
      
      filtered = merged.length > 0 ? merged : fornecedores.filter(f =>
        f.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
        f.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
        f.cnpj.includes(search)
      );
    }
    
    // Type filter
    if (tipoFilter !== "todos") {
      filtered = filtered.filter(f => f.tipo === tipoFilter);
    }
    
    return filtered;
  }, [fornecedores, search, tipoFilter, fornecedoresFuse]);

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
      IMPORTADORA: "bg-info/20 text-info border-blue-500/30",
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-tour="fornecedor-header">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" data-tour="fornecedor-kpis">
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
              <div className="p-2 rounded-lg bg-success/20">
                <Plug className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">APIs Integradas</p>
                <p className="text-2xl font-bold text-foreground">{kpis.integradosApi}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <TrendingUp className="w-5 h-5 text-warning" />
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
        <Card className="p-4" data-tour="fornecedor-filtros">
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
          <Card className="overflow-hidden" data-tour="fornecedor-tabela">
            <div className="overflow-x-auto">
              <Table aria-label="Tabela de dados">
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
                              <MessageCircle className="w-4 h-4 text-success" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < fornecedor.rating ? 'text-warning fill-amber-400' : 'text-muted-foreground/30'}`} 
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {fornecedor.apiIntegrada ? (
                          <Badge className="bg-success/20 text-success border-emerald-500/30">
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

      {/* Onboarding Tour */}
      {!isTourLoading && (
        <OnboardingTour
          steps={fornecedorTourSteps}
          isOpen={isTourOpen}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
    </MainLayout>
  );
};

export default Fornecedores;
