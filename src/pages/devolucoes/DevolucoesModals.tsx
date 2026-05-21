import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDevolucoes, type CreateDevolucaoInput, type Devolucao } from "@/hooks/useDevolucoes";
import { useFornecedores } from "@/hooks/useFornecedores";
import { RotateCcw, Plus, X, Clock } from "lucide-react";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { toast } from "sonner";

export const MOTIVO_LABELS: Record<string, string> = {
  defeito: "Defeito de Fabricação",
  divergencia: "Divergência do Pedido",
  avaria_transporte: "Avaria no Transporte",
  prazo_vencido: "Prazo de Validade",
  quantidade_errada: "Quantidade Errada",
  especificacao_errada: "Especificação Errada",
  outro: "Outro",
};

export const RESOLUCAO_LABELS: Record<string, string> = {
  credito: "Crédito para Futuras Compras",
  reposicao: "Reposição de Produto",
  reembolso: "Reembolso Financeiro",
  desconto_futuro: "Desconto em Pedido Futuro",
};

export function NovaDevolucaoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createDevolucao } = useDevolucoes();
  const { fornecedores } = useFornecedores();
  const [form, setForm] = useState({
    fornecedor_id: "",
    tipo: "devolucao" as const,
    motivo: "defeito",
    motivo_detalhe: "",
    resolucao: "credito",
    observacoes: "",
    itens: [{ descricao: "", quantidade: 1, valor_unitario: 0 }],
  });
  const [saving, setSaving] = useState(false);

  const addItem = () => setForm(f => ({ ...f, itens: [...f.itens, { descricao: "", quantidade: 1, valor_unitario: 0 }] }));
  const removeItem = (idx: number) => setForm(f => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  const updateItem = (idx: number, field: string, value: string | number) =>
    setForm(f => ({ ...f, itens: f.itens.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));

  const handleSubmit = async () => {
    if (!form.fornecedor_id) { toast.error("Selecione o fornecedor"); return; }
    if (form.itens.some(i => !i.descricao)) { toast.error("Preencha todos os itens"); return; }
    setSaving(true);
    const input: CreateDevolucaoInput = {
      fornecedor_id: form.fornecedor_id,
      tipo: form.tipo,
      motivo: form.motivo,
      motivo_detalhe: form.motivo_detalhe || undefined,
      resolucao: form.resolucao,
      observacoes: form.observacoes || undefined,
      itens: form.itens,
    };
    const result = await createDevolucao(input);
    setSaving(false);
    if (result) {
      setForm({ fornecedor_id: "", tipo: "devolucao", motivo: "defeito", motivo_detalhe: "", resolucao: "credito", observacoes: "", itens: [{ descricao: "", quantidade: 1, valor_unitario: 0 }] });
      onClose();
    }
  };

  const totalValue = form.itens.reduce((s, i) => s + i.quantidade * i.valor_unitario, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Nova Devolução / Troca
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fornecedor *</Label>
              <Select value={form.fornecedor_id} onValueChange={v => setForm(f => ({ ...f, fornecedor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia || f.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as typeof f.tipo }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="devolucao">Devolução</SelectItem>
                  <SelectItem value="troca">Troca</SelectItem>
                  <SelectItem value="garantia">Garantia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Motivo *</Label>
              <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MOTIVO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resolução Desejada</Label>
              <Select value={form.resolucao} onValueChange={v => setForm(f => ({ ...f, resolucao: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RESOLUCAO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Detalhes do Motivo</Label>
            <Textarea value={form.motivo_detalhe} onChange={e => setForm(f => ({ ...f, motivo_detalhe: e.target.value }))} placeholder="Descreva o problema em detalhe..." rows={2} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Itens para Devolução</Label>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Item</Button>
            </div>
            <div className="space-y-2">
              {form.itens.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {idx === 0 && <Label className="text-xs">Descrição</Label>}
                    <Input value={item.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)} placeholder="Nome do item" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs">Qtd</Label>}
                    <Input type="number" min={1} value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value, 10) || 1)} />
                  </div>
                  <div className="col-span-3">
                    {idx === 0 && <Label className="text-xs">Valor Unit.</Label>}
                    <Input type="number" min={0} step={0.01} value={item.valor_unitario} onChange={e => updateItem(idx, 'valor_unitario', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {form.itens.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-semibold text-foreground">
              Total: R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações adicionais..." rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Criando..." : "Criar Devolução"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DevolucaoDetailModal({ devolucao, open, onClose }: { devolucao: Devolucao | null; open: boolean; onClose: () => void }) {
  const { updateStatus } = useDevolucoes();
  if (!devolucao) return null;

  const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
    solicitada: { label: "Solicitada", color: "bg-kpi-warning/20 text-kpi-warning", icon: Clock },
    aprovada: { label: "Aprovada", color: "bg-primary/20 text-primary", icon: Clock },
    em_transito: { label: "Em Trânsito", color: "bg-info/20 text-info", icon: Clock },
    recebida_fornecedor: { label: "Recebida", color: "bg-success/20 text-success", icon: Clock },
    credito_emitido: { label: "Crédito Emitido", color: "bg-violet-500/20 text-violet-400", icon: Clock },
    reposicao_enviada: { label: "Reposição Enviada", color: "bg-cyan-500/20 text-cyan-400", icon: Clock },
    concluida: { label: "Concluída", color: "bg-kpi-success/20 text-kpi-success", icon: Clock },
    rejeitada: { label: "Rejeitada", color: "bg-kpi-danger/20 text-kpi-danger", icon: Clock },
    cancelada: { label: "Cancelada", color: "bg-muted text-muted-foreground", icon: Clock },
  };

  const status = STATUS_MAP[devolucao.status];
  const StatusIcon = status?.icon || Clock;

  type ActionDef = { label: string; status: string; variant: "default" | "outline" | "destructive" };
  const transitions: Record<string, ActionDef[]> = {
    solicitada: [{ label: "Aprovar", status: "aprovada", variant: "default" }, { label: "Rejeitar", status: "rejeitada", variant: "destructive" }],
    aprovada: [{ label: "Marcar em Trânsito", status: "em_transito", variant: "default" }],
    em_transito: [{ label: "Confirmar Recebimento", status: "recebida_fornecedor", variant: "default" }],
    recebida_fornecedor: [
      { label: "Emitir Crédito", status: "credito_emitido", variant: "default" },
      { label: "Confirmar Reposição", status: "reposicao_enviada", variant: "default" },
      { label: "Concluir", status: "concluida", variant: "outline" },
    ],
    credito_emitido: [{ label: "Concluir", status: "concluida", variant: "default" }],
    reposicao_enviada: [{ label: "Concluir", status: "concluida", variant: "default" }],
    rejeitada: [{ label: "Reabrir", status: "solicitada", variant: "outline" }],
  };
  const actions = transitions[devolucao.status] || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" />
            {devolucao.numero}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={status?.color}>{status?.label}</Badge>
            <Badge variant="outline">{devolucao.tipo === 'troca' ? 'Troca' : devolucao.tipo === 'garantia' ? 'Garantia' : 'Devolução'}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Fornecedor:</span> <span className="font-medium">{devolucao.fornecedor?.nome_fantasia || devolucao.fornecedor?.razao_social || '—'}</span></div>
            <div><span className="text-muted-foreground">Pedido:</span> <span className="font-medium">{devolucao.pedido?.numero || '—'}</span></div>
            <div><span className="text-muted-foreground">Motivo:</span> <span className="font-medium">{MOTIVO_LABELS[devolucao.motivo as keyof typeof MOTIVO_LABELS] || devolucao.motivo}</span></div>
            <div><span className="text-muted-foreground">Resolução:</span> <span className="font-medium">{RESOLUCAO_LABELS[devolucao.resolucao as keyof typeof RESOLUCAO_LABELS] || devolucao.resolucao}</span></div>
            <div><span className="text-muted-foreground">Valor:</span> <span className="font-semibold text-primary">R$ {(devolucao.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{format(new Date(devolucao.data_solicitacao), "dd/MM/yyyy", { locale: ptBR })}</span></div>
          </div>

          {devolucao.motivo_detalhe && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground text-xs mb-1">Detalhes:</p>
              <p>{devolucao.motivo_detalhe}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</p>
            <div className="space-y-1.5">
              {[
                { label: "Solicitação", date: devolucao.data_solicitacao },
                { label: "Aprovação", date: devolucao.data_aprovacao },
                { label: "Envio", date: devolucao.data_envio },
                { label: "Recebimento Fornecedor", date: devolucao.data_recebimento_fornecedor },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${step.date ? 'bg-kpi-success' : 'bg-border'}`} />
                  <span className={step.date ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
                  {step.date && <span className="text-xs text-muted-foreground ml-auto">{format(new Date(step.date), "dd/MM HH:mm")}</span>}
                </div>
              ))}
            </div>
          </div>

          {actions.length > 0 && (
            <div className="flex gap-2 pt-2">
              {actions.map(action => (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={async () => { await updateStatus(devolucao.id, action.status); onClose(); }}
                  className="flex-1"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
