import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Target, Users, Building, Link2, Search, MapPin, 
  Package, Truck, CheckCircle, Info, AlertCircle, 
  TrendingDown, DollarSign, Sparkles
} from "lucide-react";
import { type PurchaseRecord } from "@/hooks/usePurchaseHistory";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { parseISO } from "date-fns/parseISO";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  purchaseRecords: PurchaseRecord[];
  searchTerm: string;
}

export const HistoricoSourcingTab = ({ purchaseRecords, searchTerm }: Props) => {
  const sourcingData = useMemo(() => {
    return purchaseRecords.filter(r => 
      (r.solicitacaoTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.centroCusto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       r.productName.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }, [purchaseRecords, searchTerm]);

  const stats = useMemo(() => {
    const uniqueClients = new Set(sourcingData.map(r => r.centroCusto || r.departamento)).size;
    const totalItems = sourcingData.length;
    const totalValue = sourcingData.reduce((acc, r) => acc + r.totalPrice, 0);
    const volatilityCount = sourcingData.filter(r => r.discount > 15 || r.unitPrice > 1000).length;
    return { uniqueClients, totalItems, totalValue, volatilityCount };
  }, [sourcingData]);

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const selectedRecord = useMemo(() => sourcingData.find(r => r.id === selectedRecordId), [sourcingData, selectedRecordId]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary/5 border-primary/10 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Users className="w-5 h-5 text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Clientes</p><p className="text-2xl font-bold">{stats.uniqueClients}</p></div>
        </Card>
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg"><Target className="w-5 h-5 text-emerald-500" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Itens Sourcing</p><p className="text-2xl font-bold">{stats.totalItems}</p></div>
        </Card>
        <Card className="p-4 bg-amber-500/5 border-amber-500/10 flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg"><Building className="w-5 h-5 text-amber-500" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Volume Total</p><p className="text-xl font-bold">R$ {stats.totalValue.toLocaleString('pt-BR')}</p></div>
        </Card>
        <Card className="p-4 bg-rose-500/5 border-rose-500/10 flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg"><AlertCircle className="w-5 h-5 text-rose-500" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Volatilidade Alta</p><p className="text-2xl font-bold">{stats.volatilityCount}</p></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden border-border/40 shadow-sm flex flex-col">
          <div className="p-4 border-b border-border/40 bg-muted/30 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Link2 className="w-4 h-4 text-primary" />
                Rastreabilidade de Itens por Cliente/Origem
              </h3>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Elite Sourcing Console</Badge>
          </div>
          
          <ScrollArea className="h-[550px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/20">
                  <TableHead className="text-[10px] uppercase font-bold">Cliente/Origem</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Item Solicitado</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-right">Preço Unit.</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcingData.map((record) => (
                  <TableRow 
                    key={record.id} 
                    className={cn(
                      "group cursor-pointer transition-colors",
                      selectedRecordId === record.id ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          {record.centroCusto || record.departamento || "Geral"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{record.departamento ? 'Dept.' : 'CC'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">{record.productName}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 italic">
                          Ref: {record.solicitacaoTitle || "Pedido Direto"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-xs">R$ {record.unitPrice.toLocaleString('pt-BR')}</span>
                        {record.discount > 10 && (
                          <span className="text-[9px] text-emerald-500 font-bold flex items-center">
                            <TrendingDown className="w-2 h-2 mr-0.5" /> -{record.discount}%
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                record.status === 'delivered' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'
                              )} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-[10px]">{record.status === 'delivered' ? 'Sourcing Concluído' : 'Em Trânsito'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tighter">
                          {record.status === 'delivered' ? 'Entregue' : 'Pendente'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {sourcingData.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                <Search className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">Nenhum registro encontrado</p>
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="p-6 bg-muted/10 border-border/40 min-h-[500px] flex flex-col shadow-inner">
          {selectedRecord ? (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold uppercase tracking-tight text-sm">IA Journey Insight</h3>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px]">Neural Track</Badge>
              </div>
              
              <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-gradient-to-b before:from-primary/50 before:via-border before:to-transparent">
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 z-10 border border-primary/20 shadow-sm">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Demanda Inicial</p>
                    <p className="text-xs font-semibold">{selectedRecord.solicitacaoTitle || "Pedido Direto"}</p>
                    <p className="text-[10px] text-muted-foreground">Origem: {selectedRecord.centroCusto || selectedRecord.departamento || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 z-10 border border-amber-500/20 shadow-sm">
                    <Building className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Sourcing Fornecedor</p>
                    <p className="text-xs font-semibold">{selectedRecord.supplierName}</p>
                    <p className="text-[10px] text-muted-foreground">Pedido: #{selectedRecord.orderNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border shadow-sm",
                    selectedRecord.status === 'delivered' ? "bg-emerald-500/20 border-emerald-500/20" : "bg-muted border-border"
                  )}>
                    {selectedRecord.status === 'delivered' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Truck className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="space-y-1 pt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Destino Final (Cliente)</p>
                    <p className="text-xs font-semibold">{selectedRecord.status === 'delivered' ? 'Concluído' : 'Em Transporte'}</p>
                    <p className="text-[10px] text-muted-foreground">Data: {format(parseISO(selectedRecord.purchaseDate), "dd/MM/yyyy")}</p>
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Financial Analysis
                    </p>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/10 text-[9px]">Margem Otimizada</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] text-muted-foreground uppercase">Custo Real</p>
                      <p className="text-sm font-bold">R$ {selectedRecord.unitPrice.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-muted-foreground uppercase">Target Price</p>
                      <p className="text-sm font-bold text-emerald-500">R$ {(selectedRecord.unitPrice * 0.94).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Economia no Ciclo</p>
                      <p className="text-xs font-bold text-emerald-600">R$ {(selectedRecord.totalPrice * 0.06).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <span className="text-[10px] font-bold text-emerald-600">6%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <Info className="w-12 h-12 mb-4" />
              <p className="text-sm font-medium">Selecione um registro para ver a<br/>Jornada de Sourcing Inteligente</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
