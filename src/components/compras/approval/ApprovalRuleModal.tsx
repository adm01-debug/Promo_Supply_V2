import { Plus, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { type ApprovalRule } from "@/hooks/useApprovalWorkflow";

const mockUsers = [
  { id: "user-1", nome: "João Silva", cargo: "Gestor" },
  { id: "user-2", nome: "Maria Santos", cargo: "Coordenadora" },
  { id: "user-3", nome: "Carlos Lima", cargo: "Diretor Financeiro" },
  { id: "user-4", nome: "Ana Oliveira", cargo: "Gerente de Compras" },
  { id: "user-5", nome: "Roberto Costa", cargo: "CEO" },
];

const mockCategories = [
  { id: "cat-1", nome: "Material de Escritório" },
  { id: "cat-2", nome: "Equipamentos" },
  { id: "cat-3", nome: "Serviços" },
  { id: "cat-4", nome: "Marketing" },
  { id: "cat-5", nome: "Brindes Promocionais" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: Partial<ApprovalRule> | null;
  setEditingRule: (rule: Partial<ApprovalRule> | null) => void;
  onSave: () => void;
  loading: boolean;
}

export const ApprovalRuleModal = ({ open, onOpenChange, editingRule, setEditingRule, onSave, loading }: Props) => {
  const addApprover = () => {
    if (!editingRule) return;
    const current = editingRule.aprovadores || [];
    setEditingRule({ ...editingRule, aprovadores: [...current, { user_id: '', ordem: current.length + 1 }] });
  };

  const updateApprover = (index: number, userId: string) => {
    if (!editingRule) return;
    const aprovadores = [...(editingRule.aprovadores || [])];
    aprovadores[index] = { ...aprovadores[index], user_id: userId };
    setEditingRule({ ...editingRule, aprovadores });
  };

  const removeApprover = (index: number) => {
    if (!editingRule) return;
    setEditingRule({ ...editingRule, aprovadores: (editingRule.aprovadores || []).filter((_, i) => i !== index) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {editingRule?.id ? "Editar Regra" : "Nova Regra de Aprovação"}
          </DialogTitle>
          <DialogDescription>Configure os critérios de aprovação por valor e categoria</DialogDescription>
        </DialogHeader>

        {editingRule && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nome da Regra *</Label>
                <Input value={editingRule.nome || ''} onChange={(e) => setEditingRule({ ...editingRule, nome: e.target.value })} placeholder="Ex: Aprovação Gerencial" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descrição</Label>
                <Textarea value={editingRule.descricao || ''} onChange={(e) => setEditingRule({ ...editingRule, descricao: e.target.value })} placeholder="Descreva quando esta regra se aplica..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Valor Mínimo (R$)</Label>
                <Input type="number" value={editingRule.valor_min || 0} onChange={(e) => setEditingRule({ ...editingRule, valor_min: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Valor Máximo (R$)</Label>
                <Input type="number" value={editingRule.valor_max === 999999999 ? '' : editingRule.valor_max || ''} onChange={(e) => setEditingRule({ ...editingRule, valor_max: Number(e.target.value) || 999999999 })} placeholder="Sem limite" />
              </div>
              <div className="space-y-2">
                <Label>Categoria (opcional)</Label>
                <Select value={editingRule.categoria_id || 'all'} onValueChange={(v) => setEditingRule({ ...editingRule, categoria_id: v === 'all' ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {mockCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tempo Limite (horas)</Label>
                <Input type="number" value={editingRule.tempo_limite_horas || 24} onChange={(e) => setEditingRule({ ...editingRule, tempo_limite_horas: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Aprovadores *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addApprover}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
              </div>
              <div className="space-y-2">
                {editingRule.aprovadores?.map((aprovador, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-6 h-6 flex items-center justify-center p-0">{index + 1}</Badge>
                    <Select value={aprovador.user_id} onValueChange={(v) => updateApprover(index, v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o aprovador" /></SelectTrigger>
                      <SelectContent>
                        {mockUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.nome} - {user.cargo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeApprover(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Escalação Automática</Label>
                  <p className="text-xs text-muted-foreground">Escalar para outro aprovador se o prazo expirar</p>
                </div>
                <Switch checked={editingRule.escalacao_automatica || false} onCheckedChange={(checked) => setEditingRule({ ...editingRule, escalacao_automatica: checked })} />
              </div>
              {editingRule.escalacao_automatica && (
                <div className="space-y-2">
                  <Label>Escalar para</Label>
                  <Select value={editingRule.escalacao_para || ''} onValueChange={(v) => setEditingRule({ ...editingRule, escalacao_para: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o aprovador de escalação" /></SelectTrigger>
                    <SelectContent>
                      {mockUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.nome} - {user.cargo}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>Regra Ativa</Label>
                <p className="text-xs text-muted-foreground">Regras inativas não serão aplicadas</p>
              </div>
              <Switch checked={editingRule.ativo ?? true} onCheckedChange={(checked) => setEditingRule({ ...editingRule, ativo: checked })} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={loading}>{editingRule?.id ? "Salvar Alterações" : "Criar Regra"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
