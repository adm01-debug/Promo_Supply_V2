import { memo } from 'react';
import { Check, Building2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/hooks/useAuthContext';
import { EmpresaBadge } from './EmpresaBadge';
import { cn } from '@/lib/utils';

interface EmpresaSelectorProps {
  className?: string;
}

export const EmpresaSelector = memo(({ className }: EmpresaSelectorProps) => {
  const { availableEmpresas, selectedEmpresaId, setSelectedEmpresa } = useAuth();

  if (availableEmpresas.length === 0) return null;

  const selected = selectedEmpresaId
    ? availableEmpresas.find((e) => e.id === selectedEmpresaId) ?? null
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-2 border-white/10 bg-white/[0.02] hover:bg-white/[0.06]',
            className,
          )}
          aria-label="Selecionar empresa"
        >
          {selected ? (
            <EmpresaBadge empresa={selected} showRegime />
          ) : (
            <>
              <Layers className="h-3.5 w-3.5 text-violet-300" />
              <span className="text-xs font-medium">Todas as empresas</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {availableEmpresas.length}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 border-white/10 bg-[#0a0518]/95 backdrop-blur-xl">
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Visão consolidada
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setSelectedEmpresa(null)}
          className="cursor-pointer gap-2 py-2"
        >
          <Layers className="h-4 w-4 text-violet-300" />
          <div className="flex-1">
            <div className="text-sm font-medium">Todas as empresas</div>
            <div className="text-[10px] text-muted-foreground">
              {availableEmpresas.length} {availableEmpresas.length === 1 ? 'empresa' : 'empresas'} do grupo
            </div>
          </div>
          {selectedEmpresaId === null && <Check className="h-4 w-4 text-emerald-400" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/5" />
        <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
          Foco em empresa
        </DropdownMenuLabel>

        <div className="max-h-72 overflow-y-auto">
          {availableEmpresas.map((empresa) => {
            const isSelected = empresa.id === selectedEmpresaId;
            return (
              <DropdownMenuItem
                key={empresa.id}
                onClick={() => setSelectedEmpresa(empresa.id)}
                className="cursor-pointer gap-2 py-2"
              >
                <Building2 className="h-4 w-4 shrink-0" style={{ color: empresa.cor_identificacao ?? '#6366f1' }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {empresa.nome_fantasia ?? empresa.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {empresa.cnpj && <span className="font-mono">{empresa.cnpj}</span>}
                    {empresa.uf && <span>· {empresa.uf}</span>}
                  </div>
                </div>
                <EmpresaBadge empresa={empresa} showRegime size="sm" className="ml-2" />
                {isSelected && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

EmpresaSelector.displayName = 'EmpresaSelector';
