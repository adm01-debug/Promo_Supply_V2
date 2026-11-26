import React from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EliteFormFieldProps {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  error?: string;
  description?: string;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Molecule: EliteFormField
 * Combines Atom (Label, Input) into a cohesive unit with animated error states.
 */
export const EliteFormField: React.FC<EliteFormFieldProps> = ({
  label,
  id,
  type = "text",
  placeholder,
  error,
  description,
  className,
  ...props
}) => {
  return (
    <motion.div 
      className={cn("space-y-2 w-full", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
        {label}
      </Label>
      
      <div className="relative group">
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          className={cn(
            "bg-muted/30 border-border/50 focus:bg-background transition-all duration-300",
            "group-hover:border-primary/50",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          {...props}
        />
        
        {/* Animated focus border */}
        <motion.div 
          className="absolute bottom-0 left-0 h-[2px] bg-primary"
          initial={{ width: 0 }}
          whileFocus={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {description && !error && (
        <p className="text-[10px] text-muted-foreground px-1">{description}</p>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-[10px] font-medium text-destructive px-1"
        >
          {error}
        </motion.p>
      )}
    </motion.div>
  );
};
