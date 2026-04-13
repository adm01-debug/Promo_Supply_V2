import { Pen, Check, X, Calendar } from 'lucide-react';

export interface SignatureRequest {
  id: string;
  documentName: string;
  documentType: 'contract' | 'order' | 'quote' | 'other';
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  requestedBy: string;
  requestedAt: string;
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  expiresAt: string;
}

export const mockSignatureRequests: SignatureRequest[] = [
  {
    id: '1',
    documentName: 'Contrato de Fornecimento - XBZ Brindes',
    documentType: 'contract',
    status: 'pending',
    requestedBy: 'João Silva',
    requestedAt: '2024-12-18T10:30:00',
    expiresAt: '2024-12-25T23:59:59',
  },
  {
    id: '2',
    documentName: 'Pedido de Compra #PC-2024-0156',
    documentType: 'order',
    status: 'signed',
    requestedBy: 'Maria Santos',
    requestedAt: '2024-12-15T14:00:00',
    signedAt: '2024-12-16T09:15:00',
    signerName: 'Carlos Ferreira',
    signerEmail: 'carlos@empresa.com',
    expiresAt: '2024-12-22T23:59:59',
  },
  {
    id: '3',
    documentName: 'Cotação Aprovada - Equipamentos TI',
    documentType: 'quote',
    status: 'rejected',
    requestedBy: 'Ana Costa',
    requestedAt: '2024-12-10T08:00:00',
    expiresAt: '2024-12-17T23:59:59',
  },
];

export const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning', icon: Pen },
  signed: { label: 'Assinado', color: 'bg-success/10 text-success dark:bg-success/15 dark:text-success', icon: Check },
  rejected: { label: 'Rejeitado', color: 'bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive', icon: X },
  expired: { label: 'Expirado', color: 'bg-muted text-muted-foreground', icon: Calendar },
};

export const documentTypeConfig = {
  contract: { label: 'Contrato', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  order: { label: 'Pedido', color: 'bg-info/10 text-info dark:bg-info/15 dark:text-info' },
  quote: { label: 'Cotação', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  other: { label: 'Outro', color: 'bg-muted text-muted-foreground' },
};
