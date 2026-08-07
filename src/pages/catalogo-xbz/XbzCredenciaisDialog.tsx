import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useXbzIntegration, type XbzCredentialStatus } from '@/hooks/useXbzIntegration';

interface XbzCredenciaisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function XbzCredenciaisDialog({ open, onOpenChange, onSaved }: XbzCredenciaisDialogProps) {
  const { loading, saveCredentials, getCredentialStatus } = useXbzIntegration();
  const [status, setStatus] = useState<XbzCredentialStatus | null>(null);
  const [portalUser, setPortalUser] = useState('');
  const [portalPassword, setPortalPassword] = useState('');
  const [cnpj, setCnpj] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getCredentialStatus().then((data) => {
      if (!cancelled) setStatus(data ?? null);
    });
    return () => { cancelled = true; };
  }, [open, getCredentialStatus]);

  const handleSave = useCallback(async () => {
    const result = await saveCredentials(portalUser.trim(), portalPassword, cnpj.replace(/\D/g, ''));
    if (result) {
      setPortalPassword('');
      onSaved?.();
      onOpenChange(false);
    }
  }, [saveCredentials, portalUser, portalPassword, cnpj, onSaved, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Credenciais XBZ desta empresa</DialogTitle>
          <DialogDescription>
            As credenciais são validadas junto à XBZ e armazenadas cifradas no backend.
            Elas nunca são devolvidas ao navegador.
          </DialogDescription>
        </DialogHeader>

        {status?.pessoa_id ? (
          <Alert>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Configurado para <strong>{status.razao_social ?? 'cliente XBZ'}</strong> (PessoaId {status.pessoa_id}).
              {status.last_error ? ` Último erro: ${status.last_error}` : ''}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="xbz-user">Usuário do portal MinhaXBZ</Label>
            <Input
              id="xbz-user"
              value={portalUser}
              onChange={(e) => setPortalUser(e.target.value)}
              placeholder="Ex.: E0000000"
              autoComplete="off"
              aria-label="Usuário do portal MinhaXBZ"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xbz-pass">Senha do portal</Label>
            <Input
              id="xbz-pass"
              type="password"
              value={portalPassword}
              onChange={(e) => setPortalPassword(e.target.value)}
              autoComplete="new-password"
              aria-label="Senha do portal MinhaXBZ"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xbz-cnpj">CNPJ (opcional)</Label>
            <Input
              id="xbz-cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="Somente números"
              inputMode="numeric"
              aria-label="CNPJ da empresa na XBZ"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={loading || portalUser.trim().length < 3 || portalPassword.length < 3}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Validar e salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
