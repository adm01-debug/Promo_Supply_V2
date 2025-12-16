import { Eye, BarChart3, FileText, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Solicitacao } from "@/data/mockData";
import { getTipoLabel, getStatusColor } from "@/data/mockData";

interface SolicitacaoCardProps {
  solicitacao: Solicitacao;
}

const statusActions: Record<string, { 
  primary: { label: string; icon: any; href?: string } | null; 
  secondary: { label: string; icon: any } | null;
}> = {
  AGUARDANDO_COTACAO: {
    primary: { label: 'Cotar', icon: BarChart3, href: '/cotacao' },
    secondary: { label: 'Ver', icon: Eye },
  },
  EM_COTACAO: {
    primary: { label: 'Ver Cotações', icon: BarChart3, href: '/cotacao' },
    secondary: { label: 'Selecionar', icon: Check },
  },
  FORNECEDOR_SELECIONADO: {
    primary: { label: 'Gerar Pedido', icon: FileText },
    secondary: { label: 'Ver', icon: Eye },
  },
  AGUARDANDO_PAGAMENTO: {
    primary: { label: 'Pagar', icon: FileText },
    secondary: { label: 'Ver', icon: Eye },
  },
  PAGO: {
    primary: { label: 'Acompanhar', icon: Eye },
    secondary: null,
  },
  EM_TRANSITO: {
    primary: { label: 'Rastrear', icon: Eye },
    secondary: null,
  },
  PEDIDO_GERADO: {
    primary: { label: 'Ver Pedido', icon: Eye },
    secondary: null,
  },
  ENTREGUE: {
    primary: { label: 'Ver Detalhes', icon: Eye },
    secondary: null,
  },
};

export const SolicitacaoCard = ({ solicitacao }: SolicitacaoCardProps) => {
  const actions = statusActions[solicitacao.status];
  const statusColor = getStatusColor(solicitacao.status);

  return (
    <Card className="p-4 hover:shadow-md transition-all duration-200 border-l-4" style={{ borderLeftColor: `var(--${statusColor.replace('bg-', '')})` }}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-bold text-primary">#{solicitacao.id}</span>
            <span className="text-muted-foreground">|</span>
            <span className="font-semibold text-foreground truncate">{solicitacao.empresa}</span>
          </div>
          
          <p className="text-sm text-foreground mb-2">{solicitacao.produto}</p>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{solicitacao.quantidade} un</span>
            <span>•</span>
            <Badge variant="outline" className="text-xs">{getTipoLabel(solicitacao.tipo)}</Badge>
            <span>•</span>
            <span>Vendedor: {solicitacao.vendedor}</span>
            <span>•</span>
            <span>Prazo: {new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}</span>
          </div>

          {/* Info adicional por status */}
          {solicitacao.status === 'EM_COTACAO' && solicitacao.cotacoes && (
            <div className="mt-2 p-2 bg-yellow-500/10 rounded-md">
              <span className="text-xs text-yellow-600 font-medium">
                {solicitacao.cotacoes.length} cotações recebidas | Melhor: R$ {Math.min(...solicitacao.cotacoes.map(c => c.valorUnitario)).toFixed(2)}/un
              </span>
            </div>
          )}

          {solicitacao.status === 'FORNECEDOR_SELECIONADO' && solicitacao.fornecedorSelecionado && (
            <div className="mt-2 p-2 bg-blue-500/10 rounded-md">
              <span className="text-xs text-blue-600 font-medium">
                Fornecedor: {solicitacao.fornecedorSelecionado} | R$ {solicitacao.valorUnitario?.toFixed(2)}/un | Total: R$ {solicitacao.valorTotal?.toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          {actions?.secondary && (
            <Button variant="outline" size="sm">
              <actions.secondary.icon className="w-4 h-4 mr-1" />
              {actions.secondary.label}
            </Button>
          )}
          
          {actions?.primary && (
            <Button 
              size="sm" 
              asChild={!!actions.primary.href}
              className={cn(
                solicitacao.status === 'AGUARDANDO_COTACAO' && "bg-emerald-600 hover:bg-emerald-700",
                solicitacao.status === 'EM_COTACAO' && "bg-yellow-600 hover:bg-yellow-700",
                solicitacao.status === 'FORNECEDOR_SELECIONADO' && "bg-blue-600 hover:bg-blue-700",
                solicitacao.status === 'AGUARDANDO_PAGAMENTO' && "bg-orange-600 hover:bg-orange-700",
              )}
            >
              {actions.primary.href ? (
                <Link to={`${actions.primary.href}?id=${solicitacao.id}`}>
                  <actions.primary.icon className="w-4 h-4 mr-1" />
                  {actions.primary.label}
                </Link>
              ) : (
                <>
                  <actions.primary.icon className="w-4 h-4 mr-1" />
                  {actions.primary.label}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
