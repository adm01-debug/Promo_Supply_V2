import { useState, useMemo } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDevolucoes, useCreditosFornecedor, useDevolucoesKPIs } from "@/hooks/useDevolucoes";
import { 
  RotateCcw, Plus, Search, TrendingDown, Truck, CheckCircle2, 
  AlertTriangle, DollarSign, CreditCard, Package, 
  Clock, Eye
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { NovaDevolucaoModal, DevolucaoDetailModal, MOTIVO_LABELS } from "./devolucoes/DevolucoesModals";
import { STATUS_MAP, CREDITO_STATUS_MAP } from "./devolucoes/devolucoesData";

function KpiCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string | number; subtitle?: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NovaDevolucaoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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

          {/* Items */}
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
                    <Input type="number" min={1} value={item.quantidade} onChange={e => updateItem(idx, 'quantidade', parseInt(e.target.value) || 1)} />
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

function DevolucaoDetailModal({ devolucao, open, onClose }: { devolucao: import("@/hooks/useDevolucoes").Devolucao | null; open: boolean; onClose: () => void }) {
  const { updateStatus } = useDevolucoes();
  if (!devolucao) return null;

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
            <div><span className="text-muted-foreground">Motivo:</span> <span className="font-medium">{MOTIVO_LABELS[devolucao.motivo] || devolucao.motivo}</span></div>
            <div><span className="text-muted-foreground">Resolução:</span> <span className="font-medium">{RESOLUCAO_LABELS[devolucao.resolucao] || devolucao.resolucao}</span></div>
            <div><span className="text-muted-foreground">Valor:</span> <span className="font-semibold text-primary">R$ {devolucao.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
            <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{format(new Date(devolucao.data_solicitacao), "dd/MM/yyyy", { locale: ptBR })}</span></div>
          </div>

          {devolucao.motivo_detalhe && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground text-xs mb-1">Detalhes:</p>
              <p>{devolucao.motivo_detalhe}</p>
            </div>
          )}

          {/* Timeline */}
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

export default function Devolucoes() {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedDev, setSelectedDev] = useState<import("@/hooks/useDevolucoes").Devolucao | null>(null);
  const [activeTab, setActiveTab] = useState("devolucoes");

  const { devolucoes, loading } = useDevolucoes({ status: statusFilter, search: searchTerm });
  const { kpis, loading: kpisLoading } = useDevolucoesKPIs();
  const { creditos, saldoTotal, loading: creditosLoading } = useCreditosFornecedor();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-primary" />
              Devoluções & Créditos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão de devoluções, trocas e créditos de fornecedores</p>
          </div>
          <Button onClick={() => setShowNewModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Devolução
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpisLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : (
            <>
              <KpiCard title="Total Devoluções" value={kpis.total} icon={RotateCcw} color="bg-primary/15 text-primary" />
              <KpiCard title="Abertas" value={kpis.abertas} icon={AlertTriangle} color="bg-kpi-warning/15 text-kpi-warning" />
              <KpiCard title="Em Trânsito" value={kpis.emTransito} icon={Truck} color="bg-info/15 text-info" />
              <KpiCard title="Concluídas" value={kpis.concluidas} icon={CheckCircle2} color="bg-kpi-success/15 text-kpi-success" />
              <KpiCard title="Valor Total" value={`R$ ${(kpis.valorTotal / 1000).toFixed(1)}k`} icon={TrendingDown} color="bg-kpi-danger/15 text-kpi-danger" />
              <KpiCard title="Créditos Ativos" value={`R$ ${(saldoTotal / 1000).toFixed(1)}k`} subtitle="Saldo disponível" icon={CreditCard} color="bg-violet-500/15 text-violet-400" />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="devolucoes" className="gap-1.5"><RotateCcw className="w-3.5 h-3.5" />Devoluções</TabsTrigger>
            <TabsTrigger value="creditos" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" />Créditos</TabsTrigger>
          </TabsList>

          {/* Devoluções Tab */}
          <TabsContent value="devolucoes" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar devoluções..." className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card className="border-border/50">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : devolucoes.length === 0 ? (
                  <div className="p-12 text-center">
                    <RotateCcw className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Nenhuma devolução encontrada</p>
                    <p className="text-xs text-muted-foreground mt-1">Crie uma nova devolução para começar</p>
                  </div>
                ) : (
                  <Table aria-label="Tabela de dados">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Número</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devolucoes.map(dev => {
                        const st = STATUS_MAP[dev.status];
                        return (
                          <TableRow key={dev.id} className="cursor-pointer" onClick={() => setSelectedDev(dev)}>
                            <TableCell className="font-mono font-semibold text-primary">{dev.numero}</TableCell>
                            <TableCell className="font-medium">{dev.fornecedor?.nome_fantasia || dev.fornecedor?.razao_social || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {dev.tipo === 'troca' ? 'Troca' : dev.tipo === 'garantia' ? 'Garantia' : 'Devolução'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{MOTIVO_LABELS[dev.motivo] || dev.motivo}</TableCell>
                            <TableCell><Badge className={`${st?.color} text-xs`}>{st?.label}</Badge></TableCell>
                            <TableCell className="text-right font-semibold">R$ {dev.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(new Date(dev.data_solicitacao), "dd/MM/yy")}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="w-8 h-8"><Eye className="w-4 h-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Créditos Tab */}
          <TabsContent value="creditos" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Créditos de Fornecedores
                  <Badge variant="secondary" className="ml-auto">
                    Saldo Total: R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {creditosLoading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : creditos.length === 0 ? (
                  <div className="p-12 text-center">
                    <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Nenhum crédito registrado</p>
                    <p className="text-xs text-muted-foreground mt-1">Créditos são gerados automaticamente ao concluir devoluções</p>
                  </div>
                ) : (
                  <Table aria-label="Tabela de dados">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Ref. Devolução</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor Original</TableHead>
                        <TableHead className="text-right">Utilizado</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Emissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditos.map(cred => {
                        const cs = CREDITO_STATUS_MAP[cred.status] || CREDITO_STATUS_MAP.ativo;
                        return (
                          <TableRow key={cred.id}>
                            <TableCell className="font-medium">{cred.fornecedor?.nome_fantasia || cred.fornecedor?.razao_social || '—'}</TableCell>
                            <TableCell className="font-mono text-xs text-primary">{cred.devolucao?.numero || '—'}</TableCell>
                            <TableCell className="text-sm">{cred.tipo === 'credito_devolucao' ? 'Devolução' : cred.tipo}</TableCell>
                            <TableCell className="text-right font-medium">R$ {cred.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right text-muted-foreground">R$ {cred.valor_utilizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-semibold text-kpi-success">R$ {cred.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell><Badge className={`${cs.color} text-xs`}>{cs.label}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">{format(new Date(cred.data_emissao), "dd/MM/yy")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <NovaDevolucaoModal open={showNewModal} onClose={() => setShowNewModal(false)} />
      <DevolucaoDetailModal devolucao={selectedDev} open={!!selectedDev} onClose={() => setSelectedDev(null)} />
    </MainLayout>
  );
}
