import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PageSkeletonProps {
  className?: string;
  variant?: 'table' | 'cards' | 'dashboard' | 'form' | 'detail' | 'list';
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted/60',
        className
      )}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
          repeatDelay: 0.5
        }}
      />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        <SkeletonPulse className="h-4 w-8" />
        <SkeletonPulse className="h-4 w-32" />
        <SkeletonPulse className="h-4 w-24" />
        <SkeletonPulse className="h-4 w-20" />
        <SkeletonPulse className="h-4 w-16" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div 
          key={i} 
          className="flex gap-4 py-3 border-b border-border/50"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
        >
          <SkeletonPulse className="h-4 w-8" />
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-16" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function CardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <motion.div 
          key={i} 
          className="p-5 rounded-xl border bg-card space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
        >
          <div className="flex items-center justify-between">
            <SkeletonPulse className="h-3 w-20" />
            <SkeletonPulse className="h-10 w-10 rounded-lg" />
          </div>
          <SkeletonPulse className="h-8 w-24" />
          <SkeletonPulse className="h-3 w-28" />
        </motion.div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <SkeletonPulse className="h-8 w-48" />
          <SkeletonPulse className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <SkeletonPulse className="h-10 w-10 rounded-lg" />
          <SkeletonPulse className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      <CardsSkeleton cards={4} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          className="p-6 rounded-xl border bg-card space-y-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="h-48 w-full rounded-lg" />
        </motion.div>
        <motion.div 
          className="p-6 rounded-xl border bg-card space-y-4"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="h-48 w-full rounded-lg" />
        </motion.div>
      </div>

      {/* Table */}
      <motion.div 
        className="p-6 rounded-xl border bg-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <SkeletonPulse className="h-5 w-40 mb-4" />
        <TableSkeleton rows={5} />
      </motion.div>
    </motion.div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: fields }).map((_, i) => (
        <motion.div 
          key={i} 
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.08 }}
        >
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-12 w-full rounded-lg" />
        </motion.div>
      ))}
      <motion.div 
        className="flex gap-3 pt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <SkeletonPulse className="h-10 w-24 rounded-lg" />
        <SkeletonPulse className="h-10 w-24 rounded-lg" />
      </motion.div>
    </motion.div>
  );
}

export function DetailSkeleton() {
  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <SkeletonPulse className="h-16 w-16 rounded-xl" />
        <div className="space-y-2 flex-1">
          <SkeletonPulse className="h-7 w-48" />
          <SkeletonPulse className="h-4 w-64" />
          <div className="flex gap-2 pt-1">
            <SkeletonPulse className="h-6 w-16 rounded-full" />
            <SkeletonPulse className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Content sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border bg-card space-y-4">
          <SkeletonPulse className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <SkeletonPulse className="h-4 w-24" />
                <SkeletonPulse className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-xl border bg-card space-y-4">
          <SkeletonPulse className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <SkeletonPulse className="h-4 w-24" />
                <SkeletonPulse className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: items }).map((_, i) => (
        <motion.div 
          key={i} 
          className="p-4 rounded-xl border bg-card flex items-center gap-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
        >
          <SkeletonPulse className="h-12 w-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-4 w-48" />
            <SkeletonPulse className="h-3 w-32" />
          </div>
          <SkeletonPulse className="h-8 w-20 rounded-lg" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function PageSkeleton({ className, variant = 'dashboard' }: PageSkeletonProps) {
  return (
    <div className={cn('', className)}>
      {variant === 'table' && <TableSkeleton />}
      {variant === 'cards' && <CardsSkeleton />}
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'form' && <FormSkeleton />}
      {variant === 'detail' && <DetailSkeleton />}
      {variant === 'list' && <ListSkeleton />}
    </div>
  );
}

export default PageSkeleton;
