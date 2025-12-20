import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  History,
  Package,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface ContractDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: FileText },
  pending_approval: { label: "Aguard. Aprovação", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  active: { label: "Ativo", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: XCircle },
  renewed: { label: "Renovado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: RefreshCw },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  service: { label: "Serviço", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  supply: { label: "Fornecimento", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  framework: { label: "Acordo-Quadro", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
};

export function ContractDetailsModal({ open, onOpenChange, contract }: ContractDetailsModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [linkedOrders, setLinkedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contract && open) {
      fetchContractDetails();
    }
  }, [contract, open]);

  const fetchContractDetails = async () => {
    setLoading(true);
    try {
      // Fetch items
      const { data: itemsData } = await supabase
        .from('contract_items')
        .select('*')
        .eq('contract_id', contract.id);
      setItems(itemsData || []);

      // Fetch history
      const { data: historyData } = await supabase
        .from('contract_history')
        .select('*')
        .eq('contract_id', contract.id)
        .order('created_at', { ascending: false });
      setHistory(historyData || []);

      // Fetch linked orders
      const { data: ordersData } = await supabase
        .from('order_contracts')
        .select('*')
        .eq('contract_id', contract.id);
      setLinkedOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching contract details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!contract) return null;

  const status = statusConfig[contract.status] || statusConfig.draft;
  const type = typeConfig[contract.contract_type] || typeConfig.service;
  const StatusIcon = status.icon;
  const daysRemaining = differenceInDays(new Date(contract.end_date), new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalhes do Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">{contract.title}</h2>
              <p className="text-sm text-muted-foreground">{contract.contract_number}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${status.color} flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
                <Badge className={type.color}>{type.label}</Badge>
                {contract.status === 'active' && daysRemaining <= 30 && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {daysRemaining < 0 ? `Expirado há ${Math.abs(daysRemaining)} dias` : `Expira em ${daysRemaining} dias`}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">
                {Number(contract.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="items">Itens ({items.length})</TabsTrigger>
              <TabsTrigger value="orders">Pedidos ({linkedOrders.length})</TabsTrigger>
              <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Fornecedor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{contract.supplier_name}</p>
                    <p className="text-sm text-muted-foreground">ID: {contract.supplier_id}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Vigência
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">
                      {format(new Date(contract.start_date), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(contract.end_date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {daysRemaining > 0 ? `${daysRemaining} dias restantes` : `Expirado há ${Math.abs(daysRemaining)} dias`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{contract.payment_terms || "Não especificado"}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Renovação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium capitalize">{contract.renewal_type}</p>
                    <p className="text-sm text-muted-foreground">
                      Aviso prévio: {contract.renewal_notice_days} dias
                    </p>
                  </CardContent>
                </Card>
              </div>

              {contract.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Descrição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{contract.description}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="items">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum item cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.item_name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {Number(item.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(item.total_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="orders">
              {linkedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum pedido vinculado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID do Pedido</TableHead>
                      <TableHead>Data de Vínculo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_id}</TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="history">
              {history.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum histórico disponível</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <History className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{entry.action_type}</p>
                        {entry.action_description && (
                          <p className="text-sm text-muted-foreground">{entry.action_description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
