import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { Keyboard, Navigation, FileText, Search } from "lucide-react";

interface SkipLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { 
    href: "#main-content", 
    label: "Pular para o conteúdo principal",
    icon: <FileText className="w-4 h-4" />,
    shortcut: "Alt+1"
  },
  { 
    href: "#main-navigation", 
    label: "Pular para a navegação",
    icon: <Navigation className="w-4 h-4" />,
    shortcut: "Alt+2"
  },
  { 
    href: "#search", 
    label: "Pular para a busca",
    icon: <Search className="w-4 h-4" />,
    shortcut: "Alt+3"
  },
];

export const SkipLinks = ({ links = defaultLinks }: SkipLinksProps) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const handleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedIndex(null);
  }, []);

  return (
    <nav 
      aria-label="Links de navegação rápida"
      className="skip-links-container"
    >
      <AnimatePresence>
        {focusedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9998]"
          />
        )}
      </AnimatePresence>
      
      <ul className="skip-links flex flex-col gap-2">
        {links.map((link, index) => (
          <li key={index}>
            <a
              href={link.href}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              className={cn(
                // Hidden by default
                "sr-only focus:not-sr-only",
                // Position when focused
                "focus:fixed focus:top-4 focus:left-4 focus:z-[9999]",
                // Styling
                "focus:flex focus:items-center focus:gap-3",
                "focus:px-5 focus:py-3 focus:rounded-xl",
                "focus:bg-gradient-to-r focus:from-primary focus:to-primary/90",
                "focus:text-primary-foreground focus:font-medium",
                // Effects
                "focus:shadow-2xl focus:shadow-primary/25",
                "focus:outline-none focus:ring-4 focus:ring-primary/30",
                // Animation
                "focus:animate-in focus:slide-in-from-top-4 focus:fade-in",
                "focus:duration-300"
              )}
              style={{
                top: focusedIndex === index ? `${1 + index * 3.5}rem` : undefined,
              }}
            >
              {link.icon && (
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-foreground/20">
                  {link.icon}
                </span>
              )}
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{link.label}</span>
                {link.shortcut && (
                  <span className="text-xs opacity-75">
                    Atalho: {link.shortcut}
                  </span>
                )}
              </span>
              <Keyboard className="w-4 h-4 ml-auto opacity-75" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
