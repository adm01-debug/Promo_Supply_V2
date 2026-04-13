import { useState } from 'react';
import { format } from 'date-fns';
import { Gavel, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useLicitacaoPropostas, type Licitacao } from '@/hooks/useLicitacoes';
import { cn } from '@/lib/utils';

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

export { modalidadeLabels, statusConfig };

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
            <Skeleton className="h-20 w-full" />
          ) : propostas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma proposta registrada</p>
          ) : (
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Prazo (dias)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostas.map(p => (
                  <TableRow key={p.id} className={cn(p.vencedora && 'bg-primary/5')}>
                    <TableCell className="font-medium">
                      {p.fornecedor?.razao_social || 'Fornecedor'}
                      {p.vencedora && <Trophy className="w-4 h-4 text-primary inline ml-2" />}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(p.valor_proposta)}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{p.prazo_entrega}</TableCell>
                    <TableCell>
                      <Badge variant={p.vencedora ? 'default' : p.desclassificada ? 'destructive' : 'secondary'}>
                        {p.vencedora ? 'Vencedora' : p.desclassificada ? 'Desclassificada' : p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!p.vencedora && !p.desclassificada && licitacao.status === 'encerrada' && (
                        <Button size="sm" variant="outline" onClick={() => selectWinner(p.id, p.fornecedor_id, p.valor_proposta)}>
                          <Trophy className="w-3 h-3 mr-1" /> Homologar
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
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-sm">Nova Proposta</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fornecedor *</Label>
                    <Select value={propostaForm.fornecedor_id} onValueChange={v => setPropostaForm(f => ({ ...f, fornecedor_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {fornecedores.filter((f: any) => f.status === 'ativo').map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor (R$) *</Label>
                    <Input type="number" value={propostaForm.valor_proposta} onChange={e => setPropostaForm(f => ({ ...f, valor_proposta: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prazo Entrega (dias)</Label>
                    <Input type="number" value={propostaForm.prazo_entrega} onChange={e => setPropostaForm(f => ({ ...f, prazo_entrega: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <Input value={propostaForm.observacoes} onChange={e => setPropostaForm(f => ({ ...f, observacoes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setAddingProposta(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleAddProposta} disabled={!propostaForm.fornecedor_id || !propostaForm.valor_proposta}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {licitacao.valor_vencedor && (
            <>
              <Separator />
              <div className="bg-primary/5 rounded-lg p-4 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-semibold">Vencedor Homologado</p>
                  <p className="text-sm text-muted-foreground">
                    {licitacao.fornecedor_vencedor?.razao_social || 'Fornecedor'} — {formatCurrency(licitacao.valor_vencedor)}
                    {licitacao.valor_estimado > 0 && (
                      <span className="ml-2 text-primary font-medium">
                        (Economia: {((1 - licitacao.valor_vencedor / licitacao.valor_estimado) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
