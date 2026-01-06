import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  className?: string;
  variant?: 'table' | 'cards' | 'dashboard' | 'form';
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/60',
        className
      )}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-fade-in">
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
        <div key={i} className="flex gap-4 py-3 border-b border-border/50">
          <SkeletonPulse className="h-4 w-8" />
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-8 w-8 rounded-full" />
          </div>
          <SkeletonPulse className="h-8 w-20" />
          <SkeletonPulse className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <SkeletonPulse className="h-8 w-48" />
          <SkeletonPulse className="h-4 w-32" />
        </div>
        <SkeletonPulse className="h-10 w-32" />
      </div>

      {/* KPI Cards */}
      <CardsSkeleton cards={4} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-lg border bg-card space-y-4">
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="h-48 w-full" />
        </div>
        <div className="p-6 rounded-lg border bg-card space-y-4">
          <SkeletonPulse className="h-5 w-32" />
          <SkeletonPulse className="h-48 w-full" />
        </div>
      </div>

      {/* Table */}
      <div className="p-6 rounded-lg border bg-card">
        <SkeletonPulse className="h-5 w-40 mb-4" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <SkeletonPulse className="h-10 w-24" />
        <SkeletonPulse className="h-10 w-24" />
      </div>
    </div>
  );
}

export function PageSkeleton({ className, variant = 'dashboard' }: PageSkeletonProps) {
  return (
    <div className={cn('', className)}>
      {variant === 'table' && <TableSkeleton />}
      {variant === 'cards' && <CardsSkeleton />}
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'form' && <FormSkeleton />}
    </div>
  );
}

export default PageSkeleton;
