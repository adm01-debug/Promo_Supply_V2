import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { Package, Mail, Lock, Loader2, Fingerprint, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FloatingInput } from '@/components/ui/floating-input';
import { useAuth } from '@/features/auth';
import { useWebAuthn } from '@/hooks/useWebAuthn';
import { useAccountLockout } from '@/hooks/useAccountLockout';
import { ThemeToggle } from '@/features/layout/components/ThemeToggle';
import { toast } from '@/lib/feedbackToast';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// QA 035: troca de senha pelo link de recuperacao do Supabase.
const novaSenhaSchema = z.object({
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
  confirm: z.string().min(1, 'Confirme a senha'),
}).refine((v) => v.password === v.confirm, {
  message: 'As senhas não coincidem',
  path: ['confirm'],
});


import { AuthBackground, AuthBrandingPanel } from './AuthBranding';

const Auth = () => {
  const navigate = useNavigate();
  // QA-043: rota de origem gravada pelo ProtectedRoute quando a sessao cai.
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  // Destino pos-login: volta para a rota interrompida, ou para a raiz.
  const destinoPosLogin = from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/auth')
    ? from
    : '/';
  const { user, loading, signIn } = useAuth();
  const { isSupported, isLoading: isPasskeyLoading, authenticateWithPasskey } = useWebAuthn();
  const { isLocked, countdown, formatCountdown, checkLockout, recordFailedAttempt, clearLockout } = useAccountLockout();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passkeyEmail, setPasskeyEmail] = useState('');
  const [isPasswordLeaked, setIsPasswordLeaked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // QA 035: pedido de link de recuperacao de senha.
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate(destinoPosLogin, { replace: true });
    }
  }, [user, loading, navigate, destinoPosLogin]);

  // Check lockout status when email changes
  useEffect(() => {
    if (loginEmail && loginEmail.includes('@')) {
      const timeout = setTimeout(() => {
        checkLockout(loginEmail);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [loginEmail, checkLockout]);

  /**
   * QA 035: dispara o e-mail de recuperacao do proprio Supabase.
   * A resposta e sempre a mesma, exista ou nao a conta, para nao revelar
   * quais e-mails estao cadastrados.
   */
  const handleForgotPassword = async () => {
    const email = loginEmail.trim();
    if (!z.string().email().safeParse(email).success) {
      setErrors({ email: 'Informe seu email para receber o link' });
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/nova-senha`,
    });
    setIsSendingReset(false);

    if (error) {
      logger.error('Falha ao pedir recuperacao de senha', { error });
      toast.error('Não foi possível enviar o link agora. Tente novamente em instantes.');
      return;
    }
    setResetSent(true);
    toast.success('Se este e-mail estiver cadastrado, o link de recuperação chegará em instantes.');
  };

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
      result.error.issues.forEach((err) => {
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
        _failure_reason: failureReason ?? undefined,
      }).then(({ error: logError }) => {
        if (logError) logger.error('Failed to log login attempt', { error: logError });
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
      navigate(destinoPosLogin, { replace: true });
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

  const outfit = { fontFamily: 'Outfit, sans-serif' } as const;

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-[#05020a] text-white">
      <AuthBackground />

      {/* Left Panel - Branding & Features */}
      <AuthBrandingPanel />

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-16 relative z-20">
        {/* Theme Toggle */}
        <div className="absolute top-4 right-4 z-30">
          <ThemeToggle />
        </div>

        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2 z-30">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white" style={outfit}>PROMO SUPPLY</span>
        </div>

        <div className="w-full max-w-[440px]">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold mb-2 text-white" style={outfit}>
              Bem-vindo de volta
            </h2>
            <p className="text-zinc-500 text-sm">
              Acesse sua conta para continuar
            </p>
          </div>

          <div
            className="bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[28px] p-7 sm:p-8 shadow-2xl"
            style={{ boxShadow: '0 30px 80px -20px rgba(124, 58, 237, 0.25), 0 0 0 1px rgba(255,255,255,0.04)' }}
          >
            <div className="w-full space-y-4 animate-fade-in">
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

                {!isLocked && remainingAttempts !== null && remainingAttempts <= 2 && (
                  <Alert className="bg-warning/10 border-warning text-warning-foreground animate-scale-in">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      {remainingAttempts} tentativa(s) restante(s) antes do bloqueio.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <FloatingInput
                    label="Email"
                    type="email"
                    icon={<Mail className="w-5 h-5" />}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    error={errors["email"]}
                    disabled={isSubmitting}
                  />

                  <FloatingInput
                    label="Senha"
                    type="password"
                    icon={<Lock className="w-5 h-5" />}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    error={errors["password"]}
                    disabled={isSubmitting}
                  />

                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSubmitting || isSendingReset}
                      className="text-xs font-medium text-violet-300 hover:text-violet-200 disabled:opacity-60 transition-colors"
                    >
                      {isSendingReset ? 'Enviando link...' : 'Esqueci minha senha'}
                    </button>
                  </div>

                  {resetSent && (
                    <Alert className="bg-violet-500/10 border-violet-500/30">
                      <AlertDescription className="text-xs text-violet-200">
                        Enviamos um link para <span className="font-medium">{loginEmail.trim()}</span>. Abra o link
                        para definir uma nova senha. Se não chegar em alguns minutos, confira a caixa de spam.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-semibold rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white border-0 shadow-xl shadow-violet-600/25 active:scale-[0.98] transition-all"
                    disabled={isSubmitting || isLocked}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Acessar Plataforma'
                    )}
                  </Button>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                    <div className="relative flex justify-center">
                      <span className="px-3 text-[10px] uppercase tracking-[0.18em] text-zinc-600 font-medium bg-transparent">
                        ou continue com
                      </span>
                    </div>
                  </div>

                  <div className={cn("grid gap-3", isSupported ? "grid-cols-2" : "grid-cols-1")}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-2xl bg-white/[0.02] border-white/10 hover:bg-white/[0.06] hover:border-white/20 text-white font-medium text-sm"
                      disabled={isSubmitting}
                      onClick={async () => {
                        const { lovable } = await import('@/integrations/lovable/index');
                        const result = await lovable.auth.signInWithOAuth('google', {
                          redirect_uri: window.location.origin,
                        });
                        if (result?.error) toast.error('Erro ao entrar com Google');
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Google
                    </Button>

                    {isSupported && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-2xl bg-white/[0.02] border-white/10 hover:bg-white/[0.06] hover:border-white/20 text-white font-medium text-sm"
                        disabled={true}
                        title="Login por passkey desabilitado temporariamente por segurança (verificação de assinatura pendente). Use e-mail/senha."
                        onClick={async () => {
                          const target = loginEmail || passkeyEmail;
                          if (!target) {
                            toast.error('Informe seu email para usar Passkey');
                            return;
                          }
                          setPasskeyEmail(target);
                          const result = await authenticateWithPasskey(target);
                          if (result.success) navigate(destinoPosLogin, { replace: true });
                        }}
                      >
                        {isPasskeyLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Fingerprint className="mr-2 h-4 w-4 text-violet-300" />
                        )}
                        Passkey
                      </Button>
                    )}
                  </div>
                </form>
            </div>
          </div>

          <p className="mt-8 text-[11px] leading-relaxed text-zinc-600 text-center max-w-[380px] mx-auto">
            Este sistema é propriedade intelectual exclusiva da{' '}
            <span className="text-zinc-400 font-medium">Promo Brindes</span>, sendo protegido pela
            Lei nº 9.609/98 e demais normas aplicáveis. É proibida sua reprodução, cópia,
            modificação, distribuição ou uso não autorizado.
          </p>

          <p className="text-center text-zinc-700 text-xs mt-6 lg:hidden">
            © 2026 Promo Brindes. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * QA 035: tela de definicao de nova senha, aberta pelo link de recuperacao.
 *
 * O Supabase entrega a sessao de recuperacao na propria URL do link
 * (`detectSessionInUrl`). Enquanto ela nao chega, a tela fica em "verificando";
 * se nao chegar, mostra que o link e invalido/expirado em vez de fingir sucesso.
 */
export const NovaSenhaPage = () => {
  const navigate = useNavigate();
  const [estadoSessao, setEstadoSessao] = useState<'verificando' | 'ok' | 'invalida'>('verificando');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ativo = true;

    const { data: inscricao } = supabase.auth.onAuthStateChange((evento, session) => {
      if (ativo && session && (evento === 'PASSWORD_RECOVERY' || evento === 'SIGNED_IN')) {
        setEstadoSessao('ok');
      }
    });

    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      setEstadoSessao(data.session ? 'ok' : 'invalida');
    }, 1500);

    return () => {
      ativo = false;
      clearTimeout(timer);
      inscricao.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = novaSenhaSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        const campo = err.path[0];
        if (campo) fieldErrors[campo as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setIsSubmitting(false);

    if (error) {
      logger.error('Falha ao definir nova senha', { error });
      toast.error('Não foi possível alterar a senha. O link pode ter expirado — solicite outro.');
      return;
    }

    // Troca a senha e encerra a sessao de recuperacao: o proximo acesso e com a senha nova.
    await supabase.auth.signOut();
    toast.success('Senha alterada com sucesso. Entre com a nova senha.');
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950 p-6">
      <div
        className="w-full max-w-[420px] bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[28px] p-7 sm:p-8 shadow-2xl"
        style={{ boxShadow: '0 30px 80px -20px rgba(124, 58, 237, 0.25), 0 0 0 1px rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight">Definir nova senha</h1>
            <p className="text-xs text-zinc-400">Promo Brindes</p>
          </div>
        </div>

        {estadoSessao === 'verificando' && (
          <div className="flex items-center gap-3 text-sm text-zinc-300 py-8">
            <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
            Validando o link de recuperação...
          </div>
        )}

        {estadoSessao === 'invalida' && (
          <div className="space-y-5">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este link de recuperação é inválido ou expirou. Solicite um novo na tela de login.
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              className="w-full h-12 text-sm font-semibold rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white border-0"
              onClick={() => navigate('/auth', { replace: true })}
            >
              Voltar para o login
            </Button>
          </div>
        )}

        {estadoSessao === 'ok' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FloatingInput
              label="Nova senha"
              type="password"
              icon={<Lock className="w-5 h-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors["password"]}
              disabled={isSubmitting}
            />

            <FloatingInput
              label="Confirme a nova senha"
              type="password"
              icon={<Lock className="w-5 h-5" />}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors["confirm"]}
              disabled={isSubmitting}
            />

            <p className="text-[11px] text-zinc-500">
              A senha precisa ter ao menos 8 caracteres.
            </p>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-semibold rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white border-0 shadow-xl shadow-violet-600/25 active:scale-[0.98] transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
