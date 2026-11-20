import { supabase } from '@/integrations/supabase/client';

export type RlsSeverity = "CRITICAL" | "INFO" | "OK";

export interface RlsPolicyEntry {
  table: string;
  policy: string;
  command: string;
  roles: string[];
  using: string | null;
  check: string | null;
  severity: RlsSeverity;
  access_level: string;
  tenant_filtering: boolean;
}

export interface RlsAuditReport {
  timestamp: string;
  overall_status: "COMPLIANT" | "NON_COMPLIANT";
  total_policies: number;
  critical_findings: number;
  compliance_report: RlsPolicyEntry[];
  remediation_required: string[];
}

export async function fetchRlsAuditReport(): Promise<RlsAuditReport> {
  const { data, error } = await supabase.functions.invoke("run-audit");
  if (error) throw error;
  return data as RlsAuditReport;
}
