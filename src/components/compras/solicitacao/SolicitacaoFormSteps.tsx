import React, { useCallback } from "react";
import {
  Package, Building2, User, Calendar, FileText,
  Upload, AlertCircle, Loader2, Check, DollarSign,
  ShieldCheck, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/imageCompression";

interface NovaSolicitacaoData {
  empresa: string;
  vendedor: string;
  produto: string;
  quantidade: number;
  tipo: 'PE_LISO' | 'FAB_LISO' | 'FAB_PERSONALIZADO';
  prazoEntrega: string;
  observacoes: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  valorEstimado: number;
  centroCusto: string;
  anexos: File[];
}

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
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="empresa" className="flex items-center gap-2"><Building2 className="w-4 h-4" />Empresa *</Label>
          <Select value={formData.empresa} onValueChange={(v) => updateField('empresa', v)}>
            <SelectTrigger className={cn(errors.empresa && "border-destructive")}><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
            <SelectContent>{empresasMock.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
          </Select>
          {errors.empresa && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.empresa}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendedor" className="flex items-center gap-2"><User className="w-4 h-4" />Vendedor *</Label>
          <Select value={formData.vendedor} onValueChange={(v) => updateField('vendedor', v)}>
            <SelectTrigger className={cn(errors.vendedor && "border-destructive")}><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
            <SelectContent>{vendedoresMock.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
          {errors.vendedor && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.vendedor}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Prioridade</Label>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          {Object.entries(prioridadeConfig).map(([key, config]) => (
            <button key={key} type="button"
              className={cn("py-2 px-2 sm:px-3 sm:flex-1 rounded-lg border-2 transition-all text-xs sm:text-sm font-medium",
                formData.prioridade === key ? "border-primary bg-primary/10 shadow-sm" : "border-muted hover:border-muted-foreground/30")}
              onClick={() => updateField('prioridade', key as NovaSolicitacaoData['prioridade'])}>
              <span className={cn("w-2 h-2 rounded-full inline-block mr-1 sm:mr-2", config.color)} />{config.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Step2Specifications({ formData, errors, updateField }: StepProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <Label htmlFor="produto" className="flex items-center gap-2"><Package className="w-4 h-4" />Produto *</Label>
        <Input id="produto" value={formData.produto} onChange={(e) => updateField('produto', e.target.value)}
          placeholder="Ex: Caneta Esferográfica Azul" className={cn(errors.produto && "border-destructive")} />
        {errors.produto && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.produto}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantidade">Quantidade *</Label>
          <Input id="quantidade" type="number" min="1" value={formData.quantidade || ''}
            onChange={(e) => updateField('quantidade', parseInt(e.target.value) || 0)}
            placeholder="0" className={cn(errors.quantidade && "border-destructive")} />
          {errors.quantidade && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.quantidade}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="prazoEntrega" className="flex items-center gap-2"><Calendar className="w-4 h-4" />Prazo de Entrega *</Label>
          <Input id="prazoEntrega" type="date" value={formData.prazoEntrega}
            onChange={(e) => updateField('prazoEntrega', e.target.value)}
            className={cn(errors.prazoEntrega && "border-destructive")} />
          {errors.prazoEntrega && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.prazoEntrega}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Tipo de Solicitação *</Label>
        <div className="grid gap-2">
          {Object.entries(tipoConfig).map(([key, config]) => (
            <button key={key} type="button"
              className={cn("p-3 rounded-lg border-2 text-left transition-all",
                formData.tipo === key ? "border-primary bg-primary/10 shadow-sm" : "border-muted hover:border-muted-foreground/30")}
              onClick={() => updateField('tipo', key as NovaSolicitacaoData['tipo'])}>
              <p className="font-medium text-sm">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
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
          <Label htmlFor="centroCusto">Centro de Custo</Label>
          <Input id="centroCusto" value={formData.centroCusto} onChange={(e) => updateField('centroCusto', e.target.value)} placeholder="Ex: CC-001" />
          {formData.centroCusto && formData.valorEstimado > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={checkBudget} disabled={isCheckingBudget} className="w-full mt-1">
              {isCheckingBudget ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando...</> : <><ShieldCheck className="w-3 h-3 mr-1" /> Verificar Orçamento</>}
            </Button>
          )}
        </div>
      </div>

      {budgetCheck && (
        <div className={cn("rounded-lg p-3 border text-sm", budgetCheck.available
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          : "bg-destructive/10 border-destructive/20 text-destructive")}>
          <div className="flex items-center gap-2 font-medium mb-1">
            {budgetCheck.available ? <><Check className="w-4 h-4" /> Orçamento Disponível</> : <><AlertCircle className="w-4 h-4" /> Orçamento Insuficiente</>}
          </div>
          <p className="text-xs">{budgetCheck.message}</p>
          {budgetCheck.has_budget && budgetCheck.budget_available !== undefined && (
            <p className="text-xs mt-1">Disponível: R$ {budgetCheck.budget_available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          )}
        </div>
      )}

      {formData.valorEstimado > 0 && formData.valorEstimado < 1000 && (
        <div className="rounded-lg p-3 border bg-primary/5 border-primary/20 text-sm">
          <div className="flex items-center gap-2 text-primary font-medium"><Check className="w-4 h-4" />Aprovação Automática</div>
          <p className="text-xs text-muted-foreground mt-1">Solicitações abaixo de R$ 1.000 são aprovadas automaticamente.</p>
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
