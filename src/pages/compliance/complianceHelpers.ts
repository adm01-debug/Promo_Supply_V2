import { AlertTriangle, CheckCircle2, XCircle, Ban, Clock, ShieldAlert } from "lucide-react";

export interface ComplianceData {
  fornecedor_id: string;
  razao_social: string;
  avaliacao: number | null;
  supplier_status: string;
  penalty_count: number;
  total_penalty_value: number;
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  on_time_rate: number;
  avg_quality_score: number;
  total_inspections: number;
  rejected_count: number;
  active_bonifications: number;
}

export interface EscalationRule {
  id: string;
  level: number;
  min_infractions: number;
  max_infractions: number | null;
  action_type: string;
  penalty_multiplier: number;
  block_days: number;
  description: string;
  is_active: boolean;
}

export const actionTypeLabels: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  warning: { label: "Advertência", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning", icon: AlertTriangle },
  standard_fine: { label: "Multa Padrão", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning", icon: ShieldAlert },
  double_fine: { label: "Multa Dobrada", color: "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive", icon: ShieldAlert },
  temp_block: { label: "Bloq. Temporário", color: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300", icon: Ban },
  permanent_block: { label: "Bloq. Permanente", color: "bg-destructive text-destructive-foreground", icon: XCircle },
};

export function getComplianceStatus(item: ComplianceData) {
  if (item.supplier_status === 'bloqueado') return { label: "Bloqueado", color: "bg-destructive text-destructive-foreground", icon: Ban };
  if (item.penalty_count >= 3) return { label: "Crítico", color: "bg-destructive/10 text-destructive dark:bg-destructive/15 dark:text-destructive", icon: XCircle };
  if (item.penalty_count >= 1 || item.late_deliveries > 0) return { label: "Em Risco", color: "bg-warning/10 text-warning dark:bg-warning/15 dark:text-warning", icon: AlertTriangle };
  if (item.on_time_rate >= 95) return { label: "Excelente", color: "bg-success/10 text-success dark:bg-success/15 dark:text-success", icon: CheckCircle2 };
  return { label: "Regular", color: "bg-info/10 text-info dark:bg-info/15 dark:text-info", icon: Clock };
}

export function computeComplianceKPIs(data: ComplianceData[]) {
  const infractors = data.filter(d => d.penalty_count > 0 || d.late_deliveries > 0 || d.rejected_count > 0);
  const compliant = data.filter(d => d.on_time_rate >= 95 && d.penalty_count === 0);
  const totalPenaltyValue = data.reduce((s, d) => s + Number(d.total_penalty_value), 0);
  const avgOnTimeRate = data.length > 0 ? data.reduce((s, d) => s + Number(d.on_time_rate), 0) / data.length : 0;
  return { infractors, compliant, totalPenaltyValue, avgOnTimeRate };
}

export function sortComplianceData(data: ComplianceData[], sortBy: string) {
  return [...data].sort((a, b) => {
    switch (sortBy) {
      case "penalties": return b.penalty_count - a.penalty_count;
      case "late": return b.late_deliveries - a.late_deliveries;
      case "quality": return (a.avg_quality_score || 5) - (b.avg_quality_score || 5);
      case "ontime": return a.on_time_rate - b.on_time_rate;
      default: return 0;
    }
  });
}
