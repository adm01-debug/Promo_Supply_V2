import { Suspense, useEffect } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { logger } from "@/lib/logger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient, persister } from "@/lib/query-client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth";
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


const App = () => {
  usePerformanceMonitor();

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
                <SkipToContent />
                <Toaster />
                <Sonner />
                <PWAInstallPrompt />
                <AccessibilityPanel />
                <BrowserRouter>
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
          </PersistQueryClientProvider>
        </ThemeProvider>
      </div>
    </AuthProvider>
  );
};

export default App;
