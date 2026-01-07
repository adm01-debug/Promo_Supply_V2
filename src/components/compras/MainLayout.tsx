import { useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/compras/AppSidebar";
import { RealNotificationCenter } from "@/components/compras/RealNotificationCenter";
import { SLASettingsPanel } from "@/components/compras/SLASettingsPanel";
import { UserMenu } from "@/components/compras/UserMenu";
import { SupplierChat } from "@/components/compras/SupplierChat";
import { GlobalSearch } from "@/components/compras/GlobalSearch";
import { KeyboardShortcutsDialog } from "@/components/compras/KeyboardShortcutsDialog";
import { CommandPalette, useCommandPalette } from "@/components/compras/CommandPalette";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkipLinks } from "@/components/accessibility/SkipLinks";
import { OnboardingTour, useOnboardingTour, dashboardTourSteps } from "@/components/onboarding/OnboardingTour";
import { BottomNavigation } from "@/components/mobile/BottomNavigation";
import { MobileRefreshWrapper } from "@/components/mobile/MobileRefreshWrapper";
import { FeedbackSettingsPanel } from "@/components/settings/FeedbackSettingsPanel";
import { QuickActionsFAB } from "@/components/compras/QuickActionsFAB";
import { CelebrationOverlay } from "@/components/ui/celebration";
import { UndoToastContainer } from "@/components/ui/undo-toast";
import { cn } from "@/lib/utils";
import { Menu, X, Keyboard, HelpCircle, Command, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQueryClient } from "@tanstack/react-query";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  // Command Palette
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();
  
  // Onboarding tour - only show on dashboard
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  const { isOpen: isTourOpen, complete: completeTour, skip: skipTour, restart: restartTour } = useOnboardingTour('dashboard');

  // Pull-to-refresh handler - invalidates all queries
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    // Simulate minimum loading time for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Skip Links for accessibility */}
      <SkipLinks />
      
      {/* Command Palette (Ctrl+K) */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      
      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block" id="main-navigation" data-tour="sidebar">
        <AppSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border transform transition-transform duration-300 md:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <AppSidebar 
          collapsed={false} 
          onToggle={() => setMobileMenuOpen(false)} 
        />
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 md:h-16 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
          <div className="h-full px-3 md:px-4 flex items-center justify-between gap-2 md:gap-4">
            {/* Mobile Menu Button */}
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

            {/* Global Search - responsive */}
            <div className="flex flex-1 max-w-xl" data-tour="global-search">
              <GlobalSearch />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Command Palette Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCommandPaletteOpen(true)}
                    className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    aria-label="Abrir Command Palette"
                  >
                    <Command className="w-4 h-4" />
                    <span className="text-xs">Buscar...</span>
                    <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Busca rápida (Ctrl+K / ⌘K)</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Feedback Settings */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex"
                        aria-label="Configurações de feedback"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Som e vibração</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <FeedbackSettingsPanel />
                </PopoverContent>
              </Popover>
              
              {/* Keyboard shortcuts button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const event = new CustomEvent('show-keyboard-shortcuts');
                      window.dispatchEvent(event);
                    }}
                    className="hidden md:flex"
                    aria-label="Atalhos de teclado"
                  >
                    <Keyboard className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Atalhos de teclado (Shift + ?)</p>
                </TooltipContent>
              </Tooltip>
              
              {/* Help / Restart Tour */}
              {isDashboard && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={restartTour}
                      className="hidden md:flex"
                      aria-label="Ver tour de introdução"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver tour de introdução</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <div data-tour="notifications">
                <RealNotificationCenter />
              </div>
              <SLASettingsPanel />
              
              <div className="pl-2 ml-1 sm:pl-3 sm:ml-2 border-l border-border">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content with Pull-to-Refresh */}
        <MobileRefreshWrapper
          onRefresh={handleRefresh}
          className="min-h-[calc(100vh-4rem)]"
        >
          <main id="main-content" className="p-4 md:p-6 animate-fade-in" tabIndex={-1}>
            <Breadcrumbs className="mb-4" />
            {children}
          </main>
        </MobileRefreshWrapper>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Quick Actions FAB */}
      <QuickActionsFAB />

      {/* Supplier Chat */}
      <SupplierChat />
      
      {/* Celebration Overlay */}
      <CelebrationOverlay />
      
      {/* Undo Toast Container */}
      <UndoToastContainer />
      
      {/* Onboarding Tour */}
      {isDashboard && (
        <OnboardingTour
          steps={dashboardTourSteps}
          isOpen={isTourOpen}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
    </div>
  );
};
