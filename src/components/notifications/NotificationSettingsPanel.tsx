import { useState } from "react";
import { Bell, BellOff, Check, Volume2, VolumeX, Smartphone, Mail, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRealPushNotifications } from "@/hooks/useRealPushNotifications";
import { toast } from "@/lib/feedbackToast";
import { supabase } from "@/integrations/supabase/client";

export const NotificationSettingsPanel = () => {
  const {
    preferences,
    permissionStatus,
    requestPermission,
    updatePreferences,
    loading,
  } = useRealPushNotifications();

  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast.success("Notificações push ativadas!");
    } else if (result === 'denied') {
      toast.error("Permissão para notificações foi negada.");
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("🔔 Teste de Notificação", {
          body: "As notificações estão funcionando corretamente!",
          icon: "/pwa-192x192.png",
          tag: "test-notification",
        });
        toast.success("Notificação de teste enviada!");
      } else {
        toast.error("Permita as notificações primeiro.");
      }
    } catch (error) {
      console.error("Error testing notification:", error);
      toast.error("Erro ao enviar notificação de teste.");
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleCheckAlerts = async () => {
    setIsCheckingAlerts(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-sla-alerts');
      
      if (error) throw error;

      toast.success(
        `Verificação concluída: ${data.sla_warnings} alertas SLA, ${data.pending_approvals} aprovações pendentes, ${data.notifications_sent} notificações enviadas.`
      );
    } catch (error) {
      console.error("Error checking alerts:", error);
      toast.error("Erro ao verificar alertas.");
    } finally {
      setIsCheckingAlerts(false);
    }
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Badge className="bg-success/10 text-success border-green-500/20">Ativas</Badge>;
      case 'denied':
        return <Badge variant="destructive">Bloqueadas</Badge>;
      default:
        return <Badge variant="secondary">Não configuradas</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações Push
            </CardTitle>
            <CardDescription>
              Configurações de alertas e notificações do sistema
            </CardDescription>
          </div>
          {getPermissionBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Section */}
        {permissionStatus !== 'granted' && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Ative as notificações push</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Receba alertas em tempo real sobre SLA, aprovações e pagamentos.
                </p>
                <Button onClick={handleRequestPermission} size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Ativar Notificações
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notification Categories */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Categorias de Notificação</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de SLA (Aviso)</Label>
                <p className="text-xs text-muted-foreground">Pedidos próximos do prazo</p>
              </div>
              <Switch
                checked={preferences?.sla_warnings ?? true}
                onCheckedChange={(checked) => updatePreferences({ sla_warnings: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SLA Crítico</Label>
                <p className="text-xs text-muted-foreground">Pedidos vencidos ou vencendo hoje</p>
              </div>
              <Switch
                checked={preferences?.sla_critical ?? true}
                onCheckedChange={(checked) => updatePreferences({ sla_critical: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Atualizações de Pedidos</Label>
                <p className="text-xs text-muted-foreground">Mudanças de status e entregas</p>
              </div>
              <Switch
                checked={preferences?.order_updates ?? true}
                onCheckedChange={(checked) => updatePreferences({ order_updates: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de Pagamento</Label>
                <p className="text-xs text-muted-foreground">Vencimentos e aprovações</p>
              </div>
              <Switch
                checked={preferences?.payment_alerts ?? true}
                onCheckedChange={(checked) => updatePreferences({ payment_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de Fornecedor</Label>
                <p className="text-xs text-muted-foreground">Problemas e atualizações</p>
              </div>
              <Switch
                checked={preferences?.supplier_alerts ?? true}
                onCheckedChange={(checked) => updatePreferences({ supplier_alerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Variações de Preço</Label>
                <p className="text-xs text-muted-foreground">Mudanças significativas de preço</p>
              </div>
              <Switch
                checked={preferences?.price_alerts ?? true}
                onCheckedChange={(checked) => updatePreferences({ price_alerts: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Delivery Methods */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Canais de Entrega</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label>Push no Navegador</Label>
                  <p className="text-xs text-muted-foreground">Notificações em tempo real</p>
                </div>
              </div>
              <Switch
                checked={preferences?.push_notifications ?? true}
                onCheckedChange={(checked) => updatePreferences({ push_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label>E-mail</Label>
                  <p className="text-xs text-muted-foreground">Resumo diário por e-mail</p>
                </div>
              </div>
              <Switch
                checked={preferences?.email_notifications ?? false}
                onCheckedChange={(checked) => updatePreferences({ email_notifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {preferences?.sound_enabled ? (
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <div className="space-y-0.5">
                  <Label>Som de Notificação</Label>
                  <p className="text-xs text-muted-foreground">Alerta sonoro para notificações</p>
                </div>
              </div>
              <Switch
                checked={preferences?.sound_enabled ?? true}
                onCheckedChange={(checked) => updatePreferences({ sound_enabled: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Test Section */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotification}
            disabled={isTestingNotification || permissionStatus !== 'granted'}
          >
            {isTestingNotification ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            Testar Notificação
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckAlerts}
            disabled={isCheckingAlerts}
          >
            {isCheckingAlerts ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Verificar Alertas Agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
