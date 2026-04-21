import { useState } from 'react';
import { Monitor, Smartphone, Globe, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSecurityLogs, ActiveSession } from '@/hooks/useSecurityLogs';
import { useAuth } from '@/hooks/useAuth';
import { format } from "date-fns/format";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { ptBR } from "date-fns/locale/pt-BR";

export const ActiveSessionsPanel = () => {
  const { activeSessions, isLoading, terminateSession } = useSecurityLogs();
  const { user } = useAuth();
  const [sessionToTerminate, setSessionToTerminate] = useState<ActiveSession | null>(null);

  const handleTerminate = async () => {
    if (!sessionToTerminate) return;

    try {
      await terminateSession.mutateAsync(sessionToTerminate.id);
      toast.success('Sessão encerrada');
      setSessionToTerminate(null);
    } catch (error) {
      toast.error('Erro ao encerrar sessão');
    }
  };

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return Globe;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    }
    return Monitor;
  };

  const parseUserAgent = (userAgent: string | null) => {
    if (!userAgent) return { browser: 'Desconhecido', os: 'Desconhecido' };
    
    let browser = 'Navegador';
    let os = 'Sistema';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) os = 'iOS';

    return { browser, os };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Sessões Ativas
          </CardTitle>
          <CardDescription>
            Gerencie os dispositivos conectados à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activeSessions || activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Monitor className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma sessão ativa encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.user_agent);
                const { browser, os } = parseUserAgent(session.user_agent);
                const isCurrentUser = session.user_id === user?.id;

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <DeviceIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{browser} em {os}</span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {session.ip_address && (
                            <span className="font-mono">{session.ip_address}</span>
                          )}
                          <span>•</span>
                          <span>
                            Último acesso {formatDistanceToNow(new Date(session.last_activity), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Iniciada em {format(new Date(session.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSessionToTerminate(session)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terminate Session Dialog */}
      <Dialog open={!!sessionToTerminate} onOpenChange={() => setSessionToTerminate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Encerrar Sessão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja encerrar esta sessão? O usuário será desconectado imediatamente.
            </DialogDescription>
          </DialogHeader>

          {sessionToTerminate && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="font-medium">
                {parseUserAgent(sessionToTerminate.user_agent).browser} em{' '}
                {parseUserAgent(sessionToTerminate.user_agent).os}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {sessionToTerminate.ip_address}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToTerminate(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminateSession.isPending}
            >
              {terminateSession.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Encerrando...
                </>
              ) : (
                'Encerrar Sessão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
