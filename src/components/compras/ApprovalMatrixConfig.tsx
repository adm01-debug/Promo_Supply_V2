import { useState } from "react";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface ApprovalRule {
  id: string;
  nome: string;
  valorMin: number;
  valorMax: number;
  categoria?: string;
  aprovadores: string[];
  tempoLimite: number; // horas
  escalacaoAutomatica: boolean;
  escalacaoPara?: string;
  ativo: boolean;
}

export interface Delegation {
  id: string;
  delegante: string;
  delegado: string;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
}

const categoriasDisponiveis = [
  "Todas",
  "Material de Escritório",
  "Brindes Promocionais",
  "Equipamentos",
  "Serviços",
  "Marketing",
];

const aprovadoresDisponiveis = [
  { id: "gestor", nome: "Gestor Direto", cargo: "Gestão" },
  { id: "coordenador", nome: "Coordenador de Compras", cargo: "Coordenação" },
  { id: "diretor", nome: "Diretor Financeiro", cargo: "Diretoria" },
  { id: "comite", nome: "Comitê de Compras", cargo: "Comitê" },
  { id: "ceo", nome: "CEO", cargo: "Executivo" },
];

const defaultRules: ApprovalRule[] = [
  {
    id: "1",
    nome: "Auto-Aprovação",
    valorMin: 0,
    valorMax: 1000,
    aprovadores: [],
    tempoLimite: 0,
    escalacaoAutomatica: false,
    ativo: true,
  },
  {
    id: "2",
    nome: "Aprovação Gestor",
    valorMin: 1000.01,
    valorMax: 10000,
    aprovadores: ["gestor"],
    tempoLimite: 24,
    escalacaoAutomatica: true,
    escalacaoPara: "coordenador",
    ativo: true,
  },
  {
    id: "3",
    nome: "Aprovação Coordenador",
    valorMin: 10000.01,
    valorMax: 50000,
    aprovadores: ["gestor", "coordenador"],
    tempoLimite: 48,
    escalacaoAutomatica: true,
    escalacaoPara: "diretor",
    ativo: true,
  },
  {
    id: "4",
    nome: "Comitê de Compras",
    valorMin: 50000.01,
    valorMax: 999999999,
    aprovadores: ["gestor", "coordenador", "diretor", "comite"],
    tempoLimite: 72,
    escalacaoAutomatica: true,
    escalacaoPara: "ceo",
    ativo: true,
  },
];

const defaultDelegations: Delegation[] = [
  {
    id: "1",
    delegante: "coordenador",
    delegado: "gestor",
    dataInicio: "2024-12-20",
    dataFim: "2024-12-27",
    ativo: true,
  },
];

