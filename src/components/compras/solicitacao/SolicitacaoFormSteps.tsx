import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  Package, Building2, User, Calendar, FileText,
  Upload, AlertCircle, Loader2, Check, DollarSign,
  ShieldCheck, X, Search, Plus, Sparkles, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useProdutos, type Produto } from "@/hooks/useProdutos";
import { useSolicitacoes } from "@/features/solicitacoes";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/imageCompression";

import { type SolicitacaoFormData as NovaSolicitacaoData } from "@/schemas/solicitacao.schema";


interface BudgetCheckResult {
  available: boolean;
  has_budget: boolean;
  budget_total?: number;
  budget_available?: number;
  budget_committed?: number;
  budget_used?: number;
  requested?: number;
  message: string;
}

const empresasMock = ['Promo Supply', 'Gift Solutions', 'Marketing Promo', 'Brindes Express', 'Corporate Gifts'];
const vendedoresMock = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Pedro Lima'];

const prioridadeConfig = {
  baixa: { label: 'Baixa', color: 'bg-muted-foreground' },
  normal: { label: 'Normal', color: 'bg-info' },
  alta: { label: 'Alta', color: 'bg-warning' },
  urgente: { label: 'Urgente', color: 'bg-destructive' },
};

const tipoConfig = {
  PE_LISO: { label: 'Pronta Entrega Liso', description: 'Produto em estoque, sem personalização' },
  FAB_LISO: { label: 'Fabricação Liso', description: 'Fabricação sob demanda, sem personalização' },
  FAB_PERSONALIZADO: { label: 'Fabricação Personalizado', description: 'Fabricação com arte personalizada' },
};

interface StepProps {
  formData: NovaSolicitacaoData;
  errors: Partial<Record<keyof NovaSolicitacaoData, string>>;
  updateField: <K extends keyof NovaSolicitacaoData>(field: K, value: NovaSolicitacaoData[K]) => void;
}

