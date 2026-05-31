import { useState, useMemo } from "react";
import { Settings, Plus, Trash2, Edit2, Users, DollarSign, Clock, ArrowRight, AlertTriangle, GitBranch, Zap, ChevronDown, ChevronUp, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useApprovalWorkflow, ApprovalRule, ApprovalDelegation } from "@/hooks/useApprovalWorkflow";
import { toast } from "@/lib/feedbackToast";
import { ApprovalRuleModal } from "./approval/ApprovalRuleModal";
import { ApprovalDelegationModal } from "./approval/ApprovalDelegationModal";

const mockUsers = [
  { id: "user-1", nome: "João Silva", cargo: "Gestor", email: "joao@empresa.com" },
  { id: "user-2", nome: "Maria Santos", cargo: "Coordenadora", email: "maria@empresa.com" },
  { id: "user-3", nome: "Carlos Lima", cargo: "Diretor Financeiro", email: "carlos@empresa.com" },
  { id: "user-4", nome: "Ana Oliveira", cargo: "Gerente de Compras", email: "ana@empresa.com" },
  { id: "user-5", nome: "Roberto Costa", cargo: "CEO", email: "roberto@empresa.com" },
];

const mockCategories = [
  { id: "cat-1", nome: "Material de Escritório" }, { id: "cat-2", nome: "Equipamentos" },
  { id: "cat-3", nome: "Serviços" }, { id: "cat-4", nome: "Marketing" }, { id: "cat-5", nome: "Brindes Promocionais" },
];

