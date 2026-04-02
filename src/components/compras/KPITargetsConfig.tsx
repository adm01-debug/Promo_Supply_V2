import { useState } from "react";
import {
  Settings,
  Target,
  AlertTriangle,
  Bell,
  Save,
  RotateCcw,
  Info
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useKPITargetsStore, KPITarget } from "@/stores/kpiTargetsStore";
import { cn } from "@/lib/utils";

export const KPITargetsConfig = () => {
  const { targets, updateTarget } = useKPITargetsStore();
  const [localTargets, setLocalTargets] = useState<KPITarget[]>(targets);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleOpen = () => {
    setLocalTargets(targets);
    setOpen(true);
  };

  const handleSave = () => {
    localTargets.forEach(t => {
      updateTarget(t.id, t);
    });
    toast({
      title: "Metas Atualizadas",
      description: "As metas de KPIs foram salvas com sucesso.",
    });
    setOpen(false);
  };

  const handleReset = () => {
    setLocalTargets(targets);
  };

  const updateLocalTarget = (id: string, updates: Partial<KPITarget>) => {
    setLocalTargets(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleOpen}>
          <Settings className="w-4 h-4" />
          Configurar Metas
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="dialog-desc" className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Configurar Metas de KPIs
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Configure metas e limites de alerta para cada KPI. Alertas serão 
              disparados quando os valores estiverem abaixo dos limites definidos.
            </p>
          </div>

          <TooltipProvider>
            {localTargets.map((target) => (
              <Card key={target.id} className={cn(
                "p-4 transition-all",
                !target.enabled && "opacity-50"
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={target.enabled}
                      onCheckedChange={(checked) => 
                        updateLocalTarget(target.id, { enabled: checked })
                      }
                    />
                    <h4 className="font-medium text-foreground">{target.name}</h4>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {target.unit}
                  </Badge>
                </div>

                {target.enabled && (
                  <div className="space-y-4">
                    {/* Target Value */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Meta
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={target.target}
                            onChange={(e) => updateLocalTarget(target.id, { 
                              target: parseFloat(e.target.value) || 0 
                            })}
                            className="h-8"
                          />
                          <span className="text-sm text-muted-foreground">{target.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Thresholds */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="text-xs text-warning flex items-center gap-1 cursor-help">
                              <AlertTriangle className="w-3 h-3" />
                              Limite Warning (%)
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Alerta de atenção quando KPI estiver este % abaixo da meta</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[target.warningThreshold]}
                            onValueChange={([v]) => updateLocalTarget(target.id, { 
                              warningThreshold: v 
                            })}
                            max={50}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium w-10 text-right">
                            {target.warningThreshold}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="text-xs text-destructive flex items-center gap-1 cursor-help">
                              <AlertTriangle className="w-3 h-3" />
                              Limite Critical (%)
                            </Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Alerta crítico quando KPI estiver este % abaixo da meta</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-3">
                          <Slider
                            value={[target.criticalThreshold]}
                            onValueChange={([v]) => updateLocalTarget(target.id, { 
                              criticalThreshold: v 
                            })}
                            max={80}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-sm font-medium w-10 text-right">
                            {target.criticalThreshold}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                      <span className="font-medium">Preview:</span>{' '}
                      Warning se &lt; {(target.target * (1 - target.warningThreshold / 100)).toFixed(1)}{target.unit},{' '}
                      Critical se &lt; {(target.target * (1 - target.criticalThreshold / 100)).toFixed(1)}{target.unit}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </TooltipProvider>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Resetar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Metas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
