import { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Package,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isPast,
  differenceInDays,
  isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryEvent {
  id: string;
  orderId: string;
  product: string;
  supplier: string;
  quantity: number;
  date: Date;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'delayed';
  type: 'delivery' | 'pickup' | 'partial';
}

const statusConfig = {
  scheduled: {
    label: 'Agendado',
    color: 'bg-info',
    textColor: 'text-info',
    icon: Clock,
  },
  in_transit: {
    label: 'Em Trânsito',
    color: 'bg-warning',
    textColor: 'text-warning',
    icon: Truck,
  },
  delivered: {
    label: 'Entregue',
    color: 'bg-success',
    textColor: 'text-success',
    icon: CheckCircle2,
  },
  delayed: {
    label: 'Atrasado',
    color: 'bg-destructive',
    textColor: 'text-destructive',
    icon: AlertTriangle,
  },
};

const typeConfig = {
  delivery: { label: 'Entrega', icon: Truck },
  pickup: { label: 'Coleta', icon: MapPin },
  partial: { label: 'Parcial', icon: Package },
};

export function DeliveryCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<DeliveryEvent | null>(null);

  // Fetch real pedidos from Supabase
  const { data: pedidos = [] } = useQuery({
    queryKey: ['delivery-calendar-pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, status, data_previsao, data_entrega, valor_total, fornecedor_id, fornecedor:fornecedores(razao_social, nome_fantasia), pedido_itens(descricao, quantidade)')
        .order('data_previsao', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const deliveryEvents = useMemo((): DeliveryEvent[] => {
    return pedidos.map((pedido, index) => {
      const deliveryDate = pedido.data_previsao || pedido.data_entrega;
      let date: Date;
      try {
        date = deliveryDate ? parseISO(deliveryDate) : new Date();
        if (isNaN(date.getTime())) date = new Date();
      } catch {
        date = new Date();
      }

      let status: DeliveryEvent['status'] = 'scheduled';
      if (pedido.status === 'entregue' || pedido.status === 'recebido') {
        status = 'delivered';
      } else if (pedido.status === 'em_transito') {
        status = 'in_transit';
      } else if (isPast(date) && pedido.status !== 'entregue' && pedido.status !== 'recebido') {
        status = 'delayed';
      }

      const fornecedor = pedido.fornecedor as any;
      const itens = pedido.pedido_itens as any[];
      const productName = itens?.[0]?.descricao || `Pedido #${pedido.numero}`;
      const totalQty = itens?.reduce((acc: number, i: any) => acc + (i.quantidade || 0), 0) || 1;

      return {
        id: pedido.id,
        orderId: pedido.numero,
        product: productName,
        supplier: fornecedor?.nome_fantasia || fornecedor?.razao_social || 'Fornecedor',
        quantity: totalQty,
        date,
        status,
        type: index % 3 === 0 ? 'pickup' : index % 5 === 0 ? 'partial' : 'delivery',
      };
    });
  }, [pedidos]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  
  const getEventsForDay = (date: Date) => {
    return deliveryEvents.filter(event => isSameDay(event.date, date));
  };

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const monthStats = useMemo(() => {
    const monthEvents = deliveryEvents.filter(e => isSameMonth(e.date, currentMonth));
    return {
      total: monthEvents.length,
      scheduled: monthEvents.filter(e => e.status === 'scheduled').length,
      inTransit: monthEvents.filter(e => e.status === 'in_transit').length,
      delivered: monthEvents.filter(e => e.status === 'delivered').length,
      delayed: monthEvents.filter(e => e.status === 'delayed').length,
    };
  }, [deliveryEvents, currentMonth]);

  const upcomingDeliveries = useMemo(() => {
    const today = new Date();
    return deliveryEvents
      .filter(e => {
        const daysUntil = differenceInDays(e.date, today);
        return daysUntil >= 0 && daysUntil <= 7 && e.status !== 'delivered';
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [deliveryEvents]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold">Calendário de Entregas</span>
          </div>
          <div className="flex items-center gap-2">
            {monthStats.delayed > 0 && (
              <Badge variant="destructive" className="text-xs">
                {monthStats.delayed} atrasados
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {monthStats.total} entregas no mês
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-sm font-medium capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {daysInMonth.map(day => {
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;
                const hasDelayed = dayEvents.some(e => e.status === 'delayed');
                const hasInTransit = dayEvents.some(e => e.status === 'in_transit');
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <TooltipProvider key={day.toISOString()}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            "aspect-square rounded-lg text-sm relative transition-all",
                            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                            isToday(day) && "ring-2 ring-primary",
                            isSelected && "bg-primary text-primary-foreground",
                            !isSelected && hasDelayed && "bg-destructive/10",
                            !isSelected && hasInTransit && !hasDelayed && "bg-warning/10",
                            !isSelected && hasEvents && !hasDelayed && !hasInTransit && "bg-info/10"
                          )}
                          onClick={() => setSelectedDate(day)}
                        >
                          <span className={cn(
                            "absolute inset-0 flex items-center justify-center",
                            isToday(day) && !isSelected && "font-bold text-primary"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {hasEvents && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {dayEvents.slice(0, 3).map((event, i) => (
                                <span key={i} className={cn("w-1.5 h-1.5 rounded-full", statusConfig[event.status].color)} />
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                              )}
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      {hasEvents && (
                        <TooltipContent>
                          <p className="font-medium">{dayEvents.length} entrega(s)</p>
                          <ul className="text-xs mt-1 space-y-0.5">
                            {dayEvents.slice(0, 3).map(e => (
                              <li key={e.id} className="flex items-center gap-1">
                                <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig[e.status].color)} />
                                {e.product.slice(0, 20)}...
                              </li>
                            ))}
                          </ul>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
              {Object.entries(statusConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <span className={cn("w-2 h-2 rounded-full", config.color)} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Próximas Entregas</h4>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2 pr-2">
                {upcomingDeliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma entrega nos próximos 7 dias</p>
                ) : (
                  upcomingDeliveries.map(event => {
                    const StatusIcon = statusConfig[event.status].icon;
                    const daysUntil = differenceInDays(event.date, new Date());
                    return (
                      <button
                        key={event.id}
                        className={cn(
                          "w-full p-3 rounded-lg border text-left transition-colors hover:bg-muted/50",
                          event.status === 'delayed' && "border-red-500/30 bg-destructive/5"
                        )}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start gap-2">
                          <StatusIcon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", statusConfig[event.status].textColor)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.product}</p>
                            <p className="text-xs text-muted-foreground truncate">{event.supplier}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn("text-[10px] h-5", statusConfig[event.status].textColor)}>
                                {daysUntil === 0 ? 'Hoje' : `${daysUntil}d`}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{format(event.date, 'dd/MM')}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {selectedDate && selectedDateEvents.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-3">
              Entregas em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {selectedDateEvents.map(event => {
                const StatusIcon = statusConfig[event.status].icon;
                const TypeIcon = typeConfig[event.type].icon;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                      event.status === 'delayed' && "border-red-500/30"
                    )}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">#{event.orderId}</Badge>
                      <StatusIcon className={cn("w-4 h-4", statusConfig[event.status].textColor)} />
                    </div>
                    <p className="text-sm font-medium truncate">{event.product}</p>
                    <p className="text-xs text-muted-foreground truncate">{event.supplier}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <TypeIcon className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{typeConfig[event.type].label}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{event.quantity} un.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Detalhes da Entrega
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">#{selectedEvent.orderId}</Badge>
                <Badge className={cn(statusConfig[selectedEvent.status].color, "text-primary-foreground")}>
                  {statusConfig[selectedEvent.status].label}
                </Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p className="font-medium">{selectedEvent.product}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Fornecedor</p>
                    <p className="text-sm">{selectedEvent.supplier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantidade</p>
                    <p className="text-sm">{selectedEvent.quantity} unidades</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Data Prevista</p>
                    <p className="text-sm">{format(selectedEvent.date, "dd/MM/yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="text-sm flex items-center gap-1">
                      {(() => {
                        const TypeIcon = typeConfig[selectedEvent.type].icon;
                        return <TypeIcon className="w-3.5 h-3.5" />;
                      })()}
                      {typeConfig[selectedEvent.type].label}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1" size="sm">Ver Pedido</Button>
                <Button className="flex-1" size="sm">Rastrear Entrega</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
