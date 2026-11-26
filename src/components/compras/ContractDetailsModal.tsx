import { useState, useEffect, useCallback, useRef } from "react";
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
import { format } from "date-fns/format";
import { differenceInDays } from "date-fns/differenceInDays";
import { ptBR } from "date-fns/locale/pt-BR";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";
import { useAuth } from "@/features/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getStorageTenantId, privateStoragePath, resolveStoredFileUrl } from "@/lib/storageFiles";
import { formatBytes } from "@/lib/imageCompression";
import type { Contract, ContractItem, ContractPenalty, ContractDocument, ContractHistory, StatusConfig, TypeConfig } from "@/types/contract";
import { Input } from "@/components/ui/input";
import { ContractSLAReadonlyTab, ContractPenaltiesTab } from "./contract/ContractDetailsTabs";

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
  const [history, setHistory] = useState<ContractHistory[]>([]);
  const [linkedOrders, setLinkedOrders] = useState<{ id: string; contract_id: string; order_id: string; tenant_id: string; created_at: string }[]>([]);
  const [penalties, setPenalties] = useState<ContractPenalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const { user, tenantId } = useAuth();

  const fetchContractDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, historyRes, ordersRes, penaltiesRes, docsRes] = await Promise.all([
        supabase.from('contract_items').select('*').eq('contract_id', contract.id),
        supabase.from('contract_history').select('*').eq('contract_id', contract.id).order('created_at', { ascending: false }),
        supabase.from('order_contracts').select('*').eq('contract_id', contract.id),
        supabase.from('contract_penalties').select('*').eq('contract_id', contract.id).order('created_at', { ascending: false }),
        supabase.from('contract_documents').select('*').eq('contract_id', contract.id).order('created_at', { ascending: false }),
      ]);

      setItems(itemsRes.data || []);
      setHistory((historyRes.data || []) as unknown as ContractHistory[]);
      setLinkedOrders(ordersRes.data || []);
      setPenalties((penaltiesRes.data || []) as unknown as ContractPenalty[]);
      setDocuments(docsRes.data || []);
    } catch (error) {
      logger.error('Error fetching contract details', { error });
    } finally {
      setLoading(false);
    }
  }, [contract.id]);

  useEffect(() => {
    if (contract && open) {
      fetchContractDetails();
    }
  }, [contract, open, fetchContractDetails]);

  const handleUploadDocument = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const storageTenantId = await getStorageTenantId(user.id, tenantId);
      if (!storageTenantId) {
        toast.error('Organização não identificada. Faça login novamente.');
        return;
      }
      // Path convention enforced by storage RLS: {tenantId}/{userId}/...
      const filePath = privateStoragePath(storageTenantId, user.id, 'contracts', contract.id, `${Date.now()}_${file.name}`);
      const { error: uploadError } = await supabase.storage.from('documentos').upload(filePath, file);
      if (uploadError) throw uploadError;
      // Bucket privado: grava o caminho; a leitura gera URL assinada (resolveStoredFileUrl).
      await supabase.from('contract_documents').insert({
        contract_id: contract.id,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
        file_size: file.size,
      });
      toast.success('Documento enviado!');
      fetchContractDetails();
    } catch (err: unknown) {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDocument = async (doc: ContractDocument) => {
    setOpeningDocId(doc.id);
    try {
      const url = await resolveStoredFileUrl('documentos', doc.file_url);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      logger.error('Error opening contract document', { error: err });
      toast.error('Erro ao abrir o documento');
    } finally {
      setOpeningDocId(null);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: { contract_id: contract.id },
      });
      if (error) throw error;

      // Serve o HTML via Blob URL (origem opaca) para evitar XSS na origem do app
      const blob = new Blob([data.html], { type: 'text/html; charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(blobUrl);
        }, 500);
      } else {
        URL.revokeObjectURL(blobUrl);
      }
      toast.success("PDF gerado com sucesso!");
    } catch (err: unknown) {
      logger.error('Error generating PDF', { error: err });
      toast.error("Erro ao gerar PDF do contrato");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!contract) return null;

  const status = statusConfig[contract.status] || statusConfig["draft"];
  const type = typeConfig[contract.contract_type] || typeConfig["service"];
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
                    {penalties.length} penalidade(s): {formatCurrency(totalPenalties)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">
                {formatCurrency(Number(contract.total_value))}
              </p>
            </div>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">Geral</TabsTrigger>
              <TabsTrigger value="sla" className="gap-1">
                <ShieldAlert className="w-3 h-3" />
                SLA
              </TabsTrigger>
              <TabsTrigger value="items">Itens ({items.length})</TabsTrigger>
              <TabsTrigger value="docs" className="gap-1">
                <Paperclip className="w-3 h-3" />
                Docs ({documents.length})
              </TabsTrigger>
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
                      {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
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

            <TabsContent value="sla" className="space-y-4">
              <ContractSLAReadonlyTab contract={contract} />
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Carregando itens...
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum item cadastrado neste contrato</p>
                </div>
              ) : (
                <Table aria-label="Itens do contrato">
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
                    {items.map((item, index) => (
                      <TableRow key={item.id ?? index}>
                        <TableCell className="font-medium">
                          {item.item_name}
                          {item.description && (
                            <span className="block text-xs text-muted-foreground">{item.description}</span>
                          )}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(item.total_price))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!loading && (
                <p className="text-xs text-muted-foreground">
                  {linkedOrders.length === 0
                    ? "Nenhuma ordem de compra vinculada a este contrato"
                    : `${linkedOrders.length} ${linkedOrders.length === 1 ? "ordem de compra vinculada" : "ordens de compra vinculadas"} a este contrato`}
                </p>
              )}
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Documentos anexados</p>
                  <p className="text-xs text-muted-foreground">PDF, imagens ou documentos do contrato</p>
                </div>
                <input
                  ref={docInputRef}
                  type="file"
                  aria-label="Anexar documento ao contrato"
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    e.target.value = "";
                    if (selected) void handleUploadDocument(selected);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={uploading}
                  onClick={() => docInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Enviando..." : "Anexar documento"}
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Carregando documentos...
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <Paperclip className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum documento anexado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <File className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {doc.file_size != null ? ` · ${formatBytes(doc.file_size)}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 shrink-0"
                        disabled={openingDocId === doc.id}
                        onClick={() => void handleOpenDocument(doc)}
                      >
                        {openingDocId === doc.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Download className="w-4 h-4" />}
                        Abrir
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="penalties">
              <ContractPenaltiesTab penalties={penalties} totalPenalties={totalPenalties} />
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
