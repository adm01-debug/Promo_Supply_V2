import { useState, useCallback } from "react";
import { SolicitacaoReviewStep } from "./solicitacao/SolicitacaoReviewStep";
import { 
  Plus, X, Package, Building2, User, Calendar,
  FileText, Upload, AlertCircle, Loader2, Check,
  DollarSign, ShieldCheck, ArrowRight, ArrowLeft,
} from "lucide-react";
import { useImageCompression } from "@/hooks/useImageCompression";
import { formatBytes } from "@/lib/imageCompression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/feedbackToast";
import { cn } from "@/lib/utils";

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

const initialFormData: NovaSolicitacaoData = {
  empresa: '',
  vendedor: '',
  produto: '',
  quantidade: 0,
  tipo: 'PE_LISO',
  prazoEntrega: '',
  observacoes: '',
  prioridade: 'normal',
  valorEstimado: 0,
  centroCusto: '',
  anexos: [],
};

const empresasMock = [
  'Promo Supply',
  'Gift Solutions',
  'Marketing Promo',
  'Brindes Express',
  'Corporate Gifts',
];

const vendedoresMock = [
  'João Silva',
  'Maria Santos',
  'Carlos Oliveira',
  'Ana Costa',
  'Pedro Lima',
];

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

interface NovaSolicitacaoModalProps {
  onSuccess?: () => void;
}

const STEPS = [
  { num: 1, label: 'Identificação', icon: Building2 },
  { num: 2, label: 'Especificações', icon: Package },
  { num: 3, label: 'Valores', icon: DollarSign },
  { num: 4, label: 'Revisão', icon: ShieldCheck },
];

