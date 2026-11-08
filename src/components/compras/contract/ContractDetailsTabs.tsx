import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Clock, DollarSign, ShieldAlert, AlertTriangle, CheckCircle2,
} from "lucide-react";
import type { Contract, ContractPenalty } from "@/types/contract";
import { formatCurrency } from "@/lib/utils";

export function ContractSLAReadonlyTab({ contract }: { contract: Contract }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2"><Clock className="w-4 h-4" />Prazo de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contract.sla_delivery_days ?? 30} dias</p>
            <p className="text-xs text-muted-foreground">Máximo para entrega</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2"><DollarSign className="w-4 h-4" />Multa por Atraso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contract.penalty_rate_per_day ?? 0.5}%<span className="text-sm font-normal">/dia</span></p>
            <p className="text-xs text-muted-foreground">Teto: {contract.penalty_cap_percent ?? 20}% do pedido</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Score Mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contract.min_supplier_score ?? 3.0}<span className="text-sm font-normal">/5.0</span></p>
            <p className="text-xs text-muted-foreground">{contract.auto_block_below_score !== false ? "🔒 Auto-bloqueio ativo" : "Sem auto-bloqueio"}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-amber-300 dark:border-amber-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" />Qualidade & Devolução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Score mínimo qualidade:</strong> {contract.min_quality_score ?? 3.0}/5.0</p>
          <p className="text-sm"><strong>Multa qualidade:</strong> {contract.quality_penalty_percent ?? 10}% sobre o lote</p>
          <p className="text-sm"><strong>Política de devolução:</strong> {contract.return_policy || "Conforme padrão"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ContractPenaltiesTab({ penalties, totalPenalties }: { penalties: ContractPenalty[]; totalPenalties: number }) {
  if (penalties.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
        <p className="font-medium text-success dark:text-success">Nenhuma penalidade aplicada</p>
        <p className="text-sm text-muted-foreground mt-1">O fornecedor está em conformidade com o contrato.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-destructive/10 rounded-lg flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-destructive">Total de Penalidades</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPenalties)}</p>
        </div>
        <Badge variant="destructive" className="text-lg px-4 py-2">{penalties.length} ocorrência(s)</Badge>
      </div>
      <Table aria-label="Tabela de dados">
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Dias</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {penalties.map((penalty) => (
            <TableRow key={penalty.id}>
              <TableCell><Badge variant="outline" className="capitalize">{penalty.penalty_type}</Badge></TableCell>
              <TableCell className="max-w-[200px] truncate">{penalty.description}</TableCell>
              <TableCell className="text-right">{penalty.days_late ?? '-'}</TableCell>
              <TableCell className="text-right">{penalty.penalty_percent != null ? `${penalty.penalty_percent}%` : '-'}</TableCell>
              <TableCell className="text-right font-medium text-destructive">{formatCurrency(Number(penalty.penalty_value))}</TableCell>
              <TableCell className="text-center"><Badge variant={penalty.status === 'applied' ? 'destructive' : 'secondary'} className="capitalize">{penalty.status}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
