import { useState, useMemo } from 'react';
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { Gavel, Plus, Search, Eye, Trophy, Trash2, FileText, Filter, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { useLicitacoes } from '@/hooks/useLicitacoes';
import { useFornecedores } from '@/hooks/useFornecedores';
import { LicitacaoDetailDialog, modalidadeLabels, statusConfig } from './licitacoes/LicitacaoDetailDialog';
import { ReverseAuctionRoom } from '@/components/licitacoes/ReverseAuctionRoom';

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
  const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    titulo: '', descricao: '', modalidade: 'pregao', tipo: 'menor_preco',
    valor_estimado: '', data_abertura: '', data_encerramento: '', objeto: '',
    is_live: false, lance_minimo_decremento: '0.01'
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
      titulo: newForm.titulo, descricao: newForm.descricao || null, modalidade: newForm.modalidade,
      tipo: newForm.tipo, valor_estimado: parseFloat(newForm.valor_estimado) || 0,
      data_abertura: newForm.data_abertura || null, data_encerramento: newForm.data_encerramento || null,
      objeto: newForm.objeto || null,
      is_live: newForm.is_live,
      lance_minimo_decremento: parseFloat(newForm.lance_minimo_decremento) || 0.01,
    });
    if (result) {
      setCreateOpen(false);
      setNewForm({ titulo: '', descricao: '', modalidade: 'pregao', tipo: 'menor_preco', valor_estimado: '', data_abertura: '', data_encerramento: '', objeto: '', is_live: false, lance_minimo_decremento: '0.01' });
    }
  };

  const selectedLicitacao = licitacoes.find(l => l.id === detailId);

  return (
    <div className="space-y-6">
      <PageHeader 
        title={activeAuctionId ? "Sala de Leilão" : "Licitações"} 
        description={activeAuctionId ? "Acompanhamento em tempo real e lances" : "Gerenciamento de processos licitatórios e propostas"} 
        icon={Gavel}
        actions={
          activeAuctionId 
            ? [{ label: 'Voltar para Lista', icon: Filter, onClick: () => setActiveAuctionId(null) }]
            : [{ label: 'Nova Licitação', icon: Plus, onClick: () => setCreateOpen(true) }]
        } 
      />

      {activeAuctionId && licitacoes.find(l => l.id === activeAuctionId) ? (
        <ReverseAuctionRoom 
          licitacao={licitacoes.find(l => l.id === activeAuctionId)!} 
          userFornecedorId={fornecedores[0]?.id} // For demo purposes, use first supplier
        />
      ) : (
        <>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: kpis.total, icon: FileText },
          { label: 'Ativas', value: kpis.ativas, icon: Gavel },
          { label: 'Homologadas', value: kpis.homologadas, icon: Trophy },
          { label: 'Valor Estimado', value: formatCurrency(kpis.valorTotal), icon: DollarSign },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><k.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-lg font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar licitações..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-medium">Nenhuma licitação encontrada</p>
            </div>
          ) : (
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead><TableHead>Título</TableHead>
                  <TableHead className="hidden md:table-cell">Modalidade</TableHead><TableHead>Status</TableHead>
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
                    <TableCell><Badge variant={statusConfig[lic.status]?.variant || 'secondary'}>{statusConfig[lic.status]?.label || lic.status}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-right">{formatCurrency(lic.valor_estimado)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {lic.data_abertura ? format(new Date(lic.data_abertura), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {lic.is_live && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 animate-pulse text-[10px]" 
                            onClick={() => setActiveAuctionId(lic.id)}
                          >
                            SALA AO VIVO
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailId(lic.id)} aria-label="Ver detalhes"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLicitacao(lic.id)} aria-label="Excluir"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent aria-describedby="dialog-desc" className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Gavel className="w-5 h-5 text-primary" /> Nova Licitação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título *</Label><Input value={newForm.titulo} onChange={e => setNewForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da licitação" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Modalidade</Label>
                <Select value={newForm.modalidade} onValueChange={v => setNewForm(f => ({ ...f, modalidade: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(modalidadeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Tipo</Label>
                <Select value={newForm.tipo} onValueChange={v => setNewForm(f => ({ ...f, tipo: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="menor_preco">Menor Preço</SelectItem><SelectItem value="tecnica_preco">Técnica e Preço</SelectItem><SelectItem value="melhor_tecnica">Melhor Técnica</SelectItem></SelectContent>
                </Select></div>
            </div>
            <div className="space-y-2"><Label>Valor Estimado (R$)</Label><Input type="number" value={newForm.valor_estimado} onChange={e => setNewForm(f => ({ ...f, valor_estimado: e.target.value }))} placeholder="0,00" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Data Abertura</Label><Input type="datetime-local" value={newForm.data_abertura} onChange={e => setNewForm(f => ({ ...f, data_abertura: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Data Encerramento</Label><Input type="datetime-local" value={newForm.data_encerramento} onChange={e => setNewForm(f => ({ ...f, data_encerramento: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Decremento Mínimo (R$)</Label><Input type="number" value={newForm.lance_minimo_decremento} onChange={e => setNewForm(f => ({ ...f, lance_minimo_decremento: e.target.value }))} step="0.01" /></div>
              <div className="flex items-center gap-2 pt-8">
                <input type="checkbox" checked={newForm.is_live} onChange={e => setNewForm(f => ({ ...f, is_live: e.target.checked }))} id="is_live" className="w-4 h-4" />
                <Label htmlFor="is_live">Leilão ao Vivo</Label>
              </div>
            </div>
            <div className="space-y-2"><Label>Objeto</Label><Textarea value={newForm.objeto} onChange={e => setNewForm(f => ({ ...f, objeto: e.target.value }))} placeholder="Descrição do objeto da licitação" rows={3} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={newForm.descricao} onChange={e => setNewForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Informações adicionais" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newForm.titulo}>Criar Licitação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedLicitacao && (
        <LicitacaoDetailDialog licitacao={selectedLicitacao} open={!!detailId} onClose={() => setDetailId(null)} onUpdate={updateLicitacao} fornecedores={fornecedores} />
      )}
        </>
      )}
    </div>
  );
}
