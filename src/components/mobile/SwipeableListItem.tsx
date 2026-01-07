import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Trash2, Edit, Eye, MoreHorizontal, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useMobileGestures';
import { useIsMobile } from '@/hooks/use-mobile';

export interface SwipeAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeableListItemProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onDelete?: () => void;
  onEdit?: () => void;
  onView?: () => void;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export function SwipeableListItem({
  children,
  leftActions,
  rightActions,
  onDelete,
  onEdit,
  onView,
  className,
  disabled = false,
  threshold = 80,
}: SwipeableListItemProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const { lightTap, error: hapticError, success: hapticSuccess } = useHapticFeedback();

  // Transform for action reveal
  const leftActionsOpacity = useTransform(x, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const rightActionsOpacity = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.5, 0]);
  const leftActionsScale = useTransform(x, [0, threshold], [0.8, 1]);
  const rightActionsScale = useTransform(x, [-threshold, 0], [1, 0.8]);

  // Default actions if specific handlers provided
  const defaultRightActions: SwipeAction[] = [];
  const defaultLeftActions: SwipeAction[] = [];

  if (onDelete) {
    defaultRightActions.push({
      id: 'delete',
      icon: <Trash2 className="w-5 h-5" />,
      label: 'Excluir',
      color: 'bg-destructive',
      onClick: () => setShowConfirmDelete(true),
    });
  }

  if (onEdit) {
    defaultLeftActions.push({
      id: 'edit',
      icon: <Edit className="w-5 h-5" />,
      label: 'Editar',
      color: 'bg-blue-500',
      onClick: onEdit,
    });
  }

  if (onView) {
    defaultLeftActions.push({
      id: 'view',
      icon: <Eye className="w-5 h-5" />,
      label: 'Ver',
      color: 'bg-primary',
      onClick: onView,
    });
  }

  const finalLeftActions = leftActions || defaultLeftActions;
  const finalRightActions = rightActions || defaultRightActions;

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Determine if swipe was strong enough
      const shouldOpen = Math.abs(offset) > threshold || Math.abs(velocity) > 500;

      if (shouldOpen) {
        if (offset > 0 && finalLeftActions.length > 0) {
          setIsOpen('left');
          lightTap();
        } else if (offset < 0 && finalRightActions.length > 0) {
          setIsOpen('right');
          lightTap();
        } else {
          setIsOpen(null);
        }
      } else {
        setIsOpen(null);
      }
    },
    [threshold, finalLeftActions.length, finalRightActions.length, lightTap]
  );

  const handleActionClick = (action: SwipeAction) => {
    lightTap();
    action.onClick();
    setIsOpen(null);
  };

  const handleConfirmDelete = () => {
    hapticSuccess();
    onDelete?.();
    setShowConfirmDelete(false);
    setIsOpen(null);
  };

  const handleCancelDelete = () => {
    hapticError();
    setShowConfirmDelete(false);
    setIsOpen(null);
  };

  const closeActions = () => {
    setIsOpen(null);
    setShowConfirmDelete(false);
  };

  // Only enable swipe on mobile
  if (!isMobile || disabled) {
    return <div className={className}>{children}</div>;
  }

  const actionWidth = 80;
  const openOffset = isOpen === 'left' 
    ? actionWidth * finalLeftActions.length 
    : isOpen === 'right' 
    ? -actionWidth * finalRightActions.length 
    : 0;

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Left actions (revealed on swipe right) */}
      <AnimatePresence>
        {finalLeftActions.length > 0 && (
          <motion.div
            className="absolute left-0 top-0 bottom-0 flex items-stretch"
            style={{ opacity: leftActionsOpacity, scale: leftActionsScale }}
          >
            {finalLeftActions.map((action, index) => (
              <motion.button
                key={action.id}
                className={cn(
                  'flex flex-col items-center justify-center text-white px-4 min-w-[80px]',
                  action.color
                )}
                onClick={() => handleActionClick(action)}
                whileTap={{ scale: 0.95 }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {action.icon}
                <span className="text-xs mt-1 font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right actions (revealed on swipe left) */}
      <AnimatePresence>
        {finalRightActions.length > 0 && (
          <motion.div
            className="absolute right-0 top-0 bottom-0 flex items-stretch"
            style={{ opacity: rightActionsOpacity, scale: rightActionsScale }}
          >
            {finalRightActions.map((action, index) => (
              <motion.button
                key={action.id}
                className={cn(
                  'flex flex-col items-center justify-center text-white px-4 min-w-[80px]',
                  action.color
                )}
                onClick={() => handleActionClick(action)}
                whileTap={{ scale: 0.95 }}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {action.icon}
                <span className="text-xs mt-1 font-medium">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            className="absolute inset-0 bg-destructive flex items-center justify-center gap-4 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-white font-medium">Confirmar exclusão?</span>
            <motion.button
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
              onClick={handleConfirmDelete}
              whileTap={{ scale: 0.9 }}
            >
              <Check className="w-5 h-5" />
            </motion.button>
            <motion.button
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
              onClick={handleCancelDelete}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <motion.div
        className="relative bg-card touch-pan-y"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ 
          left: finalRightActions.length > 0 ? -actionWidth * finalRightActions.length : 0, 
          right: finalLeftActions.length > 0 ? actionWidth * finalLeftActions.length : 0 
        }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: openOffset }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={isOpen ? closeActions : undefined}
      >
        {children}
      </motion.div>

      {/* Swipe hint indicator */}
      {!isOpen && (
        <motion.div
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1 }}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      )}
    </div>
  );
}

// Wrapper for table rows
interface SwipeableTableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onView?: () => void;
  className?: string;
}

export function SwipeableTableRow({
  children,
  onDelete,
  onEdit,
  onView,
  className,
}: SwipeableTableRowProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <tr className={className}>{children}</tr>;
  }

  return (
    <SwipeableListItem
      onDelete={onDelete}
      onEdit={onEdit}
      onView={onView}
      className={cn('block', className)}
    >
      <div className="flex items-center p-4 bg-card border-b">
        {children}
      </div>
    </SwipeableListItem>
  );
}
