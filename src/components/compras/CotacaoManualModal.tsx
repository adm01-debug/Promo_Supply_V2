import { useState } from "react";
import { Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "@/lib/feedbackToast";
import type { Fornecedor } from "@/types/legacyTypes";

// Rotulo por condicao de pagamento: o valor gravado em cotacoes.condicao_pagamento
// e texto livre e aparece cru no preview do pedido, no PDF e na exportacao, entao
// cada opcao tem o seu rotulo - antes 45 e 60 dias eram gravados como "30 dias".
export const CONDICAO_PAGAMENTO_ROTULOS: Record<string, string> = {
  a_vista: "À vista",
  "30_dias": "30 dias",
  "45_dias": "45 dias",
  "60_dias": "60 dias",
};

export interface ManualCotacaoData {
  fornecedor: string;
  fornecedor_id?: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  freteInfo: string;
  condicaoPagamento: string;
  validadeProposta?: string;
  observacoes?: string;
}

interface CotacaoManualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (cotacao: ManualCotacaoData) => void;
  fornecedores: Fornecedor[];
}

export const CotacaoManualModal = ({ 
  open, 
  onOpenChange, 
  onSave, 
  fornecedores 
}: CotacaoManualModalProps) => {
  const [formData, setFormData] = useState({
    fornecedor: '',
    valorUnitario: '',
    quantidadeDisponivel: '',
    prazoEntrega: '',
    frete: '0',
    condicaoPagamento: 'a_vista',
    validade: '',
    observacoes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Numeric validation: reject empty/NaN; reject decimals on integer fields
    // (the HTML `min="1"` prevents most cases but a paste of "3.7" still gets
    // through here and parseInt would silently truncate to 3).
    const valorUnitario = Number(formData.valorUnitario);
    const quantidadeDisponivel = Number(formData.quantidadeDisponivel);
    const prazoEntrega = Number(formData.prazoEntrega);
    if (!Number.isFinite(valorUnitario) || valorUnitario <= 0) {
      toast.error("Informe um valor unitario maior que zero.");
      return;
    }
    if (!Number.isFinite(quantidadeDisponivel) || quantidadeDisponivel <= 0 || !Number.isInteger(quantidadeDisponivel)) {
      toast.error("Informe uma quantidade inteira maior que zero.");
      return;
    }
    if (!Number.isFinite(prazoEntrega) || prazoEntrega <= 0 || !Number.isInteger(prazoEntrega)) {
      toast.error("Informe o prazo de entrega em dias inteiros maior que zero.");
      return;
    }

    // So fornecedor do cadastro: a cotacao precisa de fornecedor_id real para
    // entrar na comparacao e virar pedido; nome digitado a mao nao vira cadastro.
    if (!formData.fornecedor) {
      toast.error("Selecione um fornecedor cadastrado. Fornecedor novo precisa ser cadastrado em Fornecedores antes da cotacao.");
      return;
    }
    const selectedFornecedor = fornecedores.find(f => f.id === formData.fornecedor);
    if (!selectedFornecedor) {
      toast.error("O fornecedor selecionado nao esta na lista de ativos.");
      return;
    }

    onSave({
      fornecedor: selectedFornecedor.nomeFantasia || '',
      fornecedor_id: formData.fornecedor,
      valorUnitario,
      quantidadeDisponivel,
      prazoEntrega,
      frete: parseFloat(formData.frete) || 0,
      freteInfo: parseFloat(formData.frete) > 0 ? `+R$ ${formData.frete}` : 'Incluso',
      condicaoPagamento: CONDICAO_PAGAMENTO_ROTULOS[formData.condicaoPagamento] ?? formData.condicaoPagamento,
      validadeProposta: formData.validade || undefined,
      observacoes: formData.observacoes.trim() || undefined,
    });

    // Reset form
    setFormData({
      fornecedor: '',
      valorUnitario: '',
      quantidadeDisponivel: '',
      prazoEntrega: '',
      frete: '0',
      condicaoPagamento: 'a_vista',
      validade: '',
      observacoes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Adicionar Cotação Manual
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fornecedor */}
          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <Select 
              value={formData.fornecedor} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, fornecedor: v }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione o fornecedor..." />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {fornecedores.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nomeFantasia}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {fornecedores.length === 0
                ? "Nenhum fornecedor ativo cadastrado: cadastre em Fornecedores antes de lancar a cotacao."
                : "Fornecedor novo precisa ser cadastrado em Fornecedores antes da cotacao, para entrar na comparacao e no pedido."}
            </p>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <Label>Valor Unitário (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={formData.valorUnitario}
                onChange={(e) => setFormData(prev => ({ ...prev, valorUnitario: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade Disponível *</Label>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={formData.quantidadeDisponivel}
                onChange={(e) => setFormData(prev => ({ ...prev, quantidadeDisponivel: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <Label>Prazo Entrega (dias) *</Label>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={formData.prazoEntrega}
                onChange={(e) => setFormData(prev => ({ ...prev, prazoEntrega: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Frete (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00 (se incluso)"
                value={formData.frete}
                onChange={(e) => setFormData(prev => ({ ...prev, frete: e.target.value }))}
              />
            </div>
          </div>

          {/* Condição de Pagamento */}
          <div className="space-y-2">
            <Label>Condição de Pagamento *</Label>
            <Select 
              value={formData.condicaoPagamento} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, condicaoPagamento: v }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="a_vista">À vista</SelectItem>
                <SelectItem value="30_dias">30 dias</SelectItem>
                <SelectItem value="45_dias">45 dias</SelectItem>
                <SelectItem value="60_dias">60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Validade */}
          <div className="space-y-2">
            <Label>Validade da Cotação</Label>
            <Input
              type="date"
              value={formData.validade}
              onChange={(e) => setFormData(prev => ({ ...prev, validade: e.target.value }))}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Informações adicionais..."
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              Salvar Cotação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
