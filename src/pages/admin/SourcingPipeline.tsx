import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, TrendingUp, Briefcase, CheckCircle2, AlertCircle, Clock, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SourcingPipeline = () => {
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["sourcing-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sourcing_projects")
        .select(`
          *,
          categorias(nome)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: savings, isLoading: savingsLoading } = useQuery({
    queryKey: ["savings-tracker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_tracker")
        .select("*")
        .order("realized_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>;
      case "execution":
      case "negotiation":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> Em Andamento</Badge>;
      case "planning":
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Planejamento</Badge>;
      case "backlog":
        return <Badge variant="secondary">Backlog</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalNegotiatedSaving = savings?.reduce((acc, s) => acc + (Number(s.actual_saving) || 0), 0) || 0;

  /** Agregados reais derivados de `sourcing_projects` — antes eram literais fixos. */
  const pipeline = useMemo(() => {
    const lista = projects ?? [];
    const abertos = lista.filter((p) => p.status !== 'completed' && p.status !== 'cancelled');
    const valorPipeline = abertos.reduce((acc, p) => acc + (Number(p.estimated_spend) || 0), 0);
    const metas = abertos
      .map((p) => Number(p.target_saving_pct))
      .filter((v) => Number.isFinite(v) && v > 0);
    const metaMedia = metas.length > 0 ? metas.reduce((a, b) => a + b, 0) / metas.length : null;
    const categorias = new Set(lista.map((p) => p.category_id).filter(Boolean));
    const emNegociacao = lista.filter((p) => p.status === 'negotiation').length;

    return { abertos: abertos.length, valorPipeline, metaMedia, categorias: categorias.size, emNegociacao };
  }, [projects]);

  const metaLabel = (valor: number) =>
    valor >= 1_000_000
      ? `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
      : `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

  return (
    
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Category Mgmt & Sourcing Pipeline</h1>
            <p className="text-muted-foreground">Gestão estratégica de categorias, funil de projetos e tracker de savings</p>
          </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-primary/5">
            <Target className="w-3 h-3 mr-1" />
            {pipeline.metaMedia !== null
              ? `Meta média: ${pipeline.metaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
              : 'Meta média: sem projeto'}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 text-green-500 border-green-500 bg-green-50">
            Realizado: {metaLabel(totalNegotiatedSaving)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.abertos}</div>
            <p className="text-xs text-muted-foreground">{pipeline.emNegociacao} em negociação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value (Est.)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metaLabel(pipeline.valorPipeline)}</div>
            <p className="text-xs text-muted-foreground">Soma de estimated_spend dos projetos ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta de Saving Médio</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pipeline.metaMedia !== null
                ? `${pipeline.metaMedia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {pipeline.metaMedia !== null ? 'Média de target_saving_pct' : 'Nenhum alvo cadastrado'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias Estratégicas</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.categorias}</div>
            <p className="text-xs text-muted-foreground">Categorias com projeto no pipeline</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sourcing Pipeline (Top Projects)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Spend Est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando pipeline...</TableCell>
                  </TableRow>
                ) : projects?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum projeto no pipeline.</TableCell>
                  </TableRow>
                ) : (
                  projects?.slice(0, 5).map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.title}</TableCell>
                      <TableCell>{project.categorias?.nome || "Geral"}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {project.estimated_spend ? formatCurrency(Number(project.estimated_spend)) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings Tracker (Last Validations)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Iniciativa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Saving Realizado</TableHead>
                  <TableHead>Finance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savingsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando savings...</TableCell>
                  </TableRow>
                ) : savings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum saving registrado.</TableCell>
                  </TableRow>
                ) : (
                  savings?.slice(0, 5).map((saving) => (
                    <TableRow key={saving.id}>
                      <TableCell className="font-medium">{saving.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{saving.type}</Badge></TableCell>
                      <TableCell className="text-green-600 font-bold">
                        R$ {Number(saving.actual_saving).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {saving.validated_by_finance ? 
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Validado</Badge> : 
                          <Badge variant="secondary">Pendente</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>
    
  );
};

export default SourcingPipeline;
