import { Badge } from '@/components/ui/badge';
import { Star, CheckCircle2, AlertTriangle } from 'lucide-react';
import { type PurchaseRecord } from '@/hooks/usePurchaseHistory';

export const QualityStars = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-3 h-3 ${star <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
      />
    ))}
    <span className="text-xs text-muted-foreground ml-1">({rating.toFixed(1)})</span>
  </div>
);

export const DeliveryBadge = ({ onTime }: { onTime: boolean }) => (
  <Badge
    variant={onTime ? "default" : "secondary"}
    className={`text-xs ${onTime ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}
  >
    {onTime ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
    {onTime ? "No prazo" : "Atrasado"}
  </Badge>
);

export const StatusBadge = ({ status }: { status: PurchaseRecord["status"] }) => {
  const config = {
    pending: { label: "Pendente", color: "bg-warning/10 text-warning border-warning/20" },
    shipped: { label: "Enviado", color: "bg-info/10 text-info border-info/20" },
    delivered: { label: "Entregue", color: "bg-success/10 text-success border-success/20" },
    returned: { label: "Devolvido", color: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  return <Badge variant="outline" className={`text-xs ${config[status].color}`}>{config[status].label}</Badge>;
};

export const COLORS = [
  "hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(221, 83%, 53%)",
  "hsl(262, 83%, 58%)", "hsl(38, 92%, 50%)",
];