export const ApprovalMatrixConfig = () => {
  const [rules, setRules] = useState<ApprovalRule[]>(defaultRules);
  const [delegations, setDelegations] = useState<Delegation[]>(defaultDelegations);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [editingDelegation, setEditingDelegation] = useState<Delegation | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [delegationModalOpen, setDelegationModalOpen] = useState(false);

  const handleSaveRule = () => {
    if (!editingRule) return;
    
    if (editingRule.id) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
    } else {
      setRules(prev => [...prev, { ...editingRule, id: Date.now().toString() }]);
    }
    setRuleModalOpen(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveDelegation = () => {
    if (!editingDelegation) return;
    
    if (editingDelegation.id) {
      setDelegations(prev => prev.map(d => d.id === editingDelegation.id ? editingDelegation : d));
    } else {
      setDelegations(prev => [...prev, { ...editingDelegation, id: Date.now().toString() }]);
    }
    setDelegationModalOpen(false);
    setEditingDelegation(null);
  };

  const handleDeleteDelegation = (id: string) => {
    setDelegations(prev => prev.filter(d => d.id !== id));
  };

  const getAprovadorNome = (id: string) => {
    return aprovadoresDisponiveis.find(a => a.id === id)?.nome || id;
  };

  const formatCurrency = (value: number) => {
    if (value >= 999999999) return "∞";
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  return (
    <div className="space-y-6">
      {/* Approval Rules Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Regras de Aprovação
          </h2>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingRule({
                id: "",
                nome: "",
                valorMin: 0,
                valorMax: 0,
                aprovadores: [],
                tempoLimite: 24,
                escalacaoAutomatica: false,
                ativo: true,
              });
              setRuleModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Regra
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Regra</TableHead>
              <TableHead>Faixa de Valor</TableHead>
              <TableHead>Aprovadores</TableHead>
              <TableHead>Tempo Limite</TableHead>
              <TableHead>Escalação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.nome}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <span>{formatCurrency(rule.valorMin)}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span>{formatCurrency(rule.valorMax)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {rule.aprovadores.length === 0 ? (
                      <Badge variant="secondary" className="text-xs">Auto</Badge>
                    ) : (
                      rule.aprovadores.map(a => (
                        <Badge key={a} variant="outline" className="text-xs">
                          {getAprovadorNome(a)}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {rule.tempoLimite > 0 ? (
                    <span className="flex items-center gap-1 text-sm">
                      <Clock className="w-3 h-3" />
                      {rule.tempoLimite}h
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {rule.escalacaoAutomatica ? (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span className="text-xs">{getAprovadorNome(rule.escalacaoPara || "")}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Não</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={rule.ativo ? "default" : "secondary"}>
                    {rule.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditingRule(rule);
                        setRuleModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Visual Workflow */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Fluxo Visual de Aprovação
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {rules.filter(r => r.ativo).sort((a, b) => a.valorMin - b.valorMin).map((rule, index) => (
            <div key={rule.id} className="flex items-center">
              <div className={cn(
                "p-3 rounded-lg border-2 text-center min-w-[140px]",
                rule.aprovadores.length === 0 
                  ? "border-emerald-500/50 bg-emerald-500/10" 
                  : "border-primary/50 bg-primary/10"
              )}>
                <p className="text-xs text-muted-foreground mb-1">
                  {formatCurrency(rule.valorMin)} - {formatCurrency(rule.valorMax)}
                </p>
                <p className="font-medium text-sm">{rule.nome}</p>
                {rule.aprovadores.length > 0 && (
                  <div className="flex justify-center gap-1 mt-2">
                    {rule.aprovadores.map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
                {rule.escalacaoAutomatica && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Escala em {rule.tempoLimite}h
                  </p>
                )}
              </div>
              {index < rules.filter(r => r.ativo).length - 1 && (
                <ArrowRight className="w-5 h-5 text-muted-foreground mx-2" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Delegations Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Delegações Temporárias
          </h2>
          <Button 
            size="sm" 
            onClick={() => {
              setEditingDelegation({
                id: "",
                delegante: "",
                delegado: "",
                dataInicio: new Date().toISOString().split('T')[0],
                dataFim: "",
                ativo: true,
              });
              setDelegationModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Delegação
          </Button>
        </div>

        {delegations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma delegação configurada
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegante</TableHead>
                <TableHead>Delegado</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegations.map((delegation) => (
                <TableRow key={delegation.id}>
                  <TableCell className="font-medium">
                    {getAprovadorNome(delegation.delegante)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      {getAprovadorNome(delegation.delegado)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {new Date(delegation.dataInicio).toLocaleDateString('pt-BR')} - {new Date(delegation.dataFim).toLocaleDateString('pt-BR')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={delegation.ativo ? "default" : "secondary"}>
                      {delegation.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingDelegation(delegation);
                          setDelegationModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteDelegation(delegation.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Rule Edit Modal */}
      <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRule?.id ? "Editar Regra" : "Nova Regra de Aprovação"}
            </DialogTitle>
          </DialogHeader>
          
          {editingRule && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Regra</Label>
                <Input
                  value={editingRule.nome}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, nome: e.target.value } : null)}
                  placeholder="Ex: Aprovação Gerencial"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Mínimo (R$)</Label>
                  <Input
                    type="number"
                    value={editingRule.valorMin}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, valorMin: Number(e.target.value) } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Máximo (R$)</Label>
                  <Input
                    type="number"
                    value={editingRule.valorMax === 999999999 ? "" : editingRule.valorMax}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, valorMax: Number(e.target.value) || 999999999 } : null)}
                    placeholder="Sem limite"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoria (opcional)</Label>
                <Select
                  value={editingRule.categoria || "Todas"}
                  onValueChange={(v) => setEditingRule(prev => prev ? { ...prev, categoria: v === "Todas" ? undefined : v } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasDisponiveis.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Aprovadores (em sequência)</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 min-h-[60px]">
                  {editingRule.aprovadores.map((a, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {index + 1}. {getAprovadorNome(a)}
                      <button
                        onClick={() => setEditingRule(prev => prev ? {
                          ...prev,
                          aprovadores: prev.aprovadores.filter((_, i) => i !== index)
                        } : null)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Select
                  onValueChange={(v) => {
                    if (!editingRule.aprovadores.includes(v)) {
                      setEditingRule(prev => prev ? {
                        ...prev,
                        aprovadores: [...prev.aprovadores, v]
                      } : null);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar aprovador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {aprovadoresDisponiveis
                      .filter(a => !editingRule.aprovadores.includes(a.id))
                      .map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome} ({a.cargo})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tempo Limite (horas)</Label>
                  <Input
                    type="number"
                    value={editingRule.tempoLimite}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, tempoLimite: Number(e.target.value) } : null)}
                    placeholder="0 = sem limite"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Escalação Automática</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={editingRule.escalacaoAutomatica}
                      onCheckedChange={(checked) => setEditingRule(prev => prev ? { ...prev, escalacaoAutomatica: checked } : null)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {editingRule.escalacaoAutomatica ? "Sim" : "Não"}
                    </span>
                  </div>
                </div>
              </div>

              {editingRule.escalacaoAutomatica && (
                <div className="space-y-2">
                  <Label>Escalar Para</Label>
                  <Select
                    value={editingRule.escalacaoPara || ""}
                    onValueChange={(v) => setEditingRule(prev => prev ? { ...prev, escalacaoPara: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {aprovadoresDisponiveis.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingRule.ativo}
                  onCheckedChange={(checked) => setEditingRule(prev => prev ? { ...prev, ativo: checked } : null)}
                />
                <Label>Regra Ativa</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRule}>
              <Check className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delegation Edit Modal */}
      <Dialog open={delegationModalOpen} onOpenChange={setDelegationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDelegation?.id ? "Editar Delegação" : "Nova Delegação Temporária"}
            </DialogTitle>
          </DialogHeader>
          
          {editingDelegation && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Delegante (quem está delegando)</Label>
                <Select
                  value={editingDelegation.delegante}
                  onValueChange={(v) => setEditingDelegation(prev => prev ? { ...prev, delegante: v } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {aprovadoresDisponiveis.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Delegado (quem vai aprovar)</Label>
                <Select
                  value={editingDelegation.delegado}
                  onValueChange={(v) => setEditingDelegation(prev => prev ? { ...prev, delegado: v } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {aprovadoresDisponiveis
                      .filter(a => a.id !== editingDelegation.delegante)
                      .map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={editingDelegation.dataInicio}
                    onChange={(e) => setEditingDelegation(prev => prev ? { ...prev, dataInicio: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={editingDelegation.dataFim}
                    onChange={(e) => setEditingDelegation(prev => prev ? { ...prev, dataFim: e.target.value } : null)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingDelegation.ativo}
                  onCheckedChange={(checked) => setEditingDelegation(prev => prev ? { ...prev, ativo: checked } : null)}
                />
                <Label>Delegação Ativa</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegationModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDelegation}>
              <Check className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
