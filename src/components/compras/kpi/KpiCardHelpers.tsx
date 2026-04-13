import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { cn } from "@/lib/utils";
import type { KpiColor } from "./kpiColorClasses";
import { colorClasses } from "./kpiColorClasses";

// Animated counter component
export const AnimatedCounter = ({ 
  value, 
  className,
  duration = 1.5 
}: { 
  value: number; 
  className?: string;
  duration?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={className}>
      {displayValue.toLocaleString('pt-BR')}
    </span>
  );
};

// Progress ring for targets
export const ProgressRing = ({ 
  progress, 
  size = 40, 
  strokeWidth = 3,
  color 
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  color: KpiColor;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const colors = colorClasses[color];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={colors.text}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ 
            strokeDashoffset: circumference - (progress / 100) * circumference 
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
        {Math.round(progress)}%
      </span>
    </div>
  );
};
