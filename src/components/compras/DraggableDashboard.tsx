import { useState, useCallback, useMemo, forwardRef } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { 
  GripVertical, 
  Maximize2, 
  Minimize2, 
  Eye, 
  EyeOff, 
  Settings2, 
  RotateCcw,
  Lock,
  Unlock,
  X,
  Plus,
  LayoutGrid,
  Columns,
  Rows
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDashboardLayoutStore, DashboardWidget } from '@/stores/dashboardLayoutStore';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  children: React.ReactNode;
  isEditMode: boolean;
  onToggleVisibility: (id: string) => void;
  onResize: (id: string, size: DashboardWidget['size']) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

const DraggableWidget = ({ 
  widget, 
  children, 
  isEditMode, 
  onToggleVisibility, 
  onResize,
  onRemove,
  className
}: DraggableWidgetProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const dragControls = useDragControls();

  const sizeOptions: { value: DashboardWidget['size']; label: string; icon: React.ElementType }[] = [
    { value: 'small', label: 'Pequeno', icon: Minimize2 },
    { value: 'medium', label: 'Médio', icon: LayoutGrid },
    { value: 'large', label: 'Grande', icon: Columns },
    { value: 'full', label: 'Largura Total', icon: Rows },
  ];

  return (
    <Reorder.Item
      value={widget}
      id={widget.id}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "relative group",
        className,
        !widget.visible && "opacity-40"
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: widget.visible ? 1 : 0.4, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit Mode Overlay */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Widget Controls */}
      <AnimatePresence>
        {(isEditMode || isHovered) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-background border rounded-full shadow-lg px-2 py-1"
          >
            {/* Drag Handle */}
            {isEditMode && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1 h-6 w-6 cursor-grab active:cursor-grabbing hover:bg-muted rounded-full transition-colors"
                      onPointerDown={(e) => dragControls.start(e)}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Arrastar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Size Selector */}
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="p-1 h-6 w-6 hover:bg-muted rounded-full transition-colors">
                        <Maximize2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Redimensionar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="center">
                <DropdownMenuLabel>Tamanho</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sizeOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onResize(widget.id, option.value)}
                    className={cn(
                      "flex items-center gap-2",
                      widget.size === option.value && "bg-primary/10"
                    )}
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                    {widget.size === option.value && (
                      <Badge variant="secondary" className="ml-auto text-xs">Atual</Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Toggle Visibility */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1 h-6 w-6 hover:bg-muted rounded-full transition-colors"
                    onClick={() => onToggleVisibility(widget.id)}
                  >
                    {widget.visible ? (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{widget.visible ? 'Ocultar' : 'Mostrar'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Widget Title */}
            <span className="text-xs font-medium text-muted-foreground px-1 max-w-[100px] truncate">
              {widget.title}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget Content */}
      <div className={cn(
        "h-full transition-all duration-200",
        isEditMode && "pointer-events-none"
      )}>
        {children}
      </div>
    </Reorder.Item>
  );
};

interface DraggableDashboardProps {
  renderWidget: (widgetId: string, index: number) => React.ReactNode;
  getGridClasses: (size: string) => string;
  className?: string;
}

export const DraggableDashboard = ({ 
  renderWidget, 
  getGridClasses,
  className 
}: DraggableDashboardProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const { 
    widgets, 
    setWidgets, 
    toggleWidgetVisibility, 
    resizeWidget, 
    resetLayout 
  } = useDashboardLayoutStore();

  const sortedWidgets = useMemo(() => 
    [...widgets].sort((a, b) => a.order - b.order),
    [widgets]
  );

  const kpiWidgets = useMemo(() => 
    sortedWidgets.filter(w => w.type === 'kpi'),
    [sortedWidgets]
  );

  const otherWidgets = useMemo(() => 
    sortedWidgets.filter(w => w.type !== 'kpi'),
    [sortedWidgets]
  );

  const visibleKpiWidgets = kpiWidgets.filter(w => w.visible);
  const visibleOtherWidgets = otherWidgets.filter(w => w.visible);
  const hiddenWidgets = widgets.filter(w => !w.visible);

  const handleReorder = useCallback((type: 'kpi' | 'other', newOrder: DashboardWidget[]) => {
    const baseOrder = type === 'kpi' ? 0 : kpiWidgets.length;
    const reorderedWithOrder = newOrder.map((widget, index) => ({
      ...widget,
      order: baseOrder + index
    }));

    const otherTypeWidgets = type === 'kpi' ? otherWidgets : kpiWidgets;
    const updatedOther = otherTypeWidgets.map((w, i) => ({
      ...w,
      order: type === 'kpi' ? kpiWidgets.length + i : i
    }));

    setWidgets([...reorderedWithOrder, ...updatedOther]);
  }, [kpiWidgets, otherWidgets, setWidgets]);

  const handleShowHiddenWidget = (widgetId: string) => {
    toggleWidgetVisibility(widgetId);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Edit Mode Controls */}
      <motion.div 
        className="flex items-center justify-between flex-wrap gap-2"
        layout
      >
        <div className="flex items-center gap-2">
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
            className="gap-2"
          >
            {isEditMode ? (
              <>
                <Lock className="w-4 h-4" />
                Bloquear Layout
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Editar Layout
              </>
            )}
          </Button>

          <AnimatePresence>
            {isEditMode && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetLayout}
                  className="gap-2 text-muted-foreground"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetar
                </Button>

                {hiddenWidgets.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Adicionar ({hiddenWidgets.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Widgets Ocultos</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {hiddenWidgets.map((widget) => (
                        <DropdownMenuItem
                          key={widget.id}
                          onClick={() => handleShowHiddenWidget(widget.id)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          {widget.title}
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {widget.type}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Badge variant="outline" className="gap-1">
                <Settings2 className="w-3 h-3" />
                Modo de Edição Ativo
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* KPIs Grid with Reorder */}
      {visibleKpiWidgets.length > 0 && (
        <section aria-label="Indicadores" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Indicadores</h2>
            {isEditMode && (
              <p className="text-xs text-muted-foreground">
                Arraste para reorganizar • Use o menu para redimensionar
              </p>
            )}
          </div>

          <Reorder.Group
            axis="x"
            values={visibleKpiWidgets}
            onReorder={(newOrder) => handleReorder('kpi', newOrder)}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
          >
            {visibleKpiWidgets.map((widget, index) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onToggleVisibility={toggleWidgetVisibility}
                onResize={resizeWidget}
              >
                {renderWidget(widget.id, index)}
              </DraggableWidget>
            ))}
          </Reorder.Group>
        </section>
      )}

      {/* Other Widgets Grid with Reorder */}
      {visibleOtherWidgets.length > 0 && (
        <section aria-label="Widgets" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Análises & Painéis</h2>
            <p className="text-xs text-muted-foreground">Widgets redimensionáveis por seção</p>
          </div>

          <Reorder.Group
            axis="y"
            values={visibleOtherWidgets}
            onReorder={(newOrder) => handleReorder('other', newOrder)}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-fr"
          >
            {visibleOtherWidgets.map((widget, index) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                isEditMode={isEditMode}
                onToggleVisibility={toggleWidgetVisibility}
                onResize={resizeWidget}
                className={getGridClasses(widget.size)}
              >
                {renderWidget(widget.id, index)}
              </DraggableWidget>
            ))}
          </Reorder.Group>
        </section>
      )}

      {/* Empty State */}
      {visibleKpiWidgets.length === 0 && visibleOtherWidgets.length === 0 && (
        <IllustratedEmptyState
          type="analytics"
          title="Seu dashboard está vazio"
          description='Todos os widgets foram ocultados. Clique em "Editar Layout" para reativar e reorganizar.'
          action={{ label: 'Editar dashboard', onClick: () => setIsEditMode(true) }}
          size="lg"
        />
      )}
    </div>
  );
};
