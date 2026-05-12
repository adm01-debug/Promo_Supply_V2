import { useState, useCallback, useEffect } from "react";
import { SolicitacaoReviewStep } from "./solicitacao/SolicitacaoReviewStep";
import { 
  Plus, Package, Check, Loader2,
  Building2, DollarSign, ShieldCheck, ArrowRight, ArrowLeft,
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
import { Step1Identification, Step2Specifications, Step3Values } from "./solicitacao/SolicitacaoFormSteps";

interface NovaSolicitacaoData {
  empresa: string;
  vendedor: string;
  produto: string;
  categoriaId: string;
  quantidade: number;
  tipo: 'PE_LISO' | 'FAB_LISO' | 'FAB_PERSONALIZADO';
  prazoEntrega: string;
  observacoes: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente';
  valorEstimado: number;
  centroCusto: string;
  costCenterId: string;
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
  costCenterId: '',
  anexos: [],
};




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
  const [formData, setFormData] = useState<NovaSolicitacaoData>(() => {
    const saved = localStorage.getItem('nova_solicitacao_draft');
    return saved ? JSON.parse(saved) : initialFormData;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NovaSolicitacaoData, string>>>({});
  const [budgetCheck, setBudgetCheck] = useState<BudgetCheckResult | null>(null);
  const [isCheckingBudget, setIsCheckingBudget] = useState(false);

  // Persistence effect
  useEffect(() => {
    if (formData !== initialFormData) {
      localStorage.setItem('nova_solicitacao_draft', JSON.stringify(formData));
    }
  }, [formData]);

  const updateField = <K extends keyof NovaSolicitacaoData>(
    field: K, 
    value: NovaSolicitacaoData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Clear budget check when value or cost center changes
    if (field === 'valorEstimado' || field === 'costCenterId') {
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
    if (!formData.costCenterId) newErrors.costCenterId = 'Selecione o centro de custo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkBudget = async () => {
    if (!formData.costCenterId || formData.valorEstimado <= 0) return;
    setIsCheckingBudget(true);
    try {
      const { data, error } = await supabase.rpc('check_budget_availability', {
        p_cost_center_id: formData.costCenterId,
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
      // Auto-check budget if cost center provided
      if (formData.costCenterId && formData.valorEstimado > 0) {
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
          cost_center_id: formData.costCenterId || null,
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
      
      localStorage.removeItem('nova_solicitacao_draft');
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
        <Button className="relative">
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
          {localStorage.getItem('nova_solicitacao_draft') && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 px-1 text-[8px] animate-bounce">RASCUNHO</Badge>
          )}
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

        {step === 1 && <Step1Identification formData={formData} errors={errors} updateField={updateField} />}
        {step === 2 && <Step2Specifications formData={formData} errors={errors} updateField={updateField} />}
        {step === 3 && <Step3Values formData={formData} errors={errors} updateField={updateField}
          budgetCheck={budgetCheck} isCheckingBudget={isCheckingBudget} checkBudget={checkBudget}
          isCompressing={isCompressing} handleFileUpload={handleFileUpload} removeFile={removeFile} />}

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
