import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";

export type KpiColor = 'emerald' | 'orange' | 'blue' | 'purple' | 'green' | 'cyan' | 'red' | 'indigo' | 'teal';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: KpiColor;
  subtitle?: string;
  highlight?: boolean;
  index?: number;
}

// Using semantic tokens from design system (index.css)
const colorClasses: Record<KpiColor, { bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    bg: 'bg-[hsl(var(--kpi-emerald-bg))]',
    text: 'text-[hsl(var(--kpi-emerald))]',
    border: 'border-[hsl(var(--kpi-emerald)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-emerald)/0.2)]',
  },
  orange: {
    bg: 'bg-[hsl(var(--kpi-orange-bg))]',
    text: 'text-[hsl(var(--kpi-orange))]',
    border: 'border-[hsl(var(--kpi-orange)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-orange)/0.2)]',
  },
  blue: {
    bg: 'bg-[hsl(var(--kpi-blue-bg))]',
    text: 'text-[hsl(var(--kpi-blue))]',
    border: 'border-[hsl(var(--kpi-blue)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-blue)/0.2)]',
  },
  purple: {
    bg: 'bg-[hsl(var(--kpi-purple-bg))]',
    text: 'text-[hsl(var(--kpi-purple))]',
    border: 'border-[hsl(var(--kpi-purple)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-purple)/0.2)]',
  },
  green: {
    bg: 'bg-[hsl(var(--kpi-green-bg))]',
    text: 'text-[hsl(var(--kpi-green))]',
    border: 'border-[hsl(var(--kpi-green)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-green)/0.2)]',
  },
  cyan: {
    bg: 'bg-[hsl(var(--kpi-cyan-bg))]',
    text: 'text-[hsl(var(--kpi-cyan))]',
    border: 'border-[hsl(var(--kpi-cyan)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-cyan)/0.2)]',
  },
  red: {
    bg: 'bg-[hsl(var(--kpi-red-bg))]',
    text: 'text-[hsl(var(--kpi-red))]',
    border: 'border-[hsl(var(--kpi-red)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-red)/0.2)]',
  },
  indigo: {
    bg: 'bg-[hsl(var(--kpi-indigo-bg))]',
    text: 'text-[hsl(var(--kpi-indigo))]',
    border: 'border-[hsl(var(--kpi-indigo)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-indigo)/0.2)]',
  },
  teal: {
    bg: 'bg-[hsl(var(--kpi-teal-bg))]',
    text: 'text-[hsl(var(--kpi-teal))]',
    border: 'border-[hsl(var(--kpi-teal)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-teal)/0.2)]',
  },
};

export const KpiCard = ({ title, value, icon: Icon, color, subtitle, highlight, index = 0 }: KpiCardProps) => {
  const colors = colorClasses[color];
  
  // Extract numeric value for animation if it's a number
  const numericValue = typeof value === 'number' ? value : null;
  const animatedNumber = useAnimatedValue(numericValue ?? 0, { stiffness: 50, damping: 20 });
  
  // Format the display value
  const displayValue = numericValue !== null 
    ? animatedNumber.toLocaleString('pt-BR')
    : value;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut"
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={cn(
        "relative rounded-lg border bg-card text-card-foreground shadow-sm p-3 md:p-4 group cursor-default",
        "transition-shadow duration-300 hover:shadow-lg",
        colors.border,
        colors.glow,
        highlight && "ring-2 ring-destructive/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          <motion.p 
            className={cn("text-lg md:text-2xl font-bold truncate", colors.text)}
            key={String(value)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {displayValue}
          </motion.p>
          {subtitle && (
            <motion.p 
              className="text-[10px] md:text-xs text-muted-foreground truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        <motion.div 
          className={cn("p-1.5 md:p-2 rounded-lg shrink-0", colors.bg)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Icon className={cn("w-4 h-4 md:w-5 md:h-5", colors.text)} />
        </motion.div>
      </div>
      
      {highlight && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-destructive/50 pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};
