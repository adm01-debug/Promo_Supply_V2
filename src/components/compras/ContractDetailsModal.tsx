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
  ShieldAlert,
  Loader2,
  Paperclip,
  Upload,
  File,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import type { Contract, ContractItem, ContractPenalty, ContractDocument, StatusConfig, TypeConfig } from "@/types/contract";
import { Input } from "@/components/ui/input";

interface ContractDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

const statusConfig: Record<string, StatusConfig> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: FileText },
  pending_approval: { label: "Aguard. Aprovação", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning", icon: Clock },
  active: { label: "Ativo", color: "bg-success/10 text-success dark:bg-success/15 dark:text-success", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-muted text-foreground dark:bg-muted dark:text-muted-foreground", icon: XCircle },
  renewed: { label: "Renovado", color: "bg-info/10 text-info dark:bg-info/15 dark:text-info", icon: RefreshCw },
};

const typeConfig: Record<string, TypeConfig> = {
  service: { label: "Serviço", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  supply: { label: "Fornecimento", color: "bg-info/10 text-info dark:bg-info/15 dark:text-info" },
  framework: { label: "Acordo-Quadro", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning" },
};

export function ContractDetailsModal({ open, onOpenChange, contract }: ContractDetailsModalProps) {
  const [items, setItems] = useState<ContractItem[]>([]);
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [linkedOrders, setLinkedOrders] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<ContractPenalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (contract && open) {
      fetchContractDetails();
    }
  }, [contract, open]);

  const fetchContractDetails = async () => {
    setLoading(true);
    try {
      const [itemsRes, historyRes, ordersRes, penaltiesRes] = await Promise.all([
        supabase.from('contract_items').select('*').eq('contract_id', contract.id),
        supabase.from('contract_history').select('*').eq('contract_id', contract.id).order('created_at', { ascending: false }),
        supabase.from('order_contracts').select('*').eq('contract_id', contract.id),
        (supabase as any).from('contract_penalties').select('*').eq('contract_id', contract.id).order('created_at', { ascending: false }),
      ]);

      setItems(itemsRes.data || []);
      setHistory(historyRes.data || []);
      setLinkedOrders(ordersRes.data || []);
      setPenalties(penaltiesRes.data || []);
    } catch (error) {
      console.error('Error fetching contract details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: { contract_id: contract.id },
      });
      if (error) throw error;

      // Open HTML in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(data.html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
      toast.success("PDF gerado com sucesso!");
    } catch (err: unknown) {
      console.error('Error generating PDF:', err);
      toast.error("Erro ao gerar PDF do contrato");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!contract) return null;

  const status = statusConfig[contract.status] || statusConfig.draft;
  const type = typeConfig[contract.contract_type] || typeConfig.service;
  const StatusIcon = status.icon;
  const daysRemaining = differenceInDays(new Date(contract.end_date), new Date());
  const totalPenalties = penalties.reduce((sum, p) => sum + Number(p.penalty_value), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  <Badge className="bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {daysRemaining < 0 ? `Expirado há ${Math.abs(daysRemaining)} dias` : `Expira em ${daysRemaining} dias`}
                  </Badge>
                )}
                {penalties.length > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {penalties.length} penalidade(s): {totalPenalties.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="sla" className="gap-1">
                <ShieldAlert className="w-3 h-3" />
                SLA
              </TabsTrigger>
              <TabsTrigger value="items">Itens ({items.length})</TabsTrigger>
              <TabsTrigger value="penalties" className="gap-1">
                Multas ({penalties.length})
              </TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
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

            {/* SLA & Penalties Clauses Tab */}
            <TabsContent value="sla" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-destructive flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Prazo de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{contract.sla_delivery_days ?? 30} dias</p>
                    <p className="text-xs text-muted-foreground">Máximo para entrega</p>
                  </CardContent>
                </Card>

                <Card className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-destructive flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Multa por Atraso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{contract.penalty_rate_per_day ?? 0.5}%<span className="text-sm font-normal">/dia</span></p>
                    <p className="text-xs text-muted-foreground">Teto: {contract.penalty_cap_percent ?? 20}% do pedido</p>
                  </CardContent>
                </Card>

                <Card className="border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-destructive flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      Score Mínimo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{contract.min_supplier_score ?? 3.0}<span className="text-sm font-normal">/5.0</span></p>
                    <p className="text-xs text-muted-foreground">
                      {contract.auto_block_below_score !== false ? "🔒 Auto-bloqueio ativo" : "Sem auto-bloqueio"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-amber-300 dark:border-amber-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Qualidade & Devolução
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm"><strong>Score mínimo qualidade:</strong> {contract.min_quality_score ?? 3.0}/5.0</p>
                  <p className="text-sm"><strong>Multa qualidade:</strong> {contract.quality_penalty_percent ?? 10}% sobre o lote</p>
                  <p className="text-sm"><strong>Política de devolução:</strong> {contract.return_policy || "Conforme padrão"}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum item cadastrado</p>
                </div>
              ) : (
                <Table aria-label="Tabela de dados">
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

            {/* Penalties Applied Tab */}
            <TabsContent value="penalties">
              {penalties.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="font-medium text-success dark:text-success">Nenhuma penalidade aplicada</p>
                  <p className="text-sm text-muted-foreground mt-1">O fornecedor está em conformidade com o contrato.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-destructive/10 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-destructive">Total de Penalidades</p>
                      <p className="text-2xl font-bold text-destructive">
                        {totalPenalties.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      {penalties.length} ocorrência(s)
                    </Badge>
                  </div>

                  <Table aria-label="Tabela de dados">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Dias</TableHead>
                        <TableHead className="text-right">%</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {penalties.map((penalty) => (
                        <TableRow key={penalty.id}>
                          <TableCell>
                            <Badge variant={penalty.penalty_type === 'delivery_delay' ? 'destructive' : 'secondary'}>
                              {penalty.penalty_type === 'delivery_delay' ? 'Atraso' : penalty.penalty_type === 'quality_defect' ? 'Qualidade' : 'Outro'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{penalty.description}</TableCell>
                          <TableCell className="text-right">{penalty.days_late || '-'}</TableCell>
                          <TableCell className="text-right">{penalty.penalty_percent}%</TableCell>
                          <TableCell className="text-right font-bold text-destructive">
                            {Number(penalty.penalty_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={penalty.status === 'applied' ? 'default' : 'outline'}>
                              {penalty.status === 'applied' ? '✅ Aplicada' : '⏳ Pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {generatingPdf ? "Gerando..." : "Exportar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
