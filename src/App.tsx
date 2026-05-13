import { Suspense, useEffect } from "react";
import { logger } from "@/lib/logger";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { ThemeProvider } from "next-themes";
import { PageLoader } from "@/components/PageLoader";
import { ErrorBoundary } from "@/components/ui/error-boundary";
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

const App = () => (
  <div className="min-h-screen">
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AccessibilityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <PWAInstallPrompt />
            <BrowserRouter>
              <AuthProvider>
                <Suspense fallback={<PageLoader />}>
                  <AnimatedRoutes />
                </Suspense>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AccessibilityProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </div>
);

export default App;
