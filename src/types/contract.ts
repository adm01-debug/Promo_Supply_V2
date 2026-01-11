import type { LucideIcon } from 'lucide-react';

export interface Contract {
  id: string;
  contract_number: string;
  title: string;
  description: string | null;
  supplier_id: string;
  supplier_name: string;
  contract_type: string;
  status: string;
  start_date: string;
  end_date: string;
  total_value: number;
  payment_terms: string | null;
  renewal_type: string | null;
  renewal_notice_days: number | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface ContractItem {
  id?: string;
  contract_id?: string;
  item_name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface ContractHistory {
  id: string;
  contract_id: string;
  action_type: string;
  action_description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
}

export interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

export interface TypeConfig {
  label: string;
  color: string;
}
