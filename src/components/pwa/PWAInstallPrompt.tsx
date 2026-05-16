import { useState, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = forwardRef<HTMLDivElement>((_props, _ref) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conexão Restaurada",
        description: "Você está online novamente.",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
      toast({
        title: "Sem Conexão",
        description: "Você está offline. Alguns recursos podem estar limitados.",
        variant: "destructive",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: "App Instalado!",
        description: "O Promo Brindes foi adicionado à sua tela inicial.",
      });
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const dismissPrompt = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt && isOnline) return null;

  return (
    <>
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Você está offline - dados em cache disponíveis</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="ml-2 h-6 px-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Recarregar
          </Button>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-6 md:bottom-10 right-6 z-[2000] max-w-sm animate-in slide-in-from-bottom-10 duration-700 ease-[0.16,1,0.3,1]">
          <Card className="border-white/[0.08] bg-[#0a0a0c]/80 backdrop-blur-3xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] rounded-[2.5rem] overflow-hidden relative group">
            {/* Ambient Animated Glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-600/20 blur-[80px] rounded-full group-hover:bg-violet-600/30 transition-colors duration-1000" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-fuchsia-600/20 blur-[80px] rounded-full group-hover:bg-fuchsia-600/30 transition-colors duration-1000" />
            
            <CardHeader className="pb-4 relative z-10 pt-8 px-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 blur-md opacity-50 animate-pulse" />
                    <div className="relative p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-2xl">
                      <Download className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-[-0.02em] text-white">Instalar App</CardTitle>
                    <CardDescription className="text-[9px] font-black uppercase tracking-[0.3em] text-violet-400/80 mt-1">
                      Elite Native Experience
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 -mt-2 -mr-2 rounded-2xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
                  onClick={dismissPrompt}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-8 pt-2 px-8 relative z-10">
              <p className="text-sm text-zinc-400 mb-8 leading-relaxed font-medium">
                Adicione o <span className="text-white font-black">PROMO BRINDES</span> à sua homescreen para acesso instantâneo e performance ultra-fluida.
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleInstall} 
                  className="w-full h-14 rounded-2xl bg-white text-black hover:bg-zinc-100 font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_20px_-10px_rgba(255,255,255,0.2)] transition-all active:scale-[0.98]"
                >
                  Instalar Agora
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={dismissPrompt}
                  className="w-full h-12 rounded-2xl bg-transparent hover:bg-white/[0.03] text-zinc-500 hover:text-zinc-300 font-black uppercase tracking-[0.2em] text-[9px] transition-all"
                >
                  Talvez mais tarde
                </Button>
              </div>
            </CardContent>
            
            {/* Bottom Progress Line Accent */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 opacity-50" />
          </Card>
        </div>
      )}
    </>
  );
});
PWAInstallPrompt.displayName = 'PWAInstallPrompt';
