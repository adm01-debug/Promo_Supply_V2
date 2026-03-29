import { useState, useCallback, memo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/compras/AppSidebar";
import { AdvancedSearch } from "@/components/compras/AdvancedSearch";
import { KeyboardShortcutsDialog } from "@/components/compras/KeyboardShortcutsDialog";
import { CommandPalette, useCommandPalette } from "@/components/compras/CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useGlobalUndo } from "@/hooks/useGlobalUndo";
import { useSessionIdleTimeout } from "@/hooks/useSessionIdleTimeout";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkipLinks } from "@/components/accessibility/SkipLinks";
import { OnboardingTour, dashboardTourSteps } from "@/components/onboarding/OnboardingTour";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { BottomNavigation } from "@/components/mobile/BottomNavigation";
import { MobileRefreshWrapper } from "@/components/mobile/MobileRefreshWrapper";
import { QuickActionsFAB } from "@/components/compras/QuickActionsFAB";
import { CelebrationOverlay } from "@/components/ui/celebration";
import { UndoToastContainer } from "@/components/ui/undo-toast";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SmartBackButton } from "@/components/navigation/SmartBackButton";
import { NavigationProgressBar } from "@/components/navigation/NavigationProgressBar";
import { HeaderActions } from "@/components/layout/HeaderActions";
import { SupplierChat } from "@/components/compras/SupplierChat";
import { cn } from "@/lib/utils";
import { Menu, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface MainLayoutProps {
  children: React.ReactNode;
}

// Hook for swipe-back navigation
function useSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const isHome = location.pathname === '/' || location.pathname === '/compras';
    if (isHome) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger from left edge (first 30px)
      if (e.touches[0].clientX < 30) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      
      // Swipe right from edge with more horizontal than vertical movement
      if (deltaX > 80 && deltaX > deltaY * 1.5) {
        navigate(-1);
      }
      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);
}

export const MainLayout = memo(({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

  useKeyboardShortcuts();
  useGlobalUndo();
  useSessionIdleTimeout();
  useScrollRestoration();
  useSwipeBack();

  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const isHome = location.pathname === '/' || location.pathname === '/compras';
  const { isOpen: isTourOpen, complete: completeTour, skip: skipTour, restart: restartTour, isLoading: isTourLoading } = useTourPreferences('dashboard');

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <NavigationProgressBar />
      <SkipLinks />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <KeyboardShortcutsDialog />

      {/* Desktop Sidebar */}
      <div className="hidden md:block" id="main-navigation" data-tour="sidebar">
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border transform transition-transform duration-300 md:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <AppSidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main Content */}
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "md:ml-16" : "md:ml-60")}>
        <header className="sticky top-0 z-20 h-14 md:h-16 border-b border-border/50 bg-card/90 backdrop-blur-xl dark:bg-[hsl(228,28%,6%,0.85)] dark:border-border/30 dark:shadow-[0_4px_24px_hsl(0,0%,0%,0.3)]">
          <div className="h-full px-3 md:px-4 flex items-center justify-between gap-2 md:gap-4">
            {/* Mobile: hamburger OR back button */}
            <div className="md:hidden shrink-0 flex items-center">
              {isHome ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="h-9 w-9"
                  aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <SmartBackButton className="flex" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="h-8 w-8 text-muted-foreground"
                    aria-label="Abrir menu"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Desktop: back button */}
            <SmartBackButton className="hidden md:flex" />

            <div className="flex flex-1 max-w-xl" data-tour="global-search">
              <AdvancedSearch />
            </div>

            <HeaderActions
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onRestartTour={restartTour}
            />
          </div>
        </header>

        <MobileRefreshWrapper onRefresh={handleRefresh} className="min-h-[calc(100vh-4rem)]">
          <main id="main-content" className="p-4 md:p-6 animate-fade-in" tabIndex={-1}>
            {/* Breadcrumbs — always visible on non-home pages */}
            {!isHome && (
              <div className="mb-4">
                <Breadcrumbs className="hidden md:flex" />
                <Breadcrumbs variant="compact" className="md:hidden" />
              </div>
            )}
            {children}
          </main>
        </MobileRefreshWrapper>
      </div>

      <BottomNavigation />
      <QuickActionsFAB />
      <SupplierChat />
      <CelebrationOverlay />
      <UndoToastContainer />
      <OfflineIndicator />

      {isDashboard && !isTourLoading && (
        <OnboardingTour steps={dashboardTourSteps} isOpen={isTourOpen} onComplete={completeTour} onSkip={skipTour} />
      )}
    </div>
  );
});

MainLayout.displayName = 'MainLayout';
