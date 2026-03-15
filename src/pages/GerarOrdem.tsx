import { useState } from "react";
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

const getTipoLabel = (tipo: string) => {
  const map: Record<string, string> = {
    'produto': 'Produto', 'servico': 'Serviço', 'material': 'Material',
    'pe_liso': 'P.E. Liso', 'fabricacao_liso': 'Fab. Liso', 'fabricacao_personalizado': 'Fab. Personalizado',
  };
  return map[tipo] || tipo;
};

const GerarOrdem = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const solicitacaoId = searchParams.get("solicitacao");

  const [copiado, setCopiado] = useState<string | null>(null);
  const [mensagemWhatsApp, setMensagemWhatsApp] = useState("");
  const [mensagemEmail, setMensagemEmail] = useState("");
  const [assuntoEmail, setAssuntoEmail] = useState("");
  const [frete, setFrete] = useState(150);
  const [desconto, setDesconto] = useState(0);
  const [observacoes, setObservacoes] = useState("");

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

  const fornecedor = fornecedoresData[0] || {
    id: '',
    razao_social: 'N/A',
    nome_fantasia: 'N/A',
    cnpj: 'N/A',
    email: 'N/A',
    telefone: 'N/A',
    tipo: 'N/A',
  };

  const ordemNumero = `OC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

  // Cálculos financeiros
  const subtotal = (solicitacao.valorUnitario || 12) * solicitacao.quantidadeReal;
  const total = subtotal + frete - desconto;

  // Gera mensagens automáticas
  const gerarMensagemWhatsApp = () => {
    const msg = `Olá ${fornecedor.nome_fantasia || fornecedor.razao_social}!

Gostaríamos de confirmar o pedido abaixo:

*ORDEM DE COMPRA: ${ordemNumero}*

📦 *Produto:* ${solicitacao.produto}
📊 *Quantidade:* ${solicitacao.quantidadeReal} unidades
💰 *Valor Unitário:* R$ ${(solicitacao.valorUnitario || 12).toFixed(2)}
${frete > 0 ? `🚚 *Frete:* R$ ${frete.toFixed(2)}` : '🚚 *Frete:* Grátis'}
${desconto > 0 ? `🎁 *Desconto:* R$ ${desconto.toFixed(2)}` : ''}
💵 *TOTAL:* R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

📅 *Prazo de Entrega:* ${new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
💳 *Condição:* À vista via PIX
${observacoes ? `\n📝 *Observações:* ${observacoes}` : ''}
Por favor, confirme o recebimento e disponibilidade.

Atenciosamente,
Equipe de Compras - Promo Supply`;
    setMensagemWhatsApp(msg);
  };

  const gerarMensagemEmail = () => {
    setAssuntoEmail(`Ordem de Compra ${ordemNumero} - ${solicitacao.produto}`);
    const msg = `Prezados,

Segue abaixo os detalhes da Ordem de Compra para confirmação:

═══════════════════════════════════════════
ORDEM DE COMPRA: ${ordemNumero}
═══════════════════════════════════════════

DADOS DO PEDIDO:
• Produto: ${solicitacao.produto}
• Quantidade: ${solicitacao.quantidadeReal} unidades
• Tipo: ${getTipoLabel(solicitacao.tipo)}

VALORES:
• Valor Unitário: R$ ${(solicitacao.valorUnitario || 12).toFixed(2)}
• Subtotal: R$ ${subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Frete: ${frete > 0 ? `R$ ${frete.toFixed(2)}` : 'Grátis'}
${desconto > 0 ? `• Desconto: R$ ${desconto.toFixed(2)}` : ''}
• Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

CONDIÇÕES:
• Pagamento: À vista via PIX
• Prazo de Entrega: ${new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}
${observacoes ? `\nOBSERVAÇÕES:\n${observacoes}` : ''}
DADOS PARA ENTREGA:
Promo Supply
[Endereço da empresa]

═══════════════════════════════════════════

Por favor, confirme o recebimento desta ordem e a disponibilidade do prazo informado.

Atenciosamente,
Equipe de Compras
Promo Supply
compras@promosupply.com.br`;
    setMensagemEmail(msg);
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

  const finalizarOrdem = () => {
    toast({
      title: "Ordem Gerada!",
      description: `A ordem ${ordemNumero} foi gerada com sucesso.`,
    });
    navigate("/acompanhamento");
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
                  <p className="font-medium text-foreground">{fornecedor.nomeFantasia}</p>
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
                  <p className="font-medium text-foreground">{fornecedor.whatsapp}</p>
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
                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
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
                  <span className="font-medium">{ordemMock.condicaoPagamento}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prazo Entrega</span>
                  <span className="font-medium">{new Date(solicitacao.prazoEntrega).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4" />
                  Imprimir OC
                </Button>
                <Button 
                  className="w-full gap-2 gradient-primary"
                  onClick={finalizarOrdem}
                >
                  <Check className="w-4 h-4" />
                  Finalizar e Gerar Ordem
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
