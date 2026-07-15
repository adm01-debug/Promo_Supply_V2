import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
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
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Send,
  Calendar as CalendarIcon,
  Search,
  Check
} from "lucide-react";
import { useSourcingEvents } from "@/hooks/useLicitacoes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/feedbackToast";
import { logger } from "@/lib/logger";

type RFxUiType = "RFI" | "RFP" | "RFQ" | "AUCTION";
type SourcingEventType = "rfp" | "rfq" | "auction";
type CriterionType = "numeric" | "scale_1_5" | "boolean";

interface RFxLotDraft {
  title: string;
  description: string;
  target_price: string;
}

interface RFxCriterionDraft {
  label: string;
  weight: number;
  type: CriterionType;
}

const UI_TYPE_TO_EVENT_TYPE: Record<RFxUiType, SourcingEventType> = {
  RFI: "rfp",
  RFP: "rfp",
  RFQ: "rfq",
  AUCTION: "auction",
};

const RFxCreate = () => {
  const navigate = useNavigate();
  const { createEvent } = useSourcingEvents();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    type: RFxUiType;
    category_id: string;
    budget_estimate: string;
    currency: string;
    closes_at: string;
    sealed_bid: boolean;
    lots: RFxLotDraft[];
    criteria: RFxCriterionDraft[];
    invitations: string[];
  }>({
    title: "",
    description: "",
    type: "RFQ",
    category_id: "",
    budget_estimate: "",
    currency: "BRL",
    closes_at: "",
    sealed_bid: false,
    lots: [],
    criteria: [
      { label: "Preço Comercial", weight: 60, type: "numeric" },
      { label: "Prazo de Entrega", weight: 20, type: "numeric" },
      { label: "Qualidade Técnica", weight: 20, type: "scale_1_5" }
    ],
    invitations: [] as string[]
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await supabase.from('categorias').select('*').eq('ativo', true);
      return data || [];
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['fornecedores-by-category', formData.category_id],
    queryFn: async () => {
      let query = supabase.from('fornecedores').select('id, razao_social, nome_fantasia, email');
      
      if (formData.category_id) {
        // Buscar fornecedores que atendem esta categoria
        const { data: catSuppliers } = await supabase
          .from('fornecedor_categorias')
          .select('fornecedor_id')
          .eq('categoria_id', formData.category_id);
        
        if (catSuppliers && catSuppliers.length > 0) {
          const ids = catSuppliers.map(cs => cs.fornecedor_id);
          query = query.in('id', ids);
        }
      }
      
      const { data } = await query;
      return data || [];
    }
  });

  const handleCreate = async () => {
    try {
      // Validate
      if (!formData.title || !formData.closes_at) {
        toast.error("Por favor, preencha o título e a data de fechamento.");
        return;
      }

      const event = await createEvent.mutateAsync({
        title: formData.title,
        description: formData.description,
        type: UI_TYPE_TO_EVENT_TYPE[formData.type],
        category_id: formData.category_id || null,
        budget_estimate: parseFloat(formData.budget_estimate) || 0,
        currency: formData.currency,
        closes_at: new Date(formData.closes_at).toISOString(),
        sealed_bid: formData.sealed_bid,
        status: 'published'
      });

      if (event) {
        // Create lots
        if (formData.lots.length > 0) {
          const { error: lotsError } = await supabase.from('sourcing_event_lots').insert(
            formData.lots.map(lot => ({ 
              event_id: event.id,
              nome: lot.title,
              descricao: lot.description,
              preco_referencia: parseFloat(lot.target_price) || null
            }))
          );
          if (lotsError) throw lotsError;
        }

        // Create criteria
        if (formData.criteria.length > 0) {
          const { error: critError } = await supabase.from('sourcing_event_criteria').insert(
            formData.criteria.map(c => ({ 
              event_id: event.id,
              nome: c.label,
              peso: c.weight,
              config: { type: c.type }
            }))
          );
          if (critError) throw critError;
        }

        // Create invitations
        if (formData.invitations.length > 0) {
          const selectedSuppliers = suppliers.filter(s => formData.invitations.includes(s.id));
          const { error: invError } = await supabase.from('sourcing_invitations').insert(
            selectedSuppliers.map(s => ({ 
              event_id: event.id, 
              fornecedor_id: s.id,
              email_contato: (s as any).email || 'contato@fornecedor.com',
              token: crypto.randomUUID()
            }))
          );
          if (invError) throw invError;
        }

        navigate(`/sourcing/${event.id}`);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sourcing")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Novo Evento de Sourcing</h1>
            <p className="text-muted-foreground text-sm">Passo {step} de 4: {
              step === 1 ? "Informações Básicas" :
              step === 2 ? "Critérios e Pesos" :
              step === 3 ? "Lotes e Itens" :
              "Fornecedores Convidados"
            }</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {step === 1 && (
          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Título do Evento</Label>
                <Input 
                  id="title" 
                  placeholder="Ex: Aquisição de Laptops 2026" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as RFxUiType})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RFI">RFI (Informação)</SelectItem>
                    <SelectItem value="RFP">RFP (Proposta)</SelectItem>
                    <SelectItem value="RFQ">RFQ (Cotação)</SelectItem>
                    <SelectItem value="AUCTION">Leilão Reverso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category_id} onValueChange={v => setFormData({...formData, category_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estimativa de Budget</Label>
                <Input 
                  type="number" 
                  placeholder="0,00" 
                  value={formData.budget_estimate}
                  onChange={e => setFormData({...formData, budget_estimate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Fechamento</Label>
                <Input 
                  type="datetime-local" 
                  value={formData.closes_at}
                  onChange={e => setFormData({...formData, closes_at: e.target.value})}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descrição / Instruções</Label>
                <Textarea 
                  placeholder="Detalhes sobre o que está sendo comprado e regras do evento..." 
                  className="min-h-[100px]"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Rubrica de Avaliação</Label>
              <Button variant="outline" size="sm" onClick={() => setFormData({
                ...formData, 
                criteria: [...formData.criteria, { label: "", weight: 0, type: "numeric" }]
              })}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Critério
              </Button>
            </div>
            
            <div className="space-y-4">
              {formData.criteria.map((c, i) => (
                <div key={i} className="flex items-end gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <Label>Nome do Critério</Label>
                    <Input 
                      value={c.label} 
                      onChange={e => {
                        const newCriteria = [...formData.criteria];
                        newCriteria[i].label = e.target.value;
                        setFormData({...formData, criteria: newCriteria});
                      }}
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Label>Peso (%)</Label>
                    <Input 
                      type="number" 
                      value={c.weight} 
                      onChange={e => {
                        const newCriteria = [...formData.criteria];
                        newCriteria[i].weight = parseInt(e.target.value, 10) || 0;
                        setFormData({...formData, criteria: newCriteria});
                      }}
                    />
                  </div>
                  <div className="w-40 space-y-2">
                    <Label>Tipo de Resposta</Label>
                    <Select 
                      value={c.type} 
                      onValueChange={v => {
                        const newCriteria = [...formData.criteria];
                        newCriteria[i].type = v;
                        setFormData({...formData, criteria: newCriteria});
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numeric">Numérico</SelectItem>
                        <SelectItem value="scale_1_5">Escala 1-5</SelectItem>
                        <SelectItem value="boolean">Sim/Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                    setFormData({...formData, criteria: formData.criteria.filter((_, idx) => idx !== i)});
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="font-semibold">Soma dos Pesos:</span>
              <Badge variant={formData.criteria.reduce((a, b) => a + b.weight, 0) === 100 ? "default" : "destructive"}>
                {formData.criteria.reduce((a, b) => a + b.weight, 0)}%
              </Badge>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Lotes / Itens da Cotação</Label>
              <Button variant="outline" size="sm" onClick={() => setFormData({
                ...formData, 
                lots: [...formData.lots, { title: "", description: "", target_price: "" }]
              })}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Lote
              </Button>
            </div>

            <div className="space-y-4">
              {formData.lots.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">Nenhum lote adicionado. O evento será considerado como lote único do budget total.</p>
                </div>
              ) : formData.lots.map((lot, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Lote/Item</Label>
                      <Input 
                        value={lot.title} 
                        onChange={e => {
                          const newLots = [...formData.lots];
                          newLots[i].title = e.target.value;
                          setFormData({...formData, lots: newLots});
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço Alvo (Opcional)</Label>
                      <Input 
                        type="number" 
                        value={lot.target_price} 
                        onChange={e => {
                          const newLots = [...formData.lots];
                          newLots[i].target_price = e.target.value;
                          setFormData({...formData, lots: newLots});
                        }}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Especificações Técnicas</Label>
                      <Textarea 
                        value={lot.description} 
                        onChange={e => {
                          const newLots = [...formData.lots];
                          newLots[i].description = e.target.value;
                          setFormData({...formData, lots: newLots});
                        }}
                      />
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                    setFormData({...formData, lots: formData.lots.filter((_, idx) => idx !== i)});
                  }}>
                    Remover Lote
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-6 space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Convidar Fornecedores</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar fornecedores na base..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
                {suppliers.map(s => {
                  const isSelected = formData.invitations.includes(s.id);
                  return (
                    <div 
                      key={s.id} 
                      className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-primary' : 'hover:bg-muted'}`}
                      onClick={() => {
                        if (isSelected) {
                          setFormData({...formData, invitations: formData.invitations.filter(id => id !== s.id)});
                        } else {
                          setFormData({...formData, invitations: [...formData.invitations, s.id]});
                        }
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{s.razao_social}</span>
                        <span className="text-[10px] text-muted-foreground">{s.nome_fantasia || 'Sem nome fantasia'}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">{formData.invitations.length} fornecedores selecionados</span>
              <Badge variant="secondary">E-mail automático será enviado no lançamento</Badge>
            </div>
          </Card>
        )}

        {/* Footer Actions */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 flex justify-between">
          <Button 
            variant="outline" 
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
          >
            Anterior
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" className="gap-2" onClick={() => navigate("/sourcing")}>
              Cancelar
            </Button>
            
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>
                Próximo Passo
              </Button>
            ) : (
              <Button className="gap-2" onClick={handleCreate} disabled={createEvent.isPending}>
                <Send className="w-4 h-4" />
                Lançar Evento
              </Button>
            )}
          </div>
        </div>
      </div>
    
  );
};

export default RFxCreate;
