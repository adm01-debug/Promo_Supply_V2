import { useState, useCallback, useEffect } from "react";
import { SolicitacaoReviewStep } from "./solicitacao/SolicitacaoReviewStep";
import { 
  Plus, Package, Check, Loader2,
  Building2, DollarSign, ShieldCheck, ArrowRight, ArrowLeft,
} from "lucide-react";
import { EliteButton } from "@/components/atoms/EliteButton";
import { useImageCompression } from "@/hooks/useImageCompression";
import { formatBytes } from "@/lib/imageCompression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import DOMPurify from "dompurify";
import { solicitacaoSchema, type SolicitacaoFormData as NovaSolicitacaoData } from "@/schemas/solicitacao.schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/feedbackToast";
import { cn } from "@/lib/utils";
import { Step1Identification, Step2Specifications, Step3Values } from "./solicitacao/SolicitacaoFormSteps";

const initialFormData: NovaSolicitacaoData = {
  empresa: '',
  vendedor: '',
  produto: '',
  categoriaId: '',
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
  const { user, organizationId } = useAuth();
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
    if (field === 'valorEstimado' || field === 'costCenterId') {
      setBudgetCheck(null);
    }
  };

  const validateWithSchema = (currentStep: number) => {
    const result = solicitacaoSchema.safeParse(formData);
    if (result.success) return true;

    const newErrors: Partial<Record<keyof NovaSolicitacaoData, string>> = {};
    result.error.issues.forEach(issue => {
      const path = issue.path[0] as keyof NovaSolicitacaoData;
      // Filter errors by step
      if (currentStep === 1 && (path === 'empresa' || path === 'vendedor')) {
        newErrors[path] = issue.message;
      } else if (currentStep === 2 && (path === 'produto' || path === 'quantidade' || path === 'prazoEntrega')) {
        newErrors[path] = issue.message;
      } else if (currentStep === 3 && (path === 'valorEstimado' || path === 'costCenterId')) {
        newErrors[path] = issue.message;
      }
    });

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
    if (validateWithSchema(step)) {
      if (step === 3) {
        if (formData.costCenterId && formData.valorEstimado > 0) {
          await checkBudget();
        }
      }
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user || !organizationId) {
      toast.error('Você precisa estar logado em uma organização');
      return;
    }
    setIsSubmitting(true);
    
    try {
      // Sanitização de inputs
      const sanitizedTitulo = DOMPurify.sanitize(formData.produto);
      const sanitizedDescricao = DOMPurify.sanitize(formData.observacoes || '');

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
          titulo: sanitizedTitulo,
          descricao: sanitizedDescricao || `${formData.tipo} — Empresa: ${formData.empresa}, Vendedor: ${formData.vendedor}`,
          tipo: tipoMap[formData.tipo] || 'material',
          prioridade: prioridadeMap[formData.prioridade] || 'media',
          quantidade: formData.quantidade,
          valor_estimado: formData.valorEstimado > 0 ? formData.valorEstimado : null,
          centro_custo: formData.centroCusto || null,
          cost_center_id: formData.costCenterId || null,
          data_necessidade: formData.prazoEntrega || null,
          solicitante_id: user.id,
          departamento: formData.empresa,
          categoria_id: formData.categoriaId || null,
          organization_id: organizationId,
          tenant_id: organizationId as any,
        } as any)
        .select('id, numero')
        .single();

      if (error) throw error;

      if (formData.anexos && formData.anexos.length > 0 && data?.id) {
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
        description: `${sanitizedTitulo} - ${formData.quantidade} un. | R$ ${formData.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
    updateField('anexos', [...(formData.anexos || []), ...processedFiles]);
    e.target.value = '';
  }, [compressAndReplace, formData.anexos]);

  const removeFile = (index: number) => {
    updateField('anexos', (formData.anexos || []).filter((_, i) => i !== index));
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

      <DialogContent aria-describedby="dialog-desc" className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-0 bg-[#0a0a0f] border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-sky-600" />
        
        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="flex items-center gap-4 text-2xl font-black text-white tracking-tighter uppercase font-mono">
            <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-400 border border-violet-500/10 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            Nova Solicitação de Compra
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 pb-8">
          <div className="flex items-center justify-between mb-8 bg-white/[0.02] p-4 rounded-3xl border border-white/5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-500",
                    step > s.num && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
                    step === s.num && "bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-110",
                    step < s.num && "bg-white/5 text-zinc-600 border border-white/5 opacity-50"
                  )}>
                    {step > s.num ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    "text-[10px] hidden lg:block font-black uppercase tracking-widest ml-2",
                    step === s.num ? "text-white" : "text-zinc-500"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-[2px] mx-4 transition-all duration-1000",
                    step > s.num ? "bg-gradient-to-r from-emerald-500/50 to-violet-500/50" : "bg-white/5"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <Separator className="mb-8 bg-white/5" />

        {step === 1 && <Step1Identification formData={formData} errors={errors} updateField={updateField} />}
        {step === 2 && <Step2Specifications formData={formData} errors={errors} updateField={updateField} />}
        {step === 3 && <Step3Values formData={formData} errors={errors} updateField={updateField}
          budgetCheck={budgetCheck} isCheckingBudget={isCheckingBudget} checkBudget={checkBudget}
          isCompressing={isCompressing} handleFileUpload={handleFileUpload} removeFile={removeFile} />}

        {step === 4 && (
          <SolicitacaoReviewStep formData={formData} budgetCheck={budgetCheck} />
        )}

        <DialogFooter className="p-8 pt-0 flex gap-4 sm:justify-between items-center bg-white/[0.01]">
          {step > 1 ? (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleBack} 
              disabled={isSubmitting}
              className="rounded-xl font-black text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 h-12 px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          ) : (
            <div />
          )}
          
          {step < 4 ? (
            <EliteButton onClick={handleNext} className="h-12 px-10 rounded-xl bg-violet-600 hover:bg-violet-500 font-black text-[10px] tracking-widest uppercase">
              PRÓXIMO <ArrowRight className="w-4 h-4 ml-2" />
            </EliteButton>
          ) : (
            <EliteButton 
              onClick={handleSubmit} 
              disabled={isSubmitting || (budgetCheck !== null && !budgetCheck.available)}
              className="h-12 px-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-black text-[10px] tracking-widest uppercase border-none shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> PROCESSANDO...</>
              ) : (
                <><Check className="w-4 h-4 mr-2" /> FINALIZAR SOLICITAÇÃO</>
              )}
            </EliteButton>
          )}
        </DialogFooter>
      </div>
      </DialogContent>
    </Dialog>
  );
}
