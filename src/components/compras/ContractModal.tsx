import { ContractSLASection } from "./contract/ContractSLASection";
import { ContractItemsEditor } from "./contract/ContractItemsEditor";
import { useState, useEffect } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, ShieldAlert, AlertTriangle } from "lucide-react";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Contract, ContractItem } from "@/types/contract";

interface ContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract;
  onSuccess: () => void;
}

export function ContractModal({ open, onOpenChange, contract, onSuccess }: ContractModalProps) {
  const isEditing = !!contract;
  
  const [formData, setFormData] = useState({
    contract_number: "",
    title: "",
    description: "",
    supplier_id: "",
    supplier_name: "",
    contract_type: "service",
    status: "draft",
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    total_value: 0,
    payment_terms: "",
    renewal_type: "manual",
    renewal_notice_days: 30,
    // SLA & Penalty
    sla_delivery_days: 30,
    penalty_rate_per_day: 0.5,
    penalty_cap_percent: 20,
    min_quality_score: 3.0,
    quality_penalty_percent: 10,
    return_policy: "Itens fora do padrão serão devolvidos com nota de devolução e desconto aplicado no próximo pagamento.",
    min_supplier_score: 3.0,
    auto_block_below_score: true,
  });

  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contract) {
      setFormData({
        contract_number: contract.contract_number,
        title: contract.title,
        description: contract.description || "",
        supplier_id: contract.supplier_id,
        supplier_name: contract.supplier_name,
        contract_type: contract.contract_type,
        status: contract.status,
        start_date: new Date(contract.start_date),
        end_date: new Date(contract.end_date),
        total_value: Number(contract.total_value),
        payment_terms: contract.payment_terms || "",
        renewal_type: contract.renewal_type || "manual",
        renewal_notice_days: contract.renewal_notice_days || 30,
        sla_delivery_days: contract.sla_delivery_days ?? 30,
        penalty_rate_per_day: contract.penalty_rate_per_day ?? 0.5,
        penalty_cap_percent: contract.penalty_cap_percent ?? 20,
        min_quality_score: contract.min_quality_score ?? 3.0,
        quality_penalty_percent: contract.quality_penalty_percent ?? 10,
        return_policy: contract.return_policy || "Itens fora do padrão serão devolvidos com nota de devolução e desconto aplicado no próximo pagamento.",
        min_supplier_score: contract.min_supplier_score ?? 3.0,
        auto_block_below_score: contract.auto_block_below_score ?? true,
      });
      // Fetch items
      fetchContractItems(contract.id);
    } else {
      resetForm();
    }
  }, [contract, open]);

  const fetchContractItems = async (contractId: string) => {
    const { data, error } = await supabase
      .from('contract_items')
      .select('*')
      .eq('contract_id', contractId);
    
    if (!error && data) {
      setItems(data);
    }
  };

  const resetForm = () => {
    setFormData({
      contract_number: `CTR-${Date.now().toString().slice(-6)}`,
      title: "",
      description: "",
      supplier_id: "",
      supplier_name: "",
      contract_type: "service",
      status: "draft",
      start_date: undefined,
      end_date: undefined,
      total_value: 0,
      payment_terms: "",
      renewal_type: "manual",
      renewal_notice_days: 30,
      sla_delivery_days: 30,
      penalty_rate_per_day: 0.5,
      penalty_cap_percent: 20,
      min_quality_score: 3.0,
      quality_penalty_percent: 10,
      return_policy: "Itens fora do padrão serão devolvidos com nota de devolução e desconto aplicado no próximo pagamento.",
      min_supplier_score: 3.0,
      auto_block_below_score: true,
    });
    setItems([]);
  };

  const addItem = () => {
    setItems([...items, {
      item_name: "",
      description: "",
      unit: "UN",
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof ContractItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total price
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
    
    // Update total contract value
    const totalValue = newItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => ({ ...prev, total_value: totalValue }));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    
    const totalValue = newItems.reduce((sum, item) => sum + item.total_price, 0);
    setFormData(prev => ({ ...prev, total_value: totalValue }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.supplier_name || !formData.start_date || !formData.end_date) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      // Generate a canonical slug from the supplier name. Names made up
      // entirely of symbols/non-ASCII collapse to ''; fall back to a
      // timestamped placeholder so the DB never receives an empty id.
      const slugFromName = (formData.supplier_name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const supplierId =
        formData.supplier_id || slugFromName || `supplier-${Date.now()}`;

      const contractData = {
        contract_number: formData.contract_number,
        title: formData.title,
        description: formData.description || null,
        supplier_id: supplierId,
        supplier_name: formData.supplier_name,
        contract_type: formData.contract_type,
        status: formData.status,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd'),
        total_value: formData.total_value,
        payment_terms: formData.payment_terms || null,
        renewal_type: formData.renewal_type,
        renewal_notice_days: formData.renewal_notice_days,
        sla_delivery_days: formData.sla_delivery_days,
        penalty_rate_per_day: formData.penalty_rate_per_day,
        penalty_cap_percent: formData.penalty_cap_percent,
        min_quality_score: formData.min_quality_score,
        quality_penalty_percent: formData.quality_penalty_percent,
        return_policy: formData.return_policy,
        min_supplier_score: formData.min_supplier_score,
        auto_block_below_score: formData.auto_block_below_score,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('contracts')
          .update(contractData)
          .eq('id', contract.id);

        if (error) throw error;

        // Update items - delete old and insert new
        await supabase.from('contract_items').delete().eq('contract_id', contract.id);
        
        if (items.length > 0) {
          const itemsToInsert = items.map(item => ({
            contract_id: contract.id,
            item_name: item.item_name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          }));
          
          const { error: itemsError } = await supabase
            .from('contract_items')
            .insert(itemsToInsert);
          
          if (itemsError) throw itemsError;
        }

        // Add history entry
        await supabase.from('contract_history').insert({
          contract_id: contract.id,
          action_type: 'updated',
          action_description: 'Contrato atualizado',
        });

        toast.success("Contrato atualizado com sucesso");
      } else {
        const { data: newContract, error } = await supabase
          .from('contracts')
          .insert(contractData)
          .select()
          .single();

        if (error) throw error;

        // Insert items
        if (items.length > 0 && newContract) {
          const itemsToInsert = items.map(item => ({
            contract_id: newContract.id,
            item_name: item.item_name,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          }));
          
          await supabase.from('contract_items').insert(itemsToInsert);
        }

        // Add history entry
        if (newContract) {
          await supabase.from('contract_history').insert({
            contract_id: newContract.id,
            action_type: 'created',
            action_description: 'Contrato criado',
          });
        }

        toast.success("Contrato criado com sucesso");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar contrato';
      console.error('Error saving contract:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Contrato" : "Novo Contrato"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_number">Número do Contrato</Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                disabled={isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nome do contrato"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição detalhada do contrato"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">Fornecedor *</Label>
              <Input
                id="supplier_name"
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, contract_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Serviço</SelectItem>
                  <SelectItem value="supply">Fornecimento</SelectItem>
                  <SelectItem value="framework">Acordo-Quadro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_approval">Aguard. Aprovação</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="renewed">Renovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? (
                      format(formData.start_date, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      "Selecione"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data Fim *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? (
                      format(formData.end_date, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      "Selecione"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Condições de Pagamento</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                placeholder="Ex: 30 dias"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Renovação</Label>
              <Select
                value={formData.renewal_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, renewal_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automática</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewal_notice_days">Aviso Prévio (dias)</Label>
              <Input
                id="renewal_notice_days"
                type="number"
                value={formData.renewal_notice_days}
                onChange={(e) => setFormData(prev => ({ ...prev, renewal_notice_days: parseInt(e.target.value) || 30 }))}
              />
            </div>
          </div>

          <ContractSLASection
            data={{
              sla_delivery_days: formData.sla_delivery_days,
              penalty_rate_per_day: formData.penalty_rate_per_day,
              penalty_cap_percent: formData.penalty_cap_percent,
              min_quality_score: formData.min_quality_score,
              quality_penalty_percent: formData.quality_penalty_percent,
              return_policy: formData.return_policy,
              min_supplier_score: formData.min_supplier_score,
              auto_block_below_score: formData.auto_block_below_score,
            }}
            onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />

          {/* Items */}
          <ContractItemsEditor
            items={items}
            totalValue={formData.total_value}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Contrato"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
