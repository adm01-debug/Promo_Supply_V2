import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, Clock, FileText, ChevronDown, ChevronUp,
  CalendarDays, User, Building2, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { differenceInDays } from "date-fns/differenceInDays";
import { differenceInHours } from "date-fns/differenceInHours";
import { isPast } from "date-fns/isPast";
import { ptBR } from "date-fns/locale/pt-BR";
import { AlertTriangle, Timer, CheckCircle2 } from "lucide-react";
import { 
  type TimelineStep, 
  type EnhancedPedidoTimelineProps, 
  iconesPorEtapa, 
  statusColors 
} from "./timeline/timelineConfig";

export type { TimelineStep };
export const EnhancedPedidoTimeline = ({ 
  etapas, 
  pedidoNumero,
  fornecedor,
  valorTotal,
  prazoFinal,
  orientacao = 'vertical',
  showDetails = true 
}: EnhancedPedidoTimelineProps) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  const progressPercent = Math.round(
    (etapas.filter(e => e.status === 'concluido').length / etapas.length) * 100
  );

  const etapaAtual = etapas.find(e => e.status === 'atual');
  const prazoInfo = prazoFinal ? calcularPrazo(prazoFinal) : null;

  function calcularPrazo(prazo: string) {
    const prazoDate = parseISO(prazo);
    const hoje = new Date();
    const diasRestantes = differenceInDays(prazoDate, hoje);
    const horasRestantes = differenceInHours(prazoDate, hoje);
    const atrasado = isPast(prazoDate);

    if (atrasado) {
      return {
        label: `${Math.abs(diasRestantes)} dia(s) atrasado`,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        icon: AlertTriangle,
      };
    }

    if (diasRestantes === 0) {
      return {
        label: `Vence hoje (${horasRestantes}h)`,
        color: "text-warning",
        bgColor: "bg-warning/10",
        icon: Timer,
      };
    }

    if (diasRestantes <= 3) {
      return {
        label: `${diasRestantes} dia(s) restante(s)`,
        color: "text-warning",
        bgColor: "bg-warning/10",
        icon: Timer,
      };
    }

    return {
      label: `${diasRestantes} dias restantes`,
      color: "text-success",
      bgColor: "bg-success/10",
      icon: CheckCircle2,
    };
  }

  if (orientacao === 'horizontal') {
    return (
      <div className="space-y-6">
        {/* Header com informações do pedido */}
        {showDetails && (pedidoNumero || fornecedor || valorTotal) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b"
          >
            <div className="flex items-center gap-4">
              {pedidoNumero && (
                <Badge variant="outline" className="text-base font-semibold py-1.5 px-3">
                  #{pedidoNumero}
                </Badge>
              )}
              {fornecedor && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  {fornecedor}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {valorTotal && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                </Badge>
              )}
              {prazoInfo && (
                <Badge className={cn(prazoInfo.bgColor, prazoInfo.color, "border-0 gap-1")}>
                  <prazoInfo.icon className="w-3 h-3" />
                  {prazoInfo.label}
                </Badge>
              )}
            </div>
          </motion.div>
        )}

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold text-primary">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Timeline horizontal */}
        <div className="relative pt-4">
          {/* Linha base */}
          <div className="absolute top-9 left-0 right-0 h-1 bg-border rounded-full" />
          
          {/* Linha de progresso */}
          <motion.div
            className="absolute top-9 left-0 h-1 bg-gradient-to-r from-success via-primary to-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(etapas.filter(e => e.status === 'concluido').length / (etapas.length - 1)) * 100}%` 
            }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          />

          <div className="relative flex justify-between">
            {etapas.map((etapa, index) => {
              const Icone = iconesPorEtapa[etapa.id] || Check;
              const colors = statusColors[etapa.status];

              return (
                <TooltipProvider key={etapa.id}>
                  <Tooltip>
                    <TooltipTrigger className="cursor-pointer">
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                        className="flex flex-col items-center group"
                        onClick={() => setExpandedStep(expandedStep === etapa.id ? null : etapa.id)}
                      >
                        {/* Círculo */}
                        <motion.div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 transition-all",
                            colors.bg,
                            colors.border,
                            etapa.status === 'atual' && "ring-4 ring-primary/20",
                            colors.glow && `shadow-lg ${colors.glow}`,
                            "group-hover:scale-110"
                          )}
                          animate={etapa.status === 'atual' ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          {etapa.status === 'concluido' ? (
                            <Check className={cn("w-5 h-5", colors.icon)} />
                          ) : (
                            <Icone className={cn("w-5 h-5", colors.icon)} />
                          )}
                        </motion.div>

                        {/* Label */}
                        <div className="mt-3 text-center max-w-24">
                          <p className={cn("text-xs font-medium truncate", colors.text)}>
                            {etapa.nome}
                          </p>
                          {etapa.data && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {etapa.data}
                            </p>
                          )}
                          {etapa.status === 'atual' && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                            >
                              Atual
                            </motion.span>
                          )}
                        </div>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{etapa.nome}</p>
                        {etapa.descricao && <p className="text-xs text-muted-foreground">{etapa.descricao}</p>}
                        {etapa.responsavel && (
                          <p className="text-xs flex items-center gap-1">
                            <User className="w-3 h-3" /> {etapa.responsavel}
                          </p>
                        )}
                        {etapa.duracao && (
                          <p className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {etapa.duracao}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>

        {/* Detalhes da etapa expandida */}
        <AnimatePresence>
          {expandedStep && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {etapas.filter(e => e.id === expandedStep).map(etapa => (
                <Card key={etapa.id} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        {etapa.nome}
                        <Badge variant="outline" className={statusColors[etapa.status].text}>
                          {etapa.status === 'concluido' ? 'Concluído' : 
                           etapa.status === 'atual' ? 'Em andamento' : 
                           etapa.status === 'erro' ? 'Erro' : 'Pendente'}
                        </Badge>
                      </h4>
                      {etapa.descricao && <p className="text-sm text-muted-foreground">{etapa.descricao}</p>}
                      <div className="flex flex-wrap gap-4 text-sm">
                        {etapa.dataReal && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <CalendarDays className="w-4 h-4" />
                            {format(parseISO(etapa.dataReal), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {etapa.responsavel && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-4 h-4" />
                            {etapa.responsavel}
                          </span>
                        )}
                        {etapa.duracao && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {etapa.duracao}
                          </span>
                        )}
                      </div>
                      {etapa.observacoes && (
                        <p className="text-sm bg-background p-2 rounded-lg border">
                          💬 {etapa.observacoes}
                        </p>
                      )}
                    </div>
                    {etapa.documentos && etapa.documentos.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Documentos:</p>
                        {etapa.documentos.map((doc, i) => (
                          <Button key={i} variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            <FileText className="w-3 h-3" />
                            {doc.nome}
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Orientação vertical
  return (
    <div className="space-y-6">
      {/* Header com informações do pedido */}
      {showDetails && (pedidoNumero || fornecedor || valorTotal) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b"
        >
          <div className="flex items-center gap-4">
            {pedidoNumero && (
              <Badge variant="outline" className="text-base font-semibold py-1.5 px-3">
                #{pedidoNumero}
              </Badge>
            )}
            {fornecedor && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {fornecedor}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {valorTotal && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
              </Badge>
            )}
            {prazoInfo && (
              <Badge className={cn(prazoInfo.bgColor, prazoInfo.color, "border-0 gap-1")}>
                <prazoInfo.icon className="w-3 h-3" />
                {prazoInfo.label}
              </Badge>
            )}
          </div>
        </motion.div>
      )}

      {/* Progress summary */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progresso do Pedido</span>
            <span className="font-semibold text-primary">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
        {etapaAtual && (
          <Badge variant="outline" className="gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {etapaAtual.nome}
          </Badge>
        )}
      </div>

      {/* Timeline vertical */}
      <div className="relative pl-2">
        {etapas.map((etapa, index) => {
          const Icone = iconesPorEtapa[etapa.id] || Check;
          const colors = statusColors[etapa.status];
          const isLast = index === etapas.length - 1;
          const isExpanded = expandedStep === etapa.id;

          return (
            <motion.div
              key={etapa.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex gap-4"
            >
              {/* Linha vertical e círculo */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all",
                    colors.bg,
                    colors.border,
                    etapa.status === 'atual' && "ring-4 ring-primary/20",
                    colors.glow && `shadow-lg ${colors.glow}`
                  )}
                  animate={etapa.status === 'atual' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {etapa.status === 'concluido' ? (
                    <Check className={cn("w-5 h-5", colors.icon)} />
                  ) : (
                    <Icone className={cn("w-5 h-5", colors.icon)} />
                  )}
                </motion.div>
                {!isLast && (
                  <motion.div
                    className={cn(
                      "w-0.5 flex-1 min-h-[4rem] transition-colors",
                      etapa.status === 'concluido' ? colors.line : "bg-border"
                    )}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                  />
                )}
              </div>

              {/* Conteúdo */}
              <div className={cn("flex-1 pb-6", !isLast && "pb-8")}>
                <div 
                  className={cn(
                    "p-4 rounded-lg border transition-all cursor-pointer",
                    etapa.status === 'atual' && "bg-primary/5 border-primary/30",
                    etapa.status === 'concluido' && "bg-success/5 border-success/20",
                    etapa.status === 'erro' && "bg-destructive/5 border-destructive/30",
                    etapa.status === 'pendente' && "bg-muted/30 border-border",
                    "hover:shadow-md"
                  )}
                  onClick={() => setExpandedStep(isExpanded ? null : etapa.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn("font-semibold", colors.text)}>
                          {etapa.nome}
                        </h4>
                        {etapa.status === 'atual' && (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">
                            Em andamento
                          </Badge>
                        )}
                        {etapa.status === 'erro' && (
                          <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
                            Erro
                          </Badge>
                        )}
                      </div>
                      {etapa.data && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {etapa.data}
                        </p>
                      )}
                      {etapa.descricao && (
                        <p className="text-sm text-muted-foreground mt-2">{etapa.descricao}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {/* Detalhes expandidos */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="flex flex-wrap gap-4 text-sm">
                            {etapa.responsavel && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <User className="w-4 h-4" />
                                {etapa.responsavel}
                              </span>
                            )}
                            {etapa.duracao && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                Duração: {etapa.duracao}
                              </span>
                            )}
                          </div>
                          {etapa.observacoes && (
                            <div className="p-3 rounded-lg bg-background border">
                              <p className="text-sm">💬 {etapa.observacoes}</p>
                            </div>
                          )}
                          {etapa.documentos && etapa.documentos.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Documentos anexados:</p>
                              <div className="flex flex-wrap gap-2">
                                {etapa.documentos.map((doc, i) => (
                                  <Button key={i} variant="outline" size="sm" className="h-8 text-xs gap-1">
                                    <FileText className="w-3 h-3" />
                                    {doc.nome}
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
