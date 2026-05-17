import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import { useProdutoFornecedores } from "@/hooks/useProdutoFornecedores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Plus, Trash2, Building2, Truck, DollarSign, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ProductSupplierManagerProps {
  produtoId: string;
  produtoNome: string;
}

export const ProductSupplierManager = ({ produtoId, produtoNome }: ProductSupplierManagerProps) => {
  const { tenantId } = useAuth();
  const { fornecedores, isLoading, linkFornecedor, removeLink } = useProdutoFornecedores(produtoId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLink, setNewLink] = useState({
    fornecedor_id: "",
    preco_custo: 0,
    lead_time_estimado: 0,
    codigo_no_fornecedor: ""
  });

  // Fetch all available suppliers for the selection
  const { data: allFornecedores = [] } = useQuery({
    queryKey: ["available-fornecedores", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, razao_social")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const handleAdd = async () => {
    if (!newLink.fornecedor_id) return;
    await linkFornecedor.mutateAsync({
      produto_id: produtoId,
      fornecedor_id: newLink.fornecedor_id,
      preco_custo: newLink.preco_custo,
      lead_time_estimado: newLink.lead_time_estimado,
      codigo_no_fornecedor: newLink.codigo_no_fornecedor
    });
    setIsAddOpen(false);
    setNewLink({ fornecedor_id: "", preco_custo: 0, lead_time_estimado: 0, codigo_no_fornecedor: "" });
  };

  return (
    <Card className="border-white/10 bg-black/40 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 py-6">
        <div>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            Ecossistema de Fornecedores
          </CardTitle>
          <p className="text-sm text-zinc-500 mt-1 uppercase tracking-widest font-bold">
            {produtoNome}
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] tracking-widest uppercase px-6">
              <Plus className="w-4 h-4 mr-2" /> Vincular Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold uppercase tracking-tight">Vincular Novo Parceiro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Selecionar Fornecedor</Label>
                <Select 
                  value={newLink.fornecedor_id} 
                  onValueChange={(v) => setNewLink({...newLink, fornecedor_id: v})}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue placeholder="Escolha um fornecedor..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {allFornecedores
                      .filter(f => !fornecedores.find(linked => linked.fornecedor_id === f.id))
                      .map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Preço de Custo (R$)</Label>
                  <Input 
                    type="number" 
                    value={newLink.preco_custo} 
                    onChange={(e) => setNewLink({...newLink, preco_custo: parseFloat(e.target.value)})}
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Lead Time (Dias)</Label>
                  <Input 
                    type="number" 
                    value={newLink.lead_time_estimado} 
                    onChange={(e) => setNewLink({...newLink, lead_time_estimado: parseInt(e.target.value)})}
                    className="bg-white/5 border-white/10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Código no Fornecedor (SKU)</Label>
                <Input 
                  value={newLink.codigo_no_fornecedor} 
                  onChange={(e) => setNewLink({...newLink, codigo_no_fornecedor: e.target.value})}
                  className="bg-white/5 border-white/10 h-12"
                />
              </div>

              <Button onClick={handleAdd} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest h-12 mt-4">
                Confirmar Vínculo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-8">Parceiro</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Custo Base</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Lead Time</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">Avaliação</TableHead>
              <TableHead className="w-20 pr-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-500">Carregando rede...</TableCell></TableRow>
            ) : fornecedores.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-zinc-500 italic">Nenhum fornecedor vinculado a este produto.</TableCell></TableRow>
            ) : (
              fornecedores.map((pf) => (
                <TableRow key={pf.id} className="border-white/5 group hover:bg-white/[0.02] transition-colors">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-emerald-400 text-xs border border-white/10">
                        {pf.fornecedor_nome?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase tracking-tight">{pf.fornecedor_nome}</p>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black mt-1">Ref: {pf.codigo_no_fornecedor || 'N/A'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-bold text-white">{formatCurrency(pf.preco_custo || 0)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-bold text-white">{pf.lead_time_estimado || 0} dias</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < (pf.fornecedor_rating || 0) ? "text-amber-400 fill-amber-400" : "text-zinc-800"}`} 
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="pr-8">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeLink.mutate(pf.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
