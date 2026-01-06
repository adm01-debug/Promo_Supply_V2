import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Base animated skeleton with shimmer
const ShimmerSkeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn("loading-shimmer rounded-md bg-muted", className)} 
    {...props} 
  />
);

// Dashboard KPI Skeleton
export const KPICardSkeleton = () => (
  <div className="rounded-xl border bg-card p-5 space-y-3">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <ShimmerSkeleton className="h-3 w-20" />
        <ShimmerSkeleton className="h-8 w-24" />
        <ShimmerSkeleton className="h-3 w-16" />
      </div>
      <ShimmerSkeleton className="h-10 w-10 rounded-lg" />
    </div>
  </div>
);

// Dashboard Grid Skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-4 w-64" />
      </div>
      <ShimmerSkeleton className="h-10 w-32" />
    </div>

    {/* KPIs Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <KPICardSkeleton key={i} />
      ))}
    </div>

    {/* Charts Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <ShimmerSkeleton className="h-5 w-32" />
        <ShimmerSkeleton className="h-[200px] w-full rounded-lg" />
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <ShimmerSkeleton className="h-5 w-32" />
        <ShimmerSkeleton className="h-[200px] w-full rounded-lg" />
      </div>
    </div>
  </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => (
  <div className="rounded-xl border bg-card overflow-hidden">
    {/* Table Header */}
    <div className="border-b bg-muted/30 p-4">
      <div className="flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <ShimmerSkeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    
    {/* Table Rows */}
    {[...Array(rows)].map((_, rowIndex) => (
      <div 
        key={rowIndex} 
        className={cn(
          "p-4 flex gap-4",
          rowIndex !== rows - 1 && "border-b"
        )}
        style={{ animationDelay: `${rowIndex * 50}ms` }}
      >
        {[...Array(columns)].map((_, colIndex) => (
          <ShimmerSkeleton 
            key={colIndex} 
            className={cn("h-4 flex-1", colIndex === 0 && "max-w-[120px]")} 
          />
        ))}
      </div>
    ))}
  </div>
);

// Kanban Skeleton
export const KanbanSkeleton = ({ columns = 6 }: { columns?: number }) => (
  <div className="flex gap-4 overflow-x-auto pb-4">
    {[...Array(columns)].map((_, colIndex) => (
      <div 
        key={colIndex} 
        className="min-w-[280px] rounded-xl border bg-card p-4 space-y-3"
        style={{ animationDelay: `${colIndex * 75}ms` }}
      >
        <div className="flex items-center gap-2">
          <ShimmerSkeleton className="h-3 w-3 rounded-full" />
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-5 w-8 rounded-full ml-auto" />
        </div>
        
        {[...Array(3)].map((_, cardIndex) => (
          <div key={cardIndex} className="rounded-lg border bg-background p-3 space-y-2">
            <ShimmerSkeleton className="h-4 w-full" />
            <ShimmerSkeleton className="h-3 w-3/4" />
            <div className="flex gap-2 mt-3">
              <ShimmerSkeleton className="h-5 w-16 rounded-full" />
              <ShimmerSkeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
  <div className="rounded-xl border bg-card p-6 space-y-6">
    <div className="space-y-2">
      <ShimmerSkeleton className="h-6 w-48" />
      <ShimmerSkeleton className="h-4 w-64" />
    </div>
    
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <ShimmerSkeleton className="h-4 w-24" />
          <ShimmerSkeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
    </div>
    
    <div className="flex gap-3 pt-4">
      <ShimmerSkeleton className="h-10 w-24 rounded-md" />
      <ShimmerSkeleton className="h-10 w-20 rounded-md" />
    </div>
  </div>
);

// Card Grid Skeleton
export const CardGridSkeleton = ({ cards = 6, columns = 3 }: { cards?: number; columns?: number }) => (
  <div className={cn("grid gap-4", `grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns}`)}>
    {[...Array(cards)].map((_, i) => (
      <div 
        key={i} 
        className="rounded-xl border bg-card p-5 space-y-4"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <ShimmerSkeleton className="h-5 w-32" />
            <ShimmerSkeleton className="h-4 w-24" />
          </div>
          <ShimmerSkeleton className="h-8 w-8 rounded-full" />
        </div>
        <ShimmerSkeleton className="h-4 w-full" />
        <ShimmerSkeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-6 w-16 rounded-full" />
          <ShimmerSkeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// List Skeleton
export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <div 
        key={i} 
        className="flex items-center gap-4 p-4 rounded-lg border bg-card"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <ShimmerSkeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-1/3" />
          <ShimmerSkeleton className="h-3 w-1/2" />
        </div>
        <ShimmerSkeleton className="h-8 w-20 rounded-md" />
      </div>
    ))}
  </div>
);

// Profile/Detail Skeleton
export const DetailSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-start gap-6">
      <ShimmerSkeleton className="h-24 w-24 rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <ShimmerSkeleton className="h-8 w-64" />
        <ShimmerSkeleton className="h-4 w-48" />
        <div className="flex gap-2 pt-2">
          <ShimmerSkeleton className="h-6 w-20 rounded-full" />
          <ShimmerSkeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
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
  </div>
);

export { ShimmerSkeleton };
