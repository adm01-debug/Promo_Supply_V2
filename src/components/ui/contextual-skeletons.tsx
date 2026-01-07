import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

// Base animated skeleton with enhanced shimmer
const ShimmerSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      "relative overflow-hidden rounded-md bg-muted",
      "before:absolute before:inset-0 before:-translate-x-full",
      "before:animate-[shimmer_2s_infinite]",
      "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
      className
    )} 
    {...props} 
  />
);

// Dashboard KPI Skeleton - matches KpiCard layout
export const KPICardSkeleton = () => (
  <motion.div 
    className="rounded-xl border bg-card p-5 space-y-3"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
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

// Dashboard Grid Skeleton - Full dashboard layout
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
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

    {/* Alert bar */}
    <ShimmerSkeleton className="h-12 w-full rounded-lg" />

    {/* KPIs Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <KPICardSkeleton />
        </motion.div>
      ))}
    </div>

    {/* Charts Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <motion.div 
          key={i}
          className="rounded-xl border bg-card p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
        >
          <div className="flex items-center justify-between">
            <ShimmerSkeleton className="h-5 w-32" />
            <ShimmerSkeleton className="h-8 w-24 rounded-md" />
          </div>
          <ShimmerSkeleton className="h-[200px] w-full rounded-lg" />
        </motion.div>
      ))}
    </div>

    {/* Bottom section */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <motion.div 
        className="lg:col-span-2 rounded-xl border bg-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
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
      <motion.div 
        className="rounded-xl border bg-card p-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <ShimmerSkeleton className="h-5 w-32" />
        <ShimmerSkeleton className="h-[180px] w-full rounded-lg" />
      </motion.div>
    </div>
  </div>
);

// Table Skeleton - matches DataTable layout
export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
  <motion.div 
    className="rounded-xl border bg-card overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {/* Toolbar */}
    <div className="border-b p-4 flex items-center justify-between gap-4">
      <ShimmerSkeleton className="h-10 w-64 rounded-md" />
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-10 w-24 rounded-md" />
        <ShimmerSkeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>

    {/* Table Header */}
    <div className="border-b bg-muted/30 p-4">
      <div className="flex gap-4">
        <ShimmerSkeleton className="h-4 w-4 rounded" />
        {[...Array(columns)].map((_, i) => (
          <ShimmerSkeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    
    {/* Table Rows */}
    {[...Array(rows)].map((_, rowIndex) => (
      <motion.div 
        key={rowIndex} 
        className={cn(
          "p-4 flex gap-4 items-center",
          rowIndex !== rows - 1 && "border-b"
        )}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: rowIndex * 0.03 }}
      >
        <ShimmerSkeleton className="h-4 w-4 rounded" />
        {[...Array(columns)].map((_, colIndex) => (
          <ShimmerSkeleton 
            key={colIndex} 
            className={cn(
              "h-4 flex-1",
              colIndex === 0 && "max-w-[120px]",
              colIndex === columns - 1 && "max-w-[80px]"
            )} 
          />
        ))}
      </motion.div>
    ))}

    {/* Pagination */}
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

// Kanban Skeleton - matches SolicitacaoKanban layout
export const KanbanSkeleton = ({ columns = 6 }: { columns?: number }) => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {[...Array(columns)].map((_, colIndex) => (
      <motion.div 
        key={colIndex} 
        className="min-w-[300px] rounded-xl border bg-card p-4 space-y-3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: colIndex * 0.05 }}
      >
        {/* Column header */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <ShimmerSkeleton className="h-3 w-3 rounded-full" />
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-5 w-8 rounded-full ml-auto" />
        </div>
        
        {/* Cards */}
        {[...Array(3)].map((_, cardIndex) => (
          <motion.div 
            key={cardIndex} 
            className="rounded-lg border bg-background p-4 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: colIndex * 0.05 + cardIndex * 0.02 }}
          >
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

// Form Skeleton - for modals and forms
export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
  <motion.div 
    className="space-y-6"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {/* Form header */}
    <div className="space-y-2 pb-4 border-b">
      <ShimmerSkeleton className="h-6 w-48" />
      <ShimmerSkeleton className="h-4 w-64" />
    </div>
    
    {/* Form fields */}
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <motion.div 
          key={i} 
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
        >
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-10 w-full rounded-md" />
        </motion.div>
      ))}
    </div>
    
    {/* Form actions */}
    <div className="flex gap-3 pt-4 border-t">
      <ShimmerSkeleton className="h-10 w-24 rounded-md" />
      <ShimmerSkeleton className="h-10 w-20 rounded-md" />
    </div>
  </motion.div>
);

// Card Grid Skeleton - for card-based layouts
export const CardGridSkeleton = ({ cards = 6, columns = 3 }: { cards?: number; columns?: number }) => (
  <div className={cn("grid gap-4", {
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-3": columns === 3,
    "grid-cols-1 md:grid-cols-2": columns === 2,
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-4": columns === 4,
  })}>
    {[...Array(cards)].map((_, i) => (
      <motion.div 
        key={i} 
        className="rounded-xl border bg-card p-5 space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: i * 0.03 }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <ShimmerSkeleton className="h-5 w-32" />
            <ShimmerSkeleton className="h-4 w-24" />
          </div>
          <ShimmerSkeleton className="h-10 w-10 rounded-full" />
        </div>
        <ShimmerSkeleton className="h-4 w-full" />
        <ShimmerSkeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-2">
          <ShimmerSkeleton className="h-6 w-16 rounded-full" />
          <ShimmerSkeleton className="h-6 w-20 rounded-full" />
        </div>
      </motion.div>
    ))}
  </div>
);

// List Skeleton - for list views
export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <motion.div 
        key={i} 
        className="flex items-center gap-4 p-4 rounded-lg border bg-card"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: i * 0.05 }}
      >
        <ShimmerSkeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-1/3" />
          <ShimmerSkeleton className="h-3 w-1/2" />
        </div>
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-8 w-8 rounded-md" />
          <ShimmerSkeleton className="h-8 w-8 rounded-md" />
        </div>
      </motion.div>
    ))}
  </div>
);

