import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
import { MainLayout } from "@/components/compras/MainLayout";
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
import { usePedidos } from "@/hooks/usePedidos";
import { useCotacoes } from "@/hooks/useCotacoes";
import { Loader2 } from "lucide-react";

import { getTipoLabel, buildWhatsAppMessage, buildEmailMessage } from './gerar-ordem/gerarOrdemHelpers';
import { generateOrderPDF } from "@/lib/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";

const GerarOrdem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("solicitacao");
  const cotacaoId = searchParams.get("cotacao");

  const [copiado, setCopiado] = useState<string | null>(null);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState("");
  const [mensagemEmail, setMensagemEmail] = useState("");
  const [assuntoEmail, setAssuntoEmail] = useState("");
  const [frete, setFrete] = useState(150);
  const [desconto, setDesconto] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createPedido } = usePedidos();
  const { cotacoes } = useCotacoes({ solicitacao_id: solicitacaoId || undefined });

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
    staleTime: 60000,
  });

  // Create a unified data shape
  const solicitacao = {
    id: solicitacaoData?.id || 'N/A',
    produto: solicitacaoData?.descricao || 'Produto',
    quantidade: solicitacaoData?.quantidade || 0,
    quantidadeReal: solicitacaoData?.quantidade || 0,
    tipo: 'produto',
    empresa: 'Promo Supply',
    vendedor: '',
    prazoEntrega: solicitacaoData?.data_necessidade || new Date().toISOString(),
    valorUnitario: Number(solicitacaoData?.valor_estimado || 0) / Math.max(solicitacaoData?.quantidade || 1, 1),
    fornecedorSelecionado: '',
  };

  const selectedCotacao = cotacoes.find(c => c.id === cotacaoId) || cotacoes.find(c => c.selecionada);
  
  const fornecedor = useMemo(() => {
    if (selectedCotacao?.fornecedor_id) {
      const found = fornecedoresData.find(f => f.id === selectedCotacao.fornecedor_id);
      if (found) return found;
    }
    return fornecedoresData[0] || {
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

  // Cálculos financeiros
  const subtotal = (solicitacao.valorUnitario || 12) * solicitacao.quantidadeReal;
  const total = subtotal + frete - desconto;

  const gerarMensagemWhatsApp = () => {
    setMensagemWhatsApp(buildWhatsAppMessage(
      { nome_fantasia: fornecedor.nome_fantasia || '', razao_social: fornecedor.razao_social },
      solicitacao, ordemNumero, total, frete, desconto, observacoes,
    ));
  };

  const gerarMensagemEmail = () => {
    const { assunto, corpo } = buildEmailMessage(
      solicitacao, ordemNumero, subtotal, total, frete, desconto, observacoes,
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
          quantidade: solicitacaoData.quantidade || 1,
          unidade: solicitacaoData.unidade || 'un',
          valor_unitario: solicitacao.valorUnitario
        }]
      });

      if (pedido) {
        // Se houver solicitação, atualiza status
        if (solicitacaoId) {
          await supabase
            .from('solicitacoes')
            .update({ status: 'em_andamento' })
            .eq('id', solicitacaoId);
        }

        toast({
          title: "Ordem Gerada!",
          description: `A ordem ${pedido.numero} foi gerada e persistida no banco de dados.`,
        });
        navigate("/acompanhamento");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPDF = () => {
    const doc = generateOrderPDF({
      numero: ordemNumero,
      data: new Date().toLocaleDateString('pt-BR'),
      fornecedor,
      solicitante: user,
      itens: [{
        descricao: solicitacao.produto,
        quantidade: solicitacao.quantidadeReal,
        valor_unitario: solicitacao.valorUnitario || 12,
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
    <MainLayout>
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
                  <span className="font-medium">R$ {(solicitacao.valorUnitario || 12).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-medium">× {solicitacao.quantidadeReal}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  disabled={isSubmitting}
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
    </MainLayout>
  );
};

export default GerarOrdem;
