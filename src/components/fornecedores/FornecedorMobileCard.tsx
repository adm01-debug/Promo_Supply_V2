import React from 'react';
import { Edit, History, Mail, Phone, MessageCircle, Star, Plug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SwipeableListItem, type SwipeAction } from '@/components/mobile/SwipeableListItem';
import { useIsMobile } from '@/hooks/use-mobile';

interface FornecedorCardData {
  id: string;
  nomeFantasia: string;
  cnpj: string;
  tipo: 'IMPORTADORA' | 'FABRICANTE' | 'DISTRIBUIDORA';
  ramos: string[];
  email: string;
  telefone: string;
  whatsapp: string;
  apiIntegrada: boolean;
  rating: number;
}

interface FornecedorMobileCardProps {
  fornecedor: FornecedorCardData;
  onEdit?: () => void;
  onHistory?: () => void;
  onDelete?: () => void;
}

const getTipoLabel = (tipo: FornecedorCardData['tipo']) => {
  const labels = { IMPORTADORA: 'Importadora', FABRICANTE: 'Fabricante', DISTRIBUIDORA: 'Distribuidora' };
  return labels[tipo];
};

const getTipoBadgeColor = (tipo: FornecedorCardData['tipo']) => {
  const colors = { 
    IMPORTADORA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    FABRICANTE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    DISTRIBUIDORA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  };
  return colors[tipo];
};

export function FornecedorMobileCard({ 
  fornecedor, 
  onEdit, 
  onHistory,
  onDelete 
}: FornecedorMobileCardProps) {
  const isMobile = useIsMobile();

  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (onHistory) {
    leftActions.push({
      id: 'history',
      icon: <History className="w-5 h-5" />,
      label: 'Histórico',
      color: 'bg-primary',
      onClick: onHistory,
    });
  }

  if (onEdit) {
    leftActions.push({
      id: 'edit',
      icon: <Edit className="w-5 h-5" />,
      label: 'Editar',
      color: 'bg-blue-500',
      onClick: onEdit,
    });
  }

  const cardContent = (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-foreground truncate">{fornecedor.nomeFantasia}</p>
            {fornecedor.apiIntegrada && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shrink-0">
                <Plug className="w-3 h-3" />
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">{fornecedor.cnpj || 'Sem CNPJ'}</p>
          
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className={getTipoBadgeColor(fornecedor.tipo)}>
              {getTipoLabel(fornecedor.tipo)}
            </Badge>
            {fornecedor.ramos.slice(0, 2).map(ramo => (
              <Badge key={ramo} variant="secondary" className="text-xs">
                {ramo}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-3 h-3 ${i < fornecedor.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} 
              />
            ))}
          </div>
        </div>

        {/* Contact buttons - visible on desktop */}
        {!isMobile && (
          <div className="flex gap-1 shrink-0">
            {fornecedor.email && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => window.open(`mailto:${fornecedor.email}`)}
              >
                <Mail className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            {fornecedor.telefone && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => window.open(`tel:${fornecedor.telefone}`)}
              >
                <Phone className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            {fornecedor.whatsapp && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => window.open(`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g, '')}`)}
              >
                <MessageCircle className="w-4 h-4 text-emerald-500" />
              </Button>
            )}
            {onHistory && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onHistory}>
                <History className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit className="w-4 h-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Contact row for mobile */}
      {isMobile && (
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {fornecedor.email && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(`mailto:${fornecedor.email}`)}
            >
              <Mail className="w-4 h-4 mr-1" />
              Email
            </Button>
          )}
          {fornecedor.whatsapp && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => window.open(`https://wa.me/55${fornecedor.whatsapp.replace(/\D/g, '')}`)}
            >
              <MessageCircle className="w-4 h-4 mr-1 text-emerald-500" />
              WhatsApp
            </Button>
          )}
        </div>
      )}
    </Card>
  );

  if (isMobile && (leftActions.length > 0 || onDelete)) {
    return (
      <SwipeableListItem 
        leftActions={leftActions.length > 0 ? leftActions : undefined}
        onDelete={onDelete}
      >
        {cardContent}
      </SwipeableListItem>
    );
  }

  return cardContent;
}
