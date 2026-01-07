import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
}

export function ProgressIndicator({
  steps,
  currentStep,
  className,
  orientation = "horizontal",
  size = "md"
}: ProgressIndicatorProps) {
  const isVertical = orientation === "vertical";

  const sizeClasses = {
    sm: { circle: "w-6 h-6", icon: "w-3 h-3", text: "text-xs", line: "w-0.5 h-8" },
    md: { circle: "w-8 h-8", icon: "w-4 h-4", text: "text-sm", line: "w-1 h-12" },
    lg: { circle: "w-10 h-10", icon: "w-5 h-5", text: "text-base", line: "w-1 h-16" }
  }[size];

  return (
    <div
      className={cn(
        "flex",
        isVertical ? "flex-col" : "flex-row items-center justify-between",
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center",
              isVertical ? "flex-row gap-4" : "flex-col gap-2",
              !isVertical && index < steps.length - 1 && "flex-1"
            )}
          >
            {/* Step circle and connector */}
            <div className={cn("flex items-center", isVertical ? "flex-col" : "flex-row w-full")}>
              {/* Circle */}
              <motion.div
                className={cn(
                  "rounded-full flex items-center justify-center shrink-0 transition-colors",
                  sizeClasses.circle,
                  isCompleted && "bg-success text-success-foreground",
                  isCurrent && "bg-primary text-primary-foreground",
                  isPending && "bg-muted text-muted-foreground border-2 border-border"
                )}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle2 className={sizeClasses.icon} />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className={sizeClasses.icon} />
                  </motion.div>
                ) : (
                  <span className={cn("font-medium", sizeClasses.text)}>
                    {index + 1}
                  </span>
                )}
              </motion.div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "bg-border relative",
                    isVertical ? sizeClasses.line : "h-0.5 flex-1 mx-2"
                  )}
                >
                  <motion.div
                    className={cn(
                      "absolute bg-success",
                      isVertical ? "w-full left-0 top-0" : "h-full left-0 top-0"
                    )}
                    initial={isVertical ? { height: "0%" } : { width: "0%" }}
                    animate={
                      isCompleted
                        ? isVertical
                          ? { height: "100%" }
                          : { width: "100%" }
                        : isVertical
                        ? { height: "0%" }
                        : { width: "0%" }
                    }
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
              )}
            </div>

            {/* Label */}
            <div className={cn(isVertical ? "flex-1" : "text-center", "min-w-0")}>
              <p
                className={cn(
                  "font-medium truncate",
                  sizeClasses.text,
                  isCompleted && "text-success",
                  isCurrent && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Circular progress indicator
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  label?: string;
  color?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  className,
  showValue = true,
  label,
  color = "hsl(var(--primary))"
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold">{Math.round(percentage)}%</span>
          {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
        </div>
      )}
    </div>
  );
}

// Goal progress bar
interface GoalProgressProps {
  current: number;
  goal: number;
  label?: string;
  className?: string;
  showMilestones?: boolean;
}

export function GoalProgress({
  current,
  goal,
  label,
  className,
  showMilestones = true
}: GoalProgressProps) {
  const percentage = Math.min((current / goal) * 100, 100);
  const milestones = [25, 50, 75, 100];

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">
            {current.toLocaleString()} / {goal.toLocaleString()}
          </span>
        </div>
      )}
      
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* Milestones */}
        {showMilestones && milestones.map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-px bg-background/50"
            style={{ left: `${milestone}%` }}
          />
        ))}
        
        {/* Progress */}
        <motion.div
          className={cn(
            "h-full rounded-full",
            percentage >= 100 ? "bg-success" : "bg-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        
        {/* Glow effect when complete */}
        {percentage >= 100 && (
          <motion.div
            className="absolute inset-0 bg-success/30 rounded-full"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>

      {/* Milestone labels */}
      {showMilestones && (
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          {milestones.map((milestone) => (
            <span
              key={milestone}
              className={cn(
                percentage >= milestone && "text-success font-medium"
              )}
            >
              {milestone}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
