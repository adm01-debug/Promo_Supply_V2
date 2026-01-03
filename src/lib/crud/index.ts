// CRUD Toolkit - Índice de Exports

// Hooks
export { useCRUD } from '@/hooks/useCRUD';
export { useSavedFilters } from '@/hooks/useSavedFilters';
export { useDuplicate } from '@/hooks/useDuplicate';
export { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
export { useBulkActions } from '@/hooks/useBulkActions';

// Components
export { DataImporter } from '@/components/DataImporter';
export { SavedFiltersDropdown } from '@/components/SavedFiltersDropdown';
export { AdvancedFilters } from '@/components/AdvancedFilters';
export { SearchInput } from '@/components/SearchInput';
export { BulkActionsBar } from '@/components/BulkActionsBar';
export { DuplicateButton } from '@/components/DuplicateButton';
export { VersionHistory } from '@/components/VersionHistory';

// Utilities
export { importCSV, generateCSVTemplate } from '@/lib/csvImporter';
export { importExcel, exportToExcel } from '@/lib/excelImporter';
export * from '@/lib/brazilValidators';

// Types
export type { FilterValue, FilterConfig } from '@/components/AdvancedFilters';
