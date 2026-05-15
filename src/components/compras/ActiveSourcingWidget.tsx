import { useSourcingEvents } from "@/hooks/useLicitacoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { ptBR } from "date-fns/locale/pt-BR";

export const ActiveSourcingWidget = () => {
  const { events, isLoading } = useSourcingEvents();

  const activeEvents = events.filter(e => e.status === 'published' || e.status === 'in_progress');

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            RFx Ativos
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {activeEvents.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activeEvents.length > 0 ? (
          <div className="space-y-3">
            {activeEvents.slice(0, 4).map((event: any) => (
              <div key={event.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-transparent hover:border-border transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{event.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] h-5 uppercase">
                      {event.type}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(event.closes_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs font-bold text-foreground">
                    {event.budget_estimate?.toLocaleString('pt-BR', { style: 'currency', currency: event.currency })}
                  </p>
                  <Link to={`/sourcing`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {activeEvents.length > 4 && (
              <Link to="/sourcing">
                <Button variant="link" className="w-full text-xs text-muted-foreground h-auto p-0 pt-2">
                  Ver mais {activeEvents.length - 4} eventos...
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Gavel className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum evento de sourcing em andamento</p>
            <Link to="/sourcing">
              <Button variant="outline" size="sm" className="mt-4">Criar Evento</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
