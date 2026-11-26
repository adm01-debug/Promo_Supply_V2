import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Shield, Settings2, History, AlertTriangle, CheckCircle2, Plus, Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { toast } from "@/lib/feedbackToast";
import type { Database } from "@/integrations/supabase/types";

type WorkflowTemplate = Database["public"]["Tables"]["workflow_templates"]["Row"];
type SodRule = Database["public"]["Tables"]["workflow_sod_rules"]["Row"];

const WorkflowAdmin = () => {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");

  // Dialog de Novo/Editar Workflow
  const [templateDialog, setTemplateDialog] = useState<"new" | "edit" | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateTrigger, setTemplateTrigger] = useState("request_created");
  const [templateActive, setTemplateActive] = useState(true);

  type AppRole = "admin" | "coordinator" | "buyer" | "finance" | "viewer";
  const APP_ROLES: AppRole[] = ["admin", "coordinator", "buyer", "finance", "viewer"];

  // Dialog de Adicionar/Editar Regra SoD
  const [ruleDialog, setRuleDialog] = useState<"new" | "edit" | null>(null);
  const [editingRule, setEditingRule] = useState<SodRule | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleRoles, setRuleRoles] = useState<AppRole[]>([]);
  const [ruleSeverity, setRuleSeverity] = useState("high");
  const [ruleActive, setRuleActive] = useState(true);

  const openTemplateDialog = (mode: "new" | "edit", t?: WorkflowTemplate) => {
    setTemplateDialog(mode);
    setEditingTemplate(t ?? null);
    setTemplateName(t?.name ?? "");
    setTemplateDescription(t?.description ?? "");
    setTemplateTrigger(t?.trigger_type ?? "request_created");
    setTemplateActive(t?.is_active ?? true);
  };

  const openRuleDialog = (mode: "new" | "edit", r?: SodRule) => {
    setRuleDialog(mode);
    setEditingRule(r ?? null);
    setRuleName(r?.name ?? "");
    setRuleDescription(r?.description ?? "");
    setRuleRoles(r?.incompatible_roles ?? []);
    setRuleSeverity(r?.severity ?? "high");
    setRuleActive(r?.is_active ?? true);
  };

  const saveTemplate = async () => {
    if (!templateName.trim() || !tenantId) {
      toast.error("Informe um nome e esteja autenticado.");
      return;
    }
    const payload = {
      name: templateName.trim(),
      description: templateDescription.trim(),
      trigger_type: templateTrigger,
      is_active: templateActive,
      version: templateDialog === "edit" ? (editingTemplate?.version ?? 1) : 1,
      config: editingTemplate?.config ?? {},
      tenant_id: tenantId,
    };
    const { error } = templateDialog === "edit"
      ? await supabase.from("workflow_templates").update(payload).eq("id", editingTemplate!.id)
      : await supabase.from("workflow_templates").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(templateDialog === "edit" ? "Workflow atualizado." : "Workflow criado.");
    queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    setTemplateDialog(null);
  };

  const saveRule = async () => {
    if (!ruleName.trim() || ruleRoles.length === 0 || !tenantId) {
      toast.error("Informe nome e pelo menos um role em conflito.");
      return;
    }
    const payload = {
      name: ruleName.trim(),
      description: ruleDescription.trim(),
      incompatible_roles: ruleRoles,
      severity: ruleSeverity,
      is_active: ruleActive,
      tenant_id: tenantId,
    };
    const { error } = ruleDialog === "edit"
      ? await supabase.from("workflow_sod_rules").update(payload).eq("id", editingRule!.id)
      : await supabase.from("workflow_sod_rules").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(ruleDialog === "edit" ? "Regra atualizada." : "Regra criada.");
    queryClient.invalidateQueries({ queryKey: ["workflow-sod-rules"] });
    setRuleDialog(null);
  };

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sodRules, isLoading: loadingSod } = useQuery({
    queryKey: ["workflow-sod-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_sod_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow & Compliance</h1>
          <p className="text-muted-foreground">
            Gestão de fluxos de aprovação no-code e regras de Segregação de Funções (SoD).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/auditoria")}>
            <History className="h-4 w-4" /> Logs de Auditoria
          </Button>
          <Button className="gap-2" onClick={() => openTemplateDialog("new")}>
            <Settings2 className="h-4 w-4" /> Novo Workflow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows Ativos</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regras de SoD</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sodRules?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violações Bloqueadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA de Aprovação</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates de Workflow</TabsTrigger>
          <TabsTrigger value="sod">Regras de SoD</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoramento Realtime</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fluxos de Processos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Gatilho (Trigger)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.trigger_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_active ? "default" : "secondary"}>
                          {t.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>v{t.version}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openTemplateDialog("edit", t)}>Configurar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templates?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum workflow configurado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <div className="bg-slate-50 border border-dashed rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <Settings2 className="h-12 w-12 mx-auto text-slate-400" />
              <h3 className="text-lg font-semibold">Workflow Designer Canvas</h3>
              <p className="text-sm text-slate-500">
                Selecione um template para abrir o editor visual e configurar os nós de decisão, aprovação e integrações ERP.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sod">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Matriz de Segregação de Funções</CardTitle>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => openRuleDialog("new")}>
                <Shield className="h-4 w-4" /> Adicionar Regra
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Regra</TableHead>
                    <TableHead>Conflito de Roles</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sodRules?.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rule.incompatible_roles.map((role: string) => (
                            <Badge key={role} variant="outline">{role}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.severity === "critical" ? "destructive" : "outline"}>
                          {rule.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openRuleDialog("edit", rule)}>Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sodRules?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma regra de SoD definida.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Instâncias em Execução</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Nenhum workflow ativo no momento.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Gargalos de Processo</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Aguardando dados de telemetria.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Novo/Editar Workflow */}
      <Dialog open={templateDialog !== null} onOpenChange={(o) => !o && setTemplateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{templateDialog === "edit" ? "Configurar Workflow" : "Novo Workflow"}</DialogTitle>
            <DialogDescription>
              Defina o gatilho e o estado do fluxo de aprovação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wf-name">Nome</Label>
              <Input id="wf-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex.: Aprovação de Cotação Urgente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wf-desc">Descrição</Label>
              <Input id="wf-desc" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Para que serve este fluxo?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wf-trigger">Gatilho</Label>
              <Select value={templateTrigger} onValueChange={setTemplateTrigger}>
                <SelectTrigger id="wf-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["request_created", "request_threshold_exceeded", "cotacao_urgente", "pedido_criado", "solicitacao_criada", "fornecedor_novo", "sourcing_project_started"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wf-active">Status</Label>
              <Select value={templateActive ? "Ativo" : "Inativo"} onValueChange={(v) => setTemplateActive(v === "Ativo")}>
                <SelectTrigger id="wf-active"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {templateDialog === "edit" && editingTemplate && (
              <div className="text-sm text-muted-foreground">Versão atual: v{editingTemplate.version}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(null)}>Cancelar</Button>
            <Button onClick={saveTemplate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar/Editar Regra SoD */}
      <Dialog open={ruleDialog !== null} onOpenChange={(o) => !o && setRuleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ruleDialog === "edit" ? "Editar Regra de SoD" : "Adicionar Regra de SoD"}</DialogTitle>
            <DialogDescription>
              Quais roles não podem coexistir no mesmo fluxo de aprovação?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sod-name">Nome</Label>
              <Input id="sod-name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Ex.: Finanças não libera compras" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sod-desc">Descrição</Label>
              <Input id="sod-desc" value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} placeholder="Qual conflito esta regra impede?" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sod-roles">Roles incompatíveis (adicione um por vez)</Label>
              <Select
                value=""
                onValueChange={(role) => {
                  const r = role as AppRole;
                  if (!ruleRoles.includes(r)) setRuleRoles([...ruleRoles, r]);
                }}
              >
                <SelectTrigger id="sod-roles"><SelectValue placeholder="Selecione um role…" /></SelectTrigger>
                <SelectContent>
                  {APP_ROLES
                    .filter((r) => !ruleRoles.includes(r))
                    .map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                {ruleRoles.map((role) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setRuleRoles(ruleRoles.filter((r) => r !== role))}
                  >
                    {role} ✕
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sod-severity">Severidade</Label>
              <Select value={ruleSeverity} onValueChange={setRuleSeverity}>
                <SelectTrigger id="sod-severity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">high</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="critical">critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sod-active">Status</Label>
              <Select value={ruleActive ? "Ativa" : "Inativa"} onValueChange={(v) => setRuleActive(v === "Ativa")}>
                <SelectTrigger id="sod-active"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(null)}>Cancelar</Button>
            <Button onClick={saveRule}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    
  );
};

export default WorkflowAdmin;
