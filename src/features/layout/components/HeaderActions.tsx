import { memo, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";

const DependencyHealthBadge = lazy(() => import("@/components/admin/DependencyHealthBadge"));
import { RealNotificationCenter } from "./RealNotificationCenter";
import { SLASettingsPanel } from "./SLASettingsPanel";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AccessibilityPanel } from "@/components/accessibility/AdvancedAccessibility";
import { FeedbackSettingsPanel } from "@/components/settings/FeedbackSettingsPanel";
import { TenantSwitcher } from "@/components/admin/TenantSwitcher";
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
    <div className="flex items-center gap-1 sm:gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommandPalette}
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

      <ThemeToggle />
      <LanguageSwitcher />
      <TenantSwitcher />

      <Suspense fallback={null}>
        <DependencyHealthBadge />
      </Suspense>

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex" aria-label="Configurações de acessibilidade">
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

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex" aria-label="Configurações de feedback">
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
