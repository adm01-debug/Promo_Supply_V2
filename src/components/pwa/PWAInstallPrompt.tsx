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
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Instalar App</CardTitle>
                    <CardDescription className="text-xs">
                      Acesso rápido e offline
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1"
                  onClick={dismissPrompt}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-xs text-muted-foreground mb-3">
                Instale o Sistema de Compras na sua tela inicial para acesso rápido, 
                mesmo sem internet.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleInstall} size="sm" className="flex-1">
                  <Download className="h-4 w-4 mr-1" />
                  Instalar
                </Button>
                <Button variant="outline" size="sm" onClick={dismissPrompt}>
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
