import { Badge } from "@/components/ui/badge";
import { Check, Building2, Package, DollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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
  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
            <span className={cn("w-2 h-2 rounded-full mr-1", prioridadeConfig[formData.prioridade].color)} />
            {prioridadeConfig[formData.prioridade].label}
          </Badge>
        </div>
      </div>
    </div>

    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <h4 className="font-medium flex items-center gap-2">
        <Package className="w-4 h-4 text-primary" />
        Especificações
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
          <p className="font-medium">{tipoConfig[formData.tipo]?.label || formData.tipo}</p>
        </div>
      </div>
    </div>

    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <h4 className="font-medium flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-primary" />
        Valores
      </h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Valor Estimado</p>
          <p className="font-medium text-lg">
            R$ {formData.valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        {formData.centroCusto && (
          <div>
            <p className="text-muted-foreground">Centro de Custo</p>
            <p className="font-medium">
              {formData.costCenterId ? (
                // If we're in the modal, we might want to show the selected name
                formData.centroCusto
              ) : formData.centroCusto}
            </p>
          </div>
        )}
        {formData.valorEstimado < 1000 && formData.valorEstimado > 0 && (
          <div className="col-span-2">
            <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
              <Check className="w-3 h-3 mr-1" /> Aprovação Automática
            </Badge>
          </div>
        )}
      </div>

      {budgetCheck && (
        <div className={cn(
          "rounded-md p-2 text-xs",
          budgetCheck.available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
        )}>
          {budgetCheck.available ? '✅' : '⚠️'} {budgetCheck.message}
        </div>
      )}
    </div>

    {(formData.observacoes || formData.anexos.length > 0) && (
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Informações Adicionais
        </h4>
        <div className="text-sm space-y-2">
          {formData.observacoes && (
            <div>
              <p className="text-muted-foreground">Observações</p>
              <p className="font-medium">{formData.observacoes}</p>
            </div>
          )}
          {formData.anexos.length > 0 && (
            <div>
              <p className="text-muted-foreground">Anexos ({formData.anexos.length})</p>
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
    )}
  </div>
);
