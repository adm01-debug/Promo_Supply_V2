import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Mail, Lock, User, Loader2, Fingerprint, AlertTriangle, ShoppingBag, TrendingUp, Shield, Sparkles } from 'lucide-react';
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

// Animated background shapes
const FloatingShape = ({ className, delay = 0 }: { className?: string; delay?: number }) => (
  <div 
    className={cn(
      "absolute rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl animate-float",
      className
    )}
    style={{ animationDelay: `${delay}s` }}
  />
);

// Feature card for the left panel
const FeatureCard = ({ icon: Icon, title, description, delay }: { 
  icon: typeof ShoppingBag; 
  title: string; 
  description: string;
  delay: number;
}) => (
  <div 
    className="flex items-start gap-3 p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 animate-fade-in"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="p-2 rounded-lg bg-white/20">
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <h3 className="font-semibold text-white text-sm">{title}</h3>
      <p className="text-white/70 text-xs mt-0.5">{description}</p>
    </div>
  </div>
);

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
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
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
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated Background Shapes */}
      <FloatingShape className="w-96 h-96 -top-48 -left-48" delay={0} />
      <FloatingShape className="w-64 h-64 top-1/2 -right-32" delay={2} />
      <FloatingShape className="w-80 h-80 -bottom-40 left-1/4" delay={4} />
      
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative p-12 flex-col justify-between">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Logo & Title */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/30">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Sistema de Compras</h1>
              <p className="text-white/70 text-sm">Promo Supply</p>
            </div>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Gerencie suas compras com 
              <span className="relative inline-block ml-2">
                inteligência
                <Sparkles className="absolute -top-2 -right-6 w-5 h-5 text-yellow-300 animate-pulse" />
              </span>
            </h2>
            <p className="text-white/80 text-lg">
              Plataforma completa para gestão de solicitações, cotações, fornecedores e pagamentos.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          <FeatureCard 
            icon={ShoppingBag}
            title="Gestão Completa"
            description="Controle todo o ciclo de compras em um só lugar"
            delay={100}
          />
          <FeatureCard 
            icon={TrendingUp}
            title="Análises em Tempo Real"
            description="Dashboards e KPIs para tomada de decisão"
            delay={200}
          />
          <FeatureCard 
            icon={Shield}
            title="Segurança Avançada"
            description="Autenticação robusta e controle de acesso"
            delay={300}
          />
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/50 text-sm">
          © 2025 Promo Brindes. Todos os direitos reservados.
        </p>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background relative">
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
            <span className="font-bold text-foreground">Promo Brindes</span>
          </div>
        </div>
        
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden">
            {/* Gradient top border */}
            <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
            
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

                    {isSupported && (
                      <>
                        <div className="relative my-6">
                          <Separator />
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                            ou continue com
                          </span>
                        </div>

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
            © 2025 Promo Brindes. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
