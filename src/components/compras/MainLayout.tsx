import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/compras/AppSidebar";
import { cn } from "@/lib/utils";
import { Bell, Settings, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
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
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="h-full px-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            {/* Spacer for desktop */}
            <div className="hidden md:block" />

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
              <div className="flex items-center gap-2 pl-3 ml-2 border-l border-border">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:inline">Comprador</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
