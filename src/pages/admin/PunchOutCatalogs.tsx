import React, { useState } from 'react';
import { openExternalUrl } from '@/lib/security';
import { mensagemDeErroDaEdge } from '@/lib/invokeEdge';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ExternalLink, Plus, Settings2, Shield } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/feedbackToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/features/auth";
import { useFornecedores } from "@/hooks/useFornecedores";
import type { Database } from "@/integrations/supabase/types";

type PunchOutCatalog = Database['public']['Tables']['punchout_catalogs']['Row'];

interface CatalogForm {
  fornecedor_id: string;
  protocol: 'cxml' | 'oci';
  setup_url: string;
  identity: string;
  shared_secret_encrypted: string;
  is_active: boolean;
}

const emptyForm: CatalogForm = {
  fornecedor_id: '',
  protocol: 'cxml',
  setup_url: '',
  identity: '',
  shared_secret_encrypted: '',
  is_active: true,
};

const PunchOutCatalogs = () => {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { fornecedores } = useFornecedores();

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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PunchOutCatalog | null>(null);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, fornecedor_id: fornecedores[0]?.id ?? '' });
    setOpen(true);
  };

  const openEdit = (cat: PunchOutCatalog) => {
    setEditing(cat);
    setForm({
      fornecedor_id: cat.fornecedor_id,
      protocol: (cat.protocol as 'cxml' | 'oci') || 'cxml',
      setup_url: cat.setup_url,
      identity: cat.identity,
      shared_secret_encrypted: '',
      is_active: cat.is_active,
    });
    setOpen(true);
  };

  const encrypt = async (plain: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('punchout-encrypt', {
      body: { secret: plain },
    });
    if (error) throw new Error(await mensagemDeErroDaEdge(error, "Falha ao cifrar a credencial."));
    const encrypted = data?.data?.encrypted as string | undefined;
    if (!encrypted) throw new Error("Resposta vazia da edge de cifra");
    return encrypted;
  };

  const handleSave = async () => {
    if (!form.fornecedor_id || !form.setup_url || !form.identity) {
      toast.error("Preencha fornecedor, setup URL e identidade");
      return;
    }
    if (!editing && !form.shared_secret_encrypted) {
      toast.error("Informe o shared secret do fornecedor");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const patch: Partial<PunchOutCatalog> = {
          fornecedor_id: form.fornecedor_id,
          protocol: form.protocol,
          setup_url: form.setup_url,
          identity: form.identity,
          is_active: form.is_active,
        };
        if (form.shared_secret_encrypted) {
          patch.shared_secret_encrypted = await encrypt(form.shared_secret_encrypted);
        }
        const { error } = await supabase
          .from('punchout_catalogs')
          .update(patch)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success("Catálogo atualizado");
      } else {
        const encrypted = await encrypt(form.shared_secret_encrypted);
        const { error } = await supabase
          .from('punchout_catalogs')
          .insert({
            tenant_id: tenantId!,
            fornecedor_id: form.fornecedor_id,
            protocol: form.protocol,
            setup_url: form.setup_url,
            identity: form.identity,
            shared_secret_encrypted: encrypted,
            is_active: form.is_active,
          });
        if (error) throw error;
        toast.success("Catálogo criado");
      }
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['punchout-catalogs'] });
    } catch (err: unknown) {
      toast.error("Erro ao salvar catálogo: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async (catalogId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('punchout-setup', {
        body: { 
          catalog_id: catalogId,
          return_url: window.location.origin + '/solicitacoes' 
        }
      });

      if (error) throw new Error(await mensagemDeErroDaEdge(error, "Falha ao iniciar a sessão PunchOut."));

      toast.success("Sessão PunchOut iniciada");
      if (data.mock_redirect) {
        openExternalUrl(data.mock_redirect);
      }
    } catch (err: unknown) {
      toast.error("Erro ao iniciar PunchOut: " + (err as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Catálogos PunchOut (cXML/OCI)</h1>
          <p className="text-muted-foreground text-sm">Gerencie integrações de catálogo direto com fornecedores enterprise.</p>
        </div>
        <Button className="gap-2" onClick={openNew}>
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
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby="dialog-desc" className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {editing ? "Editar Catálogo PunchOut" : "Novo Catálogo PunchOut"}
            </DialogTitle>
            <DialogDescription id="dialog-desc">
              Configure a integração de catálogo com o fornecedor. O shared secret é cifrado no servidor e nunca armazenado em texto claro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fornecedor *</Label>
              <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Protocolo *</Label>
                <Select value={form.protocol} onValueChange={(v) => setForm({ ...form, protocol: v as 'cxml' | 'oci' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cxml">cXML</SelectItem>
                    <SelectItem value="oci">OCI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Identidade *</Label>
                <Input value={form.identity} onChange={(e) => setForm({ ...form, identity: e.target.value })} placeholder="Ex: STRICKER_DUNS_900123456" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Setup URL *</Label>
              <Input value={form.setup_url} onChange={(e) => setForm({ ...form, setup_url: e.target.value })} placeholder="https://fornecedor.com.br/punchout/setup" />
            </div>

            <div className="space-y-2">
              <Label>Shared Secret {editing ? "(deixe vazio para manter)" : "*"}</Label>
              <Input
                type="password"
                value={form.shared_secret_encrypted}
                onChange={(e) => setForm({ ...form, shared_secret_encrypted: e.target.value })}
                placeholder="Segredo compartilhado do PunchOut"
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="catalog-active">Catálogo ativo</Label>
              <Switch id="catalog-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : (editing ? "Salvar alterações" : "Criar catálogo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PunchOutCatalogs;