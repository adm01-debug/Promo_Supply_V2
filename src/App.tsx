import { Suspense, useEffect, ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { logger } from "@/lib/logger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient, persister } from "@/lib/query-client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/features/auth";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ThemeProvider } from "next-themes";
import { PageLoader } from "@/features/layout/components/PageLoader";
import { AccessibilityProvider, AccessibilityPanel, SkipToContent } from "@/components/accessibility/AdvancedAccessibility";
import { AnimatedRoutes } from "@/routes/AppRoutes";
import { useNProgress } from "@/hooks/useNProgress";
import { GlobalErrorBoundary } from "@/components/feedback/GlobalErrorBoundary";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { NavigationProvider } from "@/hooks/useNavigation";


const AppContent = () => {
  useNProgress();
  return (
    <main id="main-content" className="relative">
      <AnimatedRoutes />
    </main>
  );
};

/**
 * Fix #4: PersistGate scopes the React Query persisted cache to the current
 * user id via the `buster`. When the user changes (or signs out), the buster
 * changes and the persister automatically discards the previous user's cache,
 * preventing cross-user data leaks on shared machines.
 */
const PersistGate = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        buster: user?.id ?? 'anon',
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};


const App = () => {
  usePerformanceMonitor();

  useEffect(() => {
    logger.info("Aplicação inicializada");
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PersistGate>
            <AccessibilityProvider>
              <TooltipProvider>
                <SkipToContent />
                <Toaster />
                <Sonner />
                <PWAInstallPrompt />
                <AccessibilityPanel />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <NavigationProvider>
                    <GlobalErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <AppContent />
                      </Suspense>
                    </GlobalErrorBoundary>
                  </NavigationProvider>
                </BrowserRouter>
              </TooltipProvider>
            </AccessibilityProvider>
          </PersistGate>
        </ThemeProvider>
      </div>
    </AuthProvider>
  );
};

export default App;
