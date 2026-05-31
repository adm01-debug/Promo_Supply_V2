import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ExternalLink, Plus, Settings2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/feedbackToast";

const PunchOutCatalogs = () => {
  const { data: catalogs, isLoading, refetch } = useQuery({
    queryKey: ['punchout-catalogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('punchout_catalogs')
        .select(`
          *,
          fornecedores (razao_social)
        `);
      if (error) throw error;
      return data;
    }
  });

  const handleLaunch = async (catalogId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('punchout-setup', {
        body: { 
          catalog_id: catalogId,
          return_url: window.location.origin + '/solicitacoes' 
        }
      });

      if (error) throw error;

      toast.success("Sessão PunchOut iniciada");
      if (data.mock_redirect) {
        window.open(data.mock_redirect, '_blank');
      }
    } catch (err: any) {
      toast.error("Erro ao iniciar PunchOut: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Catálogos PunchOut (cXML/OCI)</h1>
          <p className="text-muted-foreground text-sm">Gerencie integrações de catálogo direto com fornecedores enterprise.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Catálogo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Endpoint (Setup URL)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : catalogs?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum catálogo configurado.</TableCell></TableRow>
              ) : catalogs?.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.fornecedores?.razao_social}</TableCell>
                  <TableCell><span className="uppercase">{cat.protocol}</span></TableCell>
                  <TableCell className="max-w-xs truncate">{cat.setup_url}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {cat.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleLaunch(cat.id)}>
                      <ExternalLink className="h-4 w-4 mr-2" /> Testar Setup
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PunchOutCatalogs;
