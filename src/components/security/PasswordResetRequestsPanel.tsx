import { useState } from 'react';
import { KeyRound, Check, X, Clock, Loader2, AlertCircle, CheckCircle2, XCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from "@/lib/feedbackToast";
import { usePasswordResetRequests, PasswordResetRequest } from '@/hooks/usePasswordResetRequests';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Aprovado', variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejeitado', variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  completed: { label: 'Concluído', variant: 'secondary', icon: <Check className="w-3 h-3" /> },
  expired: { label: 'Expirado', variant: 'secondary', icon: <AlertCircle className="w-3 h-3" /> },
};

export const PasswordResetRequestsPanel = () => {
  const { isAdmin } = useAuth();
  const { 
    pendingRequests, 
    allRequests, 
    myRequests,
    isLoading, 
    createRequest,
    approveRequest, 
    rejectRequest,
    pendingCount
  } = usePasswordResetRequests();

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');

  const handleCreateRequest = async () => {
    try {
      await createRequest.mutateAsync({ reason: reason || undefined });
      toast.success('Solicitação de reset enviada para aprovação');
      setShowRequestDialog(false);
      setReason('');
    } catch (error) {
      toast.error('Erro ao criar solicitação');
    }
  };

  const handleReview = async () => {
    if (!selectedRequest) return;

    try {
      if (reviewAction === 'approve') {
        await approveRequest.mutateAsync({ 
          id: selectedRequest.id, 
          admin_notes: adminNotes || undefined 
        });
        toast.success('Solicitação aprovada - o usuário pode agora redefinir sua senha');
      } else {
        await rejectRequest.mutateAsync({ 
          id: selectedRequest.id, 
          admin_notes: adminNotes || undefined 
        });
        toast.success('Solicitação rejeitada');
      }
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      toast.error('Erro ao processar solicitação');
    }
  };

  const openReviewDialog = (request: PasswordResetRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setAdminNotes('');
    setShowReviewDialog(true);
  };

  const renderRequestsTable = (requests: PasswordResetRequest[] | undefined, showActions = false) => {
    if (!requests || requests.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma solicitação encontrada</p>
        </div>
      );
    }

    return (
      <Table aria-label="Tabela de dados">
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Solicitado em</TableHead>
            {showActions && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const status = statusConfig[request.status];
            const isExpired = new Date(request.expires_at) < new Date() && request.status === 'pending';
            
            return (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-sm">{request.email}</TableCell>
                <TableCell>
                  <Badge variant={isExpired ? 'secondary' : status.variant} className="flex items-center gap-1 w-fit">
                    {status.icon}
                    {isExpired ? 'Expirado' : status.label}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {request.reason || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(request.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    {request.status === 'pending' && !isExpired && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReviewDialog(request, 'approve')}
                          className="text-success hover:text-success"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReviewDialog(request, 'reject')}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <Badge variant="outline" className="text-success">
                        Token gerado
                      </Badge>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* User Request Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Solicitar Reset de Senha
              </CardTitle>
              <CardDescription>
                Envie uma solicitação para um administrador aprovar o reset da sua senha
              </CardDescription>
            </div>
            <Button onClick={() => setShowRequestDialog(true)}>
              <Send className="w-4 h-4 mr-2" />
              Nova Solicitação
            </Button>
          </CardHeader>
          <CardContent>
            <h4 className="font-medium mb-4">Minhas Solicitações</h4>
            {renderRequestsTable(myRequests)}
          </CardContent>
        </Card>

        {/* Admin Panel */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-warning" />
                Gerenciar Solicitações de Reset
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount} pendente(s)</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Aprove ou rejeite solicitações de reset de senha dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending">
                <TabsList>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Pendentes
                    {pendingCount > 0 && (
                      <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                  {renderRequestsTable(pendingRequests, true)}
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                  {renderRequestsTable(allRequests, true)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Solicitar Reset de Senha
            </DialogTitle>
            <DialogDescription>
              Sua solicitação será enviada para aprovação de um administrador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo da solicitação..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createRequest.isPending}
            >
              {createRequest.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'approve' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  Aprovar Solicitação
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-destructive" />
                  Rejeitar Solicitação
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <p className="font-medium">{selectedRequest.email}</p>
                {selectedRequest.reason && (
                  <>
                    <p className="text-sm text-muted-foreground mt-2">Motivo</p>
                    <p className="text-sm">{selectedRequest.reason}</p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-notes">Observações (opcional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Adicione uma observação..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {reviewAction === 'approve' && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                  <p className="text-sm text-success">
                    Ao aprovar, um token de reset será gerado e o usuário poderá redefinir sua senha.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleReview}
              disabled={approveRequest.isPending || rejectRequest.isPending}
            >
              {(approveRequest.isPending || rejectRequest.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : reviewAction === 'approve' ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              {reviewAction === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
