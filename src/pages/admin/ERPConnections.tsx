import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Database,
  Plus,
  Settings2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  History,
  ExternalLink,
  ArrowRightLeft,
  Trash2,
  KeyRound,
  FileText,
  X
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/feedbackToast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";
import { mensagemDeErroDaEdge } from "@/lib/invokeEdge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";

type ERPConnection = SupabaseDatabase['public']['Tables']['erp_connections']['Row'];
type ERPSyncLog = SupabaseDatabase['public']['Tables']['erp_sync_log']['Row'];

const ERP_TYPES = [
  { value: 'sap_s4', label: 'SAP S/4HANA' },
  { value: 'totvs_protheus', label: 'TOTVS Protheus' },
  { value: 'totvs_datasul', label: 'TOTVS Datasul' },
  { value: 'oracle_ebs', label: 'Oracle EBS' },
  { value: 'custom', label: 'Personalizado' },
] as const;

const AUTH_TYPES = [
  { value: 'basic', label: 'Basic Auth' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'apikey', label: 'API Key' },
  { value: 'token', label: 'Bearer Token' },
] as const;

interface ERPForm {
  erp_type: string;
  base_url: string;
  auth_type: string;
  secret: string;
  is_active: boolean;
}

const emptyForm: ERPForm = {
  erp_type: 'sap_s4',
  base_url: '',
  auth_type: 'basic',
  secret: '',
  is_active: true,
};

const ERP_DIRECTIONS: Record<string, string> = {
  inbound: 'ERP -> Promo Supply',
  outbound: 'Promo Supply -> ERP',
};

