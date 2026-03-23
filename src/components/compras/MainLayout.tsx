import { useState, useCallback, memo } from "react";
import { useLocation } from "react-router-dom";
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
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

interface MainLayoutProps {
  children: React.ReactNode;
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

  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
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
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "md:ml-16" : "md:ml-64")}>
        <header className="sticky top-0 z-20 h-14 md:h-16 border-b border-border/50 bg-card/90 backdrop-blur-xl dark:bg-[hsl(228,28%,6%,0.85)] dark:border-border/30 dark:shadow-[0_4px_24px_hsl(0,0%,0%,0.3)]">
          <div className="h-full px-3 md:px-4 flex items-center justify-between gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden shrink-0 h-9 w-9"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

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
            <div className="flex items-center gap-2 mb-4">
              <SmartBackButton className="md:hidden" />
              <Breadcrumbs className="flex-1" />
            </div>
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
