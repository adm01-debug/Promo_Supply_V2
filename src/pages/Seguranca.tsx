import { useState } from 'react';
import { Shield, Ban, ShieldCheck, Monitor, FileText, LogIn, Activity, Key, Settings, Lock, Fingerprint, Globe, KeyRound, Bell, GraduationCap, ShieldBan, MapPin } from 'lucide-react';
import { MainLayout } from '@/components/compras/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MFASettings } from '@/components/security/MFASettings';
import { BlockedIPsPanel } from '@/components/security/BlockedIPsPanel';
import { IPWhitelistPanel } from '@/components/security/IPWhitelistPanel';
import { GeoWhitelistPanel } from '@/components/security/GeoWhitelistPanel';
import { BlockedCountriesPanel } from '@/components/security/BlockedCountriesPanel';
import { GeoAccessLogsPanel } from '@/components/security/GeoAccessLogsPanel';
import { PasswordResetRequestsPanel } from '@/components/security/PasswordResetRequestsPanel';
import { ActiveSessionsPanel } from '@/components/security/ActiveSessionsPanel';
import { SecurityLogsPanel } from '@/components/security/SecurityLogsPanel';
import { LoginAttemptsPanel } from '@/components/security/LoginAttemptsPanel';
import { RateLimitDashboard } from '@/components/security/RateLimitDashboard';
import { PermissionMatrix } from '@/components/security/PermissionMatrix';
import { PermissionGate } from '@/components/security/PermissionGate';
import { PasskeyManager } from '@/components/security/PasskeyManager';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { TourSettingsPanel } from '@/components/settings/TourSettingsPanel';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { useAuth } from '@/hooks/useAuth';

const Seguranca = () => {
  const { isAdmin } = useAuth();
  const { getStats } = useSecurityLogs();
  const stats = getStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Central de Segurança
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie autenticação, permissões e monitore atividades do sistema
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{stats.failedLogins24h}</p>
                  <p className="text-xs text-muted-foreground truncate">Falhas (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Ban className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{stats.blockedIPsActive}</p>
                  <p className="text-xs text-muted-foreground truncate">IPs Bloqueados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{stats.criticalEvents}</p>
                  <p className="text-xs text-muted-foreground truncate">Eventos Críticos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:px-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{stats.activeSessionsCount}</p>
                  <p className="text-xs text-muted-foreground truncate">Sessões Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-2">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="passkeys" className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4" />
              <span className="hidden sm:inline">Passkeys</span>
            </TabsTrigger>
            <TabsTrigger value="mfa" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              <span className="hidden sm:inline">MFA</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Sessões</span>
            </TabsTrigger>
            <TabsTrigger value="password-reset" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Reset Senha</span>
            </TabsTrigger>
            <PermissionGate module="security" action="manage_ips" fallback={null}>
              <TabsTrigger value="blocked" className="flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span className="hidden sm:inline">IPs Bloqueados</span>
              </TabsTrigger>
              <TabsTrigger value="whitelist" className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Whitelist IP</span>
              </TabsTrigger>
              <TabsTrigger value="geo" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Geo Whitelist</span>
              </TabsTrigger>
              <TabsTrigger value="geo-blocked" className="flex items-center gap-2">
                <ShieldBan className="w-4 h-4" />
                <span className="hidden sm:inline">Geo Blacklist</span>
              </TabsTrigger>
              <TabsTrigger value="geo-logs" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Geo Logs</span>
              </TabsTrigger>
            </PermissionGate>
            <PermissionGate module="security" action="view_logs" fallback={null}>
              <TabsTrigger value="logins" className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Logins</span>
              </TabsTrigger>
              <TabsTrigger value="ratelimit" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Rate Limit</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Logs</span>
              </TabsTrigger>
            </PermissionGate>
            {isAdmin && (
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Permissões</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="tours" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Tours</span>
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <NotificationSettingsPanel />
          </TabsContent>

          {/* Passkeys Tab */}
          <TabsContent value="passkeys" className="space-y-6">
            <PasskeyManager />
          </TabsContent>

          {/* MFA Tab */}
          <TabsContent value="mfa" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <MFASettings />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configurações de Sessão
                  </CardTitle>
                  <CardDescription>
                    Políticas de autenticação e sessão
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Duração da Sessão</p>
                      <p className="text-sm text-muted-foreground">Tempo máximo de inatividade</p>
                    </div>
                    <Badge variant="outline">24 horas</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Refresh Token</p>
                      <p className="text-sm text-muted-foreground">Renovação automática</p>
                    </div>
                    <Badge variant="default" className="bg-success">Ativo</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">MFA Provider</p>
                      <p className="text-sm text-muted-foreground">Métodos de autenticação</p>
                    </div>
                    <Badge variant="outline">TOTP + Email</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Rate Limiting</p>
                      <p className="text-sm text-muted-foreground">Limite de requisições</p>
                    </div>
                    <Badge variant="outline">Por IP</Badge>
                  </div>
                  
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <p className="font-medium mb-2">Re-autenticação Obrigatória</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Alterar senha/email</li>
                      <li>• Configurar MFA</li>
                      <li>• Ações administrativas</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <ActiveSessionsPanel />
          </TabsContent>

          {/* Password Reset Requests Tab */}
          <TabsContent value="password-reset">
            <PasswordResetRequestsPanel />
          </TabsContent>

          {/* Blocked IPs Tab */}
          <TabsContent value="blocked">
            <BlockedIPsPanel />
          </TabsContent>

          {/* Whitelist Tab */}
          <TabsContent value="whitelist">
            <IPWhitelistPanel />
          </TabsContent>

          {/* Geo Whitelist Tab */}
          <TabsContent value="geo">
            <GeoWhitelistPanel />
          </TabsContent>

          {/* Login Attempts Tab */}
          <TabsContent value="logins">
            <LoginAttemptsPanel />
          </TabsContent>

          {/* Rate Limit Tab */}
          <TabsContent value="ratelimit">
            <RateLimitDashboard />
          </TabsContent>

          {/* Security Logs Tab */}
          <TabsContent value="logs">
            <SecurityLogsPanel />
          </TabsContent>

          {/* Permissions Matrix Tab */}
          <TabsContent value="permissions">
            <PermissionMatrix />
          </TabsContent>


          {/* Tours Settings Tab */}
          <TabsContent value="tours">
            <TourSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Seguranca;
