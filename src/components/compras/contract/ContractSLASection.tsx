import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert, AlertTriangle } from "lucide-react";

interface ContractSLAData {
  sla_delivery_days: number;
  penalty_rate_per_day: number;
  penalty_cap_percent: number;
  min_quality_score: number;
  quality_penalty_percent: number;
  return_policy: string;
  min_supplier_score: number;
  auto_block_below_score: boolean;
}

interface ContractSLASectionProps {
  data: ContractSLAData;
  onChange: (updates: Partial<ContractSLAData>) => void;
}

export const ContractSLASection = ({ data, onChange }: ContractSLASectionProps) => (
  <div className="space-y-4 p-4 border-2 border-destructive/30 rounded-lg bg-destructive/5">
    <div className="flex items-center gap-2">
      <ShieldAlert className="w-5 h-5 text-destructive" />
      <h3 className="font-semibold text-foreground">SLA, Penalidades & Qualidade</h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Prazo Entrega Máximo (dias)</Label>
        <Input
          type="number"
          value={data.sla_delivery_days}
          onChange={(e) => onChange({ sla_delivery_days: parseInt(e.target.value, 10) || 30 })}
        />
      </div>
      <div className="space-y-2">
        <Label>Multa por Atraso (%/dia)</Label>
        <Input
          type="number"
          step="0.1"
          value={data.penalty_rate_per_day}
          onChange={(e) => onChange({ penalty_rate_per_day: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-2">
        <Label>Teto da Multa (%)</Label>
        <Input
          type="number"
          value={data.penalty_cap_percent}
          onChange={(e) => onChange({ penalty_cap_percent: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Nota Mínima de Qualidade</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          max="5"
          value={data.min_quality_score}
          onChange={(e) => onChange({ min_quality_score: parseFloat(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-2">
        <Label>Penalidade Qualidade (%)</Label>
        <Input
          type="number"
          value={data.quality_penalty_percent}
          onChange={(e) => onChange({ quality_penalty_percent: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
      <div className="space-y-2">
        <Label>Nota Mínima do Fornecedor</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          max="5"
          value={data.min_supplier_score}
          onChange={(e) => onChange({ min_supplier_score: parseFloat(e.target.value) || 0 })}
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label>Política de Devolução</Label>
      <Textarea
        value={data.return_policy}
        onChange={(e) => onChange({ return_policy: e.target.value })}
        rows={2}
        placeholder="Descreva a política de devolução..."
      />
    </div>

    <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <div>
          <p className="text-sm font-medium">Bloqueio automático por nota baixa</p>
          <p className="text-xs text-muted-foreground">
            Bloqueia fornecedor se nota &lt; {data.min_supplier_score}
          </p>
        </div>
      </div>
      <Switch
        checked={data.auto_block_below_score}
        onCheckedChange={(checked) => onChange({ auto_block_below_score: checked })}
      />
    </div>
  </div>
);
