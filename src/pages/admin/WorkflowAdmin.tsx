import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Shield, Settings2, History } from "lucide-react";

const WorkflowAdmin = () => {
  // Mock data for initial UI
  const templates = [
    { id: "1", name: "Aprovação de Pedido > 10k", trigger: "PO Created", status: "Active" },
    { id: "2", name: "Homologação de Fornecedor Crítico", trigger: "Supplier Created", status: "Active" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Designer</h1>
          <p className="text-muted-foreground">
            Configure fluxos de aprovação no-code com regras de Segregation of Duties (SoD).
          </p>
        </div>
        <Button className="gap-2">
          <Settings2 className="h-4 w-4" /> Novo Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows Ativos</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violações de SoD Bloqueadas</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Aprovação</CardTitle>
            <History className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2h</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates de Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Gatilho (Trigger)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.trigger}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="bg-slate-50 border rounded-lg p-12 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <Settings2 className="h-12 w-12 mx-auto text-slate-400" />
          <h3 className="text-lg font-semibold">Workflow Canvas</h3>
          <p className="text-sm text-slate-500">
            O editor visual de arrastar-e-soltar (React Flow) está configurado para permitir a montagem de nós de decisão, aprovação e integração ERP.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowAdmin;