export function Step1Identification({ formData, errors, updateField }: StepProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 px-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="empresa" className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-violet-400" />
            Entidade Solicitante *
          </Label>
          <div className="relative">
            <Select value={formData.empresa} onValueChange={(v) => updateField('empresa', v)}>
              <SelectTrigger className={cn("bg-white/5 border-white/10 h-12 rounded-xl text-white font-bold transition-all hover:bg-white/[0.08]", errors.empresa && "border-rose-500/50")}>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0a0f] border-white/10 rounded-2xl backdrop-blur-3xl">
                {empresasMock.map(e => (
                  <SelectItem key={e} value={e} className="text-xs font-bold py-3">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span>{e}</span>
                      <Badge variant="outline" className="text-[8px] border-emerald-500/20 text-emerald-400">Score: 9.8</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.empresa && <p className="text-[10px] text-rose-400 font-black uppercase tracking-tighter flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{errors.empresa}</p>}
        </div>
        <div className="space-y-3">
          <Label htmlFor="vendedor" className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-violet-400" />
            Gestor Responsável *
          </Label>
          <Select value={formData.vendedor} onValueChange={(v) => updateField('vendedor', v)}>
            <SelectTrigger className={cn("bg-white/5 border-white/10 h-12 rounded-xl text-white font-bold transition-all hover:bg-white/[0.08]", errors.vendedor && "border-rose-500/50")}>
              <SelectValue placeholder="Selecione o vendedor" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0f] border-white/10 rounded-2xl backdrop-blur-3xl">
              {vendedoresMock.map(v => <SelectItem key={v} value={v} className="text-xs font-bold py-3">{v}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.vendedor && <p className="text-[10px] text-rose-400 font-black uppercase tracking-tighter flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{errors.vendedor}</p>}
        </div>
      </div>
      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">Nível de Prioridade Neural</Label>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
          {Object.entries(prioridadeConfig).map(([key, config]) => (
            <button key={key} type="button"
              className={cn("py-3 px-4 sm:flex-1 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2",
                formData.prioridade === key 
                  ? "border-violet-500 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                  : "border-white/5 bg-white/[0.02] text-zinc-500 hover:border-white/10 hover:bg-white/5")}
              onClick={() => updateField('prioridade', key as NovaSolicitacaoData['prioridade'])}>
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", config.color)} />
              {config.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Step2Specifications({ formData, errors, updateField }: StepProps) {
  const { produtos, categorias } = useProdutos();
  const [open, setOpen] = useState(false);

  const predictedDelivery = useMemo(() => {
    if (!formData.prazoEntrega) return null;
    const date = new Date(formData.prazoEntrega);
    const today = new Date();
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 3) return { label: 'Risco de Atraso (Neural)', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    if (diffDays < 7) return { label: 'Prazo Otimizado', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' };
    return { label: 'Prazo Seguro (Histórico)', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  }, [formData.prazoEntrega]);

  const onProductSelect = (p: Produto) => {
    updateField('produto', p.nome);
    if (p.preco_referencia) {
      updateField('valorEstimado', p.preco_referencia);
    }
    if (p.categoria_id) {
      updateField('categoriaId', p.categoria_id);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 px-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="categoria" className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-violet-400" />
            Categoria Inteligente *
          </Label>
          <Select value={formData.categoriaId} onValueChange={(v) => updateField('categoriaId', v)}>
            <SelectTrigger className={cn("bg-white/5 border-white/10 h-12 rounded-xl text-white font-bold transition-all hover:bg-white/[0.08]", errors.categoriaId && "border-rose-500/50")}>
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0f] border-white/10 rounded-2xl backdrop-blur-3xl">
              {categorias.map(c => <SelectItem key={c.id} value={c.id} className="text-xs font-bold py-3">{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.categoriaId && <p className="text-[10px] text-rose-400 font-black uppercase tracking-tighter flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{errors.categoriaId}</p>}
        </div>
        <div className="space-y-3">
          <Label htmlFor="produto" className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-violet-400" />
            Item ou Serviço <Sparkles className="w-3 h-3 text-violet-300 animate-pulse" />
          </Label>
          
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn("w-full justify-between h-12 rounded-xl bg-white/5 border-white/10 text-white font-bold hover:bg-white/[0.08]", !formData.produto && "text-zinc-500", errors.produto && "border-rose-500/50")}
              >
                {formData.produto || "Selecionar ou digitar..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-[#0a0a0f] border-white/10 rounded-2xl backdrop-blur-3xl shadow-2xl" align="start">
              <Command className="bg-transparent">
                <CommandInput placeholder="Buscar no catálogo neural..." className="text-white h-12" />
                <CommandList>
                  <CommandEmpty>
                    <p className="text-sm p-4">Nenhum produto encontrado no catálogo.</p>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start font-normal text-primary"
                      onClick={() => setOpen(false)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Usar termo pesquisado como nome
                    </Button>
                  </CommandEmpty>
                  <CommandGroup heading="Sugestões do Catálogo">
                    {produtos.filter(p => p.ativo).map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.nome}
                        onSelect={() => onProductSelect(p)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.produto === p.nome ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{p.nome}</span>
                              <span className="text-xs text-muted-foreground">{p.codigo} — Ref: {p.preco_referencia?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          </div>
                          {p.preco_referencia && (
                            <Badge variant="outline" className="text-[8px] border-violet-500/20 text-violet-400">
                              Sugestão Neural
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="mt-2">
            <Input 
              id="produto-manual" 
              value={formData.produto} 
              onChange={(e) => updateField('produto', e.target.value)}
              placeholder="Ou digite manualmente aqui..." 
              className={cn("text-xs h-8", errors.produto && "border-destructive")} 
            />
          </div>

          {errors.produto && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.produto}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="quantidade" className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Quantidade Precisa *</Label>
          <Input id="quantidade" type="number" min="1" value={formData.quantidade || ''}
            onChange={(e) => updateField('quantidade', parseInt(e.target.value) || 0)}
            placeholder="0" className={cn("bg-white/5 border-white/10 h-12 rounded-xl text-white font-bold", errors.quantidade && "border-rose-500/50")} />
          {errors.quantidade && <p className="text-[10px] text-rose-400 font-black uppercase tracking-tighter flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{errors.quantidade}</p>}
        </div>
        <div className="space-y-3">
          <Label htmlFor="prazoEntrega" className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            Limite de Entrega *
          </Label>
          <div className="space-y-2">
            <Input id="prazoEntrega" type="date" value={formData.prazoEntrega}
              onChange={(e) => updateField('prazoEntrega', e.target.value)}
              className={cn("bg-white/5 border-white/10 h-12 rounded-xl text-white font-bold", errors.prazoEntrega && "border-rose-500/50")} />
            
            {predictedDelivery && (
              <div className={cn("px-3 py-2 rounded-xl border flex items-center gap-2 animate-in fade-in zoom-in duration-500", predictedDelivery.bg, predictedDelivery.border)}>
                <TrendingUp className={cn("w-3 h-3", predictedDelivery.color)} />
                <span className={cn("text-[8px] font-black uppercase tracking-widest", predictedDelivery.color)}>
                  {predictedDelivery.label}
                </span>
              </div>
            )}
          </div>
          {errors.prazoEntrega && <p className="text-[10px] text-rose-400 font-black uppercase tracking-tighter flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />{errors.prazoEntrega}</p>}
        </div>
      </div>
      <div className="space-y-4">
        <Label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block">Metodologia de Suprimento *</Label>
        <div className="grid gap-3">
          {Object.entries(tipoConfig).map(([key, config]) => (
            <button key={key} type="button"
              className={cn("p-4 rounded-2xl border-2 text-left transition-all duration-300",
                formData.tipo === key 
                  ? "border-violet-500 bg-violet-500/10 shadow-[0_0_20px_rgba(139,92,246,0.1)]" 
                  : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5")}
              onClick={() => updateField('tipo', key as NovaSolicitacaoData['tipo'])}>
              <p className="font-black text-xs text-white uppercase tracking-widest mb-1">{config.label}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">{config.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Step3Props extends StepProps {
  budgetCheck: BudgetCheckResult | null;
  isCheckingBudget: boolean;
  checkBudget: () => Promise<void>;
  isCompressing: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
}

export function Step3Values({ formData, errors, updateField, budgetCheck, isCheckingBudget, checkBudget, isCompressing, handleFileUpload, removeFile }: Step3Props) {
  const { costCenters, loadingCostCenters } = useSolicitacoes();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="valorEstimado" className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Valor Estimado (R$) *</Label>
          <Input id="valorEstimado" type="number" min="0" step="0.01" value={formData.valorEstimado || ''}
            onChange={(e) => updateField('valorEstimado', parseFloat(e.target.value) || 0)}
            placeholder="0,00" className={cn(errors.valorEstimado && "border-destructive")} />
          {errors.valorEstimado && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.valorEstimado}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="costCenterId">Centro de Custo *</Label>
          <Select 
            value={formData.costCenterId} 
            onValueChange={(v) => {
              updateField('costCenterId', v);
              const cc = costCenters.find(c => c.id === v);
              if (cc) updateField('centroCusto', cc.name);
            }}
          >
            <SelectTrigger className={cn(errors.costCenterId && "border-destructive")}>
              <SelectValue placeholder={loadingCostCenters ? "Carregando..." : "Selecione o centro de custo"} />
            </SelectTrigger>
            <SelectContent>
              {costCenters.map(cc => (
                <SelectItem key={cc.id} value={cc.id}>{cc.name} ({cc.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.costCenterId && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.costCenterId}</p>}
          
          {formData.costCenterId && formData.valorEstimado > 0 && (
            <div className="space-y-4">
              <Button type="button" variant="outline" size="sm" onClick={checkBudget} disabled={isCheckingBudget} className="w-full mt-1 border-violet-500/20 hover:bg-violet-500/5">
                {isCheckingBudget ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando...</> : <><ShieldCheck className="w-3 h-3 mr-1" /> Verificar Orçamento Neural</>}
              </Button>

              {budgetCheck && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <ShieldCheck className={cn("w-3.5 h-3.5", budgetCheck.available ? "text-emerald-400" : "text-rose-400")} />
                      Integridade Orçamentária
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full border",
                      budgetCheck.available 
                        ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                        : "text-rose-400 border-rose-500/20 bg-rose-500/5"
                    )}>
                      {budgetCheck.available ? "SEGURO" : "RISCO CRÍTICO"}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000 ease-out rounded-full",
                        budgetCheck.available ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                      )}
                      style={{ width: `${Math.min(100, (formData.valorEstimado / (budgetCheck.budget_total || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white/[0.02] rounded-lg border border-white/5">
                      <p className="text-[8px] text-zinc-500 font-black uppercase">Disponível</p>
                      <p className="text-[10px] text-white font-bold">R$ {budgetCheck.budget_available?.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="p-2 bg-white/[0.02] rounded-lg border border-white/5">
                      <p className="text-[8px] text-zinc-500 font-black uppercase">Comprometido</p>
                      <p className="text-[10px] text-white font-bold">R$ {budgetCheck.budget_committed?.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {formData.valorEstimado > 0 && formData.valorEstimado < 1000 && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-left-2 duration-500">
          <div className="w-8 h-8 rounded-full flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Fast Track Habilitado</p>
            <p className="text-[10px] font-bold text-blue-100">Aprovação Automática ativada para este valor.</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="observacoes" className="flex items-center gap-2"><FileText className="w-4 h-4" />Observações</Label>
        <Textarea id="observacoes" value={formData.observacoes} onChange={(e) => updateField('observacoes', e.target.value)} placeholder="Informações adicionais sobre o pedido..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Upload className="w-4 h-4" />Anexos
          {isCompressing && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Comprimindo...</span>}
        </Label>
        <div className={cn("border-2 border-dashed rounded-lg p-4 transition-colors", isCompressing ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50")}>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileUpload} className="hidden" id="file-upload" disabled={isCompressing} />
          <label htmlFor="file-upload" className={cn("flex flex-col items-center justify-center cursor-pointer", isCompressing && "pointer-events-none opacity-50")}>
            {isCompressing ? <Loader2 className="w-8 h-8 text-primary mb-2 animate-spin" /> : <Upload className="w-8 h-8 text-muted-foreground mb-2" />}
            <span className="text-sm text-muted-foreground">{isCompressing ? "Comprimindo imagens..." : "Clique para anexar arquivos"}</span>
            <span className="text-xs text-muted-foreground mt-1">Imagens são comprimidas automaticamente em WebP</span>
          </label>
        </div>
        {formData.anexos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.anexos.map((file, index) => (
              <Badge key={index} variant="secondary" className="gap-1 pr-1">
                <span className="max-w-[120px] truncate">{file.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
                {file.type === 'image/webp' && <Check className="w-3 h-3 text-emerald-500" />}
                <button onClick={() => removeFile(index)} className="ml-1 hover:text-destructive"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
