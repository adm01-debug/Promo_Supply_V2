import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Smooth theme transition handler
  const handleThemeChange = (newTheme: string) => {
    // Add transition class before changing theme
    document.documentElement.classList.remove('theme-transition-disabled');
    
    // Change theme
    setTheme(newTheme);
    
    // Optional: Add a subtle animation effect
    document.documentElement.style.setProperty('--theme-transition', '1');
    setTimeout(() => {
      document.documentElement.style.removeProperty('--theme-transition');
    }, 300);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative w-9 h-9">
        <span className="sr-only">Carregando tema</span>
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative w-9 h-9 overflow-hidden rounded-xl hover:bg-primary/5 transition-all duration-300"
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="moon"
                initial={{ y: -20, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 20, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="absolute"
              >
                <Moon className="h-4 w-4 text-warning" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ y: 20, opacity: 0, rotate: 90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: -20, opacity: 0, rotate: -90 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="absolute"
              >
                <Sun className="h-4 w-4 text-warning" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-popover border border-border min-w-[140px]"
        sideOffset={8}
      >
        <DropdownMenuItem 
          onClick={() => handleThemeChange('light')} 
          className={cn(
            "cursor-pointer gap-2",
            theme === 'light' && "bg-accent"
          )}
        >
          <Sun className="h-4 w-4 text-warning" />
          <span>Claro</span>
          {theme === 'light' && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange('dark')} 
          className={cn(
            "cursor-pointer gap-2",
            theme === 'dark' && "bg-accent"
          )}
        >
          <Moon className="h-4 w-4 text-info" />
          <span>Escuro</span>
          {theme === 'dark' && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange('system')} 
          className={cn(
            "cursor-pointer gap-2",
            theme === 'system' && "bg-accent"
          )}
        >
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <span>Sistema</span>
          {theme === 'system' && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
