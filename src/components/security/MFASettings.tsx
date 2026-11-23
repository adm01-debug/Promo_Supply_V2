import { useState } from 'react';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/feedbackToast';
import { useMFA } from '@/hooks/useMFA';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// Inline MFA Enrollment Component
const MFAEnroll = ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => {
  const { enrollMFA, verifyEnrollment } = useMFA();
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [factorId, setFactorId] = useState('');

  const handleEnroll = async () => {
    try {
      const result = await enrollMFA.mutateAsync();
      if (result) {
        setQrCode(result.totp?.qr_code || '');
        setSecret(result.totp?.secret || '');
        setFactorId(result.id || '');
        setStep('verify');
      }
    } catch (error: unknown) {
      toast.error('Erro ao iniciar configuração MFA');
    }
  };

  const handleVerify = async () => {
    try {
      await verifyEnrollment.mutateAsync({ factorId, code: token });
      toast.success('MFA ativado com sucesso!');
      onSuccess();
    } catch (error: unknown) {
      toast.error('Código inválido. Tente novamente.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Configurar Autenticação em Dois Fatores
        </CardTitle>
        <CardDescription>
          {step === 'enroll'
            ? 'Escaneie o QR Code com seu app autenticador'
            : 'Digite o código de verificação do seu app'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'enroll' ? (
          <>
            {qrCode ? (
              <div className="flex flex-col items-center gap-4">
                <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 rounded-lg border" loading="lazy" />
                <div className="text-center">
                  <Label className="text-xs text-muted-foreground">Chave manual:</Label>
                  <code className="block text-xs bg-muted px-3 py-1.5 rounded mt-1 select-all">{secret}</code>
                </div>
                <Button onClick={() => setStep('verify')}>Próximo</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground text-center">
                  Clique para gerar o QR Code de configuração.
                </p>
                <Button onClick={handleEnroll} disabled={enrollMFA.isPending}>
                  {enrollMFA.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Gerar QR Code
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <InputOTP maxLength={6} value={token} onChange={setToken}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <Button onClick={handleVerify} disabled={token.length < 6 || verifyEnrollment.isPending}>
              {verifyEnrollment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verificar e Ativar
            </Button>
          </div>
        )}
        <Button variant="ghost" className="w-full" onClick={onCancel}>
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
};

export const MFASettings = () => {
  const { mfaSettings, isMFAEnabled, disableMFA, isLoading } = useMFA();
  const [showEnroll, setShowEnroll] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const handleDisableMFA = async () => {
    try {
      await disableMFA.mutateAsync();
      setShowDisableConfirm(false);
    } catch (error) {
      // Error handled in hook
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

  if (showEnroll) {
    return (
      <MFAEnroll
        onSuccess={() => setShowEnroll(false)}
        onCancel={() => setShowEnroll(false)}
      />
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isMFAEnabled ? 'bg-success/10' : 'bg-muted'
              }`}>
                {isMFAEnabled ? (
                  <ShieldCheck className="w-5 h-5 text-success" />
                ) : (
                  <Shield className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Autenticação de Dois Fatores</CardTitle>
                <CardDescription>
                  Adicione uma camada extra de segurança à sua conta
                </CardDescription>
              </div>
            </div>
            <Badge variant={isMFAEnabled ? 'default' : 'secondary'} className={
              isMFAEnabled ? 'bg-success hover:bg-success/90' : ''
            }>
              {isMFAEnabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMFAEnabled ? (
            <>
              <Alert className="bg-success/5 border-success/20">
                <ShieldCheck className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Sua conta está protegida com autenticação de dois fatores.
                </AlertDescription>
              </Alert>

              {mfaSettings?.last_verified_at && (
                <p className="text-sm text-muted-foreground">
                  Última verificação: {new Date(mfaSettings.last_verified_at).toLocaleString('pt-BR')}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDisableConfirm(true)}
                >
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Desativar MFA
                </Button>
              </div>

            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                A autenticação de dois fatores adiciona uma camada extra de segurança exigindo
                um código do seu aplicativo autenticador além da sua senha.
              </p>
              <Button onClick={() => setShowEnroll(true)}>
                <Shield className="w-4 h-4 mr-2" />
                Configurar Autenticação
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Autenticação de Dois Fatores?</DialogTitle>
            <DialogDescription>
              Isso removerá a camada extra de segurança da sua conta. Você terá que configurar
              novamente se quiser reativar.
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive" className="bg-destructive/5">
            <AlertDescription>
              Sua conta ficará menos segura sem a autenticação de dois fatores.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableMFA}
              disabled={disableMFA.isPending}
            >
              {disableMFA.isPending ? 'Desativando...' : 'Desativar MFA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
