import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Gavel, Plus, Search, Eye, Trophy, Trash2, Edit,
  Calendar, DollarSign, Users, FileText, Filter, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { useLicitacoes, useLicitacaoPropostas, type Licitacao } from '@/hooks/useLicitacoes';
import { useFornecedores } from '@/hooks/useFornecedores';
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function Licitacoes() {
  const { licitacoes, isLoading, createLicitacao, updateLicitacao, deleteLicitacao } = useLicitacoes();
  const { fornecedores } = useFornecedores();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    titulo: '', descricao: '', modalidade: 'pregao', tipo: 'menor_preco',
    valor_estimado: '', data_abertura: '', data_encerramento: '', objeto: '',
  });

  const filtered = useMemo(() => {
    let result = licitacoes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => l.titulo.toLowerCase().includes(q) || l.numero.toLowerCase().includes(q));
    }
    if (filterStatus !== 'todos') result = result.filter(l => l.status === filterStatus);
    return result;
  }, [licitacoes, search, filterStatus]);

  const kpis = useMemo(() => ({
    total: licitacoes.length,
    ativas: licitacoes.filter(l => ['publicada', 'em_andamento'].includes(l.status)).length,
    homologadas: licitacoes.filter(l => l.status === 'homologada').length,
    valorTotal: licitacoes.reduce((s, l) => s + (l.valor_estimado || 0), 0),
  }), [licitacoes]);

  const handleCreate = async () => {
    const result = await createLicitacao({
      titulo: newForm.titulo,
      descricao: newForm.descricao || null,
      modalidade: newForm.modalidade,
      tipo: newForm.tipo,
      valor_estimado: parseFloat(newForm.valor_estimado) || 0,
      data_abertura: newForm.data_abertura || null,
      data_encerramento: newForm.data_encerramento || null,
      objeto: newForm.objeto || null,
    });
    if (result) {
      setCreateOpen(false);
      setNewForm({ titulo: '', descricao: '', modalidade: 'pregao', tipo: 'menor_preco', valor_estimado: '', data_abertura: '', data_encerramento: '', objeto: '' });
    }
  };

  const selectedLicitacao = licitacoes.find(l => l.id === detailId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licitações"
        description="Gerenciamento de processos licitatórios e propostas"
        icon={Gavel}
        actions={[{
          label: 'Nova Licitação',
          icon: Plus,
          onClick: () => setCreateOpen(true),
        }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: kpis.total, icon: FileText },
          { label: 'Ativas', value: kpis.ativas, icon: Gavel },
          { label: 'Homologadas', value: kpis.homologadas, icon: Trophy },
          { label: 'Valor Estimado', value: formatCurrency(kpis.valorTotal), icon: DollarSign },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <k.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar licitações..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma licitação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Modalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Valor Est.</TableHead>
                  <TableHead className="hidden lg:table-cell">Abertura</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(lic => (
                  <TableRow key={lic.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailId(lic.id)}>
                    <TableCell className="font-mono text-xs">{lic.numero}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{lic.titulo}</TableCell>
                    <TableCell className="hidden md:table-cell">{modalidadeLabels[lic.modalidade] || lic.modalidade}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[lic.status]?.variant || 'secondary'}>
                        {statusConfig[lic.status]?.label || lic.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">{formatCurrency(lic.valor_estimado)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {lic.data_abertura ? format(new Date(lic.data_abertura), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(lic.id)} aria-label="Ver detalhes">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLicitacao(lic.id)} aria-label="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" /> Nova Licitação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={newForm.titulo} onChange={e => setNewForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da licitação" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select value={newForm.modalidade} onValueChange={v => setNewForm(f => ({ ...f, modalidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(modalidadeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newForm.tipo} onValueChange={v => setNewForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="menor_preco">Menor Preço</SelectItem>
                    <SelectItem value="tecnica_preco">Técnica e Preço</SelectItem>
                    <SelectItem value="melhor_tecnica">Melhor Técnica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" value={newForm.valor_estimado} onChange={e => setNewForm(f => ({ ...f, valor_estimado: e.target.value }))} placeholder="0,00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data Abertura</Label>
                <Input type="datetime-local" value={newForm.data_abertura} onChange={e => setNewForm(f => ({ ...f, data_abertura: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data Encerramento</Label>
                <Input type="datetime-local" value={newForm.data_encerramento} onChange={e => setNewForm(f => ({ ...f, data_encerramento: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Objeto</Label>
              <Textarea value={newForm.objeto} onChange={e => setNewForm(f => ({ ...f, objeto: e.target.value }))} placeholder="Descrição do objeto da licitação" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={newForm.descricao} onChange={e => setNewForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Informações adicionais" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newForm.titulo}>Criar Licitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with Proposals */}
      {selectedLicitacao && (
        <LicitacaoDetailDialog
          licitacao={selectedLicitacao}
          open={!!detailId}
          onClose={() => setDetailId(null)}
          onUpdate={updateLicitacao}
          fornecedores={fornecedores}
        />
      )}
    </div>
  );
}

function LicitacaoDetailDialog({
  licitacao, open, onClose, onUpdate, fornecedores,
}: {
  licitacao: Licitacao;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Licitacao>) => Promise<boolean>;
  fornecedores: any[];
}) {
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <Users className="w-4 h-4" /> Propostas ({propostas.length})
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
            <Table>
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
                <Trophy className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="font-semibold">Vencedor Homologado</p>
                  <p className="text-sm text-muted-foreground">
                    {licitacao.fornecedor_vencedor?.razao_social || 'Fornecedor'} — {formatCurrency(licitacao.valor_vencedor)}
                    {licitacao.valor_estimado > 0 && (
                      <span className="ml-2 text-green-600 font-medium">
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
