import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/compras/AppSidebar";
import { RealNotificationCenter } from "@/components/compras/RealNotificationCenter";
import { SLASettingsPanel } from "@/components/compras/SLASettingsPanel";
import { UserMenu } from "@/components/compras/UserMenu";
import { SupplierChat } from "@/components/compras/SupplierChat";
import { GlobalSearch } from "@/components/compras/GlobalSearch";
import { KeyboardShortcutsDialog } from "@/components/compras/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkipLinks } from "@/components/accessibility/SkipLinks";
import { cn } from "@/lib/utils";
import { Menu, X, Keyboard, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Links for accessibility */}
      <SkipLinks />
      
      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block" id="main-navigation">
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
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
          <div className="h-full px-4 flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden shrink-0"
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Global Search */}
            <div className="hidden md:flex flex-1 max-w-xl">
              <GlobalSearch />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />
              
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
              
              <RealNotificationCenter />
              <SLASettingsPanel />
              
              <div className="pl-2 ml-1 sm:pl-3 sm:ml-2 border-l border-border">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="p-4 md:p-6 animate-fade-in" tabIndex={-1}>
          <Breadcrumbs className="mb-4" />
          {children}
        </main>
      </div>

      {/* Supplier Chat */}
      <SupplierChat />
    </div>
  );
};
