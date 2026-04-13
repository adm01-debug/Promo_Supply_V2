import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { type ApprovalDelegation } from "@/hooks/useApprovalWorkflow";

const mockUsers = [
  { id: "user-1", nome: "João Silva", cargo: "Gestor" },
  { id: "user-2", nome: "Maria Santos", cargo: "Coordenadora" },
  { id: "user-3", nome: "Carlos Lima", cargo: "Diretor Financeiro" },
  { id: "user-4", nome: "Ana Oliveira", cargo: "Gerente de Compras" },
  { id: "user-5", nome: "Roberto Costa", cargo: "CEO" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDelegation: Partial<ApprovalDelegation> | null;
  setEditingDelegation: (d: Partial<ApprovalDelegation> | null) => void;
  onSave: () => void;
  loading: boolean;
}

export const ApprovalDelegationModal = ({ open, onOpenChange, editingDelegation, setEditingDelegation, onSave, loading }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby="dialog-desc" className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {editingDelegation?.id ? "Editar Delegação" : "Nova Delegação"}
        </DialogTitle>
        <DialogDescription>Configure uma delegação temporária de aprovação</DialogDescription>
      </DialogHeader>

      {editingDelegation && (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Delegante (Quem delega) *</Label>
            <Select value={editingDelegation.delegante_id || ''} onValueChange={(v) => setEditingDelegation({ ...editingDelegation, delegante_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione quem está delegando" /></SelectTrigger>
              <SelectContent>
                {mockUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.nome} - {user.cargo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Delegado (Quem recebe) *</Label>
            <Select value={editingDelegation.delegado_id || ''} onValueChange={(v) => setEditingDelegation({ ...editingDelegation, delegado_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione quem irá aprovar" /></SelectTrigger>
              <SelectContent>
                {mockUsers.filter(u => u.id !== editingDelegation.delegante_id).map(user => <SelectItem key={user.id} value={user.id}>{user.nome} - {user.cargo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Input type="date" value={typeof editingDelegation.data_inicio === 'string' ? editingDelegation.data_inicio.split('T')[0] : ''} onChange={(e) => setEditingDelegation({ ...editingDelegation, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim *</Label>
              <Input type="date" value={typeof editingDelegation.data_fim === 'string' ? editingDelegation.data_fim.split('T')[0] : ''} onChange={(e) => setEditingDelegation({ ...editingDelegation, data_fim: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor Máximo (opcional)</Label>
            <Input type="number" value={editingDelegation.valor_maximo || ''} onChange={(e) => setEditingDelegation({ ...editingDelegation, valor_maximo: Number(e.target.value) || undefined })} placeholder="Sem limite" />
            <p className="text-xs text-muted-foreground">Limite o valor máximo que o delegado pode aprovar</p>
          </div>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea value={editingDelegation.motivo || ''} onChange={(e) => setEditingDelegation({ ...editingDelegation, motivo: e.target.value })} placeholder="Ex: Férias, viagem a trabalho..." rows={2} />
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>Delegação Ativa</Label>
              <p className="text-xs text-muted-foreground">Delegações inativas não serão consideradas</p>
            </div>
            <Switch checked={editingDelegation.ativo ?? true} onCheckedChange={(checked) => setEditingDelegation({ ...editingDelegation, ativo: checked })} />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={onSave} disabled={loading}>{editingDelegation?.id ? "Salvar Alterações" : "Criar Delegação"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