export const DynamicApprovalMatrix = () => {
  const { rules, delegations, loading, saveRule, deleteRule, saveDelegation, deleteDelegation } = useApprovalWorkflow();
  const [editingRule, setEditingRule] = useState<Partial<ApprovalRule> | null>(null);
  const [editingDelegation, setEditingDelegation] = useState<Partial<ApprovalDelegation> | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [delegationModalOpen, setDelegationModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'rule' | 'delegation', id: string } | null>(null);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(true);

  const sortedRules = useMemo(() => [...rules].sort((a, b) => a.valor_min - b.valor_min), [rules]);
  const activeDelegations = useMemo(() => delegations.filter(d => { const now = new Date(); return d.ativo && new Date(d.data_inicio) <= now && new Date(d.data_fim) >= now; }), [delegations]);

  const getUserName = (userId: string) => mockUsers.find(u => u.id === userId)?.nome || userId;
  const getCategoryName = (categoryId?: string) => categoryId ? mockCategories.find(c => c.id === categoryId)?.nome : "Todas";
  const formatCurrency = (value: number) => value >= 999999999 ? "∞" : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSaveRule = async () => {
    if (!editingRule) return;
    if (!editingRule.nome || editingRule.aprovadores?.length === 0) { toast.error('Preencha todos os campos obrigatórios'); return; }
    await saveRule(editingRule as ApprovalRule);
    setRuleModalOpen(false);
    setEditingRule(null);
  };

  const handleSaveDelegation = async () => {
    if (!editingDelegation) return;
    if (!editingDelegation.delegante_id || !editingDelegation.delegado_id || !editingDelegation.data_fim) { toast.error('Preencha todos os campos obrigatórios'); return; }
    await saveDelegation(editingDelegation as ApprovalDelegation);
    setDelegationModalOpen(false);
    setEditingDelegation(null);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'rule') await deleteRule(itemToDelete.id);
    else await deleteDelegation(itemToDelete.id);
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Approval Rules */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><GitBranch className="w-5 h-5 text-primary" />Matriz de Aprovação Dinâmica</h2>
          <Button size="sm" onClick={() => { setEditingRule({ nome: "", descricao: "", valor_min: 0, valor_max: 10000, aprovadores: [{ user_id: '', ordem: 1 }], tempo_limite_horas: 24, escalacao_automatica: false, niveis_aprovacao: 1, requer_unanimidade: false, ativo: true, prioridade: 0 }); setRuleModalOpen(true); }} disabled={loading}><Plus className="w-4 h-4 mr-2" />Nova Regra</Button>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table aria-label="Tabela de dados">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Regra</TableHead><TableHead>Faixa de Valor</TableHead><TableHead>Categoria</TableHead>
                <TableHead>Aprovadores</TableHead><TableHead>SLA</TableHead><TableHead>Escalação</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRules.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground"><Settings className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Nenhuma regra configurada</p></TableCell></TableRow>
              ) : sortedRules.map((rule) => (
                <TableRow key={rule.id} className={cn(!rule.ativo && "opacity-50")}>
                  <TableCell><div><p className="font-medium">{rule.nome}</p>{rule.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{rule.descricao}</p>}</div></TableCell>
                  <TableCell><div className="flex items-center gap-1 text-sm font-mono"><span className="text-muted-foreground">{formatCurrency(rule.valor_min)}</span><ArrowRight className="w-3 h-3 text-muted-foreground" /><span>{formatCurrency(rule.valor_max)}</span></div></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{getCategoryName(rule.categoria_id)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {rule.aprovadores.length === 0 ? <Badge variant="secondary" className="text-xs"><Zap className="w-3 h-3 mr-1" />Auto</Badge> : rule.aprovadores.slice(0, 3).map((a, i) => <Badge key={i} variant="outline" className="text-xs">{i + 1}. {getUserName(a.user_id)}</Badge>)}
                      {rule.aprovadores.length > 3 && <Badge variant="secondary" className="text-xs">+{rule.aprovadores.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell><span className="flex items-center gap-1 text-sm"><Clock className="w-3 h-3 text-muted-foreground" />{rule.tempo_limite_horas}h</span></TableCell>
                  <TableCell>{rule.escalacao_automatica ? <div className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-warning" /><span className="text-xs">{getUserName(rule.escalacao_para || '')}</span></div> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                  <TableCell><Badge variant={rule.ativo ? "default" : "secondary"}>{rule.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRule(rule); setRuleModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setItemToDelete({ type: 'rule', id: rule.id }); setDeleteConfirmOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Visual Workflow */}
      <Card className="p-6">
        <Collapsible open={isWorkflowOpen} onOpenChange={setIsWorkflowOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" />Fluxo Visual de Aprovação</h2>
              {isWorkflowOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="flex flex-wrap items-start gap-3 p-4 bg-muted/30 rounded-lg overflow-x-auto">
              {sortedRules.filter(r => r.ativo).map((rule, index) => (
                <div key={rule.id} className="flex items-center">
                  <div className={cn("p-4 rounded-xl border-2 text-center min-w-[160px] transition-all hover:shadow-md", rule.aprovadores.length === 0 ? "border-emerald-500/50 bg-success/10" : "border-primary/50 bg-primary/10")}>
                    <div className="flex items-center justify-center gap-1 mb-2"><Target className="w-4 h-4 text-primary" /><span className="font-semibold text-sm">{rule.nome}</span></div>
                    <p className="text-xs text-muted-foreground mb-3 font-mono">{formatCurrency(rule.valor_min)} → {formatCurrency(rule.valor_max)}</p>
                    {rule.aprovadores.length > 0 && <div className="space-y-1 mb-2">{rule.aprovadores.map((a, i) => <div key={i} className="flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /><span className="text-xs">{getUserName(a.user_id)}</span></div>)}</div>}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><Clock className="w-3 h-3" /><span>{rule.tempo_limite_horas}h</span></div>
                    {rule.escalacao_automatica && <div className="mt-2 pt-2 border-t border-dashed border-amber-500/50"><p className="text-[10px] text-warning flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" />Escala para {getUserName(rule.escalacao_para || '')}</p></div>}
                  </div>
                  {index < sortedRules.filter(r => r.ativo).length - 1 && <ArrowRight className="w-6 h-6 text-muted-foreground mx-2 flex-shrink-0" />}
                </div>
              ))}
              {sortedRules.filter(r => r.ativo).length === 0 && <div className="w-full text-center py-8 text-muted-foreground"><p className="text-sm">Nenhuma regra ativa</p></div>}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delegations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Delegações de Aprovação{activeDelegations.length > 0 && <Badge variant="secondary" className="ml-2">{activeDelegations.length} ativa(s)</Badge>}</h2>
          <Button size="sm" onClick={() => { setEditingDelegation({ delegante_id: '', delegado_id: '', data_inicio: new Date().toISOString().split('T')[0], data_fim: '', motivo: '', categorias_permitidas: [], ativo: true }); setDelegationModalOpen(true); }} disabled={loading}><Plus className="w-4 h-4 mr-2" />Nova Delegação</Button>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table aria-label="Tabela de dados">
            <TableHeader><TableRow className="bg-muted/50"><TableHead>Delegante</TableHead><TableHead>Delegado</TableHead><TableHead>Período</TableHead><TableHead>Restrições</TableHead><TableHead>Motivo</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {delegations.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>Nenhuma delegação configurada</p></TableCell></TableRow>
              ) : delegations.map((delegation) => {
                const isActive = delegation.ativo && new Date(delegation.data_inicio) <= new Date() && new Date(delegation.data_fim) >= new Date();
                return (
                  <TableRow key={delegation.id} className={cn(!isActive && "opacity-60")}>
                    <TableCell className="font-medium">{getUserName(delegation.delegante_id)}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary" />{getUserName(delegation.delegado_id)}</div></TableCell>
                    <TableCell><span className="text-sm font-mono">{new Date(delegation.data_inicio).toLocaleDateString('pt-BR')} - {new Date(delegation.data_fim).toLocaleDateString('pt-BR')}</span></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {delegation.valor_maximo && <Badge variant="outline" className="text-xs">Até {formatCurrency(delegation.valor_maximo)}</Badge>}
                        {delegation.categorias_permitidas.length > 0 && <Badge variant="outline" className="text-xs">{delegation.categorias_permitidas.length} categoria(s)</Badge>}
                        {!delegation.valor_maximo && delegation.categorias_permitidas.length === 0 && <span className="text-xs text-muted-foreground">Sem restrições</span>}
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm text-muted-foreground line-clamp-1">{delegation.motivo || '—'}</span></TableCell>
                    <TableCell><Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Ativa" : delegation.ativo ? "Programada" : "Inativa"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingDelegation({ ...delegation, data_inicio: delegation.data_inicio.split('T')[0], data_fim: delegation.data_fim.split('T')[0] }); setDelegationModalOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setItemToDelete({ type: 'delegation', id: delegation.id }); setDeleteConfirmOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modals */}
      <ApprovalRuleModal 
        open={ruleModalOpen} 
        onOpenChange={setRuleModalOpen} 
        editingRule={editingRule} 
        setEditingRule={setEditingRule as any} 
        onSave={handleSaveRule} 
        loading={loading} 
        requerUnanimidade={editingRule?.requer_unanimidade}
        onToggleUnanimidade={(val) => setEditingRule(prev => prev ? ({ ...prev, requer_unanimidade: val }) : null)}
      />
      <ApprovalDelegationModal open={delegationModalOpen} onOpenChange={setDelegationModalOpen} editingDelegation={editingDelegation} setEditingDelegation={setEditingDelegation as any} onSave={handleSaveDelegation} loading={loading} />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent aria-describedby="dialog-desc"><DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle><DialogDescription>Esta ação não pode ser desfeita. Deseja realmente excluir?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={confirmDelete}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
