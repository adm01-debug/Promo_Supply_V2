import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns/parseISO";
import { isPast } from "date-fns/isPast";
import { differenceInDays } from "date-fns/differenceInDays";
import { isSameMonth } from "date-fns/isSameMonth";
import { isSameDay } from "date-fns/isSameDay";
import {
  Clock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Package,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryEvent {
  id: string;
  orderId: string;
  product: string;
  supplier: string;
  quantity: number;
  date: Date;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'delayed';
  type: 'delivery' | 'pickup' | 'partial';
}

export const statusConfig = {
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

export const typeConfig = {
  delivery: { label: 'Entrega', icon: Truck },
  pickup: { label: 'Coleta', icon: MapPin },
  partial: { label: 'Parcial', icon: Package },
};

export function useDeliveryEvents() {
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

  return deliveryEvents;
}

export function useMonthStats(deliveryEvents: DeliveryEvent[], currentMonth: Date) {
  return useMemo(() => {
    const monthEvents = deliveryEvents.filter(e => isSameMonth(e.date, currentMonth));
    return {
      total: monthEvents.length,
      scheduled: monthEvents.filter(e => e.status === 'scheduled').length,
      inTransit: monthEvents.filter(e => e.status === 'in_transit').length,
      delivered: monthEvents.filter(e => e.status === 'delivered').length,
      delayed: monthEvents.filter(e => e.status === 'delayed').length,
    };
  }, [deliveryEvents, currentMonth]);
}

export function useUpcomingDeliveries(deliveryEvents: DeliveryEvent[]) {
  return useMemo(() => {
    const today = new Date();
    return deliveryEvents
      .filter(e => {
        const daysUntil = differenceInDays(e.date, today);
        return daysUntil >= 0 && daysUntil <= 7 && e.status !== 'delivered';
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [deliveryEvents]);
}

export function getEventsForDay(deliveryEvents: DeliveryEvent[], date: Date) {
  return deliveryEvents.filter(event => isSameDay(event.date, date));
}
