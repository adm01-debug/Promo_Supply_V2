import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Mail, Lock, User, Loader2, Fingerprint, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FloatingInput } from '@/components/ui/floating-input';
import { useAuth } from '@/hooks/useAuth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { useAccountLockout } from '@/hooks/useAccountLockout';
import { PasswordStrengthIndicator } from '@/components/security/PasswordStrengthIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve ter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos um número')
    .regex(/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\;'/`~]/, 'Senha deve ter pelo menos um caractere especial'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

import { AuthBackground, AuthBrandingPanel } from './auth/AuthBranding';

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const { isSupported, isLoading: isPasskeyLoading, authenticateWithPasskey } = useWebAuthn();
  const { isLocked, countdown, formatCountdown, checkLockout, recordFailedAttempt, clearLockout } = useAccountLockout();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passkeyEmail, setPasskeyEmail] = useState('');
  const [isPasswordLeaked, setIsPasswordLeaked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Check lockout status when email changes
  useEffect(() => {
    if (loginEmail && loginEmail.includes('@')) {
      const timeout = setTimeout(() => {
        checkLockout(loginEmail);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [loginEmail, checkLockout]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isLocked) {
      toast.error(`Conta temporariamente bloqueada. Aguarde ${formatCountdown(countdown)}`);
      return;
    }

    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    
    // Check if IP is blocked before attempting login
    const userAgent = navigator.userAgent;
    
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    // Log the login attempt (IP-based rate limiting handled server-side)
    const logAttempt = (success: boolean, failureReason?: string) => {
      supabase.rpc('log_login_attempt', {
        _email: loginEmail,
        _ip_address: '',
        _user_agent: userAgent,
        _success: success,
        _failure_reason: failureReason ?? null,
      }).then(({ error: logError }) => {
        if (logError) console.error('Failed to log login attempt:', logError);
      });
    };

    if (error) {
      logAttempt(false, error.message);
      const lockoutResult = await recordFailedAttempt(loginEmail);
      
      if (lockoutResult.locked) {
        toast.error(`Muitas tentativas falhadas. Conta bloqueada por ${lockoutResult.lockoutMinutes} minuto(s).`);
        setRemainingAttempts(null);
      } else {
        if (error.message.includes('Invalid login credentials')) {
          toast.error(`Email ou senha incorretos. ${lockoutResult.remainingAttempts} tentativa(s) restante(s).`);
        } else {
          toast.error(error.message);
        }
        setRemainingAttempts(lockoutResult.remainingAttempts ?? null);
      }
    } else {
      logAttempt(true);
      await clearLockout(loginEmail);
      setRemainingAttempts(null);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isPasswordLeaked) {
      toast.error('Esta senha foi encontrada em vazamentos de dados. Escolha outra senha.');
      return;
    }

    const result = signupSchema.safeParse({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Conta criada com sucesso! Você já pode fazer login.');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg animate-pulse">
              <Package className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-background rounded-full flex items-center justify-center border-2 border-primary">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      <AuthBackground />
      
      {/* Left Panel - Branding & Features */}
      <AuthBrandingPanel />

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background relative" style={{
        background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(228 28% 8%) 100%)',
      }}>
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Promo Supply</span>
          </div>
        </div>
        
        <div className="w-full max-w-md">
          <Card className="border-border/40 shadow-2xl backdrop-blur-xl bg-card/90 overflow-hidden relative" style={{
            boxShadow: '0 0 0 1px hsl(265 90% 66% / 0.1), 0 24px 48px hsl(0 0% 0% / 0.4), 0 0 80px hsl(265 90% 66% / 0.08)',
          }}>
            {/* Gradient top border — neon accent */}
            <div className="h-[2px]" style={{
              background: 'linear-gradient(90deg, hsl(265 90% 66%) 0%, hsl(195 95% 52%) 50%, hsl(265 90% 66%) 100%)',
            }} />
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="p-6 pb-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    {activeTab === 'login' ? 'Bem-vindo de volta!' : 'Criar nova conta'}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {activeTab === 'login' 
                      ? 'Entre com suas credenciais para acessar o sistema' 
                      : 'Preencha os dados para criar sua conta'}
                  </p>
                </div>

                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="login" className="text-sm font-medium data-[state=active]:shadow-sm">
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium data-[state=active]:shadow-sm">
                    Criar Conta
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="px-6 pb-6">
                {/* Login Tab */}
                <TabsContent value="login" className="mt-0 space-y-4 animate-fade-in">
                  {/* Lockout Alert */}
                  {isLocked && (
                    <Alert variant="destructive" className="animate-scale-in">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Conta temporariamente bloqueada.
                        <br />
                        <span className="font-mono font-bold text-lg">{formatCountdown(countdown)}</span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Remaining attempts warning */}
                  {!isLocked && remainingAttempts !== null && remainingAttempts <= 2 && (
                    <Alert className="bg-warning/10 border-warning text-warning-foreground animate-scale-in">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-warning">
                        {remainingAttempts} tentativa(s) restante(s) antes do bloqueio.
                      </AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleLogin} className="space-y-5">
                    <FloatingInput
                      label="Email"
                      type="email"
                      icon={<Mail className="w-5 h-5" />}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      error={errors.email}
                      disabled={isSubmitting}
                    />

                    <FloatingInput
                      label="Senha"
                      type="password"
                      icon={<Lock className="w-5 h-5" />}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      error={errors.password}
                      disabled={isSubmitting}
                      rightIcon={<Lock className="w-4 h-4 opacity-50" />}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
                      disabled={isSubmitting || isLocked}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>

                    <div className="relative my-6">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                        ou continue com
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 text-base font-medium"
                      disabled={isSubmitting}
                      onClick={async () => {
                        const { lovable } = await import('@/integrations/lovable/index');
                        const result = await lovable.auth.signInWithOAuth('google', {
                          redirect_uri: window.location.origin,
                        });
                        if (result?.error) {
                          toast.error('Erro ao entrar com Google');
                        }
                      }}
                    >
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Entrar com Google
                    </Button>

                    {isSupported && (
                      <>

                        <div className="space-y-4">
                          <FloatingInput
                            label="Email para Passkey"
                            type="email"
                            icon={<Fingerprint className="w-5 h-5" />}
                            value={passkeyEmail}
                            onChange={(e) => setPasskeyEmail(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-12 text-base font-medium"
                            disabled={isPasskeyLoading || !passkeyEmail}
                            onClick={async () => {
                              const result = await authenticateWithPasskey(passkeyEmail);
                              if (result.success) {
                                navigate('/');
                              }
                            }}
                          >
                            {isPasskeyLoading ? (
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                              <Fingerprint className="mr-2 h-5 w-5" />
                            )}
                            Entrar com Passkey
                          </Button>
                        </div>
                      </>
                    )}
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup" className="mt-0 space-y-4 animate-fade-in">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <FloatingInput
                      label="Nome Completo"
                      type="text"
                      icon={<User className="w-5 h-5" />}
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      error={errors.fullName}
                      disabled={isSubmitting}
                    />

                    <FloatingInput
                      label="Email"
                      type="email"
                      icon={<Mail className="w-5 h-5" />}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      error={errors.email}
                      disabled={isSubmitting}
                    />

                    <div className="space-y-2">
                      <FloatingInput
                        label="Senha"
                        type="password"
                        icon={<Lock className="w-5 h-5" />}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        error={errors.password}
                        disabled={isSubmitting}
                      />
                      <PasswordStrengthIndicator 
                        password={signupPassword} 
                        onStrengthChange={(_, leaked) => setIsPasswordLeaked(leaked)}
                      />
                    </div>

                    <FloatingInput
                      label="Confirmar Senha"
                      type="password"
                      icon={<Lock className="w-5 h-5" />}
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      error={errors.confirmPassword}
                      disabled={isSubmitting}
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar Conta'
                      )}
                    </Button>
                  </form>

                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Ao criar uma conta, você concorda com nossos{' '}
                    <a href="#" className="text-primary hover:underline">Termos de Uso</a>
                    {' '}e{' '}
                    <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
                  </p>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* Footer for mobile */}
          <p className="text-center text-muted-foreground text-xs mt-6 lg:hidden">
            © 2026 Promo Supply. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
