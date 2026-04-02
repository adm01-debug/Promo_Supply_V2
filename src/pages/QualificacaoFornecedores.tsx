import { useState } from 'react';
import { MainLayout } from '@/components/compras/MainLayout';
import { PageTransition } from '@/components/animations/MotionComponents';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupplierQualification } from '@/hooks/useSupplierQualification';
import { 
  ShieldCheck, FileCheck, AlertTriangle, Clock, CheckCircle2, XCircle, 
  FileText, Award, TrendingUp, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  qualified: { label: 'Qualificado', color: 'bg-success/10 text-success border-emerald-500/20', icon: CheckCircle2 },
  partially_qualified: { label: 'Parcial', color: 'bg-warning/10 text-warning border-amber-500/20', icon: AlertTriangle },
  pending: { label: 'Pendente', color: 'bg-info/10 text-info border-blue-500/20', icon: Clock },
  disqualified: { label: 'Desqualificado', color: 'bg-destructive/10 text-destructive border-red-500/20', icon: XCircle },
};

const docStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  approved: { label: 'Aprovado', variant: 'default' },
  pending: { label: 'Pendente', variant: 'secondary' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  expired: { label: 'Expirado', variant: 'outline' },
};

const QualificacaoFornecedores = () => {
  const { requirements, scores, documents, suppliers, loading, updateDocumentStatus } = useSupplierQualification();
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  const filteredScores = selectedSupplier === 'all' 
    ? scores 
    : scores.filter(s => s.fornecedor_id === selectedSupplier);

  const getSupplierName = (fornecedorId: string) => {
    const s = suppliers.find(f => f.id === fornecedorId);
    return s?.nome_fantasia || s?.razao_social || 'Fornecedor';
  };

  const stats = {
    total: scores.length,
    qualified: scores.filter(s => s.qualification_status === 'qualified').length,
    pending: scores.filter(s => s.qualification_status === 'pending').length,
    disqualified: scores.filter(s => s.qualification_status === 'disqualified').length,
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageTransition className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Qualificação de Fornecedores
            </h1>
            <p className="text-sm text-muted-foreground">Homologação, documentos e scoring</p>
          </div>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[250px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Todos fornecedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos fornecedores</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nome_fantasia || s.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Avaliados', value: stats.total, icon: Award, color: 'text-primary' },
            { label: 'Qualificados', value: stats.qualified, icon: CheckCircle2, color: 'text-success' },
            { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-warning' },
            { label: 'Desqualificados', value: stats.disqualified, icon: XCircle, color: 'text-destructive' },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
            <TabsTrigger value="requirements">Requisitos ({requirements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {filteredScores.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma avaliação de qualificação encontrada</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredScores.map((score) => {
                  const config = statusConfig[score.qualification_status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <Card key={score.id} className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground truncate">
                              {getSupplierName(score.fornecedor_id)}
                            </h3>
                            <Badge className={config.color} variant="outline">
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>📄 {score.documents_approved} aprovados</span>
                            <span>⏳ {score.documents_pending} pendentes</span>
                            <span>❌ {score.documents_expired} expirados</span>
                            {score.next_expiry_date && (
                              <span>📅 Próx. venc: {new Date(score.next_expiry_date).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-full md:w-48 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Score</span>
                            <span className="font-bold text-foreground">{Math.round(Number(score.overall_score))}%</span>
                          </div>
                          <Progress value={Number(score.overall_score)} className="h-2" />
                          <div className="flex gap-2 text-[10px] text-muted-foreground">
                            <span>Doc: {Math.round(Number(score.document_score))}%</span>
                            <span>Comp: {Math.round(Number(score.compliance_score))}%</span>
                            <span>Val: {Math.round(Number(score.expiry_score))}%</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-4">
            {documents.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum documento cadastrado</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => {
                  const ds = docStatusConfig[doc.status] || docStatusConfig.pending;
                  return (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getSupplierName(doc.fornecedor_id)}
                              {doc.expiry_date && ` • Validade: ${new Date(doc.expiry_date).toLocaleDateString('pt-BR')}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={ds.variant}>{ds.label}</Badge>
                          {doc.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-success border-emerald-300 hover:bg-success/5"
                                onClick={() => updateDocumentStatus.mutate({ docId: doc.id, status: 'approved' })}
                              >
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive border-red-300 hover:bg-destructive/5"
                                onClick={() => updateDocumentStatus.mutate({ docId: doc.id, status: 'rejected' })}
                              >
                                Rejeitar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requirements" className="space-y-4 mt-4">
            {requirements.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum requisito configurado</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {requirements.map((req) => (
                  <Card key={req.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{req.name}</h4>
                          {req.is_mandatory && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                          <Badge variant="outline" className="text-[10px]">{req.category}</Badge>
                        </div>
                        {req.description && <p className="text-xs text-muted-foreground mt-1">{req.description}</p>}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-foreground">Peso: {req.weight}</p>
                        {req.validity_days && <p className="text-xs text-muted-foreground">Validade: {req.validity_days} dias</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageTransition>
    </MainLayout>
  );
};

export default QualificacaoFornecedores;
