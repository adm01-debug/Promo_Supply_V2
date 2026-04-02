import { useState } from 'react';
import { Ban, Plus, Trash2, Clock, Infinity, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useSecurityLogs, BlockedIP } from '@/hooks/useSecurityLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const BlockedIPsPanel = () => {
  const { blockedIPs, isLoading, blockIP, unblockIP } = useSecurityLogs();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [permanent, setPermanent] = useState(false);
  const [expiresHours, setExpiresHours] = useState('24');

  const handleBlockIP = async () => {
    if (!newIP || !reason) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIP)) {
      toast.error('IP inválido');
      return;
    }

    try {
      const expiresAt = permanent
        ? undefined
        : new Date(Date.now() + parseInt(expiresHours) * 60 * 60 * 1000).toISOString();

      await blockIP.mutateAsync({
        ip_address: newIP,
        reason,
        permanent,
        expires_at: expiresAt,
      });

      toast.success('IP bloqueado com sucesso');
      setShowAddDialog(false);
      setNewIP('');
      setReason('');
      setPermanent(false);
    } catch (error) {
      toast.error('Erro ao bloquear IP');
    }
  };

  const handleUnblock = async (ip: BlockedIP) => {
    try {
      await unblockIP.mutateAsync(ip.id);
      toast.success('IP desbloqueado');
    } catch (error) {
      toast.error('Erro ao desbloquear IP');
    }
  };

  const isExpired = (ip: BlockedIP) => {
    if (ip.permanent) return false;
    if (!ip.expires_at) return false;
    return new Date(ip.expires_at) < new Date();
  };

  const activeBlocks = blockedIPs?.filter(ip => !isExpired(ip)) || [];
  const expiredBlocks = blockedIPs?.filter(ip => isExpired(ip)) || [];

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              IPs Bloqueados
            </CardTitle>
            <CardDescription>
              Gerencie IPs bloqueados por tentativas de ataque ou abuso
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Bloquear IP
          </Button>
        </CardHeader>
        <CardContent>
          {activeBlocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ban className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum IP bloqueado no momento</p>
            </div>
          ) : (
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Tentativas</TableHead>
                  <TableHead>Bloqueado em</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBlocks.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono">{ip.ip_address}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ip.reason}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ip.attempts_count}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ip.blocked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {ip.permanent ? (
                        <Badge variant="destructive" className="gap-1">
                          <Infinity className="w-3 h-3" />
                          Permanente
                        </Badge>
                      ) : ip.expires_at ? (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(ip.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnblock(ip)}
                        disabled={unblockIP.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {expiredBlocks.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Bloqueios Expirados ({expiredBlocks.length})
              </h4>
              <div className="text-xs text-muted-foreground">
                {expiredBlocks.slice(0, 5).map(ip => (
                  <div key={ip.id} className="flex justify-between py-1">
                    <span className="font-mono">{ip.ip_address}</span>
                    <span>Expirou em {format(new Date(ip.expires_at!), "dd/MM", { locale: ptBR })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add IP Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Bloquear Endereço IP
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ip">Endereço IP</Label>
              <Input
                id="ip"
                placeholder="192.168.1.1"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do Bloqueio</Label>
              <Input
                id="reason"
                placeholder="Ex: Tentativas de brute force"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bloqueio Permanente</Label>
                <p className="text-xs text-muted-foreground">
                  O IP ficará bloqueado indefinidamente
                </p>
              </div>
              <Switch
                checked={permanent}
                onCheckedChange={setPermanent}
              />
            </div>

            {!permanent && (
              <div className="space-y-2">
                <Label htmlFor="expires">Duração (horas)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  max="8760"
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockIP}
              disabled={blockIP.isPending}
            >
              {blockIP.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Bloqueando...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Bloquear IP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
