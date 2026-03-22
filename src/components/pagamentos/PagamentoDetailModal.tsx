import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  CreditCard, Upload, CheckCircle2, Building2, Copy, Calendar,
  FileText, QrCode, DollarSign, Clock, AlertTriangle, Banknote, Image
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Pagamento } from "@/hooks/usePagamentos";

interface Props {
  pagamento: Pagamento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmarPagamento: (id: string, valorParcial?: number) => Promise<boolean>;
}

export const PagamentoDetailModal = ({ pagamento, open, onOpenChange, onConfirmarPagamento }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [valorParcial, setValorParcial] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch credits for this supplier
  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos-fornecedor', pagamento?.fornecedor_id],
    queryFn: async () => {
      if (!pagamento?.fornecedor_id) return [];
      const { data, error } = await supabase
        .from('creditos_fornecedor')
        .select('*')
        .eq('fornecedor_id', pagamento.fornecedor_id)
        .eq('status', 'ativo')
        .gt('saldo', 0);
      if (error) throw error;
      return data || [];
    },
    enabled: !!pagamento?.fornecedor_id && open,
  });

  // Fetch payment history
  const { data: historico = [] } = useQuery({
    queryKey: ['payment-history', pagamento?.id],
    queryFn: async () => {
      if (!pagamento?.id) return [];
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('pagamento_id', pagamento.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!pagamento?.id && open,
  });

  const totalCreditos = creditos.reduce((s: number, c: any) => s + (c.saldo || 0), 0);
  const saldoRestante = pagamento ? pagamento.valor - (pagamento.valor_pago || 0) : 0;
  const percentPago = pagamento ? ((pagamento.valor_pago || 0) / pagamento.valor) * 100 : 0;
  const isPago = pagamento?.status === 'pago';
  const dadosBancarios = pagamento?.dados_bancarios as Record<string, string> | null;

  const handleUploadComprovante = useCallback(async (file: File) => {
    if (!pagamento || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${pagamento.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(path, file, { cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('comprovantes').getPublicUrl(path);
      
      await supabase.from('pagamentos').update({ comprovante_url: urlData.publicUrl }).eq('id', pagamento.id);
      
      // Log in payment history
      await supabase.from('payment_history').insert({
        pagamento_id: pagamento.id,
        valor_parcela: 0,
        comprovante_url: urlData.publicUrl,
        observacoes: 'Comprovante anexado',
        registrado_por: user.id,
      });

      toast({ title: "Comprovante enviado!", description: "Arquivo salvo com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history', pagamento.id] });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [pagamento, user, queryClient]);

  const handleApplyCredit = useCallback(async (creditId: string, creditSaldo: number) => {
    if (!pagamento || !user) return;
    const aplicar = Math.min(creditSaldo, saldoRestante);
    
    try {
      // Update credit
      const { error: creditError } = await supabase
        .from('creditos_fornecedor')
        .update({
          valor_utilizado: aplicar,
          saldo: creditSaldo - aplicar,
          status: creditSaldo - aplicar <= 0 ? 'utilizado' : 'ativo',
          utilizado_em_pagamento_id: pagamento.id,
        })
        .eq('id', creditId);
      if (creditError) throw creditError;

      // Update pagamento
      const novoValorPago = (pagamento.valor_pago || 0) + aplicar;
      const novoStatus = novoValorPago >= pagamento.valor ? 'pago' : 'parcial';
      await supabase.from('pagamentos').update({
        valor_pago: novoValorPago,
        status: novoStatus,
        data_pagamento: novoStatus === 'pago' ? new Date().toISOString().split('T')[0] : pagamento.data_pagamento,
      }).eq('id', pagamento.id);

      // Log history
      await supabase.from('payment_history').insert({
        pagamento_id: pagamento.id,
        valor_parcela: aplicar,
        observacoes: `Crédito de devolução aplicado: ${aplicar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        registrado_por: user.id,
      });

      toast({ title: "Crédito aplicado!", description: `${aplicar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} abatido do pagamento.` });
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['creditos-fornecedor'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }, [pagamento, user, saldoRestante, queryClient]);

  const handleConfirmar = async () => {
    if (!pagamento) return;
    setProcessing(true);
    try {
      const valor = valorParcial ? parseFloat(valorParcial) : undefined;
      if (valor && (valor <= 0 || valor > saldoRestante)) {
        toast({ title: "Valor inválido", description: `Informe um valor entre R$ 0,01 e ${saldoRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, variant: "destructive" });
        return;
      }
      const success = await onConfirmarPagamento(pagamento.id, valor);
      if (success) {
        // Log history
        await supabase.from('payment_history').insert({
          pagamento_id: pagamento.id,
          valor_parcela: valor || saldoRestante,
          observacoes: valor ? 'Pagamento parcial' : 'Pagamento integral',
          registrado_por: user?.id,
        });
        queryClient.invalidateQueries({ queryKey: ['payment-history'] });
        setValorParcial("");
        onOpenChange(false);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCopiar = (texto: string, tipo: string) => {
    navigator.clipboard.writeText(texto);
    toast({ title: "Copiado!", description: `${tipo} copiado para a área de transferência` });
  };

  if (!pagamento) return null;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {pagamento.numero}
          </DialogTitle>
          <DialogDescription>
            {isPago ? "Detalhes do pagamento confirmado" : "Registrar pagamento"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={isPago ? "detalhes" : "pagar"}>
          <TabsList className="grid w-full grid-cols-3">
            {!isPago && <TabsTrigger value="pagar">Pagar</TabsTrigger>}
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            {!isPago && totalCreditos > 0 && <TabsTrigger value="creditos">Créditos</TabsTrigger>}
          </TabsList>

          {/* Tab Pagar */}
          {!isPago && (
            <TabsContent value="pagar" className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso do pagamento</span>
                  <span className="font-medium">{percentPago.toFixed(0)}%</span>
                </div>
                <Progress value={percentPago} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pago: {fmt(pagamento.valor_pago || 0)}</span>
                  <span>Restante: {fmt(saldoRestante)}</span>
                </div>
              </div>

              {/* Bank data */}
              {dadosBancarios && Object.keys(dadosBancarios).length > 0 && (
                <Card className="p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Banknote className="h-3.5 w-3.5" /> Dados Bancários
                  </p>
                  {Object.entries(dadosBancarios).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{val}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopiar(val, key)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {/* Partial payment */}
              <div className="space-y-2">
                <Label>Valor do pagamento</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={`Total: ${fmt(saldoRestante)}`}
                    value={valorParcial}
                    onChange={(e) => setValorParcial(e.target.value)}
                    step="0.01"
                    min="0.01"
                    max={saldoRestante}
                  />
                  <Button variant="outline" size="sm" onClick={() => setValorParcial(saldoRestante.toString())}>
                    Total
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Deixe vazio para pagar o valor total restante</p>
              </div>

              {/* Upload comprovante */}
              <div className="space-y-2">
                <Label>Comprovante</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUploadComprovante(e.target.files[0])}
                />
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Enviando...</p>
                  ) : pagamento.comprovante_url ? (
                    <div className="flex items-center gap-2 justify-center text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Comprovante anexado</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">Clique para anexar (PNG, JPG, PDF até 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleConfirmar} disabled={processing}>
                  {processing ? "Processando..." : valorParcial ? "Pagar Parcial" : "Confirmar Pagamento"}
                </Button>
              </div>
            </TabsContent>
          )}

          {/* Tab Detalhes */}
          <TabsContent value="detalhes" className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">Fornecedor</p>
                <p className="font-medium flex items-center gap-1"><Building2 className="h-3 w-3" />{pagamento.fornecedor?.razao_social || '-'}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">Valor Total</p>
                <p className="font-bold text-primary">{fmt(pagamento.valor)}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">Vencimento</p>
                <p className="font-medium">{format(new Date(pagamento.data_vencimento), 'dd/MM/yyyy')}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-muted-foreground text-xs">Forma Pagamento</p>
                <p className="font-medium">{pagamento.forma_pagamento?.toUpperCase() || 'N/D'}</p>
              </div>
              {pagamento.numero_nf && (
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground text-xs">Nota Fiscal</p>
                  <p className="font-mono">{pagamento.numero_nf}</p>
                </div>
              )}
              {pagamento.data_pagamento && (
                <div className="p-2 rounded bg-muted/50">
                  <p className="text-muted-foreground text-xs">Data Pagamento</p>
                  <p className="font-medium">{format(new Date(pagamento.data_pagamento), 'dd/MM/yyyy')}</p>
                </div>
              )}
            </div>
            {pagamento.observacoes && (
              <div className="p-2 rounded bg-muted/50 text-sm">
                <p className="text-muted-foreground text-xs">Observações</p>
                <p>{pagamento.observacoes}</p>
              </div>
            )}
            {pagamento.comprovante_url && (
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={pagamento.comprovante_url} target="_blank" rel="noopener noreferrer">
                  <Image className="h-4 w-4" />
                  Ver Comprovante
                </a>
              </Button>
            )}
          </TabsContent>

          {/* Tab Histórico */}
          <TabsContent value="historico" className="space-y-2">
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro no histórico</p>
            ) : (
              historico.map((h: any) => (
                <Card key={h.id} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{h.observacoes}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    {h.valor_parcela > 0 && (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                        {fmt(h.valor_parcela)}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Tab Créditos */}
          {!isPago && totalCreditos > 0 && (
            <TabsContent value="creditos" className="space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {fmt(totalCreditos)} em créditos disponíveis para este fornecedor
                </p>
              </div>
              {creditos.map((c: any) => (
                <Card key={c.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">{c.tipo?.replace(/_/g, ' ') || 'Crédito'}</p>
                      <p className="text-xs text-muted-foreground">{c.descricao || `Emitido em ${format(new Date(c.data_emissao), 'dd/MM/yyyy')}`}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{fmt(c.saldo)}</p>
                      <Button size="sm" variant="outline" className="mt-1" onClick={() => handleApplyCredit(c.id, c.saldo)}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
