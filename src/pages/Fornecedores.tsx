import { useState } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { FornecedorModal } from "@/components/compras/FornecedorModal";
import { HistoricoComprasModal } from "@/components/compras/HistoricoComprasModal";
import { AISupplierSuggestion } from "@/components/compras/AISupplierSuggestion";
import { SupplierRiskAnalysis } from "@/components/compras/SupplierRiskAnalysis";
import { PriceComparator } from "@/components/compras/PriceComparator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Factory, 
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
  DollarSign
} from "lucide-react";
import { fornecedoresMock, Fornecedor } from "@/data/mockData";
import { toast } from "sonner";

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(fornecedoresMock);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);

  const filteredFornecedores = fornecedores.filter(f => {
    const matchSearch = 
      f.nomeFantasia.toLowerCase().includes(search.toLowerCase()) ||
      f.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
      f.cnpj.includes(search);
    const matchTipo = tipoFilter === "todos" || f.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const handleOpenModal = (fornecedor?: Fornecedor) => {
    setSelectedFornecedor(fornecedor || null);
    setModalOpen(true);
  };

  const handleOpenHistorico = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setHistoricoModalOpen(true);
  };

  const handleSaveFornecedor = (data: Partial<Fornecedor>) => {
    if (selectedFornecedor) {
      // Edit existing
      setFornecedores(fornecedores.map(f => 
        f.id === selectedFornecedor.id ? { ...f, ...data } : f
      ));
      toast.success("Fornecedor atualizado com sucesso!");
    } else {
      // Create new
      const newFornecedor: Fornecedor = {
        id: String(Date.now()),
        razaoSocial: data.razaoSocial || "",
        nomeFantasia: data.nomeFantasia || "",
        cnpj: data.cnpj || "",
        tipo: data.tipo || "DISTRIBUIDORA",
        ramos: data.ramos || [],
        vendeProduto: data.vendeProduto || "AMBOS",
        email: data.email || "",
        telefone: data.telefone || "",
        whatsapp: data.whatsapp || "",
        apiIntegrada: false,
        rating: 0,
        totalMes: 0,
        ultimaCompra: "-",
      };
      setFornecedores([...fornecedores, newFornecedor]);
      toast.success("Fornecedor cadastrado com sucesso!");
    }
  };

  const getTipoLabel = (tipo: Fornecedor["tipo"]) => {
    const labels = { IMPORTADORA: "Importadora", FABRICANTE: "Fabricante", DISTRIBUIDORA: "Distribuidora" };
    return labels[tipo];
  };

  const getTipoBadgeColor = (tipo: Fornecedor["tipo"]) => {
    const colors = { 
      IMPORTADORA: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      FABRICANTE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      DISTRIBUIDORA: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    };
    return colors[tipo];
  };

  const getProdutoLabel = (produto: Fornecedor["vendeProduto"]) => {
    const labels = { LISO: "Liso", PERSONALIZADO: "Personalizado", AMBOS: "Liso + Personalizado" };
    return labels[produto];
  };

  // KPIs
  const totalFornecedores = fornecedores.length;
  const apiIntegradas = fornecedores.filter(f => f.apiIntegrada).length;
  const volumeTotal = fornecedores.reduce((acc, f) => acc + f.totalMes, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
            <p className="text-sm text-muted-foreground">Cadastro e gestão de fornecedores</p>
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
                <p className="text-2xl font-bold text-foreground">{totalFornecedores}</p>
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
                <p className="text-2xl font-bold text-foreground">{apiIntegradas}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume do Mês</p>
                <p className="text-2xl font-bold text-foreground">
                  {volumeTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

        {/* Suppliers Table */}
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
                  <TableHead className="text-right">Volume/Mês</TableHead>
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
                        <p className="text-xs text-muted-foreground">{fornecedor.cnpj}</p>
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getProdutoLabel(fornecedor.vendeProduto)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.open(`mailto:${fornecedor.email}`)}
                        >
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.open(`tel:${fornecedor.telefone}`)}
                        >
                          <Phone className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => window.open(`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g, '')}`)}
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-500" />
                        </Button>
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
                    <TableCell className="text-right font-medium">
                      {fornecedor.totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

          {filteredFornecedores.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum fornecedor encontrado</p>
            </div>
          )}
        </Card>
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
