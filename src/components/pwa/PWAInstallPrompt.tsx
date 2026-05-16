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
        description: "O Promo Supply foi adicionado à sua tela inicial.",
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
        <div className="fixed bottom-20 md:bottom-8 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
          <Card className="border-white/10 bg-[#0a0a0c]/80 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-fuchsia-500/10 opacity-50" />
            
            <CardHeader className="pb-2 relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/20">
                    <Download className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black uppercase tracking-tight text-white">Instalar App</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      Experiência Elite Native
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -mt-1 -mr-1 rounded-xl hover:bg-white/5 text-zinc-500"
                  onClick={dismissPrompt}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-5 relative z-10">
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed font-medium">
                Adicione o <span className="text-white font-bold">Promo Brindes</span> à sua tela inicial para acesso instantâneo e performance superior.
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={handleInstall} 
                  size="sm" 
                  className="flex-1 h-11 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-white/5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Instalar Agora
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={dismissPrompt}
                  className="h-11 px-5 rounded-2xl border-white/10 hover:bg-white/5 text-zinc-400 font-black uppercase tracking-widest text-[10px]"
                >
                  Depois
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
});
PWAInstallPrompt.displayName = 'PWAInstallPrompt';
