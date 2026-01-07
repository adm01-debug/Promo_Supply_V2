import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

// Animated Sort Indicator
const SortIndicator = ({ 
  active, 
  direction 
}: { 
  active: boolean; 
  direction?: "asc" | "desc" 
}) => (
  <span className={cn(
    "ml-1 inline-flex transition-all duration-200",
    active ? "text-primary" : "text-muted-foreground/40"
  )}>
    <AnimatePresence mode="wait">
      {active && direction === "asc" ? (
        <motion.span
          key="asc"
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronUp className="w-4 h-4" />
        </motion.span>
      ) : active && direction === "desc" ? (
        <motion.span
          key="desc"
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      ) : (
        <motion.span
          key="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          className="opacity-0 group-hover:opacity-40"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
        </motion.span>
      )}
    </AnimatePresence>
  </span>
);

// Column definition
interface Column<T> {
  id: string;
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  align?: "left" | "center" | "right";
  sticky?: boolean;
  hidden?: boolean;
  className?: string;
}

// Table props
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  selectable?: boolean;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selected: Set<string | number>) => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (field: string, direction: "asc" | "desc") => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode[];
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  compact?: boolean;
  striped?: boolean;
  bordered?: boolean;
  animatedRows?: boolean;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
  loading = false,
  emptyState,
  rowActions,
  onRowClick,
  stickyHeader = true,
  compact = false,
  striped = false,
  bordered = false,
  className,
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((col) => !col.hidden);
  const allSelected = data.length > 0 && data.every((row) => selectedRows.has(row[keyField] as string));
  const someSelected = data.some((row) => selectedRows.has(row[keyField] as string));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.(new Set());
    } else {
      const newSelected = new Set(data.map((row) => row[keyField] as string));
      onSelectionChange?.(newSelected);
    }
  };

  const handleSelectRow = (rowKey: string | number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowKey)) {
      newSelected.delete(rowKey);
    } else {
      newSelected.add(rowKey);
    }
    onSelectionChange?.(newSelected);
  };

  const handleSort = (columnId: string) => {
    if (!onSort) return;
    const newDirection = sortField === columnId && sortDirection === "asc" ? "desc" : "asc";
    onSort(columnId, newDirection);
  };

  const getCellValue = (row: T, accessor: Column<T>["accessor"]): React.ReactNode => {
    if (typeof accessor === "function") {
      return accessor(row);
    }
    return row[accessor] as React.ReactNode;
  };

  const cellPadding = compact ? "px-3 py-2" : "px-4 py-3";
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className={cn("w-full overflow-auto rounded-xl border bg-card", className)}>
      <table className="w-full border-collapse">
        {/* Header */}
        <thead className={cn(
          "bg-muted/50 border-b",
          stickyHeader && "sticky top-0 z-10"
        )}>
          <tr>
            {/* Selection Column */}
            {selectable && (
              <th className={cn("w-12", cellPadding)}>
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos"
                  className={someSelected && !allSelected ? "data-[state=checked]:bg-muted" : ""}
                />
              </th>
            )}

            {/* Data Columns */}
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  cellPadding,
                  alignClasses[column.align || "left"],
                  column.sticky && "sticky left-0 bg-muted/50 z-10",
                  "font-medium text-muted-foreground text-xs uppercase tracking-wider"
                )}
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                }}
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.id)}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                  >
                    {column.header}
                    <span className="flex flex-col">
                      {sortField === column.id ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                      )}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}

            {/* Actions Column */}
            {rowActions && (
              <th className={cn("w-12", cellPadding)}>
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row, rowIndex) => {
            const rowKey = row[keyField] as string | number;
            const isSelected = selectedRows.has(rowKey);

            return (
              <tr
                key={rowKey}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b last:border-b-0 transition-colors",
                  onRowClick && "cursor-pointer",
                  isSelected && "bg-primary/5",
                  striped && rowIndex % 2 === 1 && "bg-muted/20",
                  !isSelected && "hover:bg-muted/50"
                )}
              >
                {/* Selection Cell */}
                {selectable && (
                  <td 
                    className={cellPadding}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRow(rowKey)}
                      aria-label="Selecionar linha"
                    />
                  </td>
                )}

                {/* Data Cells */}
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      cellPadding,
                      alignClasses[column.align || "left"],
                      column.sticky && "sticky left-0 bg-card z-10",
                      bordered && "border-r last:border-r-0",
                      "text-sm"
                    )}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                    }}
                  >
                    {getCellValue(row, column.accessor)}
                  </td>
                ))}

                {/* Actions Cell */}
                {rowActions && (
                  <td 
                    className={cellPadding}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions(row)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Empty State */}
      {data.length === 0 && !loading && (
        <div className="p-8">
          {emptyState || (
            <div className="text-center text-muted-foreground">
              Nenhum dado encontrado
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-8">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Pagination Component
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const TablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: TablePaginationProps) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t">
      <div className="text-sm text-muted-foreground">
        Mostrando {startItem}-{endItem} de {totalItems} itens
      </div>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronUp className="w-4 h-4 -rotate-90" />
          </Button>
          
          <span className="px-2 text-sm">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </Button>
        </div>
      </div>
    </div>
  );
};
