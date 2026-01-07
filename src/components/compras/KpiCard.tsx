import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'emerald' | 'orange' | 'blue' | 'purple' | 'green' | 'cyan' | 'red' | 'indigo' | 'teal';
  subtitle?: string;
  highlight?: boolean;
  index?: number;
}

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/20',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    border: 'border-orange-500/20',
    glow: 'group-hover:shadow-orange-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/20',
    glow: 'group-hover:shadow-blue-500/20',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    border: 'border-purple-500/20',
    glow: 'group-hover:shadow-purple-500/20',
  },
  green: {
    bg: 'bg-green-600/10',
    text: 'text-green-600',
    border: 'border-green-600/20',
    glow: 'group-hover:shadow-green-600/20',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-500',
    border: 'border-cyan-500/20',
    glow: 'group-hover:shadow-cyan-500/20',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    border: 'border-red-500/20',
    glow: 'group-hover:shadow-red-500/20',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-500',
    border: 'border-indigo-500/20',
    glow: 'group-hover:shadow-indigo-500/20',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-500',
    border: 'border-teal-500/20',
    glow: 'group-hover:shadow-teal-500/20',
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
        "rounded-lg border bg-card text-card-foreground shadow-sm p-4 group cursor-default",
        "transition-shadow duration-300 hover:shadow-lg",
        colors.border,
        colors.glow,
        highlight && "ring-2 ring-red-500/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <motion.p 
            className={cn("text-2xl font-bold", colors.text)}
            key={String(value)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {displayValue}
          </motion.p>
          {subtitle && (
            <motion.p 
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
        <motion.div 
          className={cn("p-2 rounded-lg", colors.bg)}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Icon className={cn("w-5 h-5", colors.text)} />
        </motion.div>
      </div>
      
      {highlight && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-red-500/50 pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};
