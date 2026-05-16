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
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { Breadcrumbs } from "./Breadcrumbs";
import { SkipLinks } from "@/components/accessibility/SkipLinks";
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

export const MainLayout = memo(({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();

  useKeyboardShortcuts();
  useGlobalUndo();
  useSessionIdleTimeout();
  useScrollRestoration();
  usePerformanceMonitor();

  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  const isHome = location.pathname === '/' || location.pathname === '/compras';

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    await new Promise(resolve => setTimeout(resolve, 800));
  }, [queryClient]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 overflow-x-hidden">
      <NavigationProgressBar />
      <SkipLinks />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <KeyboardShortcutsDialog />

      <div className="hidden md:block" id="main-navigation">
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed left-0 top-0 z-40 h-screen w-72 bg-card border-r border-border/50 transform transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] md:hidden",
        mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <AppSidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
      </div>

      <div className={cn(
        "transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]", 
        sidebarCollapsed ? "md:ml-[68px]" : "md:ml-64"
      )}>
        <header className="sticky top-0 z-30 h-16 md:h-20 border-b border-border/5 shadow-sm bg-background/60 backdrop-blur-2xl print:hidden flex items-center">
          <div className="w-full px-4 md:px-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="md:hidden flex items-center gap-2">
                {!isHome ? (
                  <SmartBackButton compact className="flex" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(true)}
                    className="h-10 w-10 rounded-xl"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                )}
              </div>
              {!isHome && <SmartBackButton className="hidden md:flex" />}
            </div>

            <div className="flex-1 max-w-2xl hidden sm:block">
              <AdvancedSearch />
            </div>

            <HeaderActions
              onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              onRestartTour={() => {}}
            />
          </div>
        </header>

        <MobileRefreshWrapper onRefresh={handleRefresh} className="min-h-[calc(100vh-5rem)]">
          <main id="main-content" className="p-4 md:p-8 max-w-[1600px] mx-auto" tabIndex={-1}>
            {!isHome && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Breadcrumbs variant="pills" className="hidden md:flex" />
                <Breadcrumbs variant="compact" className="md:hidden" />
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full"
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
    </div>
  );
});

MainLayout.displayName = 'MainLayout';
