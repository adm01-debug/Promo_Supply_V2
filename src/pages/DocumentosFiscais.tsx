import { useState } from "react";
import { MainLayout } from "@/components/compras/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, CheckCircle, XCircle, Clock, Search, AlertTriangle, FileCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns/format";
import { ptBR } from "date-fns/locale/pt-BR";

const DocumentosFiscais = () => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["fiscal-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fiscal_documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: pedidos } = useQuery({
    queryKey: ["pedidos-for-reconciliation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("id, numero, valor_total, fornecedor_id, status")
        .in("status", ["aprovado", "enviado", "em_transito", "entregue"])
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xml")) {
      toast.error("Apenas arquivos XML são aceitos");
      return;
    }

    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");

      const getTag = (tag: string) => xml.getElementsByTagName(tag)?.[0]?.textContent || "";

      const nNF = getTag("nNF");
      const serie = getTag("serie");
      const chaveAcesso = getTag("chNFe") || xml.querySelector("[Id]")?.getAttribute("Id")?.replace("NFe", "") || "";
      const dhEmi = getTag("dhEmi");
      const vNF = parseFloat(getTag("vNF")) || 0;
      const vProd = parseFloat(getTag("vProd")) || 0;
      const vFrete = parseFloat(getTag("vFrete")) || 0;
      const vDesc = parseFloat(getTag("vDesc")) || 0;

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("fiscal_documents").insert({
        numero_nf: nNF || `NF-${Date.now()}`,
        serie,
        chave_acesso: chaveAcesso,
        data_emissao: dhEmi ? new Date(dhEmi).toISOString().split("T")[0] : null,
        valor_total: vNF,
        valor_produtos: vProd,
        valor_frete: vFrete,
        valor_desconto: vDesc,
        status: "validada",
        uploaded_by: user?.id || null,
      });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] });
      toast.success(`NF-e ${nNF} importada com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar XML. Verifique o formato do arquivo.");
    }

    e.target.value = "";
  };

  const reconcileMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc = documents?.find(d => d.id === docId);
      if (!doc) throw new Error("Documento não encontrado");

      const match = pedidos?.find(p => Math.abs(Number(p.valor_total) - Number(doc.valor_total)) < 0.01);

      const { error } = await supabase
        .from("fiscal_documents")
        .update({
          pedido_id: match?.id || null,
          reconciliation_status: match ? "matched" : "unmatched",
          reconciliation_notes: match
            ? `Conciliado com pedido ${match.numero}`
            : "Nenhum pedido correspondente encontrado",
        })
        .eq("id", docId);

      if (error) throw error;
      return match;
    },
    onSuccess: (match) => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-documents"] });
      toast.success(match ? "NF conciliada com pedido!" : "Nenhum pedido correspondente encontrado");
    },
    onError: () => toast.error("Erro na conciliação"),
  });

  const filtered = documents?.filter(d =>
    !search || d.numero_nf.toLowerCase().includes(search.toLowerCase()) ||
    d.chave_acesso?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: documents?.length || 0,
    matched: documents?.filter(d => d.reconciliation_status === "matched").length || 0,
    unmatched: documents?.filter(d => d.reconciliation_status === "unmatched").length || 0,
    pending: documents?.filter(d => d.reconciliation_status === "pending").length || 0,
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documentos Fiscais</h1>
            <p className="text-sm text-muted-foreground">Upload de NF-e XML, conciliação e validação</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total NF-e", value: stats.total, icon: FileText, color: "text-info" },
            { label: "Conciliadas", value: stats.matched, icon: CheckCircle, color: "text-success" },
            { label: "Divergentes", value: stats.unmatched, icon: XCircle, color: "text-destructive" },
            { label: "Pendentes", value: stats.pending, icon: Clock, color: "text-warning" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upload NF-e</CardTitle>
                <CardDescription>Importe arquivos XML de Notas Fiscais Eletrônicas</CardDescription>
              </div>
              <label>
                <input type="file" accept=".xml" className="hidden" onChange={handleXmlUpload} />
                <Button asChild>
                  <span><Upload className="h-4 w-4 mr-2" /> Importar XML</span>
                </Button>
              </label>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos Importados</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar NF..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table aria-label="Tabela de dados">
              <TableHeader>
                <TableRow>
                  <TableHead>NF-e</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conciliação</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-sm">{doc.numero_nf}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{doc.chave_acesso || "-"}</TableCell>
                    <TableCell className="text-sm">
                      {doc.data_emissao ? format(new Date(doc.data_emissao), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {Number(doc.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={doc.status === "validada" ? "default" : "secondary"}>{doc.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        doc.reconciliation_status === "matched" ? "default" :
                        doc.reconciliation_status === "unmatched" ? "destructive" : "secondary"
                      }>
                        {doc.reconciliation_status === "matched" ? "Conciliada" :
                         doc.reconciliation_status === "unmatched" ? "Divergente" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.reconciliation_status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => reconcileMutation.mutate(doc.id)}>
                          Conciliar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!filtered || filtered.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum documento fiscal importado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default DocumentosFiscais;
