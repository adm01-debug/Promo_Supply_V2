import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target, Users, Building, Link2, Search, MapPin } from "lucide-react";
import { type PurchaseRecord } from "@/hooks/usePurchaseHistory";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { parseISO } from "date-fns/parseISO";

interface Props {
  purchaseRecords: PurchaseRecord[];
  searchTerm: string;
}

export const HistoricoSourcingTab = ({ purchaseRecords, searchTerm }: Props) => {
  const sourcingData = useMemo(() => {
    // Filter records that have a solicitacao associated (or show all and group)
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
    return { uniqueClients, totalItems, totalValue };
  }, [sourcingData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-primary/5 border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Centros de Custo/Clientes</p>
              <p className="text-2xl font-bold">{stats.uniqueClients}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Target className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Itens Sourcing</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/5 border-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Building className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volume Sourcing</p>
              <p className="text-2xl font-bold">R$ {stats.totalValue.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/40 shadow-sm">
        <div className="p-4 border-b border-border/40 bg-muted/30 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Rastreabilidade de Itens por Cliente/Origem
            </h3>
            <p className="text-xs text-muted-foreground">Vínculo entre solicitações originais e compras efetuadas</p>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            Elite 10/10 Sourcing
          </Badge>
        </div>
        
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Cliente/Origem</TableHead>
                <TableHead>Item Solicitado</TableHead>
                <TableHead>Fornecedor Sourcing</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourcingData.map((record) => (
                <TableRow key={record.id} className="group transition-colors hover:bg-muted/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-primary opacity-70" />
                        {record.centroCusto || record.departamento || "Geral"}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">{record.departamento ? 'Departamento' : 'Centro de Custo'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{record.productName}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Ref: {record.solicitacaoTitle || "Pedido Direto"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {record.supplierName.charAt(0)}
                      </div>
                      <span className="text-sm">{record.supplierName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-sm">R$ {record.totalPrice.toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-muted-foreground">{record.quantity} {record.quantity > 1 ? 'unids' : 'unid'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(record.purchaseDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={record.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]' : 'text-[10px]'}>
                      {record.status === 'delivered' ? 'Entregue' : 
                       record.status === 'shipped' ? 'Enviado' : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {sourcingData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>Nenhum registro de sourcing encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
};
