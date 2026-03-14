import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX,
  ZoomIn,
  ZoomOut,
  Type,
  Contrast,
  MousePointer2,
  Keyboard,
  Settings,
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// ============================================
// MELHORIA: Advanced Accessibility Features
// Recursos avançados de acessibilidade WCAG 2.2 AAA
// ============================================

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  largePointer: boolean;
  focusHighlight: boolean;
  screenReaderMode: boolean;
  dyslexiaFont: boolean;
  lineSpacing: number;
  letterSpacing: number;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  textToSpeech: boolean;
  keyboardNavigation: boolean;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 100,
  highContrast: false,
  reducedMotion: false,
  largePointer: false,
  focusHighlight: true,
  screenReaderMode: false,
  dyslexiaFont: false,
  lineSpacing: 1.5,
  letterSpacing: 0,
  colorBlindMode: 'none',
  textToSpeech: false,
  keyboardNavigation: true
};

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
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem('accessibility-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion && !settings.reducedMotion) {
      setSettings(prev => ({ ...prev, reducedMotion: true }));
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    
    // Apply settings to document
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
    
    // Color blind filters
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

// ============================================
// Accessibility Styles Injector
// ============================================

const AccessibilityStyles = React.forwardRef<HTMLStyleElement, { settings: AccessibilitySettings }>(({ settings }, _ref) => {
  const styles = `
    ${settings.highContrast ? `
      .high-contrast {
        --background: 0 0% 0%;
        --foreground: 0 0% 100%;
        --card: 0 0% 5%;
        --card-foreground: 0 0% 100%;
        --primary: 60 100% 50%;
        --primary-foreground: 0 0% 0%;
      }
      .high-contrast * {
        border-color: white !important;
      }
    ` : ''}
    
    ${settings.reducedMotion ? `
      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    ` : ''}
    
    ${settings.largePointer ? `
      .large-pointer * {
        cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='black' stroke='white' stroke-width='1'%3E%3Cpath d='M5.65 2.1L19.85 12.6C20.45 13.05 20.2 14 19.45 14.1L12.35 15L9.25 21.5C8.95 22.1 8.05 22.05 7.8 21.4L2.25 3.65C2 2.95 2.75 2.35 3.4 2.65L5.65 2.1Z'/%3E%3C/svg%3E") 0 0, auto !important;
      }
    ` : ''}
    
    ${settings.focusHighlight ? `
      .focus-highlight *:focus {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 2px !important;
      }
      .focus-highlight *:focus:not(:focus-visible) {
        outline: none !important;
      }
      .focus-highlight *:focus-visible {
        outline: 3px solid hsl(var(--primary)) !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 6px hsl(var(--primary) / 0.2) !important;
      }
    ` : ''}
    
    ${settings.dyslexiaFont ? `
      .dyslexia-font * {
        font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif !important;
        letter-spacing: 0.05em !important;
        word-spacing: 0.1em !important;
      }
    ` : ''}
    
    ${settings.colorBlindMode !== 'none' ? `
      [data-color-blind="protanopia"] {
        filter: url('#protanopia-filter');
      }
      [data-color-blind="deuteranopia"] {
        filter: url('#deuteranopia-filter');
      }
      [data-color-blind="tritanopia"] {
        filter: url('#tritanopia-filter');
      }
    ` : ''}
    
    body {
      line-height: var(--line-height, 1.5);
      letter-spacing: var(--letter-spacing, 0);
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      {/* SVG filters for color blindness simulation */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/>
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/>
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/>
          </filter>
        </defs>
      </svg>
    </>
  );
});
AccessibilityStyles.displayName = 'AccessibilityStyles';

// ============================================
// Accessibility Panel
// ============================================

export const AccessibilityPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings, announceToScreenReader } = useAccessibility();
  const [open, setOpen] = useState(false);

  const handleChange = (key: keyof AccessibilitySettings, value: any) => {
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
