import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle2, Upload, QrCode, FileText, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Pagamento } from "@/types/legacyTypes";

interface PagamentoModalProps {
  pagamento: Pagamento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmarPagamento: (id: string, comprovante: string) => void;
}

export const PagamentoModal = ({ pagamento, open, onOpenChange, onConfirmarPagamento }: PagamentoModalProps) => {
  const [comprovante, setComprovante] = useState("");
  const [etapa, setEtapa] = useState<"pagamento" | "comprovante">("pagamento");

  if (!pagamento) return null;

  const pixChave = "pagamentos@promobrindes.com.br";
  const boletoLinhaDigitavel = "23793.38128 60000.000003 00000.000405 1 84340000011475";

  const handleCopiar = (texto: string, tipo: string) => {
    navigator.clipboard.writeText(texto);
    toast({
      title: "Copiado!",
      description: `${tipo} copiado para a área de transferência`,
    });
  };

  const handleConfirmar = () => {
    if (!comprovante.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o código do comprovante",
        variant: "destructive",
      });
      return;
    }
    onConfirmarPagamento(pagamento.id, comprovante);
    setComprovante("");
    setEtapa("pagamento");
    onOpenChange(false);
  };

  const handleClose = () => {
    setEtapa("pagamento");
    setComprovante("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pagamento.metodo === "PIX" ? (
              <QrCode className="h-5 w-5 text-emerald-500" />
            ) : (
              <FileText className="h-5 w-5 text-blue-500" />
            )}
            Pagamento via {pagamento.metodo}
          </DialogTitle>
          <DialogDescription>
            {etapa === "pagamento" 
              ? `Realize o pagamento de ${pagamento.ordemCompra}` 
              : "Confirme o pagamento anexando o comprovante"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do Pagamento */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Ordem de Compra</p>
                <p className="font-semibold">{pagamento.ordemCompra}</p>
              </div>
              <Badge variant={pagamento.metodo === "PIX" ? "default" : "secondary"}>
                {pagamento.metodo}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fornecedor</p>
                <p className="font-medium flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {pagamento.fornecedor}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Produto</p>
                <p className="font-medium">{pagamento.produto}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vencimento</p>
                <p className="font-medium">{new Date(pagamento.vencimento).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-bold text-lg text-primary">
                  {pagamento.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
          </div>

          {etapa === "pagamento" ? (
            <>
              {/* Dados para Pagamento */}
              {pagamento.metodo === "PIX" ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="w-48 h-48 bg-gradient-to-br from-muted to-muted/50 rounded flex items-center justify-center">
                        <QrCode className="h-32 w-32 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Chave PIX (E-mail)</Label>
                    <div className="flex gap-2">
                      <Input value={pixChave} readOnly className="font-mono text-sm" />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleCopiar(pixChave, "Chave PIX")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2 font-medium">Linha Digitável</p>
                    <p className="font-mono text-xs break-all text-blue-900 dark:text-blue-100">
                      {boletoLinhaDigitavel}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleCopiar(boletoLinhaDigitavel, "Linha digitável")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Linha Digitável
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Boleto PDF
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={() => setEtapa("comprovante")}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Já Paguei
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmação de Comprovante */}
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirme o pagamento informando o código do comprovante
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comprovante">Código do Comprovante / ID Transação</Label>
                  <Input 
                    id="comprovante"
                    placeholder="Ex: E00000000202512161234567890"
                    value={comprovante}
                    onChange={(e) => setComprovante(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Anexar Comprovante (opcional)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Clique para anexar ou arraste o arquivo
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      PNG, JPG ou PDF até 5MB
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEtapa("pagamento")}>
                  Voltar
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmar}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
