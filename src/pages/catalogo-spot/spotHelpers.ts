import { toast } from '@/lib/feedbackToast';

/** As 6 coleções multi-valor do campo `Catalogs` da API oficial SPOT. */
export const SPOT_COLLECTIONS: readonly string[] = [
  'SPOT',
  'Stockout',
  'Our Nature',
  'Últimas Chegadas',
  'Novidades',
  'Agendas 2026',
];

export interface SpotCategoryFilter {
  name: string;
  /** TypeCode legado (numérico curto). */
  legacy: string | null;
  /** TypeCodes do sistema novo (zero-padded). Filtro sempre usa OR com o legado. */
  modern: string[];
}

/** Categorias oficiais — dois sistemas de TypeCode coexistem, filtrar com OR. */
export const SPOT_CATEGORY_FILTERS: readonly SpotCategoryFilter[] = [
  { name: 'Squeezes & Copos', legacy: '10', modern: ['0035'] },
  { name: 'Tecnologia', legacy: '3', modern: ['0029'] },
  { name: 'Casa, Restauração & Bar', legacy: '8', modern: ['0036'] },
  { name: 'Escrita', legacy: '2', modern: ['0031'] },
  { name: 'Sacolas & Bolsas Térmicas', legacy: '9', modern: ['0033'] },
  { name: 'Mochilas, Malas & Pastas', legacy: '5', modern: ['0032'] },
  { name: 'Escritório', legacy: '4', modern: ['0030'] },
  { name: 'Chaveiros', legacy: '7', modern: ['0038'] },
  { name: 'Sol & Chuva', legacy: '11', modern: ['0040'] },
  { name: 'Pessoal & Viagem', legacy: '6', modern: ['0037'] },
  { name: 'Esporte & Ar Livre', legacy: null, modern: ['0028', '0034'] },
  { name: 'Criança & Escolar', legacy: '12', modern: ['0039'] },
  { name: 'SUCO (Camisetas)', legacy: '23', modern: [] },
];


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
