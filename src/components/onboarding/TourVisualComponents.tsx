import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PartyPopper, Rocket, Star } from "lucide-react";
import { motion } from "framer-motion";

// Confetti animation component
export const Confetti = () => {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 2,
    color: [
      'hsl(var(--primary))',
      'hsl(var(--success))',
      'hsl(var(--warning))',
      'hsl(var(--info))',
    ][Math.floor(Math.random() * 4)],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[10001] overflow-hidden">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ x: `${piece.x}vw`, y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: 720, opacity: 0 }}
          transition={{ duration: piece.duration, delay: piece.delay, ease: 'linear' }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
};

// Spotlight effect component with cutout
export const Spotlight = ({ rect, highlight = "primary" }: { rect: DOMRect | null; highlight?: string }) => {
  if (!rect) return null;
  const padding = 8;
  const borderRadius = 12;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed z-[9999] pointer-events-none rounded-xl border-2 border-primary"
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 30px hsl(var(--primary) / 0.5)`,
        borderRadius,
      }}
    >
      <motion.div
        animate={{
          boxShadow: [
            `0 0 15px hsl(var(--primary) / 0.4), inset 0 0 15px hsl(var(--primary) / 0.1)`,
            `0 0 30px hsl(var(--primary) / 0.6), inset 0 0 20px hsl(var(--primary) / 0.15)`,
            `0 0 15px hsl(var(--primary) / 0.4), inset 0 0 15px hsl(var(--primary) / 0.1)`,
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-xl"
      />
    </motion.div>
  );
};

// Step indicator dots
export const StepIndicators = ({ total, current, onStepClick }: { total: number; current: number; onStepClick: (index: number) => void }) => (
  <div className="flex items-center gap-2 justify-center">
    {Array.from({ length: total }, (_, i) => (
      <motion.button
        key={i}
        onClick={() => onStepClick(i)}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "h-2 rounded-full transition-all duration-300 cursor-pointer",
          i === current ? "w-6 bg-primary" : i < current ? "w-2 bg-primary/60" : "w-2 bg-muted-foreground/30"
        )}
      />
    ))}
  </div>
);

// Completion celebration modal
export const CompletionModal = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/80 backdrop-blur-md"
  >
    <Confetti />
    <motion.div
      initial={{ scale: 0.5, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', damping: 15 }}
      className="bg-card border rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 10 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center"
      >
        <PartyPopper className="w-10 h-10 text-primary-foreground" />
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-2xl font-bold mb-2">
        🎉 Tour Concluído!
      </motion.h2>

      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-muted-foreground mb-6">
        Você está pronto para explorar todas as funcionalidades do sistema. Boas compras!
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex items-center justify-center gap-2 mb-6">
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.6 + i * 0.1, type: 'spring' }}>
            <Star className="w-6 h-6 text-warning fill-yellow-500" />
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Button onClick={onClose} size="lg" className="gap-2">
          <Rocket className="w-4 h-4" />
          Começar a Usar
        </Button>
      </motion.div>
    </motion.div>
  </motion.div>
);