export function NovaSolicitacaoModal({ onSuccess }: NovaSolicitacaoModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<NovaSolicitacaoData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NovaSolicitacaoData, string>>>({});
  const [budgetCheck, setBudgetCheck] = useState<BudgetCheckResult | null>(null);
  const [isCheckingBudget, setIsCheckingBudget] = useState(false);

  const updateField = <K extends keyof NovaSolicitacaoData>(
    field: K, 
    value: NovaSolicitacaoData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Clear budget check when value or centro custo changes
    if (field === 'valorEstimado' || field === 'centroCusto') {
      setBudgetCheck(null);
    }
  };

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof NovaSolicitacaoData, string>> = {};
    if (!formData.empresa) newErrors.empresa = 'Selecione a empresa';
    if (!formData.vendedor) newErrors.vendedor = 'Selecione o vendedor';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<Record<keyof NovaSolicitacaoData, string>> = {};
    if (!formData.produto) newErrors.produto = 'Informe o produto';
    if (formData.quantidade <= 0) newErrors.quantidade = 'Quantidade deve ser maior que 0';
    if (!formData.prazoEntrega) newErrors.prazoEntrega = 'Informe o prazo de entrega';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Partial<Record<keyof NovaSolicitacaoData, string>> = {};
    if (formData.valorEstimado <= 0) newErrors.valorEstimado = 'Informe o valor estimado';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkBudget = async () => {
    if (!formData.centroCusto || formData.valorEstimado <= 0) return;
    setIsCheckingBudget(true);
    try {
      const { data, error } = await supabase.rpc('check_budget_availability', {
        p_centro_custo: formData.centroCusto,
        p_valor: formData.valorEstimado,
      });
      if (error) throw error;
      setBudgetCheck(data as unknown as BudgetCheckResult);
    } catch (error: unknown) {
      console.error('Budget check error:', error);
      setBudgetCheck(null);
    } finally {
      setIsCheckingBudget(false);
    }
  };

  const handleNext = async () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      // Auto-check budget if centro de custo provided
      if (formData.centroCusto && formData.valorEstimado > 0) {
        await checkBudget();
      }
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    setIsSubmitting(true);
    
    try {
      // Generate sequential number from database
      const { data: numData } = await supabase.rpc('generate_sequential_number', {
        prefix: 'SOL',
        table_name: 'solicitacoes',
      });
      const numero = numData || `SOL-${Date.now()}`;

      const tipoMap: Record<string, string> = {
        PE_LISO: 'material',
        FAB_LISO: 'material',
        FAB_PERSONALIZADO: 'servico',
      };

      const prioridadeMap: Record<string, string> = {
        baixa: 'baixa',
        normal: 'media',
        alta: 'alta',
        urgente: 'urgente',
      };

      const { data, error } = await supabase
        .from('solicitacoes')
        .insert({
          numero,
          titulo: formData.produto,
          descricao: formData.observacoes || `${formData.tipo} — Empresa: ${formData.empresa}, Vendedor: ${formData.vendedor}`,
          tipo: tipoMap[formData.tipo] || 'material',
          prioridade: prioridadeMap[formData.prioridade] || 'media',
          quantidade: formData.quantidade,
          valor_estimado: formData.valorEstimado > 0 ? formData.valorEstimado : null,
          centro_custo: formData.centroCusto || null,
          data_necessidade: formData.prazoEntrega || null,
          solicitante_id: user.id,
          departamento: formData.empresa,
        })
        .select('id, numero')
        .single();

      if (error) throw error;

      // Upload attachments to Storage
      if (formData.anexos.length > 0 && data?.id) {
        for (const file of formData.anexos) {
          const filePath = `solicitacoes/${data.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('documentos')
            .upload(filePath, file);
          if (uploadError) {
            console.error('File upload error:', uploadError);
          }
        }
      }
      
      toast.success(`Solicitação ${data.numero} criada com sucesso!`, {
        description: `${formData.produto} - ${formData.quantidade} un. | R$ ${formData.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      });
      
      setFormData(initialFormData);
      setStep(1);
      setBudgetCheck(null);
      setOpen(false);
      onSuccess?.();
      
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao criar solicitação: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { compressAndReplace, isCompressing } = useImageCompression({
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    convertToWebP: true,
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const processedFiles = await compressAndReplace(files);
    updateField('anexos', [...formData.anexos, ...processedFiles]);
    e.target.value = '';
  }, [compressAndReplace, formData.anexos]);

  const removeFile = (index: number) => {
    updateField('anexos', formData.anexos.filter((_, i) => i !== index));
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData(initialFormData);
      setStep(1);
      setErrors({});
      setBudgetCheck(null);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </DialogTrigger>
      
      <DialogContent aria-describedby="dialog-desc" className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Nova Solicitação de Compra
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps - 4 etapas */}
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    step > s.num && "bg-primary text-primary-foreground",
                    step === s.num && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                    step < s.num && "bg-muted text-muted-foreground"
                  )}>
                    {step > s.num ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={cn(
                    "text-xs hidden lg:block",
                    step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2",
                    step > s.num ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <Separator className="mb-4" />

        {/* Step 1: Identificação */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="empresa" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empresa *
                </Label>
                <Select value={formData.empresa} onValueChange={(v) => updateField('empresa', v)}>
                  <SelectTrigger className={cn(errors.empresa && "border-destructive")}>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresasMock.map(empresa => (
                      <SelectItem key={empresa} value={empresa}>{empresa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.empresa && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.empresa}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendedor" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Vendedor *
                </Label>
                <Select value={formData.vendedor} onValueChange={(v) => updateField('vendedor', v)}>
                  <SelectTrigger className={cn(errors.vendedor && "border-destructive")}>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedoresMock.map(vendedor => (
                      <SelectItem key={vendedor} value={vendedor}>{vendedor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendedor && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.vendedor}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                {Object.entries(prioridadeConfig).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "py-2 px-2 sm:px-3 sm:flex-1 rounded-lg border-2 transition-all text-xs sm:text-sm font-medium",
                      formData.prioridade === key 
                        ? "border-primary bg-primary/10 shadow-sm" 
                        : "border-muted hover:border-muted-foreground/30"
                    )}
                    onClick={() => updateField('prioridade', key as NovaSolicitacaoData['prioridade'])}
                  >
                    <span className={cn("w-2 h-2 rounded-full inline-block mr-1 sm:mr-2", config.color)} />
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Especificações */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <Label htmlFor="produto" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produto *
              </Label>
              <Input
                id="produto"
                value={formData.produto}
                onChange={(e) => updateField('produto', e.target.value)}
                placeholder="Ex: Caneta Esferográfica Azul"
                className={cn(errors.produto && "border-destructive")}
              />
              {errors.produto && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{errors.produto}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={formData.quantidade || ''}
                  onChange={(e) => updateField('quantidade', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={cn(errors.quantidade && "border-destructive")}
                />
                {errors.quantidade && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.quantidade}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prazoEntrega" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Prazo de Entrega *
                </Label>
                <Input
                  id="prazoEntrega"
                  type="date"
                  value={formData.prazoEntrega}
                  onChange={(e) => updateField('prazoEntrega', e.target.value)}
                  className={cn(errors.prazoEntrega && "border-destructive")}
                />
                {errors.prazoEntrega && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.prazoEntrega}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Solicitação *</Label>
              <div className="grid gap-2">
                {Object.entries(tipoConfig).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      formData.tipo === key 
                        ? "border-primary bg-primary/10 shadow-sm" 
                        : "border-muted hover:border-muted-foreground/30"
                    )}
                    onClick={() => updateField('tipo', key as NovaSolicitacaoData['tipo'])}
                  >
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Valores & Observações */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="valorEstimado" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Valor Estimado (R$) *
                </Label>
                <Input
                  id="valorEstimado"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.valorEstimado || ''}
                  onChange={(e) => updateField('valorEstimado', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className={cn(errors.valorEstimado && "border-destructive")}
                />
                {errors.valorEstimado && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />{errors.valorEstimado}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="centroCusto">Centro de Custo</Label>
                <Input
                  id="centroCusto"
                  value={formData.centroCusto}
                  onChange={(e) => updateField('centroCusto', e.target.value)}
                  placeholder="Ex: CC-001"
                />
                {formData.centroCusto && formData.valorEstimado > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={checkBudget}
                    disabled={isCheckingBudget}
                    className="w-full mt-1"
                  >
                    {isCheckingBudget ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando...</>
                    ) : (
                      <><ShieldCheck className="w-3 h-3 mr-1" /> Verificar Orçamento</>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Budget Check Result */}
            {budgetCheck && (
              <div className={cn(
                "rounded-lg p-3 border text-sm",
                budgetCheck.available
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              )}>
                <div className="flex items-center gap-2 font-medium mb-1">
                  {budgetCheck.available ? (
                    <><Check className="w-4 h-4" /> Orçamento Disponível</>
                  ) : (
                    <><AlertCircle className="w-4 h-4" /> Orçamento Insuficiente</>
                  )}
                </div>
                <p className="text-xs">{budgetCheck.message}</p>
                {budgetCheck.has_budget && budgetCheck.budget_available !== undefined && (
                  <p className="text-xs mt-1">
                    Disponível: R$ {budgetCheck.budget_available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            )}

            {/* Auto-approval hint */}
            {formData.valorEstimado > 0 && formData.valorEstimado < 1000 && (
              <div className="rounded-lg p-3 border bg-primary/5 border-primary/20 text-sm">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Check className="w-4 h-4" />
                  Aprovação Automática
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Solicitações abaixo de R$ 1.000 são aprovadas automaticamente.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Observações
              </Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => updateField('observacoes', e.target.value)}
                placeholder="Informações adicionais sobre o pedido..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Anexos
                {isCompressing && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Comprimindo...
                  </span>
                )}
              </Label>
              <div className={cn(
                "border-2 border-dashed rounded-lg p-4 transition-colors",
                isCompressing ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
              )}>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isCompressing}
                />
                <label 
                  htmlFor="file-upload" 
                  className={cn(
                    "flex flex-col items-center justify-center cursor-pointer",
                    isCompressing && "pointer-events-none opacity-50"
                  )}
                >
                  {isCompressing ? (
                    <Loader2 className="w-8 h-8 text-primary mb-2 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isCompressing ? "Comprimindo imagens..." : "Clique para anexar arquivos"}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Imagens são comprimidas automaticamente em WebP
                  </span>
                </label>
              </div>
              
              {formData.anexos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.anexos.map((file, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pr-1">
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</span>
                      {file.type === 'image/webp' && <Check className="w-3 h-3 text-emerald-500" />}
                      <button onClick={() => removeFile(index)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <SolicitacaoReviewStep formData={formData} budgetCheck={budgetCheck} />
        )}

        <DialogFooter className="mt-6 flex gap-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          
          {step < 4 ? (
            <Button onClick={handleNext}>
              Próximo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || (budgetCheck !== null && !budgetCheck.available)}>
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Criando...</>
              ) : (
                <><Check className="w-4 h-4 mr-1" /> Criar Solicitação</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
