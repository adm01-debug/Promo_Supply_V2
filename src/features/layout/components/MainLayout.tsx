import { useState, useCallback, memo, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { AdvancedSearch } from "./AdvancedSearch";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useGlobalUndo } from "@/hooks/useGlobalUndo";
import { useSessionIdleTimeout } from "@/hooks/useSessionIdleTimeout";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useFormDirty } from "@/hooks/useFormDirty";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { Breadcrumbs } from "./Breadcrumbs";
import { SkipLinks } from "@/components/accessibility/SkipLinks";
import { OnboardingTour, dashboardTourSteps } from "@/components/onboarding/OnboardingTour";
import { useTourPreferences } from "@/hooks/useTourPreferences";
import { BottomNavigation } from "@/components/mobile/BottomNavigation";
import { MobileRefreshWrapper } from "@/components/mobile/MobileRefreshWrapper";
import { QuickActionsFAB } from "./QuickActionsFAB";
import { CelebrationOverlay } from "@/components/ui/celebration";
import { UndoToastContainer } from "@/components/ui/undo-toast";
import { OfflineIndicator } from "./OfflineIndicator";
import { SmartBackButton } from "@/components/navigation/SmartBackButton";
import { NavigationProgressBar } from "@/components/navigation/NavigationProgressBar";
import { HeaderActions } from "./HeaderActions";
import { SupplierChat } from "./SupplierChat";
import { GuidedBuyingAssistant } from "./GuidedBuyingAssistant";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
}

function useSwipeBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const isHome = location.pathname === '/' || location.pathname === '/compras';
    if (isHome) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 30) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      
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
  usePerformanceMonitor();

  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const isHome = location.pathname === '/' || location.pathname === '/compras';
  const { isOpen: isTourOpen, complete: completeTour, skip: skipTour, restart: restartTour, isLoading: isTourLoading } = useTourPreferences('dashboard');

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [queryClient]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <NavigationProgressBar />
      <SkipLinks />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <KeyboardShortcutsDialog />

      <div className="hidden md:block" id="main-navigation" data-tour="sidebar">
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border transform transition-transform duration-300 ease-out md:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <AppSidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
      </div>

      <div className={cn("transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", sidebarCollapsed ? "md:ml-[68px]" : "md:ml-64")}>
        <header className="sticky top-0 z-30 h-16 md:h-16 border-b border-border/10 bg-card/60 backdrop-blur-2xl dark:bg-[hsl(228,28%,6%,0.6)]">
          <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-1 shrink-0">
              <div className="md:hidden flex items-center">
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
                  <div className="flex items-center">
                    <SmartBackButton compact className="flex" />
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
              <SmartBackButton className="hidden md:flex" />
            </div>

            <div className="flex flex-1 max-w-xl" data-tour="global-search">
              <AdvancedSearch />
            </div>

            <HeaderActions
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onRestartTour={restartTour}
            />
          </div>
        </header>

        <MobileRefreshWrapper onRefresh={handleRefresh} className="min-h-[calc(100vh-3.5rem)]">
          <main id="main-content" className="p-4 md:p-6" tabIndex={-1}>
            {!isHome && (
              <motion.div
                className="mb-3"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                <Breadcrumbs variant="pills" className="hidden md:flex" />
                <Breadcrumbs variant="compact" className="md:hidden" />
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </MobileRefreshWrapper>
      </div>

      <BottomNavigation />
      <QuickActionsFAB />
      <SupplierChat />
      <GuidedBuyingAssistant />
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
