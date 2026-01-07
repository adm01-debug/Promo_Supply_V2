import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUndoStore } from '@/stores/undoStore';
import { useGlobalUndo } from '@/hooks/useGlobalUndo';
import { cn } from '@/lib/utils';

interface UndoIndicatorProps {
  className?: string;
  showLabels?: boolean;
}

export function UndoIndicator({ className, showLabels = false }: UndoIndicatorProps) {
  const { actions, redoStack } = useUndoStore();
  const { undo, redo, canUndo, canRedo } = useGlobalUndo();

  const hasUndo = canUndo();
  const hasRedo = canRedo();

  if (!hasUndo && !hasRedo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          "flex items-center gap-1 bg-background/95 backdrop-blur-sm border rounded-lg p-1 shadow-lg",
          className
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={!hasUndo}
              className="h-8 px-2"
            >
              <Undo2 className="w-4 h-4" />
              {showLabels && <span className="ml-1 text-xs">Desfazer</span>}
              {hasUndo && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({actions.length})
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Desfazer (Ctrl+Z)</p>
            {actions[0] && (
              <p className="text-xs text-muted-foreground">
                {actions[0].description}
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={!hasRedo}
              className="h-8 px-2"
            >
              <Redo2 className="w-4 h-4" />
              {showLabels && <span className="ml-1 text-xs">Refazer</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Refazer (Ctrl+Shift+Z)</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </AnimatePresence>
  );
}

// Floating version for mobile
export function FloatingUndoIndicator() {
  const { canUndo, canRedo } = useGlobalUndo();

  if (!canUndo() && !canRedo()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 left-4 z-40 md:hidden"
    >
      <UndoIndicator />
    </motion.div>
  );
}
