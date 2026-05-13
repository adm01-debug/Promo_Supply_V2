import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Shield, Settings2, History, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const WorkflowAdmin = () => {
  const [activeTab, setActiveTab] = useState("templates");

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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow & Compliance</h1>
          <p className="text-muted-foreground">
            Gestão de fluxos de aprovação no-code e regras de Segregação de Funções (SoD).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" /> Logs de Auditoria
          </Button>
          <Button className="gap-2">
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
                        <Button variant="ghost" size="sm">Configurar</Button>
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
              <Button size="sm" variant="outline" className="gap-2">
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
                        <Button variant="ghost" size="sm">Editar</Button>
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
    </div>
  );
};

export default WorkflowAdmin;
