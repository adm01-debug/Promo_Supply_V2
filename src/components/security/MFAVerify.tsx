import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useMFA } from '@/hooks/useMFA';

interface MFAVerifyProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MFAVerify = ({ onSuccess, onCancel }: MFAVerifyProps) => {
  const { verifyMFA, verifying } = useMFA();
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) return;

    try {
      await verifyMFA.mutateAsync(code);
      onSuccess?.();
    } catch (error) {
      setCode('');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Verificação de Dois Fatores</CardTitle>
        <CardDescription>
          Digite o código de 6 dígitos do seu aplicativo autenticador para continuar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={verifying}
            autoFocus
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
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
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

        <p className="text-xs text-center text-muted-foreground">
          Não tem acesso ao seu autenticador?{' '}
          <button className="text-primary hover:underline">
            Use um código de backup
          </button>
        </p>
      </CardContent>
    </Card>
  );
};
