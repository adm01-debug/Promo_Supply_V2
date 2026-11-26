import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show when page is scrolled down more than 400px
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    haptics.medium();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-20 md:bottom-8 right-6 z-50 pointer-events-none"
        >
          <Button
            size="icon"
            onClick={scrollToTop}
            className={cn(
              "h-12 w-12 rounded-2xl pointer-events-auto",
              "bg-primary/90 text-primary-foreground shadow-xl shadow-primary/30",
              "hover:bg-primary hover:scale-110 active:scale-90 transition-all duration-300",
              "border border-white/10 backdrop-blur-md"
            )}
            aria-label="Voltar ao topo"
          >
            <ChevronUp className="h-6 w-6 animate-bounce-gentle" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