// Detail/Profile Skeleton
export const DetailSkeleton = () => (
  <motion.div 
    className="space-y-6"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {/* Header */}
    <div className="flex items-start gap-6 pb-6 border-b">
      <ShimmerSkeleton className="h-24 w-24 rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <ShimmerSkeleton className="h-8 w-64" />
        <ShimmerSkeleton className="h-4 w-48" />
        <div className="flex gap-2 pt-2">
          <ShimmerSkeleton className="h-6 w-20 rounded-full" />
          <ShimmerSkeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-10 w-24 rounded-md" />
        <ShimmerSkeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>
    
    {/* Tabs */}
    <div className="flex gap-4 border-b pb-2">
      {[...Array(4)].map((_, i) => (
        <ShimmerSkeleton key={i} className="h-8 w-24 rounded-md" />
      ))}
    </div>
    
    {/* Content sections */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <ShimmerSkeleton className="h-5 w-32" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <ShimmerSkeleton className="h-4 w-24" />
              <ShimmerSkeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <ShimmerSkeleton className="h-5 w-32" />
        <ShimmerSkeleton className="h-[150px] w-full rounded-lg" />
      </div>
    </div>
  </motion.div>
);

// Timeline Skeleton
export const TimelineSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-4">
    {[...Array(items)].map((_, i) => (
      <motion.div 
        key={i} 
        className="flex gap-4"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: i * 0.05 }}
      >
        <div className="flex flex-col items-center">
          <ShimmerSkeleton className="h-8 w-8 rounded-full" />
          {i !== items - 1 && <ShimmerSkeleton className="h-16 w-0.5" />}
        </div>
        <div className="flex-1 space-y-2 pb-4">
          <ShimmerSkeleton className="h-4 w-32" />
          <ShimmerSkeleton className="h-3 w-48" />
          <ShimmerSkeleton className="h-3 w-24" />
        </div>
      </motion.div>
    ))}
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton = () => (
  <motion.div 
    className="rounded-xl border bg-card p-6 space-y-4"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center justify-between">
      <ShimmerSkeleton className="h-5 w-32" />
      <ShimmerSkeleton className="h-8 w-8 rounded-lg" />
    </div>
    <div className="space-y-2">
      <ShimmerSkeleton className="h-10 w-24" />
      <div className="flex items-center gap-2">
        <ShimmerSkeleton className="h-4 w-12 rounded-full" />
        <ShimmerSkeleton className="h-3 w-20" />
      </div>
    </div>
    <ShimmerSkeleton className="h-16 w-full rounded-lg" />
  </motion.div>
);

