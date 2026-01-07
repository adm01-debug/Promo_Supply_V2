import { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "@/lib/feedbackToast";
import { useSecurityLogs, IPWhitelist } from '@/hooks/useSecurityLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const IPWhitelistPanel = () => {
  const { ipWhitelist, isLoading, addToWhitelist, removeFromWhitelist } = useSecurityLogs();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [description, setDescription] = useState('');

  const handleAddIP = async () => {
    if (!newIP) {
      toast.error('Informe o endereço IP');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIP)) {
      toast.error('IP inválido');
      return;
    }

    try {
      await addToWhitelist.mutateAsync({
        ip_address: newIP,
        description,
      });

      toast.success('IP adicionado à whitelist');
      setShowAddDialog(false);
      setNewIP('');
      setDescription('');
    } catch (error) {
      toast.error('Erro ao adicionar IP');
    }
  };

  const handleRemove = async (ip: IPWhitelist) => {
    try {
      await removeFromWhitelist.mutateAsync(ip.id);
      toast.success('IP removido da whitelist');
    } catch (error) {
      toast.error('Erro ao remover IP');
    }
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" />
              Whitelist de IPs
            </CardTitle>
            <CardDescription>
              IPs confiáveis que nunca serão bloqueados automaticamente
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar IP
          </Button>
        </CardHeader>
        <CardContent>
          {!ipWhitelist || ipWhitelist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum IP na whitelist</p>
              <p className="text-sm">Adicione IPs confiáveis para evitar bloqueios acidentais</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipWhitelist.map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell className="font-mono">{ip.ip_address}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ip.description || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(ip.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(ip)}
                        disabled={removeFromWhitelist.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add IP Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-success" />
              Adicionar IP à Whitelist
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
              <p className="text-xs text-muted-foreground">
                Este IP nunca será bloqueado automaticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Ex: Escritório principal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddIP}
              disabled={addToWhitelist.isPending}
            >
              {addToWhitelist.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
