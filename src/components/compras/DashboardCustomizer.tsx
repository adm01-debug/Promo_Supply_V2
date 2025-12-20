import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, RotateCcw, GripVertical } from "lucide-react";
import { useDashboardLayoutStore, DashboardWidget } from "@/stores/dashboardLayoutStore";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export function DashboardCustomizer() {
  const { widgets, toggleWidgetVisibility, reorderWidgets, resizeWidget, resetLayout } = useDashboardLayoutStore();
  const [open, setOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderWidgets(result.source.index, result.destination.index);
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Personalizar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Personalizar Dashboard
            </span>
            <Button variant="ghost" size="sm" onClick={resetLayout} className="gap-1">
              <RotateCcw className="w-4 h-4" />
              Resetar
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Arraste para reordenar, ative/desative widgets e ajuste seus tamanhos.
          </p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {sortedWidgets.map((widget, index) => (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            snapshot.isDragging ? 'bg-accent shadow-lg' : 'bg-card'
                          } ${!widget.visible ? 'opacity-50' : ''}`}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1">
                            <p className="font-medium text-sm">{widget.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">{widget.type}</p>
                          </div>

                          <Select
                            value={widget.size}
                            onValueChange={(value: DashboardWidget['size']) => resizeWidget(widget.id, value)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Pequeno</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="large">Grande</SelectItem>
                              <SelectItem value="full">Tela Cheia</SelectItem>
                            </SelectContent>
                          </Select>

                          <Switch
                            checked={widget.visible}
                            onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setOpen(false)}>Concluído</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
