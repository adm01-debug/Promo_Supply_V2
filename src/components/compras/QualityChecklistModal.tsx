import { useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardCheck, Package, CheckCircle2, XCircle, AlertTriangle, Loader2, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/feedbackToast";

interface QualityChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoNumero: string;
  fornecedorId: string;
  fornecedorNome: string;
  contractId?: string;
  onSuccess?: () => void;
}

const criteria = [
  { key: "packaging_score", label: "Embalagem", description: "Integridade e proteção da embalagem" },
  { key: "conformity_score", label: "Conformidade", description: "Produto conforme especificação do pedido" },
  { key: "quantity_score", label: "Quantidade", description: "Quantidade entregue vs. solicitada" },
  { key: "documentation_score", label: "Documentação", description: "NF-e, certificados e laudos" },
] as const;

export function QualityChecklistModal({
  open, onOpenChange, pedidoId, pedidoNumero, fornecedorId, fornecedorNome, contractId, onSuccess,
}: QualityChecklistModalProps) {
  const [scores, setScores] = useState({
    packaging_score: 5,
    conformity_score: 5,
    quantity_score: 5,
    documentation_score: 5,
  });
  const [notes, setNotes] = useState("");
  const [defects, setDefects] = useState("");
  const [status, setStatus] = useState<"approved" | "rejected" | "conditional">("approved");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  const overallScore = Object.values(scores).reduce((s, v) => s + v, 0) / 4;

  const handleScoreChange = useCallback((key: string, value: number[]) => {
    setScores(prev => ({ ...prev, [key]: value[0] }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('receiving_checklists').insert({
        pedido_id: pedidoId,
        fornecedor_id: fornecedorId,
        contract_id: contractId || null,
        packaging_score: scores.packaging_score,
        conformity_score: scores.conformity_score,
        quantity_score: scores.quantity_score,
        documentation_score: scores.documentation_score,
        notes: notes || null,
        defects_found: defects || null,
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : null,
      });

      if (error) throw error;

      toast.success(
        status === 'approved'
          ? "Checklist de qualidade aprovado!"
          : status === 'rejected'
            ? "Recebimento rejeitado — fornecedor notificado"
            : "Recebimento condicional registrado"
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao salvar checklist: " + msg);
    } finally {
      setSaving(false);
    }
  }, [pedidoId, fornecedorId, contractId, scores, notes, defects, status, rejectionReason, onSuccess, onOpenChange]);

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-success";
    if (score >= 3) return "text-warning";
    return "text-destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Checklist de Qualidade — {pedidoNumero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Supplier info */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Fornecedor</p>
              <p className="font-medium">{fornecedorNome}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Score Geral</p>
              <p className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore.toFixed(1)}/5
              </p>
            </div>
          </div>

          {/* Quality Criteria */}
          <div className="space-y-4">
            {criteria.map((c) => {
              const score = scores[c.key];
              return (
                <Card key={c.key} className={`border ${score <= 2 ? 'border-destructive/30' : score <= 3 ? 'border-amber-300/30' : 'border-emerald-300/30'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < score ? 'text-warning fill-amber-500' : 'text-muted'}`}
                          />
                        ))}
                        <span className={`ml-2 font-bold ${getScoreColor(score)}`}>{score}</span>
                      </div>
                    </div>
                    <Slider
                      value={[score]}
                      onValueChange={(v) => handleScoreChange(c.key, v)}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Defects */}
          <div className="space-y-2">
            <Label>Defeitos Encontrados</Label>
            <Textarea
              placeholder="Descreva os defeitos encontrados (se houver)..."
              value={defects}
              onChange={(e) => setDefects(e.target.value)}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações gerais sobre o recebimento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Verdict */}
          <div className="space-y-2">
            <Label>Veredicto</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={status === "approved" ? "default" : "outline"}
                className={status === "approved" ? "bg-success hover:bg-success/80" : ""}
                onClick={() => setStatus("approved")}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Aprovado
              </Button>
              <Button
                type="button"
                variant={status === "conditional" ? "default" : "outline"}
                className={status === "conditional" ? "bg-warning hover:bg-amber-700" : ""}
                onClick={() => setStatus("conditional")}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Condicional
              </Button>
              <Button
                type="button"
                variant={status === "rejected" ? "destructive" : "outline"}
                onClick={() => setStatus("rejected")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Rejeitado
              </Button>
            </div>
          </div>

          {status === "rejected" && (
            <div className="space-y-2">
              <Label className="text-destructive">Motivo da Rejeição *</Label>
              <Textarea
                placeholder="Explique o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                className="border-destructive"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (status === "rejected" && !rejectionReason.trim())}
            className={status === "rejected" ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {status === "approved" ? "Aprovar Recebimento" : status === "rejected" ? "Registrar Rejeição" : "Aceite Condicional"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
