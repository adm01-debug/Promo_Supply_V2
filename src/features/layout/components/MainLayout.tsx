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
import { BackToTop } from "@/components/navigation/BackToTop";
import { cn } from "@/lib/utils";
import { Menu, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { EliteBackground } from "@/components/layout/EliteBackground";

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
    <div className="min-h-screen text-foreground pb-16 md:pb-0 overflow-x-hidden selection:bg-primary/30">
      <EliteBackground />
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
        "fixed left-0 top-0 z-40 h-screen w-72 bg-[#05020a]/95 border-r border-white/5 transform transition-transform duration-500 ease-&lsqb;cubic-bezier(0.23,1,0.32,1)] md:hidden",
        mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <AppSidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
      </div>

      <div className={cn(
        "transition-all duration-500 ease-&lsqb;cubic-bezier(0.23,1,0.32,1)]", 
        sidebarCollapsed ? "md:ml-[68px]" : "md:ml-64"
      )}>
        <header className="sticky top-0 z-30 h-16 md:h-20 border-b border-white/5 shadow-sm bg-white/[0.01] backdrop-blur-2xl print:hidden flex items-center">
          <div className="w-full px-4 md:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="md:hidden flex items-center gap-2">
                {isHome && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(true)}
                    className="h-10 w-10 rounded-xl bg-muted border border-border"
                    aria-label="Abrir menu"
                  >
                    <Menu className="w-5 h-5 text-violet-400" />
                  </Button>
                )}
              </div>

              
              {/* Desktop & Mobile Smart Back Button - Always present in header when not home */}
              <AnimatePresence mode="wait">
                {!isHome && (
                  <motion.div
                    initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                    className="flex items-center"
                  >
                    <SmartBackButton compact={false} className="hidden md:flex" />
                    <SmartBackButton compact={true} className="md:hidden" />
                  </motion.div>
                )}
              </AnimatePresence>


              {/* Sidebar toggle for desktop when collapsed */}
              {isHome && (
                <div className="hidden md:block">
                  <Package className="w-6 h-6 text-primary animate-pulse-slow" />
                </div>
              )}
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
                className="mb-6 md:hidden"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Breadcrumbs variant="compact" />
              </motion.div>
            )}


            <AnimatePresence mode="wait" initial={false}>
              <PageTransition className="w-full h-full">
                {children}
              </PageTransition>
            </AnimatePresence>
          </main>
        </MobileRefreshWrapper>
      </div>

      <BottomNavigation />
      <QuickActionsFAB />
      <BackToTop />
      <SupplierChat />
      <GuidedBuyingAssistant />
      <CelebrationOverlay />
      <UndoToastContainer />
      <OfflineIndicator />
    </div>
  );
});

MainLayout.displayName = 'MainLayout';
