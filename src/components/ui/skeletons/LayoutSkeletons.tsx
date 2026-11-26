import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ShimmerSkeleton, SkeletonLoadingIndicator } from "./SkeletonPrimitives";

// Dashboard KPI Skeleton - matches KpiCard layout
export const KPICardSkeleton = () => (
  <motion.div 
    className="rounded-xl border bg-card p-5 space-y-3"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <ShimmerSkeleton className="h-3 w-20" />
        <ShimmerSkeleton className="h-8 w-24" />
        <div className="flex items-center gap-2 pt-1">
          <ShimmerSkeleton className="h-4 w-4 rounded-full" />
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
      </div>
      <ShimmerSkeleton className="h-12 w-12 rounded-xl" />
    </div>
    <ShimmerSkeleton className="h-1 w-full rounded-full" />
  </motion.div>
);

// Dashboard Grid Skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-10 w-32" />
        <ShimmerSkeleton className="h-10 w-10 rounded-lg" />
      </div>
    </div>
    <ShimmerSkeleton className="h-12 w-full rounded-lg" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
          <KPICardSkeleton />
        </motion.div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <motion.div key={i} className="rounded-xl border bg-card p-6 space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 + i * 0.05 }}>
          <div className="flex items-center justify-between">
            <ShimmerSkeleton className="h-5 w-32" />
            <ShimmerSkeleton className="h-8 w-24 rounded-md" />
          </div>
          <ShimmerSkeleton className="h-[200px] w-full rounded-lg" />
        </motion.div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div className="lg:col-span-2 rounded-xl border bg-card p-6 space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.25 }}>
        <ShimmerSkeleton className="h-5 w-40" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <ShimmerSkeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <ShimmerSkeleton className="h-4 w-3/4" />
                <ShimmerSkeleton className="h-3 w-1/2" />
              </div>
              <ShimmerSkeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </motion.div>
      <motion.div className="rounded-xl border bg-card p-6 space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.3 }}>
        <ShimmerSkeleton className="h-5 w-32" />
        <ShimmerSkeleton className="h-[180px] w-full rounded-lg" />
      </motion.div>
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
  <motion.div className="rounded-xl border bg-card overflow-hidden" initial={{ opacity: 0, scale: 0.995 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
    <div className="border-b p-4 flex items-center justify-between gap-4">
      <ShimmerSkeleton className="h-10 w-64 rounded-md" />
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-10 w-24 rounded-md" />
        <ShimmerSkeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
    <div className="border-b bg-muted/30 p-4">
      <div className="flex gap-4">
        <ShimmerSkeleton className="h-4 w-4 rounded" />
        {[...Array(columns)].map((_, i) => (<ShimmerSkeleton key={i} className="h-4 flex-1" />))}
      </div>
    </div>
    {[...Array(rows)].map((_, rowIndex) => (
      <motion.div key={rowIndex} className={cn("p-4 flex gap-4 items-center", rowIndex !== rows - 1 && "border-b")} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15, delay: rowIndex * 0.02 }}>
        <ShimmerSkeleton className="h-4 w-4 rounded" />
        {[...Array(columns)].map((_, colIndex) => (
          <ShimmerSkeleton key={colIndex} className={cn("h-4 flex-1", colIndex === 0 && "max-w-[120px]", colIndex === columns - 1 && "max-w-[80px]")} />
        ))}
      </motion.div>
    ))}
    <div className="border-t p-4 flex items-center justify-between">
      <ShimmerSkeleton className="h-4 w-32" />
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-8 w-8 rounded-md" />
        <ShimmerSkeleton className="h-8 w-8 rounded-md" />
        <ShimmerSkeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  </motion.div>
);

// Kanban Skeleton
export const KanbanSkeleton = ({ columns = 6 }: { columns?: number }) => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {[...Array(columns)].map((_, colIndex) => (
      <motion.div key={colIndex} className="min-w-[300px] rounded-xl border bg-card p-4 space-y-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: colIndex * 0.05 }}>
        <div className="flex items-center gap-2 pb-2 border-b">
          <ShimmerSkeleton className="h-3 w-3 rounded-full" />
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-5 w-8 rounded-full ml-auto" />
        </div>
        {[...Array(3)].map((_, cardIndex) => (
          <motion.div key={cardIndex} className="rounded-lg border bg-background p-4 space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: colIndex * 0.05 + cardIndex * 0.02 }}>
            <div className="flex items-start justify-between">
              <ShimmerSkeleton className="h-4 w-16 rounded" />
              <ShimmerSkeleton className="h-5 w-5 rounded" />
            </div>
            <ShimmerSkeleton className="h-5 w-full" />
            <ShimmerSkeleton className="h-4 w-3/4" />
            <div className="flex gap-2 pt-2">
              <ShimmerSkeleton className="h-6 w-16 rounded-full" />
              <ShimmerSkeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <ShimmerSkeleton className="h-6 w-6 rounded-full" />
              <ShimmerSkeleton className="h-3 w-24" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
  <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
    <div className="space-y-2 pb-4 border-b">
      <ShimmerSkeleton className="h-6 w-48" />
      <ShimmerSkeleton className="h-4 w-64" />
    </div>
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <motion.div key={i} className="space-y-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.05 }}>
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-10 w-full rounded-md" />
        </motion.div>
      ))}
    </div>
    <div className="flex gap-3 pt-4 border-t">
      <ShimmerSkeleton className="h-10 w-24 rounded-md" />
      <ShimmerSkeleton className="h-10 w-20 rounded-md" />
    </div>
  </motion.div>
);

// Full Page Loading Skeleton
export const FullPageSkeleton = ({ title = "Carregando..." }: { title?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
    <motion.div className="flex flex-col items-center gap-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <div className="relative">
        <ShimmerSkeleton className="h-16 w-16 rounded-2xl" variant="glow" />
        <motion.div className="absolute inset-0 rounded-2xl border-2 border-primary/30" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
      </div>
      <SkeletonLoadingIndicator message={title} />
    </motion.div>
  </div>
);
