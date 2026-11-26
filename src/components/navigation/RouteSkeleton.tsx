import { Suspense, ReactNode } from "react";
import { 
  DashboardSkeleton, 
  TableSkeleton, 
  KanbanSkeleton, 
  FormSkeleton,
  FullPageSkeleton,
  KPICardSkeleton
} from "@/components/ui/contextual-skeletons";

interface RouteSkeletonProps {
  children: ReactNode;
  variant?: 'dashboard' | 'table' | 'kanban' | 'form' | 'full' | 'kpi' | 'default';
}

export const RouteSkeleton = ({ children, variant = 'default' }: RouteSkeletonProps) => {
  let fallback = <FullPageSkeleton />;

  switch (variant) {
    case 'dashboard':
      fallback = <DashboardSkeleton />;
      break;
    case 'table':
      fallback = <TableSkeleton />;
      break;
    case 'kanban':
      fallback = <KanbanSkeleton />;
      break;
    case 'form':
      fallback = <FormSkeleton />;
      break;
    case 'kpi':
      fallback = <KPICardSkeleton />;
      break;
    case 'full':
      fallback = <FullPageSkeleton />;
      break;
    default:
      fallback = <FullPageSkeleton title="Carregando módulo..." />;
  }

  return (
    <Suspense fallback={<div className="p-4 md:p-6">{fallback}</div>}>
      {children}
    </Suspense>
  );
};
