import { Badge } from "@/components/ui/badge";
import { Check, Building2, Package, DollarSign, FileText, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

import { type SolicitacaoFormData as NovaSolicitacaoData } from "@/schemas/solicitacao.schema";


interface BudgetCheckResult {
  available: boolean;
  has_budget: boolean;
  budget_available?: number;
  message: string;
}

const prioridadeConfig: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'bg-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-info' },
  alta: { label: 'Alta', color: 'bg-warning' },
  urgente: { label: 'Urgente', color: 'bg-destructive' },
};

const tipoConfig: Record<string, { label: string }> = {
  PE_LISO: { label: 'Pronta Entrega Liso' },
  FAB_LISO: { label: 'Fabricação Liso' },
  FAB_PERSONALIZADO: { label: 'Fabricação Personalizado' },
};

interface SolicitacaoReviewStepProps {
  formData: NovaSolicitacaoData;
  budgetCheck: BudgetCheckResult | null;
}

export const SolicitacaoReviewStep = ({ formData, budgetCheck }: SolicitacaoReviewStepProps) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 px-8 pb-8">
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase text-violet-400 tracking-widest flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Identificação Neural
        </h4>
        <Badge variant="outline" className="text-[8px] font-black border-white/10 text-white">STEP 01</Badge>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Entidade</p>
          <p className="text-xs font-bold text-white">{formData.empresa}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Gestor</p>
          <p className="text-xs font-bold text-white">{formData.vendedor}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Prioridade</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", prioridadeConfig[formData.prioridade].color)} />
            <span className="text-[10px] font-black uppercase text-white tracking-widest">{prioridadeConfig[formData.prioridade].label}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase text-violet-400 tracking-widest flex items-center gap-2">
          <Package className="w-4 h-4" />
          Especificações Técnicas
        </h4>
        <Badge variant="outline" className="text-[8px] font-black border-white/10 text-white">STEP 02</Badge>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="col-span-2">
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Item / Serviço</p>
          <p className="text-xs font-bold text-white uppercase tracking-tight">{formData.produto}</p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Quantidade</p>
          <p className="text-xs font-bold text-white">{formData.quantidade.toLocaleString('pt-BR')} <span className="text-[10px] text-zinc-500 font-black">UNIDADES</span></p>
        </div>
        <div>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Data Limite</p>
          <p className="text-xs font-bold text-white">
            {new Date(formData.prazoEntrega).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Fluxo de Suprimento</p>
          <p className="text-[10px] font-black text-violet-300 uppercase tracking-widest bg-violet-500/10 px-2 py-1 rounded-md border border-violet-500/20 inline-block">
            {tipoConfig[formData.tipo]?.label || formData.tipo}
          </p>
        </div>
      </div>
    </div>

    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase text-violet-400 tracking-widest flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Análise Financeira
        </h4>
        <Badge variant="outline" className="text-[8px] font-black border-white/10 text-white">STEP 03</Badge>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Valor Estimado</p>
          <p className="text-xl font-black text-emerald-400 tracking-tighter">
            {formatCurrency(formData.valorEstimado)}
          </p>
        </div>
        {formData.centroCusto && (
          <div>
            <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Centro de Custo</p>
            <p className="text-xs font-bold text-white uppercase truncate">
              {formData.centroCusto}
            </p>
          </div>
        )}
      </div>

      {budgetCheck && (
        <div className={cn(
          "rounded-2xl p-4 border flex items-center gap-3 animate-in zoom-in duration-500",
          budgetCheck.available 
            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/5 border-rose-500/20 text-rose-400"
        )}>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center border",
            budgetCheck.available ? "border-emerald-500/30 bg-emerald-500/10" : "border-rose-500/30 bg-rose-500/10"
          )}>
            {budgetCheck.available ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Status de Orçamento</p>
            <p className="text-[10px] font-bold leading-tight">{budgetCheck.message}</p>
          </div>
        </div>
      )}

      {formData.valorEstimado < 1000 && formData.valorEstimado > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Fast Track</p>
            <p className="text-[10px] font-bold text-blue-100">Aprovação Automática Habilitada</p>
          </div>
        </div>
      )}
    </div>

    {(formData.observacoes || formData.anexos.length > 0) && (
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
        <h4 className="text-[10px] font-black uppercase text-violet-400 tracking-widest flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Documentação & Contexto
        </h4>
        <div className="space-y-4">
          {formData.observacoes && (
            <div>
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-1">Notas Adicionais</p>
              <p className="text-[10px] font-medium text-zinc-300 italic bg-white/5 p-3 rounded-xl border border-white/5">{formData.observacoes}</p>
            </div>
          )}
          {formData.anexos.length > 0 && (
            <div>
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter mb-2">Arquivos Anexados ({formData.anexos.length})</p>
              <div className="flex flex-wrap gap-2">
                {formData.anexos.map((file, i) => (
                  <Badge key={i} variant="outline" className="text-[8px] font-black uppercase border-white/10 text-zinc-400 bg-white/5 py-1 px-2 rounded-lg">
                    {file.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
