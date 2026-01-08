import { useState, useRef, MouseEvent } from 'react';
import { Pen, FileSignature, Check, X, Download, Send, Loader2, User, Calendar, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SignatureRequest {
  id: string;
  documentName: string;
  documentType: 'contract' | 'order' | 'quote' | 'other';
  status: 'pending' | 'signed' | 'rejected' | 'expired';
  requestedBy: string;
  requestedAt: string;
  signedAt?: string;
  signerName?: string;
  signerEmail?: string;
  expiresAt: string;
}

const mockSignatureRequests: SignatureRequest[] = [
  {
    id: '1',
    documentName: 'Contrato de Fornecimento - XBZ Brindes',
    documentType: 'contract',
    status: 'pending',
    requestedBy: 'João Silva',
    requestedAt: '2024-12-18T10:30:00',
    expiresAt: '2024-12-25T23:59:59',
  },
  {
    id: '2',
    documentName: 'Pedido de Compra #PC-2024-0156',
    documentType: 'order',
    status: 'signed',
    requestedBy: 'Maria Santos',
    requestedAt: '2024-12-15T14:00:00',
    signedAt: '2024-12-16T09:15:00',
    signerName: 'Carlos Ferreira',
    signerEmail: 'carlos@empresa.com',
    expiresAt: '2024-12-22T23:59:59',
  },
  {
    id: '3',
    documentName: 'Cotação Aprovada - Equipamentos TI',
    documentType: 'quote',
    status: 'rejected',
    requestedBy: 'Ana Costa',
    requestedAt: '2024-12-10T08:00:00',
    expiresAt: '2024-12-17T23:59:59',
  },
];

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Pen },
  signed: { label: 'Assinado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: X },
  expired: { label: 'Expirado', color: 'bg-muted text-muted-foreground', icon: Calendar },
};

const documentTypeConfig = {
  contract: { label: 'Contrato', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  order: { label: 'Pedido', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  quote: { label: 'Cotação', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  other: { label: 'Outro', color: 'bg-muted text-muted-foreground' },
};

export function DigitalSignature() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<SignatureRequest[]>(mockSignatureRequests);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  // New request form
  const [newRequest, setNewRequest] = useState({
    documentName: '',
    documentType: 'contract' as SignatureRequest['documentType'],
    signerEmail: '',
    signerName: '',
    message: '',
  });

  // Canvas drawing functions
  const startDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSendRequest = async () => {
    if (!newRequest.documentName || !newRequest.signerEmail) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome do documento e email do assinante.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newReq: SignatureRequest = {
      id: `sig-${Date.now()}`,
      documentName: newRequest.documentName,
      documentType: newRequest.documentType,
      status: 'pending',
      requestedBy: 'Você',
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setRequests([newReq, ...requests]);
    setNewRequest({
      documentName: '',
      documentType: 'contract',
      signerEmail: '',
      signerName: '',
      message: '',
    });
    setLoading(false);
    setActiveTab('requests');

    toast({
      title: 'Solicitação enviada',
      description: `Email enviado para ${newRequest.signerEmail}`,
    });
  };

  const handleSignDocument = async (id: string) => {
    if (!signatureData) {
      toast({
        title: 'Assinatura necessária',
        description: 'Por favor, desenhe sua assinatura no campo acima.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setRequests(requests.map(r => 
      r.id === id 
        ? { ...r, status: 'signed' as const, signedAt: new Date().toISOString() }
        : r
    ));

    clearSignature();
    setLoading(false);

    toast({
      title: 'Documento assinado',
      description: 'A assinatura foi registrada com sucesso.',
    });
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSignature className="h-4 w-4" />
          Assinatura Digital
          {pendingCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Assinatura Digital de Documentos
          </DialogTitle>
          <DialogDescription>
            Solicite e gerencie assinaturas digitais de contratos e documentos
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests">
              Solicitações
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sign">Assinar</TabsTrigger>
            <TabsTrigger value="new">Nova Solicitação</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {requests.map((request) => {
                  const status = statusConfig[request.status];
                  const docType = documentTypeConfig[request.documentType];
                  const StatusIcon = status.icon;

                  return (
                    <Card key={request.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className={docType.color}>
                                {docType.label}
                              </Badge>
                              <Badge variant="secondary" className={status.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{request.documentName}</h4>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {request.requestedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(request.requestedAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {request.signedAt && (
                              <p className="text-xs text-emerald-600 mt-1">
                                Assinado em {new Date(request.signedAt).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(request.signedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {request.status === 'pending' && (
                              <Button 
                                size="sm" 
                                onClick={() => setActiveTab('sign')}
                              >
                                <Pen className="h-4 w-4 mr-1" />
                                Assinar
                              </Button>
                            )}
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sign" className="flex-1 mt-4">
            <div className="space-y-4">
              {/* Document to sign */}
              {requests.filter(r => r.status === 'pending').length > 0 ? (
                <>
                  <div>
                    <Label>Documento a Assinar</Label>
                    <Select defaultValue={requests.find(r => r.status === 'pending')?.id}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {requests.filter(r => r.status === 'pending').map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.documentName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Signature Canvas */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Desenhe sua Assinatura</Label>
                      <Button variant="ghost" size="sm" onClick={clearSignature}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Limpar
                      </Button>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-2 bg-muted/30">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={150}
                        className="w-full bg-background rounded cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use o mouse para desenhar sua assinatura
                    </p>
                  </div>

                  {/* Security Info */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium">Assinatura Segura</p>
                          <p className="text-muted-foreground">
                            Sua assinatura será criptografada e vinculada ao documento com carimbo de tempo.
                            Válida juridicamente conforme MP 2.200-2/2001.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('requests')}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => handleSignDocument(requests.find(r => r.status === 'pending')?.id || '')}
                      disabled={loading || !signatureData}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Confirmar Assinatura
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum documento pendente de assinatura</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="flex-1 mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4 pr-4">
                <div>
                  <Label htmlFor="docName">Nome do Documento *</Label>
                  <Input
                    id="docName"
                    placeholder="Ex: Contrato de Fornecimento 2024"
                    value={newRequest.documentName}
                    onChange={(e) => setNewRequest({ ...newRequest, documentName: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Tipo de Documento</Label>
                  <Select 
                    value={newRequest.documentType} 
                    onValueChange={(v) => setNewRequest({ ...newRequest, documentType: v as SignatureRequest['documentType'] })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">Contrato</SelectItem>
                      <SelectItem value="order">Pedido de Compra</SelectItem>
                      <SelectItem value="quote">Cotação</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="signerName">Nome do Assinante</Label>
                    <Input
                      id="signerName"
                      placeholder="Nome completo"
                      value={newRequest.signerName}
                      onChange={(e) => setNewRequest({ ...newRequest, signerName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signerEmail">Email do Assinante *</Label>
                    <Input
                      id="signerEmail"
                      type="email"
                      placeholder="email@empresa.com"
                      value={newRequest.signerEmail}
                      onChange={(e) => setNewRequest({ ...newRequest, signerEmail: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Mensagem (opcional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Adicione uma mensagem personalizada para o assinante..."
                    value={newRequest.message}
                    onChange={(e) => setNewRequest({ ...newRequest, message: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setActiveTab('requests')}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSendRequest} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar Solicitação
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
