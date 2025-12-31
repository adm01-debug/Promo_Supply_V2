import { useState } from 'react';
import { QrCode, Smartphone, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { useMFA } from '@/hooks/useMFA';

interface MFAEnrollProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MFAEnroll = ({ onSuccess, onCancel }: MFAEnrollProps) => {
  const { enrollMFA, verifyEnrollment, verifying } = useMFA();
  const [step, setStep] = useState<'intro' | 'qr' | 'verify'>('intro');
  const [enrollmentData, setEnrollmentData] = useState<{
    id: string;
    totp: { qr_code: string; secret: string; uri: string };
  } | null>(null);
  const [code, setCode] = useState('');

  const handleStartEnrollment = async () => {
    try {
      const data = await enrollMFA.mutateAsync();
      setEnrollmentData(data);
      setStep('qr');
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6 || !enrollmentData) return;

    try {
      await verifyEnrollment.mutateAsync({
        factorId: enrollmentData.id,
        code,
      });
      onSuccess?.();
    } catch (error) {
      setCode('');
    }
  };

  const copySecret = () => {
    if (enrollmentData?.totp.secret) {
      navigator.clipboard.writeText(enrollmentData.totp.secret);
      toast.success('Código secreto copiado!');
    }
  };

  if (step === 'intro') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Configurar Autenticação de Dois Fatores</CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">Você precisará de:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Google Authenticator, Authy ou similar</li>
              <li>• Acesso ao seu smartphone</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleStartEnrollment} className="flex-1" disabled={enrollMFA.isPending}>
              {enrollMFA.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Começar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'qr') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Escaneie o QR Code</CardTitle>
          <CardDescription>
            Use seu aplicativo autenticador para escanear o código abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {enrollmentData?.totp.qr_code && (
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <img
                  src={enrollmentData.totp.qr_code}
                  alt="QR Code para autenticação"
                  className="w-48 h-48"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Ou insira o código manualmente:
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <code className="flex-1 text-sm font-mono break-all">
                {enrollmentData?.totp.secret}
              </code>
              <Button variant="ghost" size="icon" onClick={copySecret}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button onClick={() => setStep('verify')} className="w-full">
            Próximo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Verificar Código</CardTitle>
        <CardDescription>
          Digite o código de 6 dígitos do seu aplicativo autenticador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={verifying}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('qr')} className="flex-1">
            Voltar
          </Button>
          <Button
            onClick={handleVerify}
            className="flex-1"
            disabled={code.length !== 6 || verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
