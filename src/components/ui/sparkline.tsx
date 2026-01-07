import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
  animate?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "hsl(var(--primary))",
  showArea = true,
  showDots = false,
  animate = true,
  className
}: SparklineProps) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return { line: "", area: "" };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y };
    });

    // Create smooth curve using cubic bezier
    let line = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      
      line += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }

    // Area path
    const area = `${line} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { line, area, points };
  }, [data, width, height]);

  const trend = useMemo(() => {
    if (data.length < 2) return "neutral";
    const first = data[0];
    const last = data[data.length - 1];
    if (last > first) return "up";
    if (last < first) return "down";
    return "neutral";
  }, [data]);

  const trendColor = useMemo(() => {
    if (trend === "up") return "hsl(var(--success))";
    if (trend === "down") return "hsl(var(--destructive))";
    return color;
  }, [trend, color]);

  if (!data || data.length < 2) {
    return (
      <div 
        className={cn("flex items-center justify-center bg-muted/30 rounded", className)}
        style={{ width, height }}
      >
        <span className="text-[8px] text-muted-foreground">Sem dados</span>
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
    >
      {/* Gradient definition */}
      <defs>
        <linearGradient id={`sparkline-gradient-${data.join("-")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={trendColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {showArea && pathData.area && (
        <motion.path
          d={pathData.area}
          fill={`url(#sparkline-gradient-${data.join("-")})`}
          initial={animate ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={pathData.line}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Dots */}
      {showDots && pathData.points && pathData.points.map((point, index) => (
        <motion.circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={2}
          fill={trendColor}
          initial={animate ? { scale: 0, opacity: 0 } : undefined}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 + index * 0.05, duration: 0.2 }}
        />
      ))}

      {/* End dot (always visible) */}
      {pathData.points && (
        <motion.circle
          cx={pathData.points[pathData.points.length - 1].x}
          cy={pathData.points[pathData.points.length - 1].y}
          r={3}
          fill={trendColor}
          initial={animate ? { scale: 0 } : undefined}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
        />
      )}
    </svg>
  );
}

// Mini sparkline for inline use
export function MiniSparkline({ 
  data, 
  className 
}: { 
  data: number[]; 
  className?: string;
}) {
  return (
    <Sparkline
      data={data}
      width={48}
      height={16}
      showArea={false}
      className={className}
    />
  );
}