// Chat/Message Skeleton
export const ChatSkeleton = ({ messages = 4 }: { messages?: number }) => (
  <div className="space-y-4">
    {[...Array(messages)].map((_, i) => (
      <motion.div 
        key={i} 
        className={cn(
          "flex gap-3",
          i % 2 === 0 ? "justify-start" : "justify-end"
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: i * 0.05 }}
      >
        {i % 2 === 0 && <ShimmerSkeleton className="h-8 w-8 rounded-full shrink-0" />}
        <div className={cn(
          "space-y-2 max-w-[70%]",
          i % 2 === 0 ? "items-start" : "items-end"
        )}>
          <ShimmerSkeleton className={cn(
            "h-16 rounded-xl",
            i % 2 === 0 ? "w-48" : "w-32"
          )} />
          <ShimmerSkeleton className="h-3 w-16" />
        </div>
        {i % 2 !== 0 && <ShimmerSkeleton className="h-8 w-8 rounded-full shrink-0" />}
      </motion.div>
    ))}
  </div>
);

// Supplier Card Skeleton - for fornecedores
export const SupplierCardSkeleton = () => (
  <motion.div 
    className="rounded-xl border bg-card p-5 space-y-4"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start gap-4">
      <ShimmerSkeleton className="h-14 w-14 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <ShimmerSkeleton className="h-5 w-40" />
        <ShimmerSkeleton className="h-4 w-32" />
      </div>
      <ShimmerSkeleton className="h-6 w-16 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <ShimmerSkeleton className="h-3 w-16" />
        <ShimmerSkeleton className="h-4 w-24" />
      </div>
      <div className="space-y-1">
        <ShimmerSkeleton className="h-3 w-16" />
        <ShimmerSkeleton className="h-4 w-20" />
      </div>
    </div>
    <div className="flex gap-2 pt-2 border-t">
      <ShimmerSkeleton className="h-8 flex-1 rounded-md" />
      <ShimmerSkeleton className="h-8 w-8 rounded-md" />
    </div>
  </motion.div>
);

// Payment Card Skeleton
export const PaymentCardSkeleton = () => (
  <motion.div 
    className="rounded-xl border bg-card p-5 space-y-4"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <ShimmerSkeleton className="h-4 w-20" />
        <ShimmerSkeleton className="h-6 w-32" />
      </div>
      <ShimmerSkeleton className="h-6 w-20 rounded-full" />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <ShimmerSkeleton className="h-3 w-24" />
        <ShimmerSkeleton className="h-3 w-20" />
      </div>
      <div className="flex justify-between">
        <ShimmerSkeleton className="h-3 w-20" />
        <ShimmerSkeleton className="h-3 w-24" />
      </div>
    </div>
    <ShimmerSkeleton className="h-2 w-full rounded-full" />
    <div className="flex gap-2">
      <ShimmerSkeleton className="h-9 flex-1 rounded-md" />
      <ShimmerSkeleton className="h-9 flex-1 rounded-md" />
    </div>
  </motion.div>
);

export { ShimmerSkeleton };
