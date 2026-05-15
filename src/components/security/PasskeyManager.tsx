import { useState, useEffect } from 'react';
import { Fingerprint, Trash2, Plus, Smartphone, Key, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { useAuth } from '@/features/auth';
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { ptBR } from "date-fns/locale/pt-BR";

export function PasskeyManager() {
  const { user, profile } = useAuth();
  const {
    isLoading,
    isSupported,
    isPlatformAuthenticatorAvailable,
    credentials,
    fetchCredentials,
    registerPasskey,
    deleteCredential,
  } = useWebAuthn();

  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [credentialName, setCredentialName] = useState('');

  useEffect(() => {
    fetchCredentials();
    isPlatformAuthenticatorAvailable().then(setPlatformAvailable);
  }, [fetchCredentials, isPlatformAuthenticatorAvailable]);

  const handleRegister = async () => {
    if (!user) return;
    
    const result = await registerPasskey(
      user.id,
      user.email || '',
      credentialName || undefined
    );

    if (result.success) {
      setIsDialogOpen(false);
      setCredentialName('');
    }
  };

  const handleDelete = async (credentialId: string) => {
    await deleteCredential(credentialId);
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === 'platform') {
      return <Smartphone className="h-5 w-5" />;
    }
    return <Key className="h-5 w-5" />;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Passkeys / Login Biométrico
          </CardTitle>
          <CardDescription>
            WebAuthn não é suportado neste navegador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para usar passkeys, utilize um navegador moderno como Chrome, Firefox, Safari ou Edge.
          </p>
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
              <Fingerprint className="h-5 w-5" />
              Passkeys / Login Biométrico
            </CardTitle>
            <CardDescription>
              Faça login usando biometria ou chave de segurança
            </CardDescription>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!platformAvailable && credentials.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Passkey
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Nova Passkey</DialogTitle>
                <DialogDescription>
                  Dê um nome para identificar este dispositivo ou chave de segurança.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="credential-name">Nome da Passkey</Label>
                  <Input
                    id="credential-name"
                    placeholder="Ex: MacBook Pro, iPhone, Chave USB"
                    value={credentialName}
                    onChange={(e) => setCredentialName(e.target.value)}
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">O que acontecerá:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Seu dispositivo solicitará autenticação biométrica</li>
                    <li>Uma chave segura será criada e armazenada no dispositivo</li>
                    <li>Você poderá fazer login sem senha usando esta passkey</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRegister} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4 mr-2" />
                      Registrar Passkey
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {!platformAvailable && credentials.length === 0 && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-warning">
              <strong>Aviso:</strong> Este dispositivo não suporta autenticadores de plataforma (biometria integrada).
              Você pode usar uma chave de segurança USB.
            </p>
          </div>
        )}

        {credentials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Fingerprint className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma passkey registrada</p>
            <p className="text-sm">
              Adicione uma passkey para fazer login com biometria
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {getDeviceIcon(cred.device_type)}
                  </div>
                  <div>
                    <p className="font-medium">
                      {cred.credential_name || 'Passkey'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {cred.device_type === 'platform' ? 'Biometria' : 'Chave Externa'}
                      </Badge>
                      <span>•</span>
                      <span>
                        Criada{' '}
                        {formatDistanceToNow(new Date(cred.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {cred.last_used_at && (
                        <>
                          <span>•</span>
                          <span>
                            Último uso{' '}
                            {formatDistanceToNow(new Date(cred.last_used_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover Passkey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Você não poderá mais usar esta passkey para fazer login.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cred.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
