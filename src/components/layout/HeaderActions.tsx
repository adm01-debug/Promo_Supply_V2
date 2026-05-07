import { memo, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const DependencyHealthBadge = lazy(() => import("@/components/admin/DependencyHealthBadge"));
import { RealNotificationCenter } from "@/components/compras/RealNotificationCenter";
import { SLASettingsPanel } from "@/components/compras/SLASettingsPanel";
import { UserMenu } from "@/components/compras/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityPanel } from "@/components/accessibility/AdvancedAccessibility";
import { FeedbackSettingsPanel } from "@/components/settings/FeedbackSettingsPanel";
import { Keyboard, HelpCircle, Command, Settings2, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HeaderActionsProps {
  onOpenCommandPalette: () => void;
  onRestartTour: () => void;
}

export const HeaderActions = memo(({ onOpenCommandPalette, onRestartTour }: HeaderActionsProps) => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2.5">
      {/* Command Palette Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommandPalette}
            className="hidden lg:flex items-center gap-2.5 text-muted-foreground hover:text-foreground bg-muted/20 border-border/40 rounded-xl px-4 transition-all duration-300 hover:shadow-sm"
            aria-label="Abrir Command Palette"
          >
            <Command className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">Atalhos</span>
            <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-lg border border-border/40 bg-background/50 px-1.5 font-mono text-[10px] font-bold text-muted-foreground">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover/90 backdrop-blur-md border-border/40">
          <p className="text-xs font-bold">Busca rápida (Ctrl+K / ⌘K)</p>
        </TooltipContent>
      </Tooltip>


      <ThemeToggle />

      <Suspense fallback={null}>
        <DependencyHealthBadge />
      </Suspense>

      {/* Accessibility Settings */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-300" aria-label="Configurações de acessibilidade">
                <Accessibility className="w-4 h-4" />
              </Button>

            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent><p>Acessibilidade</p></TooltipContent>
        </Tooltip>
        <PopoverContent className="w-96 p-0" align="end">
          <AccessibilityPanel />
        </PopoverContent>
      </Popover>

      {/* Feedback Settings */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex rounded-xl hover:bg-primary/5 hover:text-primary transition-all duration-300" aria-label="Configurações de feedback">
                <Settings2 className="w-4 h-4" />
              </Button>

            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent><p>Som e vibração</p></TooltipContent>
        </Tooltip>
        <PopoverContent className="w-80 p-0" align="end">
          <FeedbackSettingsPanel />
        </PopoverContent>
      </Popover>

      {/* Keyboard shortcuts */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.dispatchEvent(new CustomEvent('show-keyboard-shortcuts'))}
            className="hidden md:flex"
            aria-label="Atalhos de teclado"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Atalhos de teclado (Shift + ?)</p></TooltipContent>
      </Tooltip>

      {/* Help / Restart Tour */}
      {isDashboard && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onRestartTour} className="hidden md:flex" aria-label="Ver tour de introdução">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Ver tour de introdução</p></TooltipContent>
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
  );
});

HeaderActions.displayName = 'HeaderActions';
