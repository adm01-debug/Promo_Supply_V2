import { useState, useEffect } from 'react';
import { Shield, Key, Globe, Plus, Trash2, Check, AlertTriangle, ExternalLink, Users } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SSOConfig() {
  const { tenantId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['sso_configurations', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sso_configurations')
        .select('*')
        .eq('tenant_id', tenantId as string);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const upsertConfigMutation = useMutation({
    mutationFn: async (vars: any) => {
      const { data, error } = await supabase
        .from('sso_configurations')
        .upsert({
          tenant_id: tenantId as string,
          ...vars,
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso_configurations'] });
      toast.success('Configuração de SSO atualizada');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar configuração: ' + error.message);
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground">Apenas administradores podem configurar o SSO.</p>
      </div>
    );
  }

  const samlConfig = configs?.find(c => c.protocol === 'saml');

  // Hydrate the IdP metadata URL field from server data once it loads.
  // defaultValue alone does not update once samlConfig resolves, so the
  // input would stay empty even when a value exists in the DB.
  const [metadataUrl, setMetadataUrl] = useState('');
  useEffect(() => {
    setMetadataUrl(samlConfig?.idp_metadata_url || '');
  }, [samlConfig?.idp_metadata_url]);

  const handleAddDomain = () => {
    if (!newDomain || !newDomain.includes('.')) {
      toast.error('Informe um domínio válido (ex: empresa.com)');
      return;
    }

    const currentDomains = samlConfig?.email_domains || [];
    if (currentDomains.includes(newDomain)) {
      toast.error('Domínio já adicionado');
      return;
    }

    upsertConfigMutation.mutate({
      protocol: 'saml',
      email_domains: [...currentDomains, newDomain],
    });
    setNewDomain('');
    setIsAddingDomain(false);
  };

  const removeDomain = (domain: string) => {
    const currentDomains = samlConfig?.email_domains || [];
    upsertConfigMutation.mutate({
      protocol: 'saml',
      email_domains: currentDomains.filter(d => d !== domain),
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Single Sign-On (SSO)</h1>
          <p className="text-muted-foreground">Configure autenticação corporativa e provisionamento de usuários.</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20">
          Enterprise Feature
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* SAML Configuration Card */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>SAML 2.0</CardTitle>
                    <CardDescription>Conecte com Okta, Azure AD, Google Workspace, etc.</CardDescription>
                  </div>
                </div>
                <Switch 
                  checked={samlConfig?.is_active ?? false}
                  onCheckedChange={(checked) => upsertConfigMutation.mutate({ protocol: 'saml', is_active: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="metadata-url">IdP Metadata URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="metadata-url"
                      placeholder="https://example.okta.com/app/.../metadata.xml"
                      value={metadataUrl}
                      onChange={(e) => setMetadataUrl(e.target.value)}
                      onBlur={(e) => upsertConfigMutation.mutate({ protocol: 'saml', idp_metadata_url: e.target.value })}
                    />
                    <Button variant="outline" onClick={() => samlConfig?.idp_metadata_url && window.open(samlConfig.idp_metadata_url, '_blank')} disabled={!samlConfig?.idp_metadata_url}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Domínios Autorizados</Label>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingDomain(true)} className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                  
                  {isAddingDomain && (
                    <div className="flex gap-2 animate-in slide-in-from-top-2">
                      <Input 
                        placeholder="empresa.com" 
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        className="h-9"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleAddDomain}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsAddingDomain(false)}>Cancelar</Button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {samlConfig?.email_domains?.map(domain => (
                      <Badge key={domain} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1">
                        {domain}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 hover:text-destructive p-0"
                          onClick={() => removeDomain(domain)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    {!samlConfig?.email_domains?.length && !isAddingDomain && (
                      <p className="text-xs text-muted-foreground italic">Nenhum domínio configurado.</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Provisionamento SCIM 2.0
                </h4>
                <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-muted-foreground">Base URL</span>
                    <Badge variant="outline" className="text-[10px] uppercase">Read-only</Badge>
                  </div>
                  <code className="text-xs break-all block p-2 bg-background rounded border">
                    {window.location.origin}/functions/v1/scim-v2
                  </code>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      <Key className="h-3 w-3 mr-2" /> Gerar Token SCIM
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t px-6 py-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" /> Mudanças são aplicadas instantaneamente para novos logins.
              </p>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Status do SSO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Configuração</span>
                {samlConfig ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completa</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">SAML Ativo</span>
                {samlConfig?.is_active ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Sim</Badge>
                ) : (
                  <Badge variant="secondary">Não</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Domínios</span>
                <span className="font-bold">{samlConfig?.email_domains?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription className="text-xs">
              Sertifique-se de que o IdP está configurado para enviar o claim <code className="bg-muted px-1 rounded">email</code> como identificador principal.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Endpoints do SP
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">ACS URL (Assertion Consumer Service)</p>
                <p className="text-xs font-mono break-all mt-1">https://trwgmplubeqxrxpncdgf.supabase.co/auth/v1/sso/saml/acs</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Entity ID (Audience Restriction)</p>
                <p className="text-xs font-mono break-all mt-1">https://trwgmplubeqxrxpncdgf.supabase.co/auth/v1/sso/saml/metadata</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
