import { useState } from 'react';
import { format } from 'date-fns';
import { Gavel, Plus, Trophy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useLicitacaoPropostas, type Licitacao } from '@/hooks/useLicitacoes';

const modalidadeLabels: Record<string, string> = {
  pregao: 'Pregão', concorrencia: 'Concorrência',
  tomada_precos: 'Tomada de Preços', convite: 'Convite', leilao: 'Leilão',
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  publicada: { label: 'Publicada', variant: 'default' },
  em_andamento: { label: 'Em Andamento', variant: 'default' },
  encerrada: { label: 'Encerrada', variant: 'outline' },
  homologada: { label: 'Homologada', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
  deserta: { label: 'Deserta', variant: 'destructive' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface LicitacaoDetailDialogProps {
  licitacao: Licitacao;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Licitacao>) => Promise<boolean>;
  fornecedores: any[];
}

export function LicitacaoDetailDialog({
  licitacao, open, onClose, onUpdate, fornecedores,
}: LicitacaoDetailDialogProps) {
  const { propostas, isLoading: loadingPropostas, addProposta, selectWinner } = useLicitacaoPropostas(licitacao.id);
  const [addingProposta, setAddingProposta] = useState(false);
  const [propostaForm, setPropostaForm] = useState({ fornecedor_id: '', valor_proposta: '', prazo_entrega: '', observacoes: '' });

  const handleAddProposta = async () => {
    const result = await addProposta({
      fornecedor_id: propostaForm.fornecedor_id,
      valor_proposta: parseFloat(propostaForm.valor_proposta) || 0,
      prazo_entrega: parseInt(propostaForm.prazo_entrega) || 0,
      observacoes: propostaForm.observacoes || null,
      score_preco: licitacao.valor_estimado > 0
        ? Math.max(0, 100 - ((parseFloat(propostaForm.valor_proposta) || 0) / licitacao.valor_estimado - 1) * 100)
        : 50,
    });
    if (result) {
      setAddingProposta(false);
      setPropostaForm({ fornecedor_id: '', valor_proposta: '', prazo_entrega: '', observacoes: '' });
    }
  };

  const canManage = ['rascunho', 'publicada', 'em_andamento'].includes(licitacao.status);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent aria-describedby="dialog-desc" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            {licitacao.numero} — {licitacao.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge variant={statusConfig[licitacao.status]?.variant || 'secondary'}>
                {statusConfig[licitacao.status]?.label || licitacao.status}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Modalidade</p>
              <p className="font-medium">{modalidadeLabels[licitacao.modalidade] || licitacao.modalidade}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Estimado</p>
              <p className="font-medium">{formatCurrency(licitacao.valor_estimado)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Abertura</p>
              <p className="font-medium">
                {licitacao.data_abertura ? format(new Date(licitacao.data_abertura), 'dd/MM/yyyy HH:mm') : '—'}
              </p>
            </div>
          </div>

          {licitacao.objeto && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Objeto</p>
              <p className="text-sm">{licitacao.objeto}</p>
            </div>
          )}

          {/* Status Actions */}
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              {licitacao.status === 'rascunho' && (
                <Button size="sm" onClick={() => onUpdate(licitacao.id, { status: 'publicada', data_publicacao: new Date().toISOString() })}>
                  Publicar
                </Button>
              )}
              {licitacao.status === 'publicada' && (
                <Button size="sm" onClick={() => onUpdate(licitacao.id, { status: 'em_andamento' })}>
                  Iniciar Processo
                </Button>
              )}
              {licitacao.status === 'em_andamento' && (
                <Button size="sm" onClick={() => onUpdate(licitacao.id, { status: 'encerrada' })}>
                  Encerrar Recebimento
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => onUpdate(licitacao.id, { status: 'cancelada' })}>
                Cancelar
              </Button>
            </div>
          )}

          <Separator />

          {/* Proposals */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Propostas ({propostas.length})
            </h3>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setAddingProposta(true)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Proposta
              </Button>
            )}
          </div>

          {loadingPropostas ? (
            <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : propostas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma proposta registrada</p>
          ) : (
            <Table aria-label="Propostas da licitação">
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostas.map(p => (
                  <TableRow key={p.id} className={p.vencedora ? 'bg-success/5' : ''}>
                    <TableCell className="font-medium">{(p as any).fornecedor?.razao_social || '—'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.valor_proposta)}</TableCell>
                    <TableCell className="hidden md:table-cell">{p.prazo_entrega} dias</TableCell>
                    <TableCell>
                      {p.vencedora ? (
                        <Badge className="bg-success/20 text-success">🏆 Vencedora</Badge>
                      ) : (
                        <Badge variant="outline">{p.status === 'aprovada' ? 'Aprovada' : p.status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage && !p.vencedora && licitacao.status === 'encerrada' && (
                        <Button size="sm" variant="outline" onClick={() => selectWinner(p.id)}>
                          <Trophy className="w-3 h-3 mr-1" /> Selecionar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Add Proposal Form */}
          {addingProposta && (
            <>
              <Separator />
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium">Nova Proposta</h4>
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select value={propostaForm.fornecedor_id} onValueChange={v => setPropostaForm(f => ({ ...f, fornecedor_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {fornecedores.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" value={propostaForm.valor_proposta} onChange={e => setPropostaForm(f => ({ ...f, valor_proposta: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo (dias)</Label>
                    <Input type="number" value={propostaForm.prazo_entrega} onChange={e => setPropostaForm(f => ({ ...f, prazo_entrega: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={propostaForm.observacoes} onChange={e => setPropostaForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddProposta} disabled={!propostaForm.fornecedor_id || !propostaForm.valor_proposta}>
                    Salvar Proposta
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingProposta(false)}>Cancelar</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
