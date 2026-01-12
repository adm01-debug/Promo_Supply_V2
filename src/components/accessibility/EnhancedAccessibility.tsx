import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  ZoomIn, 
  ZoomOut,
  Keyboard,
  MousePointer,
  Type,
  Contrast,
  Settings,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

// ============================================
// FOCUS TRAP COMPONENT
// ============================================
interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  returnFocusOnDeactivate?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  className,
  returnFocusOnDeactivate = true,
  initialFocus,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;

    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (initialFocus?.current) {
      initialFocus.current.focus();
    } else if (firstElement) {
      firstElement.focus();
    }

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

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      if (returnFocusOnDeactivate && previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, returnFocusOnDeactivate, initialFocus]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// ============================================
// LIVE ANNOUNCER FOR SCREEN READERS
// ============================================
interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

export const useAnnouncer = () => {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within AnnouncerProvider');
  }
  return context;
};

export const AnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 100);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 100);
    }
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      
      {/* Polite announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      
      {/* Assertive announcements */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
};

// ============================================
// SKIP TO CONTENT ENHANCED
// ============================================
interface SkipToContentProps {
  targets: Array<{
    id: string;
    label: string;
  }>;
}

export const SkipToContent: React.FC<SkipToContentProps> = ({ targets }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 z-[9999] p-4",
        "transform transition-transform duration-200",
        isVisible ? "translate-y-0" : "-translate-y-full"
      )}
    >
      <nav 
        className="bg-primary text-primary-foreground rounded-lg shadow-lg p-2"
        onFocus={() => setIsVisible(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsVisible(false);
          }
        }}
      >
        <ul className="flex flex-col gap-1">
          {targets.map((target) => (
            <li key={target.id}>
              <a
                href={`#${target.id}`}
                className={cn(
                  "block px-4 py-2 rounded-md",
                  "hover:bg-primary-foreground/20",
                  "focus:outline-none focus:ring-2 focus:ring-primary-foreground",
                  "transition-colors duration-200"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(target.id);
                  if (element) {
                    element.focus();
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                  setIsVisible(false);
                }}
              >
                {target.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

// ============================================
// ACCESSIBLE DIALOG
// ============================================
interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}) => {
  const titleId = `dialog-title-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const descId = description ? `dialog-desc-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <FocusTrap active={isOpen}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descId}
              className={cn(
                "fixed left-1/2 top-1/2 z-50 w-full",
                sizeClasses[size],
                "bg-card rounded-xl shadow-xl p-6"
              )}
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className={cn(
                  "absolute right-4 top-4 p-1 rounded-md",
                  "text-muted-foreground hover:text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                  "transition-colors"
                )}
                aria-label="Fechar diálogo"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title */}
              <h2 id={titleId} className="text-lg font-semibold mb-2">
                {title}
              </h2>

              {/* Description */}
              {description && (
                <p id={descId} className="text-muted-foreground text-sm mb-4">
                  {description}
                </p>
              )}

              {/* Content */}
              {children}
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================
// KEYBOARD NAVIGATION HELPER
// ============================================
interface KeyboardNavProps {
  children: React.ReactNode;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  className?: string;
}

export const KeyboardNav: React.FC<KeyboardNavProps> = ({
  children,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onEscape,
  className,
}) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onArrowUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onArrowDown?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onArrowLeft?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        onArrowRight?.();
        break;
      case 'Enter':
        onEnter?.();
        break;
      case 'Escape':
        onEscape?.();
        break;
    }
  }, [onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onEnter, onEscape]);

  return (
    <div onKeyDown={handleKeyDown} className={className}>
      {children}
    </div>
  );
};

// ============================================
// ACCESSIBILITY PREFERENCES PANEL
// ============================================
interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: number;
  focusIndicators: boolean;
  screenReaderOptimized: boolean;
}

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: AccessibilityPreferences;
  onPreferencesChange: (prefs: AccessibilityPreferences) => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isOpen,
  onClose,
  preferences,
  onPreferencesChange,
}) => {
  const updatePreference = <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    onPreferencesChange({ ...preferences, [key]: value });
  };

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Configurações de Acessibilidade"
      description="Personalize a experiência de acordo com suas necessidades"
      size="lg"
    >
      <div className="space-y-6">
        {/* Reduced Motion */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Reduzir Movimento</p>
              <p className="text-sm text-muted-foreground">
                Desativa animações e transições
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.reducedMotion}
            onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
            aria-label="Reduzir movimento"
          />
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Contrast className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Alto Contraste</p>
              <p className="text-sm text-muted-foreground">
                Aumenta o contraste das cores
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.highContrast}
            onCheckedChange={(checked) => updatePreference('highContrast', checked)}
            aria-label="Alto contraste"
          />
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Type className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Tamanho da Fonte</p>
              <p className="text-sm text-muted-foreground">
                Ajuste o tamanho do texto ({preferences.fontSize}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-13">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[preferences.fontSize]}
              onValueChange={([value]) => updatePreference('fontSize', value)}
              min={75}
              max={150}
              step={5}
              className="flex-1"
              aria-label="Tamanho da fonte"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Focus Indicators */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Indicadores de Foco</p>
              <p className="text-sm text-muted-foreground">
                Destaca elementos focados
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.focusIndicators}
            onCheckedChange={(checked) => updatePreference('focusIndicators', checked)}
            aria-label="Indicadores de foco"
          />
        </div>

        {/* Screen Reader Optimized */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Otimizado para Leitor de Tela</p>
              <p className="text-sm text-muted-foreground">
                Melhora a experiência com leitores de tela
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.screenReaderOptimized}
            onCheckedChange={(checked) => updatePreference('screenReaderOptimized', checked)}
            aria-label="Otimizado para leitor de tela"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onClose}>
            <Check className="w-4 h-4 mr-2" />
            Salvar Preferências
          </Button>
        </div>
      </div>
    </AccessibleDialog>
  );
};

// ============================================
// ACCESSIBLE TABLE
// ============================================
interface AccessibleTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }>;
  caption?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function AccessibleTable<T extends Record<string, any>>({
  data,
  columns,
  caption,
  className,
  onRowClick,
}: AccessibleTableProps<T>) {
  const [focusedRow, setFocusedRow] = useState<number | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number, row: T) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onRowClick?.(row);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedRow(Math.min(index + 1, data.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedRow(Math.max(index - 1, 0));
        break;
    }
  }, [data.length, onRowClick]);

  return (
    <div className={cn("overflow-x-auto", className)} role="region" aria-label={caption || "Tabela de dados"}>
      <table className="w-full border-collapse">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}
        
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                scope="col"
                className="px-4 py-3 text-left text-sm font-semibold text-foreground"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => handleKeyDown(e, index, row)}
              onFocus={() => setFocusedRow(index)}
              onBlur={() => setFocusedRow(null)}
              className={cn(
                "border-b transition-colors",
                onRowClick && "cursor-pointer hover:bg-muted/50",
                focusedRow === index && "bg-primary/5 ring-2 ring-inset ring-primary"
              )}
              aria-selected={focusedRow === index}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-4 py-3 text-sm"
                >
                  {column.render 
                    ? column.render(row[column.key], row)
                    : String(row[column.key] ?? '')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// REDUCED MOTION HOOK
// ============================================
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
};

// ============================================
// ACCESSIBLE LOADING INDICATOR
// ============================================
interface LoadingIndicatorProps {
  isLoading: boolean;
  label?: string;
  className?: string;
}

export const AccessibleLoading: React.FC<LoadingIndicatorProps> = ({
  isLoading,
  label = "Carregando...",
  className,
}) => {
  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2", className)}
    >
      <motion.div
        className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};
