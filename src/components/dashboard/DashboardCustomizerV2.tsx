import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Settings, 
  Plus, 
  X, 
  GripVertical,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Layout,
  Grid3X3,
  LayoutGrid,
  Columns,
  Rows,
  Palette,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// ============================================
// MELHORIA: Dashboard Customization V2
// Personalização avançada do dashboard
// ============================================

interface Widget {
  id: string;
  type: string;
  title: string;
  icon?: React.ReactNode;
  size: 'sm' | 'md' | 'lg' | 'xl';
  visible: boolean;
  locked: boolean;
  column?: number;
  row?: number;
  color?: string;
  refreshInterval?: number;
}

interface DashboardLayout {
  id: string;
  name: string;
  columns: number;
  widgets: Widget[];
  isDefault?: boolean;
}

interface DashboardCustomizerV2Props {
  layouts: DashboardLayout[];
  currentLayoutId: string;
  onLayoutChange: (layoutId: string) => void;
  onLayoutUpdate: (layout: DashboardLayout) => void;
  onLayoutCreate: (layout: DashboardLayout) => void;
  onLayoutDelete: (layoutId: string) => void;
  availableWidgets: Omit<Widget, 'visible' | 'locked'>[];
}

export const DashboardCustomizerV2: React.FC<DashboardCustomizerV2Props> = ({
  layouts,
  currentLayoutId,
  onLayoutChange,
  onLayoutUpdate,
  onLayoutCreate,
  onLayoutDelete,
  availableWidgets
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('widgets');

  const currentLayout = useMemo(() => 
    layouts.find(l => l.id === currentLayoutId) || layouts[0],
    [layouts, currentLayoutId]
  );

  const [tempLayout, setTempLayout] = useState<DashboardLayout>(currentLayout);

  const handleWidgetToggle = (widgetId: string) => {
    setTempLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      )
    }));
  };

  const handleWidgetLock = (widgetId: string) => {
    setTempLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, locked: !w.locked } : w
      )
    }));
  };

  const handleWidgetResize = (widgetId: string, size: Widget['size']) => {
    setTempLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, size } : w
      )
    }));
  };

  const handleWidgetReorder = (newOrder: Widget[]) => {
    setTempLayout(prev => ({
      ...prev,
      widgets: newOrder
    }));
  };

  const handleAddWidget = (widget: Omit<Widget, 'visible' | 'locked'>) => {
    const newWidget: Widget = {
      ...widget,
      visible: true,
      locked: false
    };
    setTempLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget]
    }));
  };

  const handleRemoveWidget = (widgetId: string) => {
    setTempLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId)
    }));
  };

  const handleColumnsChange = (columns: number) => {
    setTempLayout(prev => ({
      ...prev,
      columns
    }));
  };

  const handleSave = () => {
    onLayoutUpdate(tempLayout);
    setEditMode(false);
  };

  const handleReset = () => {
    setTempLayout(currentLayout);
  };

  const handleCreateLayout = () => {
    const newLayout: DashboardLayout = {
      id: Date.now().toString(),
      name: `Layout ${layouts.length + 1}`,
      columns: 3,
      widgets: availableWidgets.map(w => ({
        ...w,
        visible: true,
        locked: false
      }))
    };
    onLayoutCreate(newLayout);
    setTempLayout(newLayout);
  };

  const sizeOptions: { value: Widget['size']; label: string; icon: React.ReactNode }[] = [
    { value: 'sm', label: 'Pequeno', icon: <Grid3X3 className="w-4 h-4" /> },
    { value: 'md', label: 'Médio', icon: <LayoutGrid className="w-4 h-4" /> },
    { value: 'lg', label: 'Grande', icon: <Columns className="w-4 h-4" /> },
    { value: 'xl', label: 'Extra Grande', icon: <Rows className="w-4 h-4" /> }
  ];

  const colorOptions = [
    'default',
    'primary',
    'success',
    'warning',
    'danger',
    'purple',
    'blue'
  ];

  return (
    <>
      {/* Edit Mode Toggle */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        {editMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex gap-2"
          >
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Resetar
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          </motion.div>
        )}
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button 
              variant={editMode ? "default" : "outline"} 
              size="icon"
              className="rounded-full shadow-lg"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-96 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Personalizar Dashboard
              </SheetTitle>
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="widgets">Widgets</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="presets">Presets</TabsTrigger>
              </TabsList>

              {/* Widgets Tab */}
              <TabsContent value="widgets" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Widgets ativos</h4>
                  <Switch
                    checked={editMode}
                    onCheckedChange={setEditMode}
                  />
                </div>

                <Reorder.Group
                  axis="y"
                  values={tempLayout.widgets}
                  onReorder={handleWidgetReorder}
                  className="space-y-2"
                >
                  {tempLayout.widgets.map((widget) => (
                    <Reorder.Item
                      key={widget.id}
                      value={widget}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg bg-card",
                        !widget.visible && "opacity-50",
                        widget.locked && "border-primary"
                      )}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{widget.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {widget.size}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Size selector */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Maximize2 className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2">
                            <div className="space-y-1">
                              {sizeOptions.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={() => handleWidgetResize(widget.id, opt.value)}
                                  className={cn(
                                    "flex items-center gap-2 w-full p-2 rounded-lg text-sm",
                                    widget.size === opt.value 
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-muted"
                                  )}
                                >
                                  {opt.icon}
                                  {opt.label}
                                  {widget.size === opt.value && (
                                    <Check className="w-4 h-4 ml-auto" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Lock button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleWidgetLock(widget.id)}
                        >
                          {widget.locked ? (
                            <Lock className="w-4 h-4 text-primary" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Visibility toggle */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleWidgetToggle(widget.id)}
                        >
                          {widget.visible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleRemoveWidget(widget.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>

                {/* Add widget */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <Plus className="w-4 h-4" />
                      Adicionar widget
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {availableWidgets
                        .filter(w => !tempLayout.widgets.find(tw => tw.id === w.id))
                        .map(widget => (
                          <button
                            key={widget.id}
                            onClick={() => handleAddWidget(widget)}
                            className="flex items-center gap-2 w-full p-2 rounded-lg text-sm hover:bg-muted"
                          >
                            {widget.icon}
                            {widget.title}
                          </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </TabsContent>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-6 mt-4">
                {/* Columns */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Colunas</label>
                    <span className="text-sm text-muted-foreground">
                      {tempLayout.columns}
                    </span>
                  </div>
                  <Slider
                    value={[tempLayout.columns]}
                    onValueChange={([v]) => handleColumnsChange(v)}
                    min={1}
                    max={4}
                    step={1}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preview</label>
                  <div 
                    className="grid gap-2 p-4 bg-muted rounded-lg"
                    style={{ gridTemplateColumns: `repeat(${tempLayout.columns}, 1fr)` }}
                  >
                    {tempLayout.widgets.filter(w => w.visible).map(widget => (
                      <div
                        key={widget.id}
                        className={cn(
                          "bg-card border rounded p-2 text-xs truncate",
                          widget.size === 'lg' && "col-span-2",
                          widget.size === 'xl' && "col-span-full"
                        )}
                      >
                        {widget.title}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-4 mt-4">
                <div className="space-y-2">
                  {layouts.map(layout => (
                    <div
                      key={layout.id}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg",
                        layout.id === currentLayoutId && "border-primary bg-primary/5"
                      )}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{layout.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {layout.widgets.filter(w => w.visible).length} widgets • 
                          {layout.columns} colunas
                        </p>
                      </div>

                      <div className="flex gap-1">
                        {layout.id !== currentLayoutId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLayoutChange(layout.id)}
                          >
                            Usar
                          </Button>
                        )}
                        
                        {!layout.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => onLayoutDelete(layout.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={handleCreateLayout}
                >
                  <Plus className="w-4 h-4" />
                  Criar novo layout
                </Button>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>

      {/* Edit mode overlay */}
      {editMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-primary/5 pointer-events-none z-10"
        />
      )}
    </>
  );
};

// ============================================
// Widget Grid
// ============================================

interface WidgetGridProps {
  layout: DashboardLayout;
  children: (widget: Widget) => React.ReactNode;
  editMode?: boolean;
}

export const WidgetGrid: React.FC<WidgetGridProps> = ({
  layout,
  children,
  editMode = false
}) => {
  const visibleWidgets = layout.widgets.filter(w => w.visible);

  const getWidgetSpan = (size: Widget['size']) => {
    switch (size) {
      case 'sm': return 1;
      case 'md': return 1;
      case 'lg': return 2;
      case 'xl': return layout.columns;
      default: return 1;
    }
  };

  return (
    <div
      className={cn(
        "grid gap-4",
        editMode && "ring-2 ring-dashed ring-primary/50 rounded-xl p-4"
      )}
      style={{ 
        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` 
      }}
    >
      {visibleWidgets.map(widget => (
        <motion.div
          key={widget.id}
          layout
          className={cn(
            "relative",
            editMode && !widget.locked && "ring-2 ring-primary/30 rounded-xl"
          )}
          style={{
            gridColumn: `span ${Math.min(getWidgetSpan(widget.size), layout.columns)}`
          }}
        >
          {children(widget)}
          
          {editMode && widget.locked && (
            <div className="absolute top-2 right-2 z-10">
              <Lock className="w-4 h-4 text-primary" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

// ============================================
// Role-based Dashboard
// ============================================

interface RoleDashboardConfig {
  role: string;
  defaultLayout: DashboardLayout;
  allowedWidgets: string[];
  canCustomize: boolean;
}

interface RoleBasedDashboardProps {
  userRole: string;
  configs: RoleDashboardConfig[];
  children: React.ReactNode;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({
  userRole,
  configs,
  children
}) => {
  const config = configs.find(c => c.role === userRole) || configs[0];

  if (!config) {
    return <div>Configuração de dashboard não encontrada</div>;
  }

  return (
    <div className="space-y-4">
      {!config.canCustomize && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm">
          <Lock className="w-4 h-4" />
          <span>Dashboard padrão para {config.role}</span>
        </div>
      )}
      {children}
    </div>
  );
};

export default DashboardCustomizerV2;
