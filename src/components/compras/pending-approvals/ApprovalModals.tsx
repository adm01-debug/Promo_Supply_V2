import { Check, X, Eye, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { PendingApprovalItem, formatCurrency } from "./pendingApprovalsData";

interface RejectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: PendingApprovalItem | null;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

export const RejectModal = ({
  open,
  onOpenChange,
  approval,
  rejectReason,
  onRejectReasonChange,
  onConfirm,
  loading,
}: RejectModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby="dialog-desc" className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-destructive flex items-center gap-2">
          <X className="w-5 h-5" />
          Rejeitar Solicitação
        </DialogTitle>
        <DialogDescription>
          Informe o motivo da rejeição. Esta ação não pode ser desfeita.
        </DialogDescription>
      </DialogHeader>
      
      {approval && (
        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{approval.solicitacao_numero}</p>
            <p className="text-sm text-muted-foreground">{approval.descricao}</p>
            <p className="text-sm font-medium mt-2">{formatCurrency(approval.valor)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Motivo da Rejeição *
            </label>
            <Textarea
              value={rejectReason}
              onChange={(e) => onRejectReasonChange(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              rows={3}
            />
          </div>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button 
          variant="destructive" 
          onClick={onConfirm}
          disabled={!rejectReason || loading}
        >
          Confirmar Rejeição
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface DetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approval: PendingApprovalItem | null;
}

export const DetailsModal = ({ open, onOpenChange, approval }: DetailsModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent aria-describedby="dialog-desc" className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Detalhes da Solicitação
        </DialogTitle>
      </DialogHeader>
      
      {approval && (
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Número</p>
              <p className="font-mono font-medium">{approval.solicitacao_numero}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="font-medium">{formatCurrency(approval.valor)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solicitante</p>
              <p>{approval.solicitante}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Categoria</p>
              <p>{approval.categoria}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p>{approval.descricao}</p>
            </div>
          </div>

          {approval.aprovadores_anteriores.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Aprovadores Anteriores</p>
              <div className="space-y-1">
                {approval.aprovadores_anteriores.map((ap, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span>{ap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
