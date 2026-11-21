import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, UserX } from 'lucide-react';
import { useXbzIntegration } from '@/hooks/useXbzIntegration';
import {
  cpfValido, formatXbzDate, formatarCpf, formatarPlaca, normalizarPlaca, placaValida,
  somenteDigitos, type XbzPortador,
} from './xbzHelpers';

interface XbzPortadorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pode autorizar/revogar (papel admin/coordinator no proxy). */
  canManage: boolean;
}

/**
 * Cadastro antecipado do portador (motorista/placa) na XBZ. Obrigatório para
 * retirada a partir de 23/11/2026 — substitui o token de retirada.
 * A XBZ mantém 1 portador ativo por cliente; autorizar outro revoga o anterior.
 */
export function XbzPortadorDialog({ open, onOpenChange, canManage }: XbzPortadorDialogProps) {
  const { loading, getPortador, autorizarPortador, revogarPortador } = useXbzIntegration();
  const [atual, setAtual] = useState<XbzPortador | null>(null);
  const [nome, setNome] = useState('');
  const [rg, setRg] = useState('');
  const [cpf, setCpf] = useState('');
  const [placa, setPlaca] = useState('');
  const [detalhes, setDetalhes] = useState('');

  const carregar = useCallback(async () => {
    const data = await getPortador();
    setAtual(data && data.motoristaNome ? data : null);
  }, [getPortador]);

  useEffect(() => {
    if (!open) return;
    void carregar();
  }, [open, carregar]);

  const cpfOk = cpfValido(cpf);
  const placaOk = placaValida(placa);
  const podeAutorizar = canManage && nome.trim().length >= 3 && cpfOk && placaOk && !loading;

  const handleAutorizar = useCallback(async () => {
    const ok = await autorizarPortador({
      nome: nome.trim(),
      rg: rg.trim(),
      cpf: somenteDigitos(cpf),
      placa: normalizarPlaca(placa),
      detalhes: detalhes.trim(),
    });
    if (ok) {
      setNome(''); setRg(''); setCpf(''); setPlaca(''); setDetalhes('');
      await carregar();
    }
  }, [autorizarPortador, nome, rg, cpf, placa, detalhes, carregar]);

  const handleRevogar = useCallback(async () => {
    const ok = await revogarPortador();
    if (ok) setAtual(null);
  }, [revogarPortador]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Portador de retirada na XBZ</DialogTitle>
          <DialogDescription>
            A XBZ exige o cadastro antecipado do motorista e da placa para liberar a retirada
            (motoboy, aplicativo ou transportadora). Só um portador fica ativo por vez — autorizar
            outro substitui o atual. CPF e RG ficam apenas na XBZ.
          </DialogDescription>
        </DialogHeader>

        {atual ? (
          <Alert>
            <Truck className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Portador ativo: <strong>{atual.motoristaNome}</strong>
              {atual.veiculoPlaca ? ` · placa ${formatarPlaca(atual.veiculoPlaca)}` : ''}
              {atual.motoristaCpf ? ` · CPF ${formatarCpf(atual.motoristaCpf)}` : ''}
              {atual.cadastroData ? ` · desde ${formatXbzDate(atual.cadastroData)}` : ''}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            {loading ? 'Consultando a XBZ…' : 'Nenhum portador cadastrado na XBZ.'}
          </p>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="xbz-portador-nome">Nome do motorista</Label>
            <Input
              id="xbz-portador-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              autoComplete="off"
              disabled={!canManage}
              aria-label="Nome do motorista"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="xbz-portador-cpf">CPF</Label>
              <Input
                id="xbz-portador-cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                disabled={!canManage}
                aria-label="CPF do motorista"
                aria-invalid={cpf.length > 0 && !cpfOk}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="xbz-portador-rg">RG (opcional)</Label>
              <Input
                id="xbz-portador-rg"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                maxLength={30}
                autoComplete="off"
                disabled={!canManage}
                aria-label="RG do motorista"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xbz-portador-placa">Placa do veículo</Label>
            <Input
              id="xbz-portador-placa"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              placeholder="ABC1D23 ou ABC-1234"
              maxLength={8}
              autoComplete="off"
              disabled={!canManage}
              aria-label="Placa do veículo"
              aria-invalid={placa.length > 0 && !placaOk}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="xbz-portador-detalhes">Observações (opcional)</Label>
            <Textarea
              id="xbz-portador-detalhes"
              value={detalhes}
              onChange={(e) => setDetalhes(e.target.value)}
              maxLength={500}
              rows={2}
              disabled={!canManage}
              aria-label="Observações para a XBZ"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleRevogar}
            disabled={!canManage || !atual || loading}
            aria-label="Revogar portador atual na XBZ"
          >
            <UserX className="mr-2 h-4 w-4" aria-hidden="true" />
            Revogar atual
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button onClick={handleAutorizar} disabled={!podeAutorizar}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {atual ? 'Substituir portador' : 'Autorizar portador'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
