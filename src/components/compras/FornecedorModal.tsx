import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Fornecedor } from "@/types/legacyTypes";

interface FornecedorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor?: Fornecedor | null;
  onSave: (fornecedor: Partial<Fornecedor>) => void | Promise<unknown>;
}

const ramosDisponiveis = [
  "Bolsas", "Mochilas", "Acessórios", "Canetas", "Escritório", 
  "Squeezes", "Copos", "Utilidades", "Têxtil", "Bonés", "Camisetas",
  "Eletrônicos", "Chaveiros", "Brindes Ecológicos"
];

export const FornecedorModal = ({ open, onOpenChange, fornecedor, onSave }: FornecedorModalProps) => {
  const [formData, setFormData] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    tipo: "" as Fornecedor["tipo"] | "",
    ramos: [] as string[],
    vendeProduto: "" as Fornecedor["vendeProduto"] | "",
    email: "",
    telefone: "",
    whatsapp: "",
  });

  useEffect(() => {
    if (fornecedor) {
      setFormData({
        razaoSocial: fornecedor.razaoSocial,
        nomeFantasia: fornecedor.nomeFantasia,
        cnpj: fornecedor.cnpj,
        tipo: fornecedor.tipo,
        ramos: fornecedor.ramos,
        vendeProduto: fornecedor.vendeProduto,
        email: fornecedor.email,
        telefone: fornecedor.telefone,
        whatsapp: fornecedor.whatsapp,
      });
    } else {
      setFormData({
        razaoSocial: "",
        nomeFantasia: "",
        cnpj: "",
        tipo: "",
        ramos: [],
        vendeProduto: "",
        email: "",
        telefone: "",
        whatsapp: "",
      });
    }
  }, [fornecedor, open]);

  const handleAddRamo = (ramo: string) => {
    if (!formData.ramos.includes(ramo)) {
      setFormData({ ...formData, ramos: [...formData.ramos, ramo] });
    }
  };

  const handleRemoveRamo = (ramo: string) => {
    setFormData({ ...formData, ramos: formData.ramos.filter(r => r !== ramo) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      tipo: formData.tipo || undefined,
      vendeProduto: formData.vendeProduto || undefined,
    };
    try {
      await onSave(dataToSave as Partial<Fornecedor>);
      onOpenChange(false);
    } catch {
      // onSave is expected to surface its own error toast; keep modal open
      // so the user can correct and retry.
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 14);
    return numbers
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="dialog-desc" className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social *</Label>
              <Input
                id="razaoSocial"
                value={formData.razaoSocial}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
              <Input
                id="nomeFantasia"
                value={formData.nomeFantasia}
                onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value as Fornecedor["tipo"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMPORTADORA">Importadora</SelectItem>
                  <SelectItem value="FABRICANTE">Fabricante</SelectItem>
                  <SelectItem value="DISTRIBUIDORA">Distribuidora</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ramos de Atuação</Label>
            <Select onValueChange={handleAddRamo}>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar ramo" />
              </SelectTrigger>
              <SelectContent>
                {ramosDisponiveis.filter(r => !formData.ramos.includes(r)).map(ramo => (
                  <SelectItem key={ramo} value={ramo}>{ramo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.ramos.map(ramo => (
                <Badge key={ramo} variant="secondary" className="gap-1">
                  {ramo}
                  <button type="button" onClick={() => handleRemoveRamo(ramo)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendeProduto">Tipo de Produto *</Label>
            <Select
              value={formData.vendeProduto}
              onValueChange={(value) => setFormData({ ...formData, vendeProduto: value as Fornecedor["vendeProduto"] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LISO">Apenas Liso</SelectItem>
                <SelectItem value="PERSONALIZADO">Apenas Personalizado</SelectItem>
                <SelectItem value="AMBOS">Liso e Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                placeholder="(00) 0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {fornecedor ? "Salvar Alterações" : "Cadastrar Fornecedor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
