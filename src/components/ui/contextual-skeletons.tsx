// Re-export all skeleton components from modular files
// Base primitives
export { ShimmerSkeleton, PulseSkeleton, WaveSkeleton, SkeletonLoadingIndicator, ProgressSkeleton } from './skeletons/SkeletonPrimitives';

// Layout skeletons
export { KPICardSkeleton, DashboardSkeleton, TableSkeleton, KanbanSkeleton, FormSkeleton, FullPageSkeleton } from './skeletons/LayoutSkeletons';

// Domain-specific skeletons
export {
  CardGridSkeleton, ListSkeleton, DetailSkeleton, TimelineSkeleton,
  StatsCardSkeleton, ChatSkeleton, SupplierCardSkeleton, PaymentCardSkeleton,
  OrderCardSkeleton, QuoteCardSkeleton, ContractCardSkeleton, NotificationSkeleton,
  SidebarSkeleton, PageHeaderSkeleton, SearchResultsSkeleton, ModalContentSkeleton,
} from './skeletons/DomainSkeletons';
