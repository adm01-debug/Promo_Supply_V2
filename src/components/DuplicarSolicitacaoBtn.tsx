import { useState } from 'react';
import { useDuplicarSolicitacao, DuplicarOpcoes } from '@/hooks/useDuplicarSolicitacao';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DuplicarSolicitacaoBtnProps {
  solicitacaoId: string;
  solicitacaoNumero?: string;
  solicitacaoTitulo?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onDuplicado?: (novaId: string) => void;
  showOptions?: boolean;
}

export function DuplicarSolicitacaoBtn({
  solicitacaoId,
  solicitacaoNumero,
  solicitacaoTitulo,
  variant = 'outline',
  size = 'sm',
  className,
  onDuplicado,
  showOptions = true,
}: DuplicarSolicitacaoBtnProps) {
  const { duplicar, isDuplicating } = useDuplicarSolicitacao();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Opções de duplicação
  const [copiarItens, setCopiarItens] = useState(true);
  const [copiarAnexos, setCopiarAnexos] = useState(false);
  const [resetarDatas, setResetarDatas] = useState(true);
  const [novoTitulo, setNovoTitulo] = useState('');

  const handleDuplicarRapido = async () => {
    const novaId = await duplicar(solicitacaoId);
    if (novaId && onDuplicado) {
      onDuplicado(novaId);
    }
  };

  const handleDuplicarComOpcoes = async () => {
    const opcoes: DuplicarOpcoes = {
      copiarItens,
      copiarAnexos,
      resetarDatas,
      novoTitulo: novoTitulo.trim() || undefined,
    };

    const novaId = await duplicar(solicitacaoId, opcoes);
    if (novaId) {
      setIsDialogOpen(false);
      resetOpcoes();
      if (onDuplicado) {
        onDuplicado(novaId);
      }
    }
  };

  const resetOpcoes = () => {
    setCopiarItens(true);
    setCopiarAnexos(false);
    setResetarDatas(true);
    setNovoTitulo('');
  };

  // Versão simples sem opções
  if (!showOptions) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleDuplicarRapido}
        disabled={isDuplicating}
        className={className}
      >
        {isDuplicating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {size !== 'icon' && <span className="ml-2">Duplicar</span>}
      </Button>
    );
  }

  // Versão com dropdown de opções
  return (
    <div className={cn("flex", className)}>
      <Button
        variant={variant}
        size={size}
        onClick={handleDuplicarRapido}
        disabled={isDuplicating}
        className="rounded-r-none"
      >
        {isDuplicating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {size !== 'icon' && <span className="ml-2">Duplicar</span>}
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={variant} 
            size={size}
            className="rounded-l-none border-l-0 px-2"
            disabled={isDuplicating}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDuplicarRapido}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar rápido
          </DropdownMenuItem>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar com opções...
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Duplicar Solicitação</DialogTitle>
                <DialogDescription>
                  {solicitacaoNumero && (
                    <span>Criando cópia de <strong>{solicitacaoNumero}</strong></span>
                  )}
                  {solicitacaoTitulo && (
                    <span className="block text-sm mt-1 truncate">
                      {solicitacaoTitulo}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Novo título */}
                <div className="space-y-2">
                  <Label htmlFor="novoTitulo">Novo título (opcional)</Label>
                  <Input
                    id="novoTitulo"
                    placeholder="Deixe em branco para usar título original + (Cópia)"
                    value={novoTitulo}
                    onChange={(e) => setNovoTitulo(e.target.value)}
                  />
                </div>

                {/* Opções */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="copiarItens"
                      checked={copiarItens}
                      onCheckedChange={(checked) => setCopiarItens(checked as boolean)}
                    />
                    <Label htmlFor="copiarItens" className="cursor-pointer">
                      Copiar itens da solicitação
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="copiarAnexos"
                      checked={copiarAnexos}
                      onCheckedChange={(checked) => setCopiarAnexos(checked as boolean)}
                    />
                    <Label htmlFor="copiarAnexos" className="cursor-pointer">
                      Copiar anexos (referência)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="resetarDatas"
                      checked={resetarDatas}
                      onCheckedChange={(checked) => setResetarDatas(checked as boolean)}
                    />
                    <Label htmlFor="resetarDatas" className="cursor-pointer">
                      Limpar datas (usar data atual)
                    </Label>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <p>A nova solicitação será criada como <strong>rascunho</strong> e você será definido como solicitante.</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleDuplicarComOpcoes} disabled={isDuplicating}>
                  {isDuplicating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Duplicando...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Criar Cópia
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Versão para uso em menus de contexto
export function DuplicarMenuItem({
  solicitacaoId,
  onDuplicado,
}: {
  solicitacaoId: string;
  onDuplicado?: (novaId: string) => void;
}) {
  const { duplicar, isDuplicating } = useDuplicarSolicitacao();

  const handleClick = async () => {
    const novaId = await duplicar(solicitacaoId);
    if (novaId && onDuplicado) {
      onDuplicado(novaId);
    }
  };

  return (
    <DropdownMenuItem onClick={handleClick} disabled={isDuplicating}>
      {isDuplicating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Copy className="h-4 w-4 mr-2" />
      )}
      Duplicar solicitação
    </DropdownMenuItem>
  );
}
