import { toast } from 'sonner';

export const STATUS_CONFIG: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  'Submetida': { variant: 'outline', label: 'Submetida' },
  'Em processamento': { variant: 'secondary', label: 'Em processamento' },
  'Processada': { variant: 'outline', label: 'Processada' },
  'Aguardando Pagamento': { variant: 'outline', label: 'Aguardando Pagamento' },
  'Pago': { variant: 'default', label: 'Pago' },
  'Pendencia Layout': { variant: 'secondary', label: 'Pendência Layout' },
  'Em Separação': { variant: 'secondary', label: 'Em Separação' },
  'Em Produção': { variant: 'default', label: 'Em Produção' },
  'Expedida': { variant: 'default', label: 'Expedida' },
  'Anulada': { variant: 'destructive', label: 'Anulada' },
};

export const openExternalSpotUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl, 'https://www.spotgifts.com.br');
    if (url.hostname !== 'www.spotgifts.com.br' && url.hostname !== 'spotgifts.com.br') {
      toast.error('URL externa inválida bloqueada por segurança');
      return;
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  } catch {
    toast.error('Não foi possível abrir o link');
  }
};

export const extractSpotProductId = (rawValue: string, fallback = '') => {
  try {
    const url = new URL(rawValue, 'https://www.spotgifts.com.br');
    return url.pathname.match(/\/(\d+)\/?$/)?.[1] || url.searchParams.get('prod') || fallback;
  } catch {
    return fallback;
  }
};
