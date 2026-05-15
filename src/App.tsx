import { Suspense, useEffect } from "react";
import { logger } from "@/lib/logger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ThemeProvider } from "next-themes";
import { PageLoader } from "@/components/PageLoader";
import { AccessibilityProvider } from "@/components/accessibility/AdvancedAccessibility";
import { AnimatedRoutes } from "@/routes/AppRoutes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'PROMO_SUPPLY_CACHE',
});

const App = () => {
  useEffect(() => {
    logger.info("Aplicação inicializada");
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PersistQueryClientProvider 
            client={queryClient}
            persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }} // 24 hours
          >
            <AccessibilityProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <PWAInstallPrompt />
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <AnimatedRoutes />
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </AccessibilityProvider>
          </PersistQueryClientProvider>
        </ThemeProvider>
      </div>
    </AuthProvider>
  );
};

export default App;
