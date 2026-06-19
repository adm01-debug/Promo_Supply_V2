import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Empresa, RegimeTributario } from '@/features/auth/schemas/auth.schemas';
import { cn } from '@/lib/utils';

interface EmpresaBadgeProps {
  empresa: Pick<
    Empresa,
    'id' | 'name' | 'nome_fantasia' | 'razao_social' | 'cnpj' | 'cor_identificacao' | 'empresa_codigo' | 'regime_tributario' | 'uf'
  > | null | undefined;
  size?: 'sm' | 'md';
  showRegime?: boolean;
  className?: string;
}

const REGIME_LABEL: Record<RegimeTributario, string> = {
  simples_nacional: 'Simples',
  lucro_presumido: 'Presumido',
  lucro_real: 'Real',
  mei: 'MEI',
};

const REGIME_TONE: Record<RegimeTributario, string> = {
  simples_nacional: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  lucro_presumido: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  lucro_real: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  mei: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

function formatCnpj(cnpj?: string | null): string {
  if (!cnpj) return '';
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function deriveCodigo(empresa: EmpresaBadgeProps['empresa']): string {
  if (!empresa) return '—';
  if (empresa.empresa_codigo) return empresa.empresa_codigo.toUpperCase().slice(0, 4);
  const source = empresa.nome_fantasia ?? empresa.name ?? '';
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return initials || source.slice(0, 3).toUpperCase() || '—';
}

export const EmpresaBadge = memo(({ empresa, size = 'sm', showRegime = true, className }: EmpresaBadgeProps) => {
  if (!empresa) return null;
  const cor = empresa.cor_identificacao ?? '#6366f1';
  const codigo = deriveCodigo(empresa);
  const regime = empresa.regime_tributario ?? null;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium leading-none',
        size === 'sm' ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs',
        'border-white/10 bg-white/[0.03]',
        className,
      )}
      style={{ borderLeft: `3px solid ${cor}` }}
      aria-label={`Empresa ${empresa.nome_fantasia ?? empresa.name}`}
    >
      <span className="font-semibold tracking-wide" style={{ color: cor }}>{codigo}</span>
      {showRegime && regime && (
        <Badge variant="outline" className={cn('h-4 px-1 text-[9px] font-normal', REGIME_TONE[regime])}>
          {REGIME_LABEL[regime]}
        </Badge>
      )}
    </span>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5">
            <div className="font-semibold">{empresa.nome_fantasia ?? empresa.name}</div>
            {empresa.razao_social && empresa.razao_social !== empresa.nome_fantasia && (
              <div className="text-muted-foreground">{empresa.razao_social}</div>
            )}
            {empresa.cnpj && <div className="font-mono text-muted-foreground">{formatCnpj(empresa.cnpj)}</div>}
            {regime && <div className="text-muted-foreground">Regime: {REGIME_LABEL[regime]}</div>}
            {empresa.uf && <div className="text-muted-foreground">UF: {empresa.uf}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

EmpresaBadge.displayName = 'EmpresaBadge';
