import { useState, useEffect, useMemo } from "react";
import { 
  Target, 
  Settings, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SavingsGoalConfig {
  metaMensal: number;
  alertaPercentual: number;
}

const DEFAULT_CONFIG: SavingsGoalConfig = {
  metaMensal: 10000,
  alertaPercentual: 70,
};

const STORAGE_KEY = "savings-goal-config";

export const SavingsGoalPanel = () => {
  const [config, setConfig] = useState<SavingsGoalConfig>(DEFAULT_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState<SavingsGoalConfig>(DEFAULT_CONFIG);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse savings goal config", e);
      }
    }
  }, []);

  // Real data from Supabase
  const { data: solicitacoes } = useQuery({
    queryKey: ['savings-goal-solicitacoes'],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('id, valor_estimado, valor_aprovado, created_at')
        .gte('created_at', startOfMonth.toISOString());
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const economiaAtual = useMemo(() => {
    const sols = solicitacoes || [];
    const totalEstimado = sols.reduce((sum, s) => sum + (Number(s.valor_estimado) || 0), 0);
    const totalAprovado = sols.reduce((sum, s) => sum + (Number(s.valor_aprovado) || 0), 0);
    return totalEstimado > totalAprovado ? totalEstimado - totalAprovado : 0;
  }, [solicitacoes]);

  const progressPercent = Math.min((economiaAtual / config.metaMensal) * 100, 100);
  const isBelowTarget = progressPercent < config.alertaPercentual;
  const isGoalReached = progressPercent >= 100;
  const diasRestantes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const economiaFaltante = Math.max(config.metaMensal - economiaAtual, 0);
  const mediaDiariaNecessaria = diasRestantes > 0 ? economiaFaltante / diasRestantes : 0;

  const handleOpenSettings = () => {
    setTempConfig(config);
    setSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    setConfig(tempConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempConfig));
    setSettingsOpen(false);
    setAlertDismissed(false);
  };

  const getStatusColor = () => {
    if (isGoalReached) return "emerald";
    if (isBelowTarget) return "red";
    return "blue";
  };

  const statusColor = getStatusColor();

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Meta de Economia Mensal
          </h2>
          <Button variant="ghost" size="icon" onClick={handleOpenSettings}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {isBelowTarget && !alertDismissed && !isGoalReached && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Economia atual está abaixo de {config.alertaPercentual}% da meta. 
                Faltam R$ {economiaFaltante.toLocaleString('pt-BR')} para atingir o objetivo.
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0"
                onClick={() => setAlertDismissed(true)}
              >
                <X className="w-3 h-3" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isGoalReached && (
          <Alert className="mb-4 border-emerald-500/50 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Meta Atingida!</AlertTitle>
            <AlertDescription className="text-success/80">
              Parabéns! A meta de economia mensal foi alcançada.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-foreground">
                R$ {economiaAtual.toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-muted-foreground">
                de R$ {config.metaMensal.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className={cn(
              "text-2xl font-bold",
              statusColor === "emerald" && "text-success",
              statusColor === "red" && "text-destructive",
              statusColor === "blue" && "text-info"
            )}>
              {progressPercent.toFixed(1)}%
            </div>
          </div>

          <div className="relative">
            <Progress 
              value={progressPercent} 
              className={cn(
                "h-3",
                statusColor === "red" && "[&>div]:bg-destructive",
                statusColor === "emerald" && "[&>div]:bg-success"
              )}
            />
            <div 
              className="absolute top-0 h-3 w-0.5 bg-warning"
              style={{ left: `${config.alertaPercentual}%` }}
              title={`Limite de alerta: ${config.alertaPercentual}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Faltam</p>
              <p className="text-sm font-semibold text-foreground">
                R$ {economiaFaltante.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Dias Restantes</p>
              <p className="text-sm font-semibold text-foreground">{diasRestantes}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Média/Dia</p>
              <p className="text-sm font-semibold text-foreground">
                R$ {mediaDiariaNecessaria.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span>Dados em tempo real do sistema</span>
          </div>
        </div>
      </Card>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent aria-describedby="dialog-desc" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurar Meta de Economia
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meta">Meta Mensal (R$)</Label>
              <Input
                id="meta"
                type="number"
                value={tempConfig.metaMensal}
                onChange={(e) => setTempConfig(prev => ({ 
                  ...prev, 
                  metaMensal: Number(e.target.value) || 0 
                }))}
                placeholder="10000"
              />
              <p className="text-xs text-muted-foreground">
                Valor alvo de economia para o mês
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alerta">Limite de Alerta (%)</Label>
              <Input
                id="alerta"
                type="number"
                min={0}
                max={100}
                value={tempConfig.alertaPercentual}
                onChange={(e) => setTempConfig(prev => ({ 
                  ...prev, 
                  alertaPercentual: Math.min(100, Math.max(0, Number(e.target.value) || 0))
                }))}
                placeholder="70"
              />
              <p className="text-xs text-muted-foreground">
                Exibir alerta quando abaixo deste percentual da meta
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Prévia</p>
              <div className="relative">
                <Progress 
                  value={(economiaAtual / tempConfig.metaMensal) * 100} 
                  className="h-2"
                />
                <div 
                  className="absolute top-0 h-2 w-0.5 bg-warning"
                  style={{ left: `${tempConfig.alertaPercentual}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Progresso atual: {((economiaAtual / tempConfig.metaMensal) * 100).toFixed(1)}% | 
                Alerta em: {tempConfig.alertaPercentual}%
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSettings}>
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
