import { useState, useMemo } from "react";
import {
  Package, Search, Plus, Edit2, Tag, Building2, DollarSign,
  TrendingUp, TrendingDown, Filter, X, Grid3X3, List,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useProdutos, type Produto } from "@/hooks/useProdutos";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";

const formatCurrency = (v: number | null) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const emptyProduct: Partial<Produto> = {
  codigo: "",
  nome: "",
  descricao: "",
  unidade: "un",
  preco_referencia: 0,
  estoque_minimo: 0,
  ativo: true,
  tags: [],
};

const CatalogoProdutos = () => {
  const { produtos, isLoading, categorias, createProduto, updateProduto } = useProdutos();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Produto> | null>(null);
  const [formData, setFormData] = useState<Partial<Produto>>(emptyProduct);

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      const matchesSearch =
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (p.descricao || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.categoria_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [produtos, search, categoryFilter]);

  const stats = useMemo(() => ({
    total: produtos.length,
    active: produtos.filter((p) => p.ativo).length,
    withRef: produtos.filter((p) => (p.preco_referencia || 0) > 0).length,
    avgPrice: produtos.length > 0
      ? produtos.reduce((s, p) => s + (p.preco_medio || 0), 0) / produtos.filter(p => (p.preco_medio || 0) > 0).length || 0
      : 0,
  }), [produtos]);

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyProduct);
    setModalOpen(true);
  };

  const openEdit = (p: Produto) => {
    setEditing(p);
    setFormData({ ...p });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.nome || !formData.codigo) return;
    if (editing?.id) {
      updateProduto.mutate({ id: editing.id, ...formData });
    } else {
      createProduto.mutate(formData);
    }
    setModalOpen(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const priceVariation = (p: Produto) => {
    if (!p.preco_referencia || !p.ultimo_preco || p.preco_referencia === 0) return null;
    return ((p.ultimo_preco - p.preco_referencia) / p.preco_referencia) * 100;
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
...
      </Dialog>
    </div>
  );
};

export default CatalogoProdutos;
