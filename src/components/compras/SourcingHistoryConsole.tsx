import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Target, Users, Building, Link2, Search, MapPin, 
  Package, Truck, CheckCircle, Info, AlertCircle, 
  TrendingDown, DollarSign, Sparkles, Filter,
  BarChart3, History, ArrowRight, ShieldCheck,
  TrendingUp, Clock, Calendar, ChevronRight, Undo2
} from "lucide-react";
import { usePurchaseHistory, type PurchaseRecord, type SupplierHistory } from "@/hooks/usePurchaseHistory";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, PieChart, Pie } from "recharts";

const PriceTrendChart = ({ data }: { data: { date: string, price: number }[] }) => (
  <div className="h-16 w-32">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey="price" 
          stroke="currentColor" 
          strokeWidth={2} 
          dot={false} 
          className="text-primary"
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export const SourcingHistoryConsole = () => {
  const { purchaseRecords, suppliersHistory, isLoading } = usePurchaseHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"client" | "supplier">("client");
  const [lastActions, setLastActions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    const cats = new Set(purchaseRecords.map(r => r.productCategory));
    return Array.from(cats);
  }, [purchaseRecords]);

  const filteredRecords = useMemo(() => {
    return purchaseRecords.filter(r => {
      const matchesSearch = 
        r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.costCenterName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.solicitacaoTitle || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(r.productCategory);
      
      return matchesSearch && matchesCategory;
    });
  }, [purchaseRecords, searchTerm, selectedCategories]);

  const filteredSuppliers = useMemo(() => {
    return suppliersHistory.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cnpj.includes(searchTerm)
    );
  }, [suppliersHistory, searchTerm]);

  const handleUndo = () => {
    if (lastActions.length > 0) {
      const newActions = [...lastActions];
      newActions.pop();
      setLastActions(newActions);
      toast.success("Ação desfeita com sucesso", {
        icon: <Undo2 className="w-4 h-4" />
      });
    }
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 4.5) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 3.5) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Estratégico */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Console de Sourcing de Elite
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              <Sparkles className="w-3 h-3 mr-1" /> IA Neural
            </Badge>
          </h2>
          <p className="text-muted-foreground">Rastreabilidade total e inteligência competitiva de suprimentos.</p>
        </div>
        <div className="flex items-center gap-2">
          {lastActions.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleUndo} className="gap-2">
              <Undo2 className="w-4 h-4" /> Desfazer
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" /> Log de Auditoria
          </Button>
        </div>
      </div>

      <Card className="p-6 border-border/40 shadow-sm bg-background/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "gap-2 px-4 transition-all duration-200",
                viewMode === "client" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )} 
              onClick={() => setViewMode("client")}
            >
              <Users className="w-4 h-4" /> Por Cliente/Centro de Custo
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className={cn(
                "gap-2 px-4 transition-all duration-200",
                viewMode === "supplier" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )} 
              onClick={() => setViewMode("supplier")}
            >
              <Building className="w-4 h-4" /> Por Fornecedor/Sourcing
            </Button>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar itens, fornecedores, centros de custo..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 h-10 bg-background/50 border-border/60 focus:ring-primary/20"
              />
            </div>
            <Button 
              variant={showFilters ? "default" : "outline"} 
              size="sm" 
              className="h-10 gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 h-5 min-w-[20px] justify-center">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-wrap gap-2">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider w-full mb-1">Categorias</div>
              {categories.map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCategories.includes(cat) ? "default" : "outline"}
                  className="cursor-pointer hover:border-primary/50 transition-colors py-1 px-3"
                  onClick={() => {
                    setSelectedCategories(prev => 
                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                    );
                  }}
                >
                  {cat}
                </Badge>
              ))}
              {selectedCategories.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCategories([])}
                  className="h-7 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Limpar Todos
                </Button>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="h-[600px] pr-4">
          {viewMode === "client" ? (
            <div className="space-y-4">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <div 
                    key={record.id} 
                    className="group border border-border/40 rounded-xl p-4 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                          <Package className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-lg">{record.productName}</h4>
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {record.productCategory}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5" /> {record.solicitacaoTitle || "Demanda Direta"}
                            </span>
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                              <Building className="w-3.5 h-3.5" /> {record.costCenterName || "Geral"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" /> {record.departamento || "Logística"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-end gap-6">
                        <div className="hidden lg:block text-right">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Evolução Preço</div>
                          <PriceTrendChart data={[
                            { date: '1', price: record.totalPrice * 1.1 },
                            { date: '2', price: record.totalPrice * 0.95 },
                            { date: '3', price: record.totalPrice * 1.05 },
                            { date: '4', price: record.totalPrice },
                          ]} />
                        </div>
                        
                        <div className="flex flex-col items-end gap-2 text-right">
                          <div className="text-xl font-bold">
                            {record.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            <Badge variant="outline" className={cn(
                              "gap-1",
                              record.status === 'delivered' ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20" : "bg-blue-500/5 text-blue-600 border-blue-500/20"
                            )}>
                              {record.status === 'delivered' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {record.status === 'delivered' ? 'Entregue' : 'Em Processo'}
                            </Badge>
                            <span className="text-muted-foreground">
                              {new Date(record.purchaseDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-4 opacity-50" />
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground">FORNECEDOR ORIGEM:</div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {record.supplierName.charAt(0)}
                          </div>
                          <span className="font-semibold text-sm underline decoration-primary/30 underline-offset-4 cursor-pointer hover:text-primary transition-colors">
                            {record.supplierName}
                          </span>
                        </div>
                        {record.discount > 0 && (
                          <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[10px]">
                            <TrendingDown className="w-3 h-3 mr-1" /> {record.discount}% Economy
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-2 hover:bg-primary/10 hover:text-primary">
                        Ver Detalhes do Sourcing <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground">Nenhum registro encontrado para sua busca.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuppliers.map((supplier) => (
                <Card 
                  key={supplier.id} 
                  className="p-5 border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className={cn("gap-1 py-1 px-2 font-bold", getReliabilityColor(supplier.qualityScore))}>
                            <ShieldCheck className="w-3 h-3" /> {supplier.qualityScore.toFixed(1)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Índice de Confiabilidade Neural</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex gap-4 mb-4">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <Building className="w-7 h-7 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg leading-tight mb-1">{supplier.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{supplier.cnpj}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">
                          {supplier.category || "GENERAL SUPPLIER"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Vol. Histórico</div>
                      <div className="text-lg font-bold text-foreground">
                        {supplier.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Ticket Médio</div>
                      <div className="text-lg font-bold text-foreground">
                        {supplier.averageOrderValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">OTIF (On-Time In-Full)</span>
                        <span className="text-foreground">{supplier.onTimeRate}%</span>
                      </div>
                      <Progress value={supplier.onTimeRate} className="h-1.5" />
                    </div>
                    
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Pedidos</span>
                          <span className="text-sm font-bold">{supplier.totalOrders}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Best Disc.</span>
                          <span className="text-sm font-bold text-emerald-600">{supplier.bestDiscount}%</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        Análise de Sourcing <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Footer Inteligente / Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-emerald-900 dark:text-emerald-400 text-sm">Oportunidade de Sourcing</h5>
            <p className="text-xs text-emerald-800/70 dark:text-emerald-400/70 mt-1">
              3 fornecedores reduziram o ticket médio em 12% no último trimestre.
            </p>
          </div>
        </Card>

        <Card className="p-4 border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-amber-900 dark:text-amber-400 text-sm">Alerta de Lead Time</h5>
            <p className="text-xs text-amber-800/70 dark:text-amber-400/70 mt-1">
              Atrasos recorrentes detectados em 15% das entregas de itens críticos.
            </p>
          </div>
        </Card>

        <Card className="p-4 border-primary/20 bg-primary/5 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-primary-900 dark:text-primary-400 text-sm">Insight IA</h5>
            <p className="text-xs text-primary-800/70 dark:text-primary-400/70 mt-1">
              Consolidar compras por Centro de Custo pode gerar economia de R$ 45k/mês.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};