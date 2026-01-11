import { useState, useCallback } from "react";
import { 
  Plus, 
  X, 
  Package, 
  Building2, 
  User, 
  Calendar,
  FileText,
  Upload,
  AlertCircle,
  Loader2,
  Check
} from "lucide-react";
import { useImageCompression } from "@/hooks/useImageCompression";
import { formatBytes } from "@/lib/imageCompression";
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
  anexos: [],
};

const empresasMock = [
  'Promo Brindes',
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

interface NovaSolicitacaoModalProps {
  onSuccess?: () => void;
}

export function NovaSolicitacaoModal({ onSuccess }: NovaSolicitacaoModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<NovaSolicitacaoData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof NovaSolicitacaoData, string>>>({});

  const updateField = <K extends keyof NovaSolicitacaoData>(
    field: K, 
    value: NovaSolicitacaoData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a mock order number
      const orderNumber = `SOL-${Date.now().toString().slice(-6)}`;
      
      toast.success(`Solicitação ${orderNumber} criada com sucesso!`, {
        description: `${formData.produto} - ${formData.quantidade} unidades`,
      });
      
      // Reset and close
      setFormData(initialFormData);
      setStep(1);
      setOpen(false);
      onSuccess?.();
      
    } catch (error) {
      toast.error('Erro ao criar solicitação', {
        description: 'Tente novamente em alguns instantes',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image compression hook
  const { compressAndReplace, isCompressing } = useImageCompression({
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    convertToWebP: true,
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Compress images automatically
    const processedFiles = await compressAndReplace(files);
    updateField('anexos', [...formData.anexos, ...processedFiles]);
    
    // Reset input
    e.target.value = '';
  }, [compressAndReplace, formData.anexos, updateField]);

  const removeFile = (index: number) => {
    updateField('anexos', formData.anexos.filter((_, i) => i !== index));
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setFormData(initialFormData);
      setStep(1);
      setErrors({});
    }
  };

  const prioridadeConfig = {
    baixa: { label: 'Baixa', color: 'bg-slate-500' },
    normal: { label: 'Normal', color: 'bg-blue-500' },
    alta: { label: 'Alta', color: 'bg-orange-500' },
    urgente: { label: 'Urgente', color: 'bg-red-500' },
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
      
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Nova Solicitação de Compra
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[
            { num: 1, label: 'Identificação' },
            { num: 2, label: 'Produto' },
            { num: 3, label: 'Revisão' },
          ].map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step >= s.num 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {s.num}
                </div>
                <span className={cn(
                  "text-sm hidden sm:block",
                  step >= s.num ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-4",
                  step > s.num ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <Separator className="mb-6" />

        {/* Step 1: Identification */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="empresa" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empresa *
                </Label>
                <Select 
                  value={formData.empresa} 
                  onValueChange={(v) => updateField('empresa', v)}
                >
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
                    <AlertCircle className="w-3 h-3" />
                    {errors.empresa}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendedor" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Vendedor *
                </Label>
                <Select 
                  value={formData.vendedor} 
                  onValueChange={(v) => updateField('vendedor', v)}
                >
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
                    <AlertCircle className="w-3 h-3" />
                    {errors.vendedor}
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
                      "py-2 px-2 sm:px-3 sm:flex-1 rounded-lg border-2 transition-colors text-xs sm:text-sm font-medium",
                      formData.prioridade === key 
                        ? "border-primary bg-primary/10" 
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

        {/* Step 2: Product */}
        {step === 2 && (
          <div className="space-y-4">
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
                  <AlertCircle className="w-3 h-3" />
                  {errors.produto}
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
                    <AlertCircle className="w-3 h-3" />
                    {errors.quantidade}
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
                    <AlertCircle className="w-3 h-3" />
                    {errors.prazoEntrega}
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
                      "p-3 rounded-lg border-2 text-left transition-colors",
                      formData.tipo === key 
                        ? "border-primary bg-primary/10" 
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
                      <span className="text-[10px] text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                      {file.type === 'image/webp' && (
                        <Check className="w-3 h-3 text-green-500" />
                      )}
                      <button 
                        onClick={() => removeFile(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Identificação
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Empresa</p>
                  <p className="font-medium">{formData.empresa}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{formData.vendedor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prioridade</p>
                  <Badge variant="outline" className="mt-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full mr-1",
                      prioridadeConfig[formData.prioridade].color
                    )} />
                    {prioridadeConfig[formData.prioridade].label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Produto
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="text-muted-foreground">Produto</p>
                  <p className="font-medium">{formData.produto}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantidade</p>
                  <p className="font-medium">{formData.quantidade.toLocaleString('pt-BR')} unidades</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prazo de Entrega</p>
                  <p className="font-medium">
                    {new Date(formData.prazoEntrega).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{tipoConfig[formData.tipo].label}</p>
                </div>
                {formData.observacoes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Observações</p>
                    <p className="font-medium">{formData.observacoes}</p>
                  </div>
                )}
                {formData.anexos.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Anexos</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.anexos.map((file, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {file.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          {step > 1 && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Voltar
            </Button>
          )}
          
          {step < 3 ? (
            <Button onClick={handleNext}>
              Próximo
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar Solicitação'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