const ERPConnections = () => {
  const { tenantId, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const tenant = tenantId ?? organizationId;

  const { data: connections, isLoading } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_connections')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ERPConnection[];
    }
  });

  const { data: logs } = useQuery({
    queryKey: ['erp-sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as ERPSyncLog[];
    }
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ERPConnection | null>(null);
  const [form, setForm] = useState<ERPForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsConn, setSettingsConn] = useState<ERPConnection | null>(null);
  const [settingsJson, setSettingsJson] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ERPConnection | null>(null);
  const [deleting, setDeleting] = useState(false);

  const encrypt = async (plain: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('erp-credential-encrypt', {
      body: { secret: plain },
    });
    if (error) throw new Error(await mensagemDeErroDaEdge(error, "Falha ao cifrar a credencial."));
    const encrypted = (data as { data?: { encrypted?: string } })?.data?.encrypted as string | undefined;
    if (!encrypted) throw new Error("Resposta vazia da edge de cifra");
    return encrypted;
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (conn: ERPConnection) => {
    setEditing(conn);
    setForm({
      erp_type: conn.erp_type,
      base_url: conn.base_url,
      auth_type: conn.auth_type,
      secret: '',
      is_active: conn.is_active,
    });
    setFormOpen(true);
  };

  const openSettings = (conn: ERPConnection) => {
    setSettingsConn(conn);
    setSettingsJson(JSON.stringify(conn.settings ?? {}, null, 2));
    setSettingsOpen(true);
  };

  const handleSave = async () => {
    if (!form.base_url.trim()) {
      toast.error("Informe a URL base do ERP");
      return;
    }
    if (!editing && !form.secret.trim()) {
      toast.error("Informe a credencial de acesso");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const patch: Partial<ERPConnection> = {
          erp_type: form.erp_type,
          base_url: form.base_url.trim(),
          auth_type: form.auth_type,
          is_active: form.is_active,
        };
        if (form.secret.trim()) {
          patch.credentials_encrypted = await encrypt(form.secret.trim());
        }
        const { error } = await supabase
          .from('erp_connections')
          .update(patch)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success("Conexão ERP atualizada");
      } else {
        const encrypted = await encrypt(form.secret.trim());
        const { error } = await supabase
          .from('erp_connections')
          .insert({
            tenant_id: tenant ?? '',
            erp_type: form.erp_type,
            base_url: form.base_url.trim(),
            auth_type: form.auth_type,
            credentials_encrypted: encrypted,
            is_active: form.is_active,
            settings: {},
          });
        if (error) throw error;
        toast.success("Conexão ERP criada");
      }
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
    } catch (err) {
      toast.error("Erro ao salvar conexão: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (conn: ERPConnection) => {
    const { error } = await supabase
      .from('erp_connections')
      .update({ is_active: !conn.is_active })
      .eq('id', conn.id);
    if (error) {
      toast.error("Erro ao alterar status: " + error.message);
      return;
    }
    toast.success(conn.is_active ? "Conexão desativada" : "Conexão ativada");
    queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('erp_connections')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success("Conexão excluída");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
    } catch (err) {
      toast.error("Erro ao excluir conexão: " + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = settingsJson.trim() ? JSON.parse(settingsJson) : {};
      if (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object') {
        throw new Error('settings deve ser um objeto JSON');
      }
    } catch (err) {
      toast.error("JSON inválido: " + (err as Error).message);
      return;
    }
    if (!settingsConn) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('erp_connections')
        .update({ settings: parsed as ERPConnection['settings'] })
        .eq('id', settingsConn.id);
      if (error) throw error;
      toast.success("Campos de mapeamento salvos");
      setSettingsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
    } catch (err) {
      toast.error("Erro ao salvar campos: " + (err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const syncMutation = useMutation({
    mutationFn: async ({ connectionId, entity }: { connectionId: string, entity: string }) => {
      // M-02: tenant agora é resolvido no servidor a partir do JWT (user_tenants).
      const { data, error } = await supabase.functions.invoke('erp-sync', {
        body: { action: 'pull', connectionId, entity },
      });
      if (error) throw new Error(await mensagemDeErroDaEdge(error, "Falha ao iniciar a sincronização."));
      return data;
    },
    onSuccess: () => {
      toast.success("Sincronização iniciada com sucesso");
      queryClient.invalidateQueries({ queryKey: ['erp-sync-logs'] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao sincronizar: " + error.message);
    }
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-primary" />
            CONECTORES ERP
          </h1>
          <p className="text-muted-foreground mt-1">
            Integração nativa com SAP S/4HANA, TOTVS (Protheus/Datasul) e Oracle Procurement.
          </p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Configurar Nova Conexão
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xl border-primary/10">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Conexões Ativas</CardTitle>
                <CardDescription>Status em tempo real dos seus conectores enterprise.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {connections?.length || 0} Integrados
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="pl-6">ERP / Sistema</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Última Sinc.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12">Carregando conexões...</TableCell></TableRow>
                ) : connections?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Database className="h-12 w-12 opacity-20" />
                        <p>Nenhuma integração ERP configurada.</p>
                        <Button variant="outline" size="sm" onClick={() => setDocsOpen(true)}>
                          <FileText className="h-3.5 w-3.5 mr-2" /> Documentação de API
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : connections?.map((conn) => (
                  <TableRow key={conn.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Database className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm uppercase">{conn.erp_type.replace('_', ' ')}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{conn.base_url}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold">{conn.auth_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString('pt-BR') : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(conn)}
                        className="flex items-center gap-2 cursor-pointer select-none"
                        title={conn.is_active ? "Clique para desativar" : "Clique para ativar"}
                      >
                        <div className={cn("h-2 w-2 rounded-full", conn.is_active ? "bg-success animate-pulse" : "bg-muted")} />
                        <span className="text-xs font-medium">{conn.is_active ? 'Online' : 'Offline'}</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-right pr-6 space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => syncMutation.mutate({ connectionId: conn.id, entity: 'fornecedor' })}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-2", syncMutation.isPending && "animate-spin")} />
                        Sync Forn.
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(conn)} title="Configurar conexão">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteTarget(conn)} title="Excluir conexão">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Atividade Recente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {logs?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem logs de integração.</p>
                ) : logs?.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    {log.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase truncate">{log.entity}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {log.duration_ms}ms
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {ERP_DIRECTIONS[log.direction] ?? 'Promo Supply -> ERP'}
                      </p>
                      {log.error_message && (
                        <p className="text-[10px] text-destructive bg-destructive/5 p-1 rounded mt-1 truncate">
                          {log.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full text-xs text-primary" size="sm" onClick={() => setLogsOpen(true)}>
                  Ver Log Completo <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Settings2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold">Mapeamento Dinâmico</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure campos customizados e transformações de dados sem escrever uma linha de código.
              </p>
              <Button size="sm" className="w-full" onClick={() => {
                const first = connections?.[0];
                if (!first) {
                  toast.info("Cadastre uma conexão ERP antes de configurar campos");
                  return;
                }
                openSettings(first);
              }}>Configurar Campos</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {editing ? 'Editar Conexão ERP' : 'Nova Conexão ERP'}
            </DialogTitle>
            <DialogDescription>
              As credenciais são cifradas com a chave mestra do servidor antes de gravar no banco.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ERP / Sistema</Label>
              <Select value={form.erp_type} onValueChange={(v) => setForm({ ...form, erp_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ERP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL Base</Label>
              <Input
                placeholder="https://erp.empresa.com/api"
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Protocolo de Autenticação</Label>
              <Select value={form.auth_type} onValueChange={(v) => setForm({ ...form, auth_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUTH_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{editing ? 'Nova Credencial (opcional, deixe vazio para manter)' : 'Credencial de Acesso'}</Label>
              <Input
                type="password"
                placeholder={editing ? "••••••••" : "senha / token / API key"}
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Conexão ativa</p>
                <p className="text-xs text-muted-foreground">Habilita sincronizações automáticas</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Conexão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Log Completo de Sincronização
            </DialogTitle>
            <DialogDescription>Últimas 50 execuções, mais recentes primeiro.</DialogDescription>
          </DialogHeader>
          <FullLogList />
        </DialogContent>
      </Dialog>

      <Dialog open={docsOpen} onOpenChange={setDocsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documentação de API
            </DialogTitle>
            <DialogDescription>Conectores suportados e formato da integração.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {ERP_TYPES.map((t) => (
              <div key={t.value} className="rounded-lg border p-4">
                <p className="font-bold uppercase text-xs mb-2">{t.label}</p>
                <p className="text-muted-foreground leading-relaxed text-xs">
                  Autenticação via Basic Auth no endpoint base. Entidades suportadas:
                  fornecedores (suppliers), ordem de compra (PO) e nota fiscal (invoice).
                </p>
                <code className="block mt-2 bg-muted/40 rounded p-2 text-[10px] text-primary break-all">
                  https://host/api/v2/supplier
                </code>
              </div>
            ))}
            <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
              A sincronização usa payload JSON no contrato <code>ERPSyncContract</code> (action{' '}
              <code>push | pull | sync_po | sync_supplier | sync_invoice</code>). Credenciais trafegam
              somente via HTTPS e são armazenadas cifradas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocsOpen(false)} className="gap-2">
              <X className="h-4 w-4" /> Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Configurar Campos — {settingsConn?.erp_type?.replace('_', ' ').toUpperCase()}
            </DialogTitle>
            <DialogDescription>Edite o JSON de mapeamento. Salve para aplicar na próxima sincronização.</DialogDescription>
          </DialogHeader>
          <Textarea
            className="font-mono text-xs min-h-[300px]"
            value={settingsJson}
            onChange={(e) => setSettingsJson(e.target.value)}
            placeholder={'{\n  "field_mapping": {\n    "supplier_code": "fornecedor_codigo",\n    "lead_time_days": 3\n  }\n}'}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? 'Salvando...' : 'Salvar Campos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão ERP?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga a conexão <strong className="uppercase">{deleteTarget?.erp_type?.replace('_', ' ')}</strong> e todo o histórico de sincronização dela, sem volta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const FullLogList = () => {
  const { data: fullLogs, isLoading, isError } = useQuery({
    queryKey: ['erp-sync-logs-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ERPSyncLog[];
    }
  });

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-8">Carregando logs...</p>;
  if (isError) return <p className="text-sm text-destructive text-center py-8">Falha ao carregar logs.</p>;

  if (!fullLogs || fullLogs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sem logs de integração até o momento.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {fullLogs.map((log) => (
        <div key={log.id} className="py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase">{log.entity}</p>
            <span className={cn("text-[10px] font-bold uppercase", log.status === 'success' ? "text-success" : "text-destructive")}>
              {log.status}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {new Date(log.created_at).toLocaleString('pt-BR')} · {ERP_DIRECTIONS[log.direction] ?? log.direction} · {log.duration_ms}ms
          </p>
          {log.error_message && (
            <p className="text-[10px] text-destructive bg-destructive/5 p-1.5 rounded mt-1">{log.error_message}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ERPConnections;
