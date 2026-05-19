import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  ZoomIn,
  ZoomOut,
  Type,
  Contrast,
  MousePointer2,
  Keyboard,
  Check,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  type AccessibilitySettings,
  defaultSettings,
  ACCESSIBILITY_STORAGE_KEY,
  getInitialAccessibilitySettings,
} from './accessibilityHelpers';
import { AccessibilityStyles } from './AccessibilityStyles';

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  announceToScreenReader: (message: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider = React.forwardRef<HTMLDivElement, AccessibilityProviderProps>(({ children }, _ref) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(getInitialAccessibilitySettings);

  useEffect(() => {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));

    const root = document.documentElement;

    root.style.fontSize = `${settings.fontSize}%`;
    root.style.setProperty('--line-height', settings.lineSpacing.toString());
    root.style.setProperty('--letter-spacing', `${settings.letterSpacing}em`);

    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('reduced-motion', settings.reducedMotion);
    root.classList.toggle('large-pointer', settings.largePointer);
    root.classList.toggle('focus-highlight', settings.focusHighlight);
    root.classList.toggle('dyslexia-font', settings.dyslexiaFont);
    root.classList.toggle('screen-reader-mode', settings.screenReaderMode);
    root.setAttribute('data-color-blind', settings.colorBlindMode);
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, resetSettings, announceToScreenReader }}>
      {children}
      <AccessibilityStyles settings={settings} />
    </AccessibilityContext.Provider>
  );
});
AccessibilityProvider.displayName = 'AccessibilityProvider';

// AccessibilityStyles extracted to ./AccessibilityStyles.tsx

// ============================================
// Accessibility Panel
// ============================================

export const AccessibilityPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings, announceToScreenReader } = useAccessibility();
  const [open, setOpen] = useState(false);

  const handleChange = (key: keyof AccessibilitySettings, value: string | number | boolean) => {
    updateSettings({ [key]: value });
    announceToScreenReader(`${key} alterado para ${value}`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 left-4 z-50 rounded-full shadow-lg"
          aria-label="Abrir configurações de acessibilidade"
        >
          <Eye className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Acessibilidade
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Font Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Type className="w-4 h-4" />
                Tamanho do texto
              </label>
              <span className="text-sm text-muted-foreground">{settings.fontSize}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleChange('fontSize', Math.max(80, settings.fontSize - 10))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Slider
                value={[settings.fontSize]}
                onValueChange={([v]) => handleChange('fontSize', v)}
                min={80}
                max={150}
                step={10}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleChange('fontSize', Math.min(150, settings.fontSize + 10))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Line Spacing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Espaçamento entre linhas</label>
              <span className="text-sm text-muted-foreground">{settings.lineSpacing}</span>
            </div>
            <Slider
              value={[settings.lineSpacing]}
              onValueChange={([v]) => handleChange('lineSpacing', v)}
              min={1}
              max={2.5}
              step={0.1}
            />
          </div>

          {/* Letter Spacing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Espaçamento entre letras</label>
              <span className="text-sm text-muted-foreground">{settings.letterSpacing}em</span>
            </div>
            <Slider
              value={[settings.letterSpacing]}
              onValueChange={([v]) => handleChange('letterSpacing', v)}
              min={0}
              max={0.2}
              step={0.02}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <ToggleSetting
              icon={<Contrast className="w-4 h-4" />}
              label="Alto contraste"
              description="Aumenta o contraste das cores"
              checked={settings.highContrast}
              onChange={(v) => handleChange('highContrast', v)}
            />

            <ToggleSetting
              icon={<EyeOff className="w-4 h-4" />}
              label="Reduzir movimento"
              description="Desativa animações"
              checked={settings.reducedMotion}
              onChange={(v) => handleChange('reducedMotion', v)}
            />

            <ToggleSetting
              icon={<MousePointer2 className="w-4 h-4" />}
              label="Ponteiro grande"
              description="Aumenta o tamanho do cursor"
              checked={settings.largePointer}
              onChange={(v) => handleChange('largePointer', v)}
            />

            <ToggleSetting
              icon={<Keyboard className="w-4 h-4" />}
              label="Destaque de foco"
              description="Destaca elemento focado"
              checked={settings.focusHighlight}
              onChange={(v) => handleChange('focusHighlight', v)}
            />

            <ToggleSetting
              icon={<Type className="w-4 h-4" />}
              label="Fonte para dislexia"
              description="Usa fonte OpenDyslexic"
              checked={settings.dyslexiaFont}
              onChange={(v) => handleChange('dyslexiaFont', v)}
            />

            <ToggleSetting
              icon={<Volume2 className="w-4 h-4" />}
              label="Leitor de tela"
              description="Otimiza para leitores de tela"
              checked={settings.screenReaderMode}
              onChange={(v) => handleChange('screenReaderMode', v)}
            />
          </div>

          {/* Color Blind Mode */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Daltonismo</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'none', label: 'Nenhum' },
                { value: 'protanopia', label: 'Protanopia' },
                { value: 'deuteranopia', label: 'Deuteranopia' },
                { value: 'tritanopia', label: 'Tritanopia' }
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={settings.colorBlindMode === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChange('colorBlindMode', option.value)}
                  className="w-full"
                >
                  {settings.colorBlindMode === option.value && (
                    <Check className="w-3 h-3 mr-1" />
                  )}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Reset button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={resetSettings}
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar padrões
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ============================================
// Toggle Setting Component
// ============================================

interface ToggleSettingProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({
  icon,
  label,
  description,
  checked,
  onChange
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

// ============================================
// Skip to Content Link
// ============================================

export const SkipToContent: React.FC<{ targetId?: string }> = ({ 
  targetId = 'main-content' 
}) => (
  <a
    href={`#${targetId}`}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg"
  >
    Pular para o conteúdo principal
  </a>
);

// ============================================
// Live Region for announcements
// ============================================

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  message, 
  politeness = 'polite' 
}) => (
  <div
    role="status"
    aria-live={politeness}
    aria-atomic="true"
    className="sr-only"
  >
    {message}
  </div>
);

// ============================================
// Focus Trap for modals
// ============================================

export const useFocusTrap = (active: boolean, containerRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, containerRef]);
};

export default AccessibilityProvider;
