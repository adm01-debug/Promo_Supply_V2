import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { logger } from '@/lib/logger';
import { 
  FileText, 
  Building2, 
  Package, 
  Calculator,
  MessageSquare,
  Mail,
  Copy,
  Check,
  ArrowLeft,
  Send,
  Printer,
  Truck,
  Percent,
  StickyNote
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { usePedidos } from "@/features/pedidos";
import { useCotacoes } from "@/features/cotacoes";
import { Loader2 } from "lucide-react";
import { useCatalogoPim } from "@/hooks/useCatalogoPim";

import { getTipoLabel, buildWhatsAppMessage, buildEmailMessage, formatarEnderecoEntrega } from './gerarOrdemHelpers';
import { formatCurrency } from "@/lib/utils";
import { generateOrderPDF } from "@/lib/pdfGenerator";
import { LegacyFornecedor } from "@/types/legacyTypes";
import { useAuth } from "@/features/auth";

const GerarOrdem = () => {
  const { user, tenantId, selectedEmpresaId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("solicitacao");
  const cotacaoId = searchParams.get("cotacao");

  const [copiado, setCopiado] = useState<string | null>(null);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState("");
  const [mensagemEmail, setMensagemEmail] = useState("");
  const [assuntoEmail, setAssuntoEmail] = useState("");
  const [frete, setFrete] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createPedido } = usePedidos();
  const { cotacoes } = useCotacoes({ solicitacao_id: solicitacaoId || undefined });
  const { buscarProdutoPorId } = useCatalogoPim();

  // Fetch solicitacao from Supabase
  const { data: solicitacaoData } = useQuery({
    queryKey: ['gerar-ordem-solicitacao', solicitacaoId],
    queryFn: async () => {
      if (!solicitacaoId) return null;
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('*')
        .eq('id', solicitacaoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!solicitacaoId,
  });

  // Etapa QA 227: o e-mail ao fornecedor imprimia o placeholder "[Endereco da
  // empresa]". O endereco real vem de `tenants.endereco_fiscal` da empresa em
  // foco no seletor do header; empresa sem endereco cadastrado omite o bloco.
  const empresaId = selectedEmpresaId ?? tenantId ?? null;
  const { data: empresaEntrega } = useQuery({
    queryKey: ['gerar-ordem-empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('name, nome_fantasia, razao_social, endereco_fiscal')
        .eq('id', empresaId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
    staleTime: 300_000,
  });

  const pimProductId = (solicitacaoData as { pim_product_id?: string | null } | null)?.pim_product_id ?? null;
  const pimVariantId = (solicitacaoData as { pim_variant_id?: string | null } | null)?.pim_variant_id ?? null;

  const { data: pimProduto } = useQuery({
    queryKey: ['gerar-ordem-pim-produto', pimProductId],
    queryFn: () => buscarProdutoPorId(pimProductId as string),
    enabled: !!pimProductId,
  });

  // Fetch fornecedores
  const { data: fornecedoresData = [] } = useQuery({
    queryKey: ['gerar-ordem-fornecedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('id, razao_social, nome_fantasia, cnpj, email, telefone, tipo')
       .eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Cotacao alvo: preco de origem da OC. Sem ela nao ha valor real para gravar.
    const selectedCotacao = cotacoes.find(c => c.id === cotacaoId) || cotacoes.find(c => c.selecionada);

    const quantidadeCotacao = Number(selectedCotacao?.quantidade ?? 0) || Number(solicitacaoData?.quantidade ?? 0);
    // O preco vem da cotacao vencedora. O valor estimado da solicitacao e' chute
    // do solicitante, nao preco negociado, e servia apenas de fallback.
    const valorUnitario = Number(selectedCotacao?.valor_unitario ?? 0)
      || (Number(solicitacaoData?.valor_estimado ?? 0) / Math.max(Number(solicitacaoData?.quantidade ?? 1), 1));

    // Create a unified data shape
  const solicitacao = {
    id: solicitacaoData?.id || 'N/A',
    produto: solicitacaoData?.descricao || 'Produto',
      quantidade: quantidadeCotacao,
      quantidadeReal: quantidadeCotacao,
    tipo: 'produto',
    empresa: 'Promo Supply',
    vendedor: '',
    prazoEntrega: solicitacaoData?.data_necessidade || new Date().toISOString(),
      valorUnitario,
    fornecedorSelecionado: '',
  };

  const fornecedor = useMemo(() => {
    if (selectedCotacao?.fornecedor_id) {
      const found = fornecedoresData.find(f => f.id === selectedCotacao.fornecedor_id);
      if (found) return found;
    }
    // Sem cotacao selecionada nao ha fornecedor definido. Cair no primeiro
    // fornecedor ativo gerava OC para o fornecedor errado, sem aviso.
    return {
      id: '',
      razao_social: 'Selecione um fornecedor',
      nome_fantasia: 'N/A',
      cnpj: 'N/A',
      email: 'N/A',
      telefone: 'N/A',
      tipo: 'N/A',
    };
  }, [selectedCotacao, fornecedoresData]);

  const ordemNumero = "A DEFINIR";

  // Calculos financeiros — frete e desconto vem da cotacao vencedora; o `|| 12`
    // era placeholder de maquete e o frete fixo de 150 inventava valor na OC.
    const subtotal = solicitacao.valorUnitario * solicitacao.quantidadeReal;
  const total = subtotal + frete - desconto;

    useEffect(() => {
      if (!selectedCotacao) return;
      setFrete(Number(selectedCotacao.valor_frete ?? 0));
      const bruto = Number(selectedCotacao.valor_unitario ?? 0) * quantidadeCotacao;
      const pct = Number(selectedCotacao.desconto_percentual ?? 0);
      setDesconto(pct > 0 ? Number(((bruto * pct) / 100).toFixed(2)) : 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCotacao?.id, selectedCotacao?.valor_frete, selectedCotacao?.desconto_percentual, selectedCotacao?.valor_unitario, quantidadeCotacao]);

  const gerarMensagemWhatsApp = () => {
    setMensagemWhatsApp(buildWhatsAppMessage(
      { nome_fantasia: fornecedor.nome_fantasia || '', razao_social: fornecedor.razao_social },
      solicitacao, ordemNumero, total, frete, desconto, observacoes,
    ));
  };

  const gerarMensagemEmail = () => {
    const { assunto, corpo } = buildEmailMessage(
      solicitacao, ordemNumero, subtotal, total, frete, desconto, observacoes,
      {
        empresa:
          empresaEntrega?.nome_fantasia ||
          empresaEntrega?.razao_social ||
          empresaEntrega?.name ||
          null,
        endereco: formatarEnderecoEntrega(empresaEntrega?.endereco_fiscal),
      },
    );
    setAssuntoEmail(assunto);
    setMensagemEmail(corpo);
  };

  const copiarMensagem = (tipo: string, texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    toast({
      title: "Copiado!",
      description: "Mensagem copiada para a área de transferência",
    });
    setTimeout(() => setCopiado(null), 2000);
  };

  const abrirWhatsApp = () => {
    const telefone = (fornecedor.telefone || '').replace(/\D/g, "");
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagemWhatsApp)}`;
    window.open(url, "_blank");
  };

  const abrirEmail = () => {
    const url = `mailto:${fornecedor.email}?subject=${encodeURIComponent(assuntoEmail)}&body=${encodeURIComponent(mensagemEmail)}`;
    window.open(url, "_blank");
  };

  const finalizarOrdem = async () => {
    if (!solicitacaoData || !fornecedor.id) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para gerar a ordem.",
        variant: "destructive"
      });
      return;
    }

    // A OC so nasce de solicitacao aprovada: para pendente/em_cotacao/rejeitada o UPDATE de
    // status e recusado pelo banco, e a OC ficava gravada sem nenhuma aprovacao vigente.
    if (solicitacaoData.status !== 'aprovada') {
      toast({
        title: "Erro",
        description: `A solicitação está em "${solicitacaoData.status}" e só gera ordem de compra quando estiver aprovada.`,
        variant: "destructive"
      });
      return;
    }

        // Sem cotacao nao existe preco negociado: gerar a OC com valor estimado (ou
        // com um padrao) gravaria valor errado no pedido e no financeiro.
        if (!selectedCotacao || !(solicitacao.valorUnitario > 0) || !(solicitacao.quantidadeReal > 0)) {
          toast({
            title: "Erro",
            description: "Selecione a cotação vencedora: a ordem de compra é emitida com o preço dela.",
            variant: "destructive"
          });
          return;
        }

    setIsSubmitting(true);
    try {
      const selectedCotacao = cotacoes.find(c => c.id === cotacaoId) || cotacoes.find(c => c.selecionada);
      
      const pedido = await createPedido({
        solicitacao_id: solicitacaoId || undefined,
        cotacao_id: selectedCotacao?.id || undefined,
        fornecedor_id: fornecedor.id,
        valor_total: total,
        valor_frete: frete,
        desconto: desconto,
        observacoes: observacoes,
        itens: [{
          descricao: solicitacaoData.titulo || 'Produto',
          quantidade: solicitacao.quantidadeReal || 1,
          unidade: solicitacaoData.unidade || 'un',
          valor_unitario: solicitacao.valorUnitario,
          pim_product_id: pimProductId ?? undefined,
          pim_variant_id: pimVariantId ?? undefined,
          codigo_fornecedor: pimProduto?.supplier_reference ?? undefined,
          ncm: pimProduto?.ncm_code ?? undefined,
          ipi_rate: pimProduto?.ipi_rate ?? undefined,
        }]
      });

      if (pedido) {
        // Se houver solicitação, atualiza status
        if (solicitacaoId) {
          const { error: statusError } = await supabase
            .from('solicitacoes')
            .update({ status: 'em_andamento' })
            .eq('id', solicitacaoId);
          // A OC ja esta gravada: se a promocao da solicitacao falhar, o operador precisa
          // saber disso em vez de ver "Ordem Gerada!" com a solicitacao parada no status anterior.
          if (statusError) {
            toast({
              title: "Ordem salva, mas a solicitação não foi atualizada",
              description: statusError.message,
              variant: "destructive"
            });
          }
        }

        toast({
          title: "Ordem Gerada!",
          description: `A ordem ${pedido.numero} foi gerada e persistida no banco de dados.`,
        });
        navigate("/acompanhamento");
      }
    } catch (error) {
      logger.error('Unexpected error', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPDF = () => {
    const doc = generateOrderPDF({
      numero: ordemNumero,
      data: new Date().toLocaleDateString('pt-BR'),
      fornecedor: fornecedor as Partial<LegacyFornecedor>,
      solicitante: { email: user?.email },
      itens: [{
        descricao: solicitacao.produto,
        quantidade: solicitacao.quantidadeReal,
        valor_unitario: solicitacao.valorUnitario,
      }],
      subtotal,
      frete,
      desconto,
      total,
      observacoes
    });
    window.open(doc.output('bloburl'), '_blank');
  };

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Gerar Ordem de Compra
            </h1>
            <p className="text-sm text-muted-foreground">
              Solicitação #{solicitacao.id} • {solicitacao.produto}
            </p>
          </div>
          <Badge className="text-lg px-4 py-1 bg-primary/10 text-primary border-primary/20">
            {ordemNumero}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados do Pedido */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Dados do Pedido
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Produto</p>
                  <p className="font-medium text-foreground">{solicitacao.produto}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantidade</p>
                  <p className="font-medium text-foreground">
                    {solicitacao.quantidade} un 
                    <span className="text-xs text-muted-foreground ml-1">(+2% = {solicitacao.quantidadeReal})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{getTipoLabel(solicitacao.tipo)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Empresa Cliente</p>
                  <p className="font-medium text-foreground">{solicitacao.empresa}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendedor</p>
                  <p className="font-medium text-foreground">{solicitacao.vendedor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo de Entrega</p>
                  <p className="font-medium text-foreground">
                    {new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </Card>

            {/* Fornecedor */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Fornecedor Selecionado
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Razão Social</p>
                  <p className="font-medium text-foreground">{fornecedor.razao_social}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                  <p className="font-medium text-foreground">{fornecedor.nome_fantasia}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <p className="font-medium text-foreground">{fornecedor.cnpj}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{fornecedor.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="font-medium text-foreground">{fornecedor.telefone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{fornecedor.tipo}</Badge>
                </div>
              </div>
            </Card>

            {/* Observações */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-primary" />
                Observações
              </h2>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações ou instruções especiais para o pedido..."
                className="min-h-[100px]"
              />
            </Card>

            {/* Mensagens */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Mensagem para Fornecedor
              </h2>

              <Tabs defaultValue="whatsapp" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="whatsapp" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="w-4 h-4" />
                    E-mail
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp" className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={gerarMensagemWhatsApp}
                      className="flex-1"
                    >
                      Gerar Mensagem Automática
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copiarMensagem("whatsapp", mensagemWhatsApp)}
                      disabled={!mensagemWhatsApp}
                    >
                      {copiado === "whatsapp" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Textarea
                    value={mensagemWhatsApp}
                    onChange={(e) => setMensagemWhatsApp(e.target.value)}
                    placeholder="Clique em 'Gerar Mensagem Automática' ou digite sua mensagem..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <Button 
                    onClick={abrirWhatsApp} 
                    disabled={!mensagemWhatsApp}
                    className="w-full gap-2 bg-success hover:bg-green-700"
                  >
                    <Send className="w-4 h-4" />
                    Enviar via WhatsApp
                  </Button>
                </TabsContent>

                <TabsContent value="email" className="space-y-4 mt-4">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={gerarMensagemEmail}
                      className="flex-1"
                    >
                      Gerar Mensagem Automática
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copiarMensagem("email", mensagemEmail)}
                      disabled={!mensagemEmail}
                    >
                      {copiado === "email" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Assunto</Label>
                    <Input
                      value={assuntoEmail}
                      onChange={(e) => setAssuntoEmail(e.target.value)}
                      placeholder="Assunto do e-mail..."
                    />
                  </div>
                  <Textarea
                    value={mensagemEmail}
                    onChange={(e) => setMensagemEmail(e.target.value)}
                    placeholder="Clique em 'Gerar Mensagem Automática' ou digite sua mensagem..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <Button 
                    onClick={abrirEmail} 
                    disabled={!mensagemEmail}
                    className="w-full gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Abrir no Cliente de E-mail
                  </Button>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar - Resumo Financeiro */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Resumo Financeiro
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor Unitário</span>
                  <span className="font-medium">{formatCurrency(solicitacao.valorUnitario)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-medium">× {solicitacao.quantidadeReal}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                
                {/* Frete Editável */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Frete
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={frete}
                      onChange={(e) => setFrete(Number(e.target.value) || 0)}
                      className="pl-10 h-9 text-sm"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                {/* Desconto Editável */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Desconto
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      value={desconto}
                      onChange={(e) => setDesconto(Number(e.target.value) || 0)}
                      className="pl-10 h-9 text-sm"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">TOTAL</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Condição</span>
                  <span className="font-medium">À vista via PIX</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prazo Entrega</span>
                  <span className="font-medium">{new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Button 
                  onClick={finalizarOrdem} 
                  className="w-full gap-2 gradient-primary h-12 text-lg"
                  disabled={isSubmitting || !fornecedor.id || !selectedCotacao || !(solicitacao.valorUnitario > 0) || solicitacaoData?.status !== 'aprovada'}
                                    title={solicitacaoData && solicitacaoData.status !== 'aprovada'
                                      ? 'A solicitacao precisa estar aprovada para gerar a ordem de compra'
                                      : !fornecedor.id || !selectedCotacao || !(solicitacao.valorUnitario > 0)
                                        ? 'Selecione uma cotacao com fornecedor e preco definidos para gerar a OC'
                                        : undefined}
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Gerando Ordem...</>
                  ) : (
                    <><Check className="w-5 h-5" /> Finalizar e Salvar OC</>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={previewPDF}
                  className="w-full gap-2 text-muted-foreground"
                >
                  <Printer className="w-4 h-4" />
                  Visualizar PDF
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    
  );
};

export default GerarOrdem;
