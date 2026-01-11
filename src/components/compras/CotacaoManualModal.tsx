import { useState } from "react";
import { Upload, Save } from "lucide-react";
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
import type { Fornecedor } from "@/data/mockData";

export interface ManualCotacaoData {
  fornecedor: string;
  fornecedor_id?: string;
  valorUnitario: number;
  quantidadeDisponivel: number;
  prazoEntrega: number;
  frete: number;
  freteInfo: string;
  condicaoPagamento: string;
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
    novoFornecedor: '',
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
    
    const selectedFornecedor = fornecedores.find(f => f.id === formData.fornecedor);
    const fornecedorNome = formData.fornecedor === 'novo' 
      ? formData.novoFornecedor 
      : selectedFornecedor?.nomeFantasia || '';

    onSave({
      fornecedor: fornecedorNome,
      fornecedor_id: formData.fornecedor === 'novo' ? undefined : formData.fornecedor,
      valorUnitario: parseFloat(formData.valorUnitario),
      quantidadeDisponivel: parseInt(formData.quantidadeDisponivel),
      prazoEntrega: parseInt(formData.prazoEntrega),
      frete: parseFloat(formData.frete) || 0,
      freteInfo: parseFloat(formData.frete) > 0 ? `+R$ ${formData.frete}` : 'Incluso',
      condicaoPagamento: formData.condicaoPagamento === 'a_vista' ? 'À vista' : '30 dias',
    });

    // Reset form
    setFormData({
      fornecedor: '',
      novoFornecedor: '',
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
      <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6">
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
                <SelectValue placeholder="Selecione ou adicione novo..." />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {fornecedores.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nomeFantasia}</SelectItem>
                ))}
                <SelectItem value="novo">+ Novo fornecedor</SelectItem>
              </SelectContent>
            </Select>
            
            {formData.fornecedor === 'novo' && (
              <Input
                placeholder="Nome do novo fornecedor"
                value={formData.novoFornecedor}
                onChange={(e) => setFormData(prev => ({ ...prev, novoFornecedor: e.target.value }))}
                className="mt-2"
              />
            )}
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

          {/* Anexo */}
          <div className="space-y-2">
            <Label>Anexar Cotação (PDF/Imagem)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Clique para selecionar arquivo</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (máx. 5MB)</p>
            </div>
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
