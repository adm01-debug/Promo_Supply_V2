export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_lockouts: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          id: string
          last_failed_attempt: string | null
          locked_until: string | null
          lockout_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          id?: string
          last_failed_attempt?: string | null
          locked_until?: string | null
          lockout_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          id?: string
          last_failed_attempt?: string | null
          locked_until?: string | null
          lockout_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          last_activity: string
          session_token: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_token: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_token?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      aliquotas_tributarias: {
        Row: {
          cofins: number | null
          created_at: string
          icms: number | null
          id: string
          ipi: number | null
          iss: number | null
          ncm: string | null
          observacoes: string | null
          organization_id: string
          pis: number | null
          regime: Database["public"]["Enums"]["regime_tributario"]
          uf_destino: string | null
          uf_origem: string | null
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          cofins?: number | null
          created_at?: string
          icms?: number | null
          id?: string
          ipi?: number | null
          iss?: number | null
          ncm?: string | null
          observacoes?: string | null
          organization_id: string
          pis?: number | null
          regime: Database["public"]["Enums"]["regime_tributario"]
          uf_destino?: string | null
          uf_origem?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          cofins?: number | null
          created_at?: string
          icms?: number | null
          id?: string
          ipi?: number | null
          iss?: number | null
          ncm?: string | null
          observacoes?: string | null
          organization_id?: string
          pis?: number | null
          regime?: Database["public"]["Enums"]["regime_tributario"]
          uf_destino?: string | null
          uf_origem?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "aliquotas_tributarias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_countries: {
        Row: {
          added_at: string
          added_by: string | null
          country_code: string
          country_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          country_code: string
          country_name: string
          id?: string
          is_active?: boolean
        }
        Update: {
          added_at?: string
          added_by?: string | null
          country_code?: string
          country_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      approval_delegations: {
        Row: {
          ativo: boolean
          categorias_permitidas: Json | null
          created_at: string
          data_fim: string
          data_inicio: string
          delegado_id: string
          delegante_id: string
          id: string
          motivo: string | null
          organization_id: string | null
          tenant_id: string
          updated_at: string
          valor_maximo: number | null
        }
        Insert: {
          ativo?: boolean
          categorias_permitidas?: Json | null
          created_at?: string
          data_fim: string
          data_inicio?: string
          delegado_id: string
          delegante_id: string
          id?: string
          motivo?: string | null
          organization_id?: string | null
          tenant_id?: string
          updated_at?: string
          valor_maximo?: number | null
        }
        Update: {
          ativo?: boolean
          categorias_permitidas?: Json | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          delegado_id?: string
          delegante_id?: string
          id?: string
          motivo?: string | null
          organization_id?: string | null
          tenant_id?: string
          updated_at?: string
          valor_maximo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_delegations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_delegations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_hierarchy: {
        Row: {
          cost_center_id: string | null
          created_at: string | null
          id: string
          max_approval_amount: number | null
          superior_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          max_approval_amount?: number | null
          superior_id?: string | null
          tenant_id?: string
          user_id: string
        }
        Update: {
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          max_approval_amount?: number | null
          superior_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_hierarchy_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_hierarchy_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_history: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          solicitacao_id: string | null
          step_id: string | null
          tenant_id: string
          usuario_id: string | null
          usuario_nome: string | null
          workflow_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          solicitacao_id?: string | null
          step_id?: string | null
          tenant_id?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          workflow_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          solicitacao_id?: string | null
          step_id?: string | null
          tenant_id?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "approval_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_history_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          aprovadores: Json
          ativo: boolean
          categoria_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          escalacao_automatica: boolean
          escalacao_para: string | null
          id: string
          niveis_aprovacao: number
          nome: string
          organization_id: string | null
          prioridade: number
          requer_unanimidade: boolean
          tempo_limite_horas: number
          tenant_id: string
          updated_at: string
          valor_max: number
          valor_min: number
        }
        Insert: {
          aprovadores?: Json
          ativo?: boolean
          categoria_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escalacao_automatica?: boolean
          escalacao_para?: string | null
          id?: string
          niveis_aprovacao?: number
          nome: string
          organization_id?: string | null
          prioridade?: number
          requer_unanimidade?: boolean
          tempo_limite_horas?: number
          tenant_id?: string
          updated_at?: string
          valor_max?: number
          valor_min?: number
        }
        Update: {
          aprovadores?: Json
          ativo?: boolean
          categoria_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escalacao_automatica?: boolean
          escalacao_para?: string | null
          id?: string
          niveis_aprovacao?: number
          nome?: string
          organization_id?: string | null
          prioridade?: number
          requer_unanimidade?: boolean
          tempo_limite_horas?: number
          tenant_id?: string
          updated_at?: string
          valor_max?: number
          valor_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_rules_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          aprovador_efetivo_id: string | null
          aprovador_id: string
          comentario: string | null
          created_at: string
          decidido_em: string | null
          delegacao_id: string | null
          etapa: number
          id: string
          lembrete_enviado: boolean
          notificado_em: string | null
          organization_id: string | null
          prazo_limite: string | null
          status: string
          tenant_id: string
          workflow_id: string
        }
        Insert: {
          aprovador_efetivo_id?: string | null
          aprovador_id: string
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          delegacao_id?: string | null
          etapa?: number
          id?: string
          lembrete_enviado?: boolean
          notificado_em?: string | null
          organization_id?: string | null
          prazo_limite?: string | null
          status?: string
          tenant_id?: string
          workflow_id: string
        }
        Update: {
          aprovador_efetivo_id?: string | null
          aprovador_id?: string
          comentario?: string | null
          created_at?: string
          decidido_em?: string | null
          delegacao_id?: string | null
          etapa?: number
          id?: string
          lembrete_enviado?: boolean
          notificado_em?: string | null
          organization_id?: string | null
          prazo_limite?: string | null
          status?: string
          tenant_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_delegacao_id_fkey"
            columns: ["delegacao_id"]
            isOneToOne: false
            referencedRelation: "approval_delegations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          categoria_id: string | null
          created_at: string
          escalado_em: string | null
          escalado_para: string | null
          etapa_atual: number
          id: string
          organization_id: string | null
          prazo_limite: string | null
          rule_id: string | null
          solicitacao_id: string | null
          status: string
          tenant_id: string
          total_etapas: number
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          escalado_em?: string | null
          escalado_para?: string | null
          etapa_atual?: number
          id?: string
          organization_id?: string | null
          prazo_limite?: string | null
          rule_id?: string | null
          solicitacao_id?: string | null
          status?: string
          tenant_id?: string
          total_etapas?: number
          updated_at?: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          escalado_em?: string | null
          escalado_para?: string | null
          etapa_atual?: number
          id?: string
          organization_id?: string | null
          prazo_limite?: string | null
          rule_id?: string | null
          solicitacao_id?: string | null
          status?: string
          tenant_id?: string
          total_etapas?: number
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_bids: {
        Row: {
          amount: number
          bid_time: string
          event_id: string
          fornecedor_id: string
          id: string
          invitation_id: string
          lot_id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["bid_status"]
          tenant_id: string
          triggered_extension: boolean | null
        }
        Insert: {
          amount: number
          bid_time?: string
          event_id: string
          fornecedor_id: string
          id?: string
          invitation_id: string
          lot_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          tenant_id?: string
          triggered_extension?: boolean | null
        }
        Update: {
          amount?: number
          bid_time?: string
          event_id?: string
          fornecedor_id?: string
          id?: string
          invitation_id?: string
          lot_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          tenant_id?: string
          triggered_extension?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sourcing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "auction_bids_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "sourcing_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "sourcing_event_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          created_at: string
          entity_description: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["audit_entity_type"]
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          tenant_id: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          created_at?: string
          entity_description?: string | null
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["audit_entity_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          tenant_id: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["audit_action_type"]
          created_at?: string
          entity_description?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["audit_entity_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_countries: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          country_code: string
          country_name: string
          id: string
          is_active: boolean
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          country_code: string
          country_name: string
          id?: string
          is_active?: boolean
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          country_code?: string
          country_name?: string
          id?: string
          is_active?: boolean
          reason?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          attempts_count: number | null
          blocked_at: string
          blocked_by: string | null
          expires_at: string | null
          id: string
          ip_address: string
          permanent: boolean
          reason: string
        }
        Insert: {
          attempts_count?: number | null
          blocked_at?: string
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          permanent?: boolean
          reason: string
        }
        Update: {
          attempts_count?: number | null
          blocked_at?: string
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          permanent?: boolean
          reason?: string
        }
        Relationships: []
      }
      budget_audit_logs: {
        Row: {
          action: string
          budget_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          budget_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          budget_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_audit_logs_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "department_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_transactions: {
        Row: {
          amount: number
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          type: string
        }
        Update: {
          amount?: number
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean | null
          codigo_unspsc: string | null
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          organization_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo_unspsc?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          organization_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo_unspsc?: string | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          organization_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_codigo_unspsc_fkey"
            columns: ["codigo_unspsc"]
            isOneToOne: false
            referencedRelation: "unspsc_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "categorias_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      category_strategies: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          id: string
          kraljic_quadrant: string | null
          last_review_at: string | null
          organization_id: string | null
          preferred_contract_type: string | null
          risk_level: string | null
          spend_impact: string | null
          strategy_description: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          kraljic_quadrant?: string | null
          last_review_at?: string | null
          organization_id?: string | null
          preferred_contract_type?: string | null
          risk_level?: string | null
          spend_impact?: string | null
          strategy_description?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          id?: string
          kraljic_quadrant?: string | null
          last_review_at?: string | null
          organization_id?: string | null
          preferred_contract_type?: string | null
          risk_level?: string | null
          spend_impact?: string | null
          strategy_description?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_strategies_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_strategies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_strategies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          author_id: string | null
          contact_id: string
          content: string
          created_at: string
          fornecedor_id: string | null
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          contact_id: string
          content: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          contact_id?: string
          content?: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "contact_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          contract_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_history: {
        Row: {
          action_description: string | null
          action_type: string
          contract_id: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          tenant_id: string
        }
        Insert: {
          action_description?: string | null
          action_type: string
          contract_id: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          tenant_id?: string
        }
        Update: {
          action_description?: string | null
          action_type?: string
          contract_id?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          contract_id: string
          created_at: string
          description: string | null
          id: string
          item_name: string
          quantity: number
          tenant_id: string
          total_price: number
          unit: string
          unit_price: number
        }
        Insert: {
          contract_id: string
          created_at?: string
          description?: string | null
          id?: string
          item_name: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit: string
          unit_price?: number
        }
        Update: {
          contract_id?: string
          created_at?: string
          description?: string | null
          id?: string
          item_name?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_penalties: {
        Row: {
          applied_to_payment: boolean | null
          contract_id: string
          created_at: string
          days_late: number | null
          description: string
          id: string
          pagamento_id: string | null
          pedido_id: string | null
          penalty_percent: number | null
          penalty_type: string
          penalty_value: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applied_to_payment?: boolean | null
          contract_id: string
          created_at?: string
          days_late?: number | null
          description: string
          id?: string
          pagamento_id?: string | null
          pedido_id?: string | null
          penalty_percent?: number | null
          penalty_type?: string
          penalty_value?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          applied_to_payment?: boolean | null
          contract_id?: string
          created_at?: string
          days_late?: number | null
          description?: string
          id?: string
          pagamento_id?: string | null
          pedido_id?: string | null
          penalty_percent?: number | null
          penalty_type?: string
          penalty_value?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_penalties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_penalties_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_penalties_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_penalties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auto_block_below_score: boolean | null
          contract_number: string
          contract_type: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          end_date: string
          id: string
          min_quality_score: number | null
          min_supplier_score: number | null
          organization_id: string | null
          payment_terms: string | null
          penalty_cap_percent: number | null
          penalty_clauses: Json | null
          penalty_rate_per_day: number | null
          quality_penalty_percent: number | null
          renewal_notice_days: number | null
          renewal_type: string | null
          return_policy: string | null
          sla_delivery_days: number | null
          start_date: string
          status: string
          supplier_id: string
          supplier_name: string
          tenant_id: string
          title: string
          total_value: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auto_block_below_score?: boolean | null
          contract_number: string
          contract_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date: string
          id?: string
          min_quality_score?: number | null
          min_supplier_score?: number | null
          organization_id?: string | null
          payment_terms?: string | null
          penalty_cap_percent?: number | null
          penalty_clauses?: Json | null
          penalty_rate_per_day?: number | null
          quality_penalty_percent?: number | null
          renewal_notice_days?: number | null
          renewal_type?: string | null
          return_policy?: string | null
          sla_delivery_days?: number | null
          start_date: string
          status?: string
          supplier_id: string
          supplier_name: string
          tenant_id?: string
          title: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auto_block_below_score?: boolean | null
          contract_number?: string
          contract_type?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          end_date?: string
          id?: string
          min_quality_score?: number | null
          min_supplier_score?: number | null
          organization_id?: string | null
          payment_terms?: string | null
          penalty_cap_percent?: number | null
          penalty_clauses?: Json | null
          penalty_rate_per_day?: number | null
          quality_penalty_percent?: number | null
          renewal_notice_days?: number | null
          renewal_type?: string | null
          return_policy?: string | null
          sla_delivery_days?: number | null
          start_date?: string
          status?: string
          supplier_id?: string
          supplier_name?: string
          tenant_id?: string
          title?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          approval_threshold: number | null
          code: string | null
          committed_amount: number | null
          created_at: string
          department: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          parent_id: string | null
          tenant_id: string
          total_budget: number | null
          updated_at: string
          used_amount: number | null
        }
        Insert: {
          approval_threshold?: number | null
          code?: string | null
          committed_amount?: number | null
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          parent_id?: string | null
          tenant_id?: string
          total_budget?: number | null
          updated_at?: string
          used_amount?: number | null
        }
        Update: {
          approval_threshold?: number | null
          code?: string | null
          committed_amount?: number | null
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          parent_id?: string | null
          tenant_id?: string
          total_budget?: number | null
          updated_at?: string
          used_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          anexos: Json | null
          avaliador_id: string | null
          condicao_pagamento: string | null
          created_at: string
          currency: string
          data_avaliacao: string | null
          desconto_percentual: number | null
          follow_up_status: string | null
          fornecedor_id: string | null
          id: string
          justificativa_selecao: string | null
          last_follow_up_at: string | null
          moeda: string | null
          numero: string
          observacoes: string | null
          organization_id: string | null
          prazo_entrega: number
          quantidade: number
          score_prazo: number | null
          score_preco: number | null
          score_qualidade: number | null
          score_total: number | null
          selecionada: boolean | null
          solicitacao_id: string | null
          status: string
          taxa_conversao: number | null
          tenant_id: string
          updated_at: string
          validade_proposta: string | null
          valor_frete: number | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          anexos?: Json | null
          avaliador_id?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          currency?: string
          data_avaliacao?: string | null
          desconto_percentual?: number | null
          follow_up_status?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_selecao?: string | null
          last_follow_up_at?: string | null
          moeda?: string | null
          numero: string
          observacoes?: string | null
          organization_id?: string | null
          prazo_entrega?: number
          quantidade?: number
          score_prazo?: number | null
          score_preco?: number | null
          score_qualidade?: number | null
          score_total?: number | null
          selecionada?: boolean | null
          solicitacao_id?: string | null
          status?: string
          taxa_conversao?: number | null
          tenant_id: string
          updated_at?: string
          validade_proposta?: string | null
          valor_frete?: number | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          anexos?: Json | null
          avaliador_id?: string | null
          condicao_pagamento?: string | null
          created_at?: string
          currency?: string
          data_avaliacao?: string | null
          desconto_percentual?: number | null
          follow_up_status?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa_selecao?: string | null
          last_follow_up_at?: string | null
          moeda?: string | null
          numero?: string
          observacoes?: string | null
          organization_id?: string | null
          prazo_entrega?: number
          quantidade?: number
          score_prazo?: number | null
          score_preco?: number | null
          score_qualidade?: number | null
          score_total?: number | null
          selecionada?: boolean | null
          solicitacao_id?: string | null
          status?: string
          taxa_conversao?: number | null
          tenant_id?: string
          updated_at?: string
          validade_proposta?: string | null
          valor_frete?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cotacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "cotacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      creditos_fornecedor: {
        Row: {
          created_at: string
          created_by: string | null
          data_emissao: string
          data_validade: string | null
          descricao: string | null
          devolucao_id: string | null
          fornecedor_id: string
          id: string
          saldo: number
          status: string
          tenant_id: string
          tipo: string
          updated_at: string
          utilizado_em_pagamento_id: string | null
          valor: number
          valor_utilizado: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_validade?: string | null
          descricao?: string | null
          devolucao_id?: string | null
          fornecedor_id: string
          id?: string
          saldo?: number
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          utilizado_em_pagamento_id?: string | null
          valor?: number
          valor_utilizado?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_validade?: string | null
          descricao?: string | null
          devolucao_id?: string | null
          fornecedor_id?: string
          id?: string
          saldo?: number
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          utilizado_em_pagamento_id?: string | null
          valor?: number
          valor_utilizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "creditos_fornecedor_devolucao_id_fkey"
            columns: ["devolucao_id"]
            isOneToOne: false
            referencedRelation: "devolucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditos_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditos_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "creditos_fornecedor_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creditos_fornecedor_utilizado_em_pagamento_id_fkey"
            columns: ["utilizado_em_pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimal_places: number
          is_active: boolean
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimal_places?: number
          is_active?: boolean
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimal_places?: number
          is_active?: boolean
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      dashboard_filter_favorites: {
        Row: {
          category_filter: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          organization_id: string | null
          period_filter: string | null
          show_comparison: boolean | null
          supplier_filter: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_filter?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          organization_id?: string | null
          period_filter?: string | null
          show_comparison?: boolean | null
          supplier_filter?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_filter?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string | null
          period_filter?: string | null
          show_comparison?: boolean | null
          supplier_filter?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_filter_favorites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          created_at: string
          dashboard_id: string
          id: string
          layout: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          id?: string
          layout: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          id?: string
          layout?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      department_budgets: {
        Row: {
          ano: number
          centro_custo: string
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          departamento: string
          id: string
          mes: number | null
          organization_id: string | null
          tenant_id: string
          updated_at: string
          valor_comprometido: number
          valor_total: number
          valor_utilizado: number
        }
        Insert: {
          ano?: number
          centro_custo: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          departamento: string
          id?: string
          mes?: number | null
          organization_id?: string | null
          tenant_id?: string
          updated_at?: string
          valor_comprometido?: number
          valor_total?: number
          valor_utilizado?: number
        }
        Update: {
          ano?: number
          centro_custo?: string
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          departamento?: string
          id?: string
          mes?: number | null
          organization_id?: string | null
          tenant_id?: string
          updated_at?: string
          valor_comprometido?: number
          valor_total?: number
          valor_utilizado?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_budgets_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_budgets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dependency_health: {
        Row: {
          id: boolean
          payload: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          payload: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          payload?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      dependency_health_history: {
        Row: {
          barrel_imports: number
          created_at: string
          created_by: string | null
          drift_count: number
          generated_at: string
          id: string
          payload: Json
        }
        Insert: {
          barrel_imports?: number
          created_at?: string
          created_by?: string | null
          drift_count?: number
          generated_at?: string
          id?: string
          payload: Json
        }
        Update: {
          barrel_imports?: number
          created_at?: string
          created_by?: string | null
          drift_count?: number
          generated_at?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      devolucao_itens: {
        Row: {
          created_at: string
          descricao: string
          devolucao_id: string
          estado_item: string | null
          fotos: Json | null
          id: string
          motivo: string
          pedido_item_id: string | null
          quantidade: number
          quantidade_aceita: number | null
          tenant_id: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao: string
          devolucao_id: string
          estado_item?: string | null
          fotos?: Json | null
          id?: string
          motivo?: string
          pedido_item_id?: string | null
          quantidade?: number
          quantidade_aceita?: number | null
          tenant_id?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          devolucao_id?: string
          estado_item?: string | null
          fotos?: Json | null
          id?: string
          motivo?: string
          pedido_item_id?: string | null
          quantidade?: number
          quantidade_aceita?: number | null
          tenant_id?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "devolucao_itens_devolucao_id_fkey"
            columns: ["devolucao_id"]
            isOneToOne: false
            referencedRelation: "devolucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucao_itens_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucao_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucoes: {
        Row: {
          aprovador_id: string | null
          codigo_rastreamento: string | null
          created_at: string
          data_aprovacao: string | null
          data_envio: string | null
          data_recebimento_fornecedor: string | null
          data_solicitacao: string
          fornecedor_id: string | null
          id: string
          motivo: string
          motivo_detalhe: string | null
          nf_devolucao: string | null
          numero: string
          observacoes: string | null
          pedido_id: string | null
          resolucao: string | null
          solicitante_id: string | null
          status: string
          tenant_id: string
          tipo: string
          transportadora: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          aprovador_id?: string | null
          codigo_rastreamento?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_envio?: string | null
          data_recebimento_fornecedor?: string | null
          data_solicitacao?: string
          fornecedor_id?: string | null
          id?: string
          motivo?: string
          motivo_detalhe?: string | null
          nf_devolucao?: string | null
          numero: string
          observacoes?: string | null
          pedido_id?: string | null
          resolucao?: string | null
          solicitante_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          transportadora?: string | null
          updated_at?: string
          valor_total?: number
        }
        Update: {
          aprovador_id?: string | null
          codigo_rastreamento?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_envio?: string | null
          data_recebimento_fornecedor?: string | null
          data_solicitacao?: string
          fornecedor_id?: string | null
          id?: string
          motivo?: string
          motivo_detalhe?: string | null
          nf_devolucao?: string | null
          numero?: string
          observacoes?: string | null
          pedido_id?: string | null
          resolucao?: string | null
          solicitante_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          transportadora?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "devolucoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_connections: {
        Row: {
          auth_type: string
          base_url: string
          created_at: string
          credentials_encrypted: string
          erp_type: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          settings: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_type: string
          base_url: string
          created_at?: string
          credentials_encrypted: string
          erp_type: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          settings?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_type?: string
          base_url?: string
          created_at?: string
          credentials_encrypted?: string
          erp_type?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          settings?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_field_mappings: {
        Row: {
          connection_id: string
          entity: string
          id: string
          is_required: boolean | null
          source_field: string
          target_field: string
          transform_fn: string | null
        }
        Insert: {
          connection_id: string
          entity: string
          id?: string
          is_required?: boolean | null
          source_field: string
          target_field: string
          transform_fn?: string | null
        }
        Update: {
          connection_id?: string
          entity?: string
          id?: string
          is_required?: boolean | null
          source_field?: string
          target_field?: string
          transform_fn?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_field_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "erp_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_sync_log: {
        Row: {
          connection_id: string
          created_at: string
          direction: string
          duration_ms: number | null
          entity: string
          error_message: string | null
          external_id: string | null
          id: string
          record_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          direction: string
          duration_ms?: number | null
          entity: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          record_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status: string
          tenant_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          direction?: string
          duration_ms?: number | null
          entity?: string
          error_message?: string | null
          external_id?: string | null
          id?: string
          record_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_sync_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "erp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_sync_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          created_at: string | null
          estoque_maximo: number | null
          estoque_minimo: number | null
          id: string
          localizacao: string
          organization_id: string
          ponto_pedido: number | null
          produto_id: string
          quantidade_atual: number
          ultimo_inventario: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          id?: string
          localizacao?: string
          organization_id: string
          ponto_pedido?: number | null
          produto_id: string
          quantidade_atual?: number
          ultimo_inventario?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          id?: string
          localizacao?: string
          organization_id?: string
          ponto_pedido?: number | null
          produto_id?: string
          quantidade_atual?: number
          ultimo_inventario?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentacoes: {
        Row: {
          created_at: string | null
          data_movimentacao: string | null
          estoque_id: string
          id: string
          motivo: string | null
          organization_id: string
          quantidade: number
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_movimentacao?: string | null
          estoque_id: string
          id?: string
          motivo?: string | null
          organization_id: string
          quantidade: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_movimentacao?: string | null
          estoque_id?: string
          id?: string
          motivo?: string | null
          organization_id?: string
          quantidade?: number
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_estoque_id_fkey"
            columns: ["estoque_id"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string
          id: string
          quote_currency: string
          rate: number
          rate_date: string
          source: string
        }
        Insert: {
          base_currency: string
          created_at?: string
          id?: string
          quote_currency: string
          rate: number
          rate_date: string
          source?: string
        }
        Update: {
          base_currency?: string
          created_at?: string
          id?: string
          quote_currency?: string
          rate?: number
          rate_date?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_base_currency_fkey"
            columns: ["base_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_quote_currency_fkey"
            columns: ["quote_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      financial_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      fiscal_documents: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string | null
          file_path: string | null
          fornecedor_id: string | null
          id: string
          numero_nf: string
          organization_id: string | null
          pdf_url: string | null
          pedido_id: string | null
          processing_id: string | null
          reconciliation_notes: string | null
          reconciliation_status: string | null
          sefaz_protocol: string | null
          sefaz_status: string | null
          serie: string | null
          source_type: string | null
          status: string
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_impostos: number | null
          valor_produtos: number | null
          valor_total: number
          xml_content: string | null
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          file_path?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_nf: string
          organization_id?: string | null
          pdf_url?: string | null
          pedido_id?: string | null
          processing_id?: string | null
          reconciliation_notes?: string | null
          reconciliation_status?: string | null
          sefaz_protocol?: string | null
          sefaz_status?: string | null
          serie?: string | null
          source_type?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_impostos?: number | null
          valor_produtos?: number | null
          valor_total?: number
          xml_content?: string | null
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          file_path?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_nf?: string
          organization_id?: string | null
          pdf_url?: string | null
          pedido_id?: string | null
          processing_id?: string | null
          reconciliation_notes?: string | null
          reconciliation_status?: string | null
          sefaz_protocol?: string | null
          sefaz_status?: string | null
          serie?: string | null
          source_type?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_impostos?: number | null
          valor_produtos?: number | null
          valor_total?: number
          xml_content?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "fiscal_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_events: {
        Row: {
          action: string
          created_at: string
          document_id: string | null
          error_message: string | null
          external_id: string | null
          id: string
          pdf_url: string | null
          processed_at: string | null
          protocol: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          tenant_id: string
          type: string
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          action: string
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          pdf_url?: string | null
          processed_at?: string | null
          protocol?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status: string
          tenant_id: string
          type: string
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          pdf_url?: string | null
          processed_at?: string | null
          protocol?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedor_categorias: {
        Row: {
          categoria_id: string
          created_at: string | null
          fornecedor_id: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          categoria_id: string
          created_at?: string | null
          fornecedor_id: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          categoria_id?: string
          created_at?: string | null
          fornecedor_id?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_categorias_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedor_categorias_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          api_endpoint: string | null
          avaliacao: number | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          codigo: string
          condicoes_pagamento: string | null
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          integrado_api: boolean | null
          limite_credito: number | null
          nome_fantasia: string | null
          observacoes: string | null
          organization_id: string | null
          prazo_medio_entrega: number | null
          razao_social: string
          saldo_comprometido: number | null
          segmento: string | null
          status: string
          telefone: string | null
          tenant_id: string
          tipo: string
          updated_at: string
          website: string | null
        }
        Insert: {
          api_endpoint?: string | null
          avaliacao?: number | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          integrado_api?: boolean | null
          limite_credito?: number | null
          nome_fantasia?: string | null
          observacoes?: string | null
          organization_id?: string | null
          prazo_medio_entrega?: number | null
          razao_social: string
          saldo_comprometido?: number | null
          segmento?: string | null
          status?: string
          telefone?: string | null
          tenant_id: string
          tipo?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          api_endpoint?: string | null
          avaliacao?: number | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          integrado_api?: boolean | null
          limite_credito?: number | null
          nome_fantasia?: string | null
          observacoes?: string | null
          organization_id?: string | null
          prazo_medio_entrega?: number | null
          razao_social?: string
          saldo_comprometido?: number | null
          segmento?: string | null
          status?: string
          telefone?: string | null
          tenant_id?: string
          tipo?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fornecedores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_access_logs: {
        Row: {
          blocked: boolean
          country_code: string | null
          country_name: string | null
          created_at: string
          endpoint: string | null
          id: string
          ip_address: string
          user_agent: string | null
        }
        Insert: {
          blocked?: boolean
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          ip_address: string
          user_agent?: string | null
        }
        Update: {
          blocked?: boolean
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          ip_address?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      geo_settings: {
        Row: {
          geo_restriction_enabled: boolean
          id: string
          restriction_mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          geo_restriction_enabled?: boolean
          id?: string
          restriction_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          geo_restriction_enabled?: boolean
          id?: string
          restriction_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      integration_outbox: {
        Row: {
          created_at: string
          created_by: string | null
          delivered_at: string | null
          endpoint: string
          headers: Json | null
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          retries: number
          status: string
          target: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          endpoint: string
          headers?: Json | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          retries?: number
          status?: string
          target: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          endpoint?: string
          headers?: Json | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          retries?: number
          status?: string
          target?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ip_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      licitacao_lances: {
        Row: {
          created_at: string | null
          fornecedor_id: string | null
          id: string
          licitacao_id: string | null
          tenant_id: string
          valor_lance: number
        }
        Insert: {
          created_at?: string | null
          fornecedor_id?: string | null
          id?: string
          licitacao_id?: string | null
          tenant_id?: string
          valor_lance: number
        }
        Update: {
          created_at?: string | null
          fornecedor_id?: string | null
          id?: string
          licitacao_id?: string | null
          tenant_id?: string
          valor_lance?: number
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_lances_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_lances_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "licitacao_lances_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_lances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacao_propostas: {
        Row: {
          created_at: string
          data_submissao: string | null
          desclassificada: boolean | null
          desconto_percentual: number | null
          documentos: Json | null
          fornecedor_id: string
          id: string
          licitacao_id: string
          motivo_desclassificacao: string | null
          observacoes: string | null
          prazo_entrega: number | null
          score_preco: number | null
          score_tecnico: number | null
          score_total: number | null
          status: string
          tenant_id: string
          updated_at: string
          valor_proposta: number
          vencedora: boolean | null
        }
        Insert: {
          created_at?: string
          data_submissao?: string | null
          desclassificada?: boolean | null
          desconto_percentual?: number | null
          documentos?: Json | null
          fornecedor_id: string
          id?: string
          licitacao_id: string
          motivo_desclassificacao?: string | null
          observacoes?: string | null
          prazo_entrega?: number | null
          score_preco?: number | null
          score_tecnico?: number | null
          score_total?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
          valor_proposta?: number
          vencedora?: boolean | null
        }
        Update: {
          created_at?: string
          data_submissao?: string | null
          desclassificada?: boolean | null
          desconto_percentual?: number | null
          documentos?: Json | null
          fornecedor_id?: string
          id?: string
          licitacao_id?: string
          motivo_desclassificacao?: string | null
          observacoes?: string | null
          prazo_entrega?: number | null
          score_preco?: number | null
          score_tecnico?: number | null
          score_total?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string
          valor_proposta?: number
          vencedora?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacao_propostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_propostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "licitacao_propostas_licitacao_id_fkey"
            columns: ["licitacao_id"]
            isOneToOne: false
            referencedRelation: "licitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacao_propostas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      licitacoes: {
        Row: {
          created_at: string
          created_by: string | null
          criterios_avaliacao: Json | null
          current_best_bid: number | null
          data_abertura: string | null
          data_encerramento: string | null
          data_publicacao: string | null
          descricao: string | null
          documentos_exigidos: Json | null
          edital_url: string | null
          fornecedor_vencedor_id: string | null
          id: string
          is_live: boolean | null
          lance_minimo_decremento: number | null
          modalidade: string
          numero: string
          objeto: string | null
          observacoes: string | null
          organization_id: string | null
          responsavel_id: string | null
          status: string
          tenant_id: string
          tipo: string
          titulo: string
          updated_at: string
          valor_estimado: number | null
          valor_vencedor: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          criterios_avaliacao?: Json | null
          current_best_bid?: number | null
          data_abertura?: string | null
          data_encerramento?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          documentos_exigidos?: Json | null
          edital_url?: string | null
          fornecedor_vencedor_id?: string | null
          id?: string
          is_live?: boolean | null
          lance_minimo_decremento?: number | null
          modalidade?: string
          numero: string
          objeto?: string | null
          observacoes?: string | null
          organization_id?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          titulo: string
          updated_at?: string
          valor_estimado?: number | null
          valor_vencedor?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          criterios_avaliacao?: Json | null
          current_best_bid?: number | null
          data_abertura?: string | null
          data_encerramento?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          documentos_exigidos?: Json | null
          edital_url?: string | null
          fornecedor_vencedor_id?: string | null
          id?: string
          is_live?: boolean | null
          lance_minimo_decremento?: number | null
          modalidade?: string
          numero?: string
          objeto?: string | null
          observacoes?: string | null
          organization_id?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          titulo?: string
          updated_at?: string
          valor_estimado?: number | null
          valor_vencedor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "licitacoes_fornecedor_vencedor_id_fkey"
            columns: ["fornecedor_vencedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_fornecedor_vencedor_id_fkey"
            columns: ["fornecedor_vencedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "licitacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licitacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      mfa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          id: string
          last_verified_at: string | null
          mfa_enabled: boolean
          mfa_method: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          mfa_enabled?: boolean
          mfa_method?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          mfa_enabled?: boolean
          mfa_method?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      negotiation_analyses: {
        Row: {
          analise_texto: string | null
          cotacao_id: string | null
          created_at: string
          created_by: string | null
          economia_estimada: number | null
          id: string
          modelo_ia: string | null
          score_negociacao: number | null
          solicitacao_id: string | null
          sugestoes: Json | null
        }
        Insert: {
          analise_texto?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          economia_estimada?: number | null
          id?: string
          modelo_ia?: string | null
          score_negociacao?: number | null
          solicitacao_id?: string | null
          sugestoes?: Json | null
        }
        Update: {
          analise_texto?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          economia_estimada?: number | null
          id?: string
          modelo_ia?: string | null
          score_negociacao?: number | null
          solicitacao_id?: string | null
          sugestoes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_analyses_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiation_analyses_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_notifications: boolean | null
          id: string
          order_updates: boolean | null
          payment_alerts: boolean | null
          price_alerts: boolean | null
          push_notifications: boolean | null
          sla_critical: boolean | null
          sla_warnings: boolean | null
          sound_enabled: boolean | null
          supplier_alerts: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          order_updates?: boolean | null
          payment_alerts?: boolean | null
          price_alerts?: boolean | null
          push_notifications?: boolean | null
          sla_critical?: boolean | null
          sla_warnings?: boolean | null
          sound_enabled?: boolean | null
          supplier_alerts?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean | null
          id?: string
          order_updates?: boolean | null
          payment_alerts?: boolean | null
          price_alerts?: boolean | null
          push_notifications?: boolean | null
          sla_critical?: boolean | null
          sla_warnings?: boolean | null
          sound_enabled?: boolean | null
          supplier_alerts?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          data: Json | null
          id: string
          message: string
          priority: string
          read: boolean | null
          sent_email: boolean | null
          sent_push: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          priority?: string
          read?: boolean | null
          sent_email?: boolean | null
          sent_push?: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          priority?: string
          read?: boolean | null
          sent_email?: boolean | null
          sent_push?: boolean | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_contracts: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          order_id: string
          tenant_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          order_id: string
          tenant_id?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          order_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_contracts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          cnpj_matriz: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          razao_social: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          cnpj_matriz?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          razao_social?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          cnpj_matriz?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          razao_social?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          aprovador_id: string | null
          chave_nf: string | null
          comprovante_url: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          dados_bancarios: Json | null
          data_aprovacao: string | null
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          fornecedor_id: string
          id: string
          numero: string
          numero_nf: string | null
          observacoes: string | null
          organization_id: string | null
          pedido_id: string | null
          status: string
          tenant_id: string
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          aprovador_id?: string | null
          chave_nf?: string | null
          comprovante_url?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios?: Json | null
          data_aprovacao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          fornecedor_id: string
          id?: string
          numero: string
          numero_nf?: string | null
          observacoes?: string | null
          organization_id?: string | null
          pedido_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          valor: number
          valor_pago?: number | null
        }
        Update: {
          aprovador_id?: string | null
          chave_nf?: string | null
          comprovante_url?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios?: Json | null
          data_aprovacao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          fornecedor_id?: string
          id?: string
          numero?: string
          numero_nf?: string | null
          observacoes?: string | null
          organization_id?: string | null
          pedido_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "pagamentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          reason: string | null
          requested_at: string
          reset_token: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          email: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          requested_at?: string
          reset_token?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          requested_at?: string
          reset_token?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data_pagamento: string
          id: string
          observacoes: string | null
          pagamento_id: string
          registrado_por: string | null
          tenant_id: string
          valor_parcela: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string
          id?: string
          observacoes?: string | null
          pagamento_id: string
          registrado_por?: string | null
          tenant_id?: string
          valor_parcela?: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string
          id?: string
          observacoes?: string | null
          pagamento_id?: string
          registrado_por?: string | null
          tenant_id?: string
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          data_previsao_producao: string | null
          descricao: string
          id: string
          pedido_id: string | null
          produto_id: string | null
          quantidade: number
          quantidade_recebida: number | null
          status_producao:
            | Database["public"]["Enums"]["status_producao_enum"]
            | null
          tenant_id: string
          unidade: string | null
          unspsc_code: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          data_previsao_producao?: string | null
          descricao: string
          id?: string
          pedido_id?: string | null
          produto_id?: string | null
          quantidade?: number
          quantidade_recebida?: number | null
          status_producao?:
            | Database["public"]["Enums"]["status_producao_enum"]
            | null
          tenant_id: string
          unidade?: string | null
          unspsc_code?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          data_previsao_producao?: string | null
          descricao?: string
          id?: string
          pedido_id?: string | null
          produto_id?: string | null
          quantidade?: number
          quantidade_recebida?: number | null
          status_producao?:
            | Database["public"]["Enums"]["status_producao_enum"]
            | null
          tenant_id?: string
          unidade?: string | null
          unspsc_code?: string | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_unspsc_code_fkey"
            columns: ["unspsc_code"]
            isOneToOne: false
            referencedRelation: "unspsc_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      pedidos: {
        Row: {
          aprovador_id: string | null
          codigo_rastreamento: string | null
          comprador_id: string | null
          condicao_pagamento: string | null
          cotacao_id: string | null
          created_at: string
          currency: string
          data_emissao: string
          data_entrega: string | null
          data_previsao: string | null
          desconto: number | null
          endereco_entrega: string | null
          fornecedor_id: string
          id: string
          moeda: string | null
          numero: string
          observacoes: string | null
          organization_id: string | null
          solicitacao_id: string | null
          status: string
          taxa_conversao: number | null
          tenant_id: string
          transportadora: string | null
          updated_at: string
          valor_frete: number | null
          valor_total: number
        }
        Insert: {
          aprovador_id?: string | null
          codigo_rastreamento?: string | null
          comprador_id?: string | null
          condicao_pagamento?: string | null
          cotacao_id?: string | null
          created_at?: string
          currency?: string
          data_emissao?: string
          data_entrega?: string | null
          data_previsao?: string | null
          desconto?: number | null
          endereco_entrega?: string | null
          fornecedor_id: string
          id?: string
          moeda?: string | null
          numero: string
          observacoes?: string | null
          organization_id?: string | null
          solicitacao_id?: string | null
          status?: string
          taxa_conversao?: number | null
          tenant_id: string
          transportadora?: string | null
          updated_at?: string
          valor_frete?: number | null
          valor_total: number
        }
        Update: {
          aprovador_id?: string | null
          codigo_rastreamento?: string | null
          comprador_id?: string | null
          condicao_pagamento?: string | null
          cotacao_id?: string | null
          created_at?: string
          currency?: string
          data_emissao?: string
          data_entrega?: string | null
          data_previsao?: string | null
          desconto?: number | null
          endereco_entrega?: string | null
          fornecedor_id?: string
          id?: string
          moeda?: string | null
          numero?: string
          observacoes?: string | null
          organization_id?: string | null
          solicitacao_id?: string | null
          status?: string
          taxa_conversao?: number | null
          tenant_id?: string
          transportadora?: string | null
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "pedidos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      penalty_escalation_config: {
        Row: {
          action_type: string
          block_days: number | null
          contract_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: number
          max_infractions: number | null
          min_infractions: number
          penalty_multiplier: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          block_days?: number | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          max_infractions?: number | null
          min_infractions?: number
          penalty_multiplier?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          block_days?: number | null
          contract_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          max_infractions?: number | null
          min_infractions?: number
          penalty_multiplier?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalty_escalation_config_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_escalation_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      produto_fornecedores: {
        Row: {
          codigo_no_fornecedor: string | null
          created_at: string | null
          fornecedor_id: string
          id: string
          lead_time_estimado: number | null
          organization_id: string | null
          preco_custo: number | null
          preferencial: boolean | null
          produto_id: string
          tenant_id: string
          ultima_cotacao_id: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_no_fornecedor?: string | null
          created_at?: string | null
          fornecedor_id: string
          id?: string
          lead_time_estimado?: number | null
          organization_id?: string | null
          preco_custo?: number | null
          preferencial?: boolean | null
          produto_id: string
          tenant_id: string
          ultima_cotacao_id?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_no_fornecedor?: string | null
          created_at?: string | null
          fornecedor_id?: string
          id?: string
          lead_time_estimado?: number | null
          organization_id?: string | null
          preco_custo?: number | null
          preferencial?: boolean | null
          produto_id?: string
          tenant_id?: string
          ultima_cotacao_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "produto_fornecedores_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          codigo: string
          codigo_cnae: string | null
          codigo_ncm: string | null
          codigo_unspsc: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          estoque_minimo: number | null
          fornecedor_preferencial_id: string | null
          id: string
          imagem_url: string | null
          lead_time_dias: number | null
          localizacao_coleta: string | null
          nome: string
          organization_id: string | null
          preco_medio: number | null
          preco_referencia: number | null
          tags: string[] | null
          tenant_id: string
          tipo_produto: Database["public"]["Enums"]["tipo_produto_enum"] | null
          ultimo_preco: number | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo: string
          codigo_cnae?: string | null
          codigo_ncm?: string | null
          codigo_unspsc?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estoque_minimo?: number | null
          fornecedor_preferencial_id?: string | null
          id?: string
          imagem_url?: string | null
          lead_time_dias?: number | null
          localizacao_coleta?: string | null
          nome: string
          organization_id?: string | null
          preco_medio?: number | null
          preco_referencia?: number | null
          tags?: string[] | null
          tenant_id: string
          tipo_produto?: Database["public"]["Enums"]["tipo_produto_enum"] | null
          ultimo_preco?: number | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string
          codigo_cnae?: string | null
          codigo_ncm?: string | null
          codigo_unspsc?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          estoque_minimo?: number | null
          fornecedor_preferencial_id?: string | null
          id?: string
          imagem_url?: string | null
          lead_time_dias?: number | null
          localizacao_coleta?: string | null
          nome?: string
          organization_id?: string | null
          preco_medio?: number | null
          preco_referencia?: number | null
          tags?: string[] | null
          tenant_id?: string
          tipo_produto?: Database["public"]["Enums"]["tipo_produto_enum"] | null
          ultimo_preco?: number | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_preferencial_id_fkey"
            columns: ["fornecedor_preferencial_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_preferencial_id_fkey"
            columns: ["fornecedor_preferencial_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "produtos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_organization_id: string | null
          department: string | null
          email: string | null
          empresa_default_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_locale: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_organization_id?: string | null
          department?: string | null
          email?: string | null
          empresa_default_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_organization_id?: string | null
          department?: string | null
          email?: string | null
          empresa_default_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_locale?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_empresa_default_id_fkey"
            columns: ["empresa_default_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      punchout_catalogs: {
        Row: {
          created_at: string
          fornecedor_id: string
          id: string
          identity: string
          is_active: boolean
          last_test_at: string | null
          last_test_status: string | null
          protocol: string
          setup_url: string
          shared_secret_encrypted: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fornecedor_id: string
          id?: string
          identity: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_status?: string | null
          protocol: string
          setup_url: string
          shared_secret_encrypted: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fornecedor_id?: string
          id?: string
          identity?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_status?: string | null
          protocol?: string
          setup_url?: string
          shared_secret_encrypted?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "punchout_catalogs_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punchout_catalogs_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "punchout_catalogs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      punchout_sessions: {
        Row: {
          buyer_cookie: string
          cart_payload: Json | null
          catalog_id: string
          closed_at: string | null
          created_at: string
          created_solicitacao_id: string | null
          id: string
          raw_request_xml: string | null
          raw_response_xml: string | null
          return_url: string
          status: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          buyer_cookie: string
          cart_payload?: Json | null
          catalog_id: string
          closed_at?: string | null
          created_at?: string
          created_solicitacao_id?: string | null
          id?: string
          raw_request_xml?: string | null
          raw_response_xml?: string | null
          return_url: string
          status?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          buyer_cookie?: string
          cart_payload?: Json | null
          catalog_id?: string
          closed_at?: string | null
          created_at?: string
          created_solicitacao_id?: string | null
          id?: string
          raw_request_xml?: string | null
          raw_response_xml?: string | null
          return_url?: string
          status?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punchout_sessions_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "punchout_catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punchout_sessions_created_solicitacao_id_fkey"
            columns: ["created_solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punchout_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qualification_history: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          fornecedor_id: string
          id: string
          new_value: string | null
          old_value: string | null
          performed_by: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          fornecedor_id: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          fornecedor_id?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualification_history_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualification_history_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
        ]
      }
      qualification_requirements: {
        Row: {
          applies_to_types: string[] | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          name: string
          updated_at: string
          validity_days: number | null
          weight: number
        }
        Insert: {
          applies_to_types?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name: string
          updated_at?: string
          validity_days?: number | null
          weight?: number
        }
        Update: {
          applies_to_types?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name?: string
          updated_at?: string
          validity_days?: number | null
          weight?: number
        }
        Relationships: []
      }
      query_telemetry: {
        Row: {
          count_mode: string | null
          created_at: string
          duration_ms: number
          error_message: string | null
          id: string
          operation: string
          query_limit: number | null
          query_offset: number | null
          record_count: number | null
          rpc_name: string | null
          severity: string
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          count_mode?: string | null
          created_at?: string
          duration_ms?: number
          error_message?: string | null
          id?: string
          operation?: string
          query_limit?: number | null
          query_offset?: number | null
          record_count?: number | null
          rpc_name?: string | null
          severity?: string
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_logs: {
        Row: {
          blocked: boolean
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          retry_after: string | null
          user_agent: string | null
          user_id: string | null
          window_start: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          retry_after?: string | null
          user_agent?: string | null
          user_id?: string | null
          window_start?: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          retry_after?: string | null
          user_agent?: string | null
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      receiving_checklists: {
        Row: {
          conformity_score: number
          contract_id: string | null
          created_at: string
          defects_found: string | null
          documentation_score: number
          fornecedor_id: string
          id: string
          inspection_date: string
          inspector_id: string | null
          notes: string | null
          overall_score: number
          packaging_score: number
          pedido_id: string
          photos_urls: Json | null
          quantity_score: number
          rejection_reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          conformity_score?: number
          contract_id?: string | null
          created_at?: string
          defects_found?: string | null
          documentation_score?: number
          fornecedor_id: string
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          notes?: string | null
          overall_score?: number
          packaging_score?: number
          pedido_id: string
          photos_urls?: Json | null
          quantity_score?: number
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          conformity_score?: number
          contract_id?: string | null
          created_at?: string
          defects_found?: string | null
          documentation_score?: number
          fornecedor_id?: string
          id?: string
          inspection_date?: string
          inspector_id?: string | null
          notes?: string | null
          overall_score?: number
          packaging_score?: number
          pedido_id?: string
          photos_urls?: Json | null
          quantity_score?: number
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_checklists_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_checklists_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_checklists_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "receiving_checklists_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_checklists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repurchase_suggestions: {
        Row: {
          confianca_score: number | null
          created_at: string
          descartado_motivo: string | null
          fornecedor_id: string | null
          frequencia_dias: number | null
          id: string
          preco_estimado: number | null
          produto_id: string | null
          proxima_compra_estimada: string | null
          quantidade_sugerida: number
          status: string
          tenant_id: string
          ultimo_pedido_id: string | null
          updated_at: string
        }
        Insert: {
          confianca_score?: number | null
          created_at?: string
          descartado_motivo?: string | null
          fornecedor_id?: string | null
          frequencia_dias?: number | null
          id?: string
          preco_estimado?: number | null
          produto_id?: string | null
          proxima_compra_estimada?: string | null
          quantidade_sugerida?: number
          status?: string
          tenant_id?: string
          ultimo_pedido_id?: string | null
          updated_at?: string
        }
        Update: {
          confianca_score?: number | null
          created_at?: string
          descartado_motivo?: string | null
          fornecedor_id?: string | null
          frequencia_dias?: number | null
          id?: string
          preco_estimado?: number | null
          produto_id?: string | null
          proxima_compra_estimada?: string | null
          quantidade_sugerida?: number
          status?: string
          tenant_id?: string
          ultimo_pedido_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repurchase_suggestions_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurchase_suggestions_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "repurchase_suggestions_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurchase_suggestions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurchase_suggestions_ultimo_pedido_id_fkey"
            columns: ["ultimo_pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_tracker: {
        Row: {
          actual_saving: number | null
          baseline_value: number
          created_at: string
          currency: string | null
          finance_notes: string | null
          id: string
          negotiated_value: number
          project_id: string | null
          realized_date: string | null
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["saving_type"]
          updated_at: string
          validated_by_finance: boolean | null
        }
        Insert: {
          actual_saving?: number | null
          baseline_value: number
          created_at?: string
          currency?: string | null
          finance_notes?: string | null
          id?: string
          negotiated_value: number
          project_id?: string | null
          realized_date?: string | null
          tenant_id: string
          title: string
          type?: Database["public"]["Enums"]["saving_type"]
          updated_at?: string
          validated_by_finance?: boolean | null
        }
        Update: {
          actual_saving?: number | null
          baseline_value?: number
          created_at?: string
          currency?: string | null
          finance_notes?: string | null
          id?: string
          negotiated_value?: number
          project_id?: string | null
          realized_date?: string | null
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["saving_type"]
          updated_at?: string
          validated_by_finance?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_tracker_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sourcing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_tracker_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scim_provisioning_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          operation: string
          payload: Json | null
          status: string
          target_email: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation: string
          payload?: Json | null
          status: string
          target_email?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation?: string
          payload?: Json | null
          status?: string
          target_email?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scim_provisioning_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string
          event_description: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_description?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_description?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      solicitacoes: {
        Row: {
          anexos: Json | null
          aprovador_id: string | null
          categoria_id: string | null
          centro_custo: string | null
          cost_center_id: string | null
          created_at: string
          data_aprovacao: string | null
          data_conclusao: string | null
          data_necessidade: string | null
          departamento: string | null
          descricao: string | null
          fornecedor_id: string | null
          id: string
          justificativa: string | null
          numero: string
          observacoes: string | null
          organization_id: string | null
          prioridade: string
          produto_id: string | null
          quantidade: number
          solicitante_id: string | null
          status: string
          tenant_id: string
          tipo: string
          titulo: string
          unidade: string | null
          updated_at: string
          valor_aprovado: number | null
          valor_estimado: number | null
        }
        Insert: {
          anexos?: Json | null
          aprovador_id?: string | null
          categoria_id?: string | null
          centro_custo?: string | null
          cost_center_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_conclusao?: string | null
          data_necessidade?: string | null
          departamento?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa?: string | null
          numero: string
          observacoes?: string | null
          organization_id?: string | null
          prioridade?: string
          produto_id?: string | null
          quantidade?: number
          solicitante_id?: string | null
          status?: string
          tenant_id: string
          tipo?: string
          titulo: string
          unidade?: string | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_estimado?: number | null
        }
        Update: {
          anexos?: Json | null
          aprovador_id?: string | null
          categoria_id?: string | null
          centro_custo?: string | null
          cost_center_id?: string | null
          created_at?: string
          data_aprovacao?: string | null
          data_conclusao?: string | null
          data_necessidade?: string | null
          departamento?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          justificativa?: string | null
          numero?: string
          observacoes?: string | null
          organization_id?: string | null
          prioridade?: string
          produto_id?: string | null
          quantidade?: number
          solicitante_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          titulo?: string
          unidade?: string | null
          updated_at?: string
          valor_aprovado?: number | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "solicitacoes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_awards: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          event_id: string
          fornecedor_id: string
          id: string
          justificativa: string
          lot_id: string | null
          pedido_id: string | null
          saving_estimado: number | null
          tenant_id: string
          valor_adjudicado: number
          winner_response_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          event_id: string
          fornecedor_id: string
          id?: string
          justificativa: string
          lot_id?: string | null
          pedido_id?: string | null
          saving_estimado?: number | null
          tenant_id?: string
          valor_adjudicado: number
          winner_response_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          event_id?: string
          fornecedor_id?: string
          id?: string
          justificativa?: string
          lot_id?: string | null
          pedido_id?: string | null
          saving_estimado?: number | null
          tenant_id?: string
          valor_adjudicado?: number
          winner_response_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_awards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sourcing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_awards_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_awards_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "sourcing_awards_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "sourcing_event_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_awards_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_awards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_awards_winner_response_id_fkey"
            columns: ["winner_response_id"]
            isOneToOne: false
            referencedRelation: "sourcing_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_event_criteria: {
        Row: {
          config: Json | null
          created_at: string
          event_id: string
          formula: string
          id: string
          nome: string
          peso: number
          tenant_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          event_id: string
          formula?: string
          id?: string
          nome: string
          peso: number
          tenant_id?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          event_id?: string
          formula?: string
          id?: string
          nome?: string
          peso?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_event_criteria_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sourcing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_event_criteria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_event_lots: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string | null
          especificacoes: Json | null
          event_id: string
          id: string
          nome: string
          ordem: number
          preco_referencia: number | null
          quantidade: number
          tenant_id: string
          unidade: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          especificacoes?: Json | null
          event_id: string
          id?: string
          nome: string
          ordem?: number
          preco_referencia?: number | null
          quantidade?: number
          tenant_id?: string
          unidade?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          especificacoes?: Json | null
          event_id?: string
          id?: string
          nome?: string
          ordem?: number
          preco_referencia?: number | null
          quantidade?: number
          tenant_id?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_event_lots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sourcing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_event_lots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_event_questions: {
        Row: {
          ajuda: string | null
          created_at: string
          event_id: string
          id: string
          obrigatoria: boolean
          opcoes: Json | null
          ordem: number
          pergunta: string
          peso: number
          tenant_id: string
          type: Database["public"]["Enums"]["question_type"]
          validacao: Json | null
        }
        Insert: {
          ajuda?: string | null
          created_at?: string
          event_id: string
          id?: string
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          pergunta: string
          peso?: number
          tenant_id?: string
          type: Database["public"]["Enums"]["question_type"]
          validacao?: Json | null
        }
        Update: {
          ajuda?: string | null
          created_at?: string
          event_id?: string
          id?: string
          obrigatoria?: boolean
          opcoes?: Json | null
          ordem?: number
          pergunta?: string
          peso?: number
          tenant_id?: string
          type?: Database["public"]["Enums"]["question_type"]
          validacao?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_event_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sourcing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_event_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_events: {
        Row: {
          auction_config: Json | null
          award_deadline: string | null
          budget_estimate: number | null
          category_id: string | null
          closes_at: string
          created_at: string
          currency: string
          description: string | null
          evaluation_deadline: string | null
          id: string
          metadata: Json | null
          numero: string
          organization_id: string | null
          owner_id: string
          sealed_bid: boolean
          starts_at: string | null
          status: Database["public"]["Enums"]["sourcing_status"]
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["sourcing_type"]
          updated_at: string
        }
        Insert: {
          auction_config?: Json | null
          award_deadline?: string | null
          budget_estimate?: number | null
          category_id?: string | null
          closes_at: string
          created_at?: string
          currency?: string
          description?: string | null
          evaluation_deadline?: string | null
          id?: string
          metadata?: Json | null
          numero: string
          organization_id?: string | null
          owner_id: string
          sealed_bid?: boolean
          starts_at?: string | null
          status?: Database["public"]["Enums"]["sourcing_status"]
          tenant_id?: string
          title: string
          type: Database["public"]["Enums"]["sourcing_type"]
          updated_at?: string
        }
        Update: {
          auction_config?: Json | null
          award_deadline?: string | null
          budget_estimate?: number | null
          category_id?: string | null
          closes_at?: string
          created_at?: string
          currency?: string
          description?: string | null
          evaluation_deadline?: string | null
          id?: string
          metadata?: Json | null
          numero?: string
          organization_id?: string | null
          owner_id?: string
          sealed_bid?: boolean
          starts_at?: string | null
          status?: Database["public"]["Enums"]["sourcing_status"]
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["sourcing_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_invitations: {
        Row: {
          declined_at: string | null
          declined_reason: string | null
          email_contato: string
          event_id: string
          fornecedor_id: string
          id: string
          invited_at: string
          last_reminder_at: string | null
          nome_contato: string | null
          reminder_count: number
          status: Database["public"]["Enums"]["invitation_status"]
          tenant_id: string
          token: string
          viewed_at: string | null
        }
        Insert: {
          declined_at?: string | null
          declined_reason?: string | null
          email_contato: string
          event_id: string
          fornecedor_id: string
          id?: string
          invited_at?: string
          last_reminder_at?: string | null
          nome_contato?: string | null
          reminder_count?: number
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token: string
          viewed_at?: string | null
        }
        Update: {
          declined_at?: string | null
          declined_reason?: string | null
          email_contato?: string
          event_id?: string
          fornecedor_id?: string
          id?: string
          invited_at?: string
          last_reminder_at?: string | null
          nome_contato?: string | null
          reminder_count?: number
          status?: Database["public"]["Enums"]["invitation_status"]
          tenant_id?: string
          token?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sourcing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_invitations_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_invitations_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "sourcing_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_pipeline: {
        Row: {
          actual_saving_value: number | null
          baseline_value: number | null
          categoria_id: string | null
          comprador_id: string | null
          created_at: string | null
          end_date: string | null
          estimated_saving_value: number | null
          id: string
          organization_id: string | null
          start_date: string | null
          status: string | null
          target_saving_percent: number | null
          tenant_id: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          actual_saving_value?: number | null
          baseline_value?: number | null
          categoria_id?: string | null
          comprador_id?: string | null
          created_at?: string | null
          end_date?: string | null
          estimated_saving_value?: number | null
          id?: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          target_saving_percent?: number | null
          tenant_id?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          actual_saving_value?: number | null
          baseline_value?: number | null
          categoria_id?: string | null
          comprador_id?: string | null
          created_at?: string | null
          end_date?: string | null
          estimated_saving_value?: number | null
          id?: string
          organization_id?: string | null
          start_date?: string | null
          status?: string | null
          target_saving_percent?: number | null
          tenant_id?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_pipeline_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_pipeline_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_pipeline_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_projects: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          estimated_spend: number | null
          id: string
          owner_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["sourcing_project_status"]
          target_saving_pct: number | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_spend?: number | null
          id?: string
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["sourcing_project_status"]
          target_saving_pct?: number | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_spend?: number | null
          id?: string
          owner_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["sourcing_project_status"]
          target_saving_pct?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_response_answers: {
        Row: {
          id: string
          question_id: string
          response_id: string
          resposta_choice: Json | null
          resposta_file_url: string | null
          resposta_number: number | null
          resposta_text: string | null
          score_manual: number | null
          tenant_id: string
        }
        Insert: {
          id?: string
          question_id: string
          response_id: string
          resposta_choice?: Json | null
          resposta_file_url?: string | null
          resposta_number?: number | null
          resposta_text?: string | null
          score_manual?: number | null
          tenant_id?: string
        }
        Update: {
          id?: string
          question_id?: string
          response_id?: string
          resposta_choice?: Json | null
          resposta_file_url?: string | null
          resposta_number?: number | null
          resposta_text?: string | null
          score_manual?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_response_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "sourcing_event_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_response_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "sourcing_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_response_answers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_response_items: {
        Row: {
          id: string
          lot_id: string
          marca: string | null
          metadata: Json | null
          modelo: string | null
          prazo_dias: number | null
          preco_total: number
          preco_unitario: number
          response_id: string
          tenant_id: string
          validade_dias: number | null
        }
        Insert: {
          id?: string
          lot_id: string
          marca?: string | null
          metadata?: Json | null
          modelo?: string | null
          prazo_dias?: number | null
          preco_total: number
          preco_unitario: number
          response_id: string
          tenant_id?: string
          validade_dias?: number | null
        }
        Update: {
          id?: string
          lot_id?: string
          marca?: string | null
          metadata?: Json | null
          modelo?: string | null
          prazo_dias?: number | null
          preco_total?: number
          preco_unitario?: number
          response_id?: string
          tenant_id?: string
          validade_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_response_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "sourcing_event_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_response_items_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "sourcing_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_response_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sourcing_responses: {
        Row: {
          created_at: string
          event_id: string
          fornecedor_id: string
          id: string
          invitation_id: string
          observacoes: string | null
          ranking: number | null
          submitted_at: string | null
          tenant_id: string
          termos_aceitos: boolean
          total_preco: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          fornecedor_id: string
          id?: string
          invitation_id: string
          observacoes?: string | null
          ranking?: number | null
          submitted_at?: string | null
          tenant_id?: string
          termos_aceitos?: boolean
          total_preco?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          fornecedor_id?: string
          id?: string
          invitation_id?: string
          observacoes?: string | null
          ranking?: number | null
          submitted_at?: string | null
          tenant_id?: string
          termos_aceitos?: boolean
          total_preco?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sourcing_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sourcing_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_responses_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_responses_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "sourcing_responses_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "sourcing_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sourcing_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      spend_forecasts: {
        Row: {
          categoria_id: string | null
          confidence_level: number | null
          created_at: string | null
          estimated_value: number
          forecast_date: string
          id: string
          metadata: Json | null
          organization_id: string | null
          tenant_id: string
        }
        Insert: {
          categoria_id?: string | null
          confidence_level?: number | null
          created_at?: string | null
          estimated_value: number
          forecast_date: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          tenant_id?: string
        }
        Update: {
          categoria_id?: string | null
          confidence_level?: number | null
          created_at?: string | null
          estimated_value?: number
          forecast_date?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spend_forecasts_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_forecasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spend_forecasts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      spot_pedidos: {
        Row: {
          codigo_rastreamento: string | null
          created_at: string
          data_pedido: string | null
          detalhes_url: string | null
          id: string
          itens: Json | null
          last_synced_at: string
          referencia_cliente: string | null
          spot_order_id: string
          status: string
          status_color: string | null
          transportadora: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          codigo_rastreamento?: string | null
          created_at?: string
          data_pedido?: string | null
          detalhes_url?: string | null
          id?: string
          itens?: Json | null
          last_synced_at?: string
          referencia_cliente?: string | null
          spot_order_id: string
          status?: string
          status_color?: string | null
          transportadora?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          codigo_rastreamento?: string | null
          created_at?: string
          data_pedido?: string | null
          detalhes_url?: string | null
          id?: string
          itens?: Json | null
          last_synced_at?: string
          referencia_cliente?: string | null
          spot_order_id?: string
          status?: string
          status_color?: string | null
          transportadora?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: []
      }
      spot_sessions: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean
          last_used_at: string
          metadata: Json | null
          session_cookie: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean
          last_used_at?: string
          metadata?: Json | null
          session_cookie: string
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean
          last_used_at?: string
          metadata?: Json | null
          session_cookie?: string
        }
        Relationships: []
      }
      sso_configurations: {
        Row: {
          created_at: string
          default_role: Database["public"]["Enums"]["app_role"]
          email_domains: string[]
          id: string
          idp_metadata_url: string | null
          is_active: boolean
          protocol: string
          scim_token_hash: string | null
          scim_token_last4: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email_domains: string[]
          id?: string
          idp_metadata_url?: string | null
          is_active?: boolean
          protocol: string
          scim_token_hash?: string | null
          scim_token_last4?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          email_domains?: string[]
          id?: string
          idp_metadata_url?: string | null
          is_active?: boolean
          protocol?: string
          scim_token_hash?: string | null
          scim_token_last4?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_configurations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_bonifications: {
        Row: {
          bonification_type: string
          compliance_rate: number | null
          contract_id: string | null
          created_at: string
          fornecedor_id: string
          granted_by: string | null
          id: string
          is_active: boolean
          on_time_deliveries: number | null
          period_end: string | null
          period_start: string
          reason: string
          tenant_id: string
          total_deliveries: number | null
          updated_at: string
          value_percent: number | null
        }
        Insert: {
          bonification_type?: string
          compliance_rate?: number | null
          contract_id?: string | null
          created_at?: string
          fornecedor_id: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          on_time_deliveries?: number | null
          period_end?: string | null
          period_start?: string
          reason: string
          tenant_id?: string
          total_deliveries?: number | null
          updated_at?: string
          value_percent?: number | null
        }
        Update: {
          bonification_type?: string
          compliance_rate?: number | null
          contract_id?: string | null
          created_at?: string
          fornecedor_id?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          on_time_deliveries?: number | null
          period_end?: string | null
          period_start?: string
          reason?: string
          tenant_id?: string
          total_deliveries?: number | null
          updated_at?: string
          value_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_bonifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bonifications_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_bonifications_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "supplier_bonifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          expiry_date: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          fornecedor_id: string
          id: string
          issue_date: string | null
          rejection_reason: string | null
          requirement_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          fornecedor_id: string
          id?: string
          issue_date?: string | null
          rejection_reason?: string | null
          requirement_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          fornecedor_id?: string
          id?: string
          issue_date?: string | null
          rejection_reason?: string | null
          requirement_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "supplier_documents_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "qualification_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_qualification_scores: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          compliance_score: number
          created_at: string
          document_score: number
          documents_approved: number | null
          documents_expired: number | null
          documents_pending: number | null
          documents_rejected: number | null
          expiry_score: number
          fornecedor_id: string
          id: string
          last_calculated_at: string
          next_expiry_date: string | null
          overall_score: number
          qualification_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          compliance_score?: number
          created_at?: string
          document_score?: number
          documents_approved?: number | null
          documents_expired?: number | null
          documents_pending?: number | null
          documents_rejected?: number | null
          expiry_score?: number
          fornecedor_id: string
          id?: string
          last_calculated_at?: string
          next_expiry_date?: string | null
          overall_score?: number
          qualification_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          compliance_score?: number
          created_at?: string
          document_score?: number
          documents_approved?: number | null
          documents_expired?: number | null
          documents_pending?: number | null
          documents_rejected?: number | null
          expiry_score?: number
          fornecedor_id?: string
          id?: string
          last_calculated_at?: string
          next_expiry_date?: string | null
          overall_score?: number
          qualification_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_qualification_scores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_qualification_scores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: true
            referencedRelation: "supplier_compliance_summary"
            referencedColumns: ["fornecedor_id"]
          },
          {
            foreignKeyName: "supplier_qualification_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          dispatch_error: string | null
          dispatch_status: string | null
          dispatched_at: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          tenant_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          dispatch_error?: string | null
          dispatch_status?: string | null
          dispatched_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          tenant_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          dispatch_error?: string | null
          dispatch_status?: string | null
          dispatched_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      telemetry_logs: {
        Row: {
          client_ip: string | null
          context: Json | null
          created_at: string
          id: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          request_id: string | null
          tenant_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          client_ip?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          request_id?: string | null
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          client_ip?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          request_id?: string | null
          tenant_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          cnpj: string | null
          cor_identificacao: string | null
          created_at: string
          default_currency: string
          default_locale: string
          empresa_codigo: string | null
          endereco_fiscal: Json | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          name: string
          nome_fantasia: string | null
          organization_id: string | null
          plan: string
          razao_social: string | null
          regime_tributario:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          uf: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          cor_identificacao?: string | null
          created_at?: string
          default_currency?: string
          default_locale?: string
          empresa_codigo?: string | null
          endereco_fiscal?: Json | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          name: string
          nome_fantasia?: string | null
          organization_id?: string | null
          plan?: string
          razao_social?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          cor_identificacao?: string | null
          created_at?: string
          default_currency?: string
          default_locale?: string
          empresa_codigo?: string | null
          endereco_fiscal?: Json | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          name?: string
          nome_fantasia?: string | null
          organization_id?: string | null
          plan?: string
          razao_social?: string | null
          regime_tributario?:
            | Database["public"]["Enums"]["regime_tributario"]
            | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_default_currency_fkey"
            columns: ["default_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      unspsc_codes: {
        Row: {
          code: string
          created_at: string
          level: number
          nome: string
          nome_en: string | null
          parent_code: string | null
          tenant_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          level: number
          nome: string
          nome_en?: string | null
          parent_code?: string | null
          tenant_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          level?: number
          nome?: string
          nome_en?: string | null
          parent_code?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unspsc_codes_parent_code_fkey"
            columns: ["parent_code"]
            isOneToOne: false
            referencedRelation: "unspsc_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "unspsc_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_filter_preferences: {
        Row: {
          created_at: string
          filters: Json
          id: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          organization_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          is_default: boolean
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          is_default?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          is_default?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tour_preferences: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          skipped: boolean | null
          skipped_at: string | null
          tour_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          skipped?: boolean | null
          skipped_at?: string | null
          tour_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          skipped?: boolean | null
          skipped_at?: string | null
          tour_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          aaguid: string | null
          counter: number
          created_at: string
          credential_id: string
          credential_name: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aaguid?: string | null
          counter?: number
          created_at?: string
          credential_id: string
          credential_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aaguid?: string | null
          counter?: number
          created_at?: string
          credential_id?: string
          credential_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          request_headers: Json | null
          response_payload: Json | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          request_headers?: Json | null
          response_payload?: Json | null
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          request_headers?: Json | null
          response_payload?: Json | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_approvals: {
        Row: {
          approver_id: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          id: string
          instance_id: string
          node_id: string
          role_required: Database["public"]["Enums"]["app_role"] | null
          status: string
          tenant_id: string
        }
        Insert: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          instance_id: string
          node_id: string
          role_required?: Database["public"]["Enums"]["app_role"] | null
          status?: string
          tenant_id: string
        }
        Update: {
          approver_id?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          instance_id?: string
          node_id?: string
          role_required?: Database["public"]["Enums"]["app_role"] | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_approvals_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approvals_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          instance_id: string | null
          new_state: Json | null
          old_state: Json | null
          task_id: string | null
          tenant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          instance_id?: string | null
          new_state?: Json | null
          old_state?: Json | null
          task_id?: string | null
          tenant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          instance_id?: string | null
          new_state?: Json | null
          old_state?: Json | null
          task_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_audit_log_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_audit_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "workflow_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          condition_expression: string | null
          created_at: string
          id: string
          source_node_id: string
          target_node_id: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          condition_expression?: string | null
          created_at?: string
          id?: string
          source_node_id: string
          target_node_id: string
          template_id: string
          tenant_id: string
        }
        Update: {
          condition_expression?: string | null
          created_at?: string
          id?: string
          source_node_id?: string
          target_node_id?: string
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_edges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_instances: {
        Row: {
          completed_at: string | null
          context: Json
          current_node_id: string | null
          entity_id: string
          entity_type: string
          id: string
          started_at: string
          status: Database["public"]["Enums"]["workflow_status"]
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          current_node_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          current_node_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_current_node_id_fkey"
            columns: ["current_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          instance_id: string
          message: string | null
          node_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          instance_id: string
          message?: string | null
          node_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          instance_id?: string
          message?: string | null
          node_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          config: Json
          created_at: string
          id: string
          label: string
          position_x: number
          position_y: number
          template_id: string
          tenant_id: string
          type: Database["public"]["Enums"]["workflow_node_type"]
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          label: string
          position_x?: number
          position_y?: number
          template_id: string
          tenant_id: string
          type: Database["public"]["Enums"]["workflow_node_type"]
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          label?: string
          position_x?: number
          position_y?: number
          template_id?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["workflow_node_type"]
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_sod_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          incompatible_roles: Database["public"]["Enums"]["app_role"][]
          is_active: boolean
          name: string
          severity: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          incompatible_roles: Database["public"]["Enums"]["app_role"][]
          is_active?: boolean
          name: string
          severity: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          incompatible_roles?: Database["public"]["Enums"]["app_role"][]
          is_active?: boolean
          name?: string
          severity?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_sod_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          assigned_to_role: Database["public"]["Enums"]["app_role"] | null
          assigned_to_user: string | null
          comments: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          instance_id: string
          node_id: string
          outcome: string | null
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          assigned_to_role?: Database["public"]["Enums"]["app_role"] | null
          assigned_to_user?: string | null
          comments?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          instance_id: string
          node_id: string
          outcome?: string | null
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          assigned_to_role?: Database["public"]["Enums"]["app_role"] | null
          assigned_to_user?: string | null
          comments?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          instance_id?: string
          node_id?: string
          outcome?: string | null
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          trigger_type: string
          updated_at: string
          version: number
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          trigger_type: string
          updated_at?: string
          version?: number
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          trigger_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      supplier_compliance_summary: {
        Row: {
          avaliacao: number | null
          avg_quality_score: number | null
          bonus_count: number | null
          fornecedor_id: string | null
          penalty_count: number | null
          razao_social: string | null
          status: string | null
          total_bonus_value: number | null
          total_penalty_value: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _invoke_edge_function: { Args: { _name: string }; Returns: number }
      calculate_supplier_qualification_score: {
        Args: { p_fornecedor_id: string }
        Returns: number
      }
      check_budget_availability: {
        Args: { p_cost_center_id: string; p_valor: number }
        Returns: Json
      }
      check_escalation: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: {
          _endpoint: string
          _identifier: string
          _max_requests?: number
          _window_seconds?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
      check_workflow_sod: {
        Args: {
          p_approver_id: string
          p_entity_id: string
          p_instance_id: string
        }
        Returns: boolean
      }
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: number }
      cleanup_old_integration_outbox: { Args: never; Returns: number }
      cleanup_old_security_logs: { Args: never; Returns: number }
      cleanup_old_system_alerts: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: number }
      clear_login_lockout: { Args: { _email: string }; Returns: undefined }
      count_legacy_storage_urls: {
        Args: never
        Returns: {
          bucket: string
          column_name: string
          legacy_count: number
          migrated_count: number
          table_name: string
          total_with_url: number
        }[]
      }
      cron_watchdog: { Args: never; Returns: undefined }
      current_tenant_id: { Args: never; Returns: string }
      exec_sql: { Args: { sql_query: string }; Returns: Json }
      find_approval_rule: {
        Args: { p_categoria_id?: string; p_valor: number }
        Returns: string
      }
      fx_convert: {
        Args: { _amount: number; _date?: string; _from: string; _to: string }
        Returns: number
      }
      generate_sequential_number: {
        Args: { prefix: string; table_name: string }
        Returns: string
      }
      get_compras_dashboard_metrics: {
        Args: {
          p_category_id?: string
          p_organization_id: string
          p_period?: string
          p_supplier_id?: string
        }
        Returns: Json
      }
      get_cost_center_performance_report:
        | {
            Args: never
            Returns: {
              alerts_count: number
              available_balance: number
              cost_center_code: string
              cost_center_id: string
              cost_center_name: string
              total_budget: number
              total_committed: number
              total_used: number
              usage_percentage: number
            }[]
          }
        | {
            Args: { p_organization_id: string }
            Returns: {
              alerts_count: number
              available_balance: number
              cost_center_code: string
              cost_center_id: string
              cost_center_name: string
              total_budget: number
              total_committed: number
              total_used: number
              usage_percentage: number
            }[]
          }
      get_effective_approver: {
        Args: {
          p_approver_id: string
          p_categoria_id?: string
          p_valor?: number
        }
        Returns: {
          approver_id: string
          delegation_id: string
        }[]
      }
      get_failed_login_count: {
        Args: { _email: string; _minutes?: number }
        Returns: number
      }
      get_fornecedores_kpis: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_my_organization: { Args: never; Returns: string }
      get_pagamentos_kpis: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_pedidos_kpis: { Args: { p_organization_id: string }; Returns: Json }
      get_solicitacoes_kpis: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_user_grupo_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_locked: { Args: { _email: string }; Returns: Json }
      is_ip_blocked: { Args: { _ip_address: string }; Returns: boolean }
      is_ip_whitelisted: { Args: { _ip_address: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_description?: string
          p_entity_id?: string
          p_metadata?: Json
          p_module: string
          p_new_data?: Json
          p_old_data?: Json
        }
        Returns: string
      }
      log_login_attempt: {
        Args: {
          _email: string
          _failure_reason?: string
          _ip_address: string
          _success: boolean
          _user_agent: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          _event_description: string
          _event_type: string
          _ip_address?: string
          _metadata?: Json
          _severity?: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      mask_sensitive_data: { Args: { data: Json }; Returns: Json }
      recalculate_saldo_comprometido: {
        Args: { p_fornecedor_id: string }
        Returns: number
      }
      record_failed_login: { Args: { _email: string }; Returns: Json }
      suggest_unspsc_code: { Args: { item_name: string }; Returns: string }
      tenant_in_my_group: { Args: { _tenant_id: string }; Returns: boolean }
      tenants_in_my_group: { Args: never; Returns: string[] }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coordinator" | "buyer" | "finance" | "viewer"
      audit_action_type:
        | "create"
        | "update"
        | "delete"
        | "view"
        | "export"
        | "login"
        | "logout"
        | "approve"
        | "reject"
        | "cancel"
      audit_entity_type:
        | "solicitacao"
        | "cotacao"
        | "pedido"
        | "pagamento"
        | "fornecedor"
        | "usuario"
        | "configuracao"
        | "relatorio"
      audit_event_type:
        | "create"
        | "update"
        | "delete"
        | "approve"
        | "reject"
        | "auth"
        | "security"
        | "export"
      bid_status: "valid" | "rejected" | "withdrawn" | "winning"
      invitation_status:
        | "pending"
        | "viewed"
        | "declined"
        | "submitted"
        | "expired"
      log_level: "info" | "warn" | "error" | "debug"
      question_type:
        | "text"
        | "number"
        | "single_choice"
        | "multi_choice"
        | "file"
        | "date"
      regime_tributario:
        | "simples_nacional"
        | "lucro_presumido"
        | "lucro_real"
        | "mei"
      saving_type: "negotiated" | "avoidance" | "process" | "specification"
      sourcing_project_status:
        | "backlog"
        | "planning"
        | "execution"
        | "negotiation"
        | "implementation"
        | "completed"
        | "cancelled"
      sourcing_status:
        | "draft"
        | "published"
        | "in_progress"
        | "evaluation"
        | "awarded"
        | "cancelled"
      sourcing_type: "rfi" | "rfp" | "rfq" | "auction"
      status_producao_enum:
        | "pendente"
        | "primeira_peca"
        | "em_producao"
        | "personalizando"
        | "concluido"
      tenant_status: "active" | "suspended" | "trial" | "churned"
      tipo_produto_enum: "importado" | "fabricado" | "personalizado"
      workflow_node_type:
        | "start"
        | "end"
        | "approval"
        | "condition"
        | "action"
        | "delay"
      workflow_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coordinator", "buyer", "finance", "viewer"],
      audit_action_type: [
        "create",
        "update",
        "delete",
        "view",
        "export",
        "login",
        "logout",
        "approve",
        "reject",
        "cancel",
      ],
      audit_entity_type: [
        "solicitacao",
        "cotacao",
        "pedido",
        "pagamento",
        "fornecedor",
        "usuario",
        "configuracao",
        "relatorio",
      ],
      audit_event_type: [
        "create",
        "update",
        "delete",
        "approve",
        "reject",
        "auth",
        "security",
        "export",
      ],
      bid_status: ["valid", "rejected", "withdrawn", "winning"],
      invitation_status: [
        "pending",
        "viewed",
        "declined",
        "submitted",
        "expired",
      ],
      log_level: ["info", "warn", "error", "debug"],
      question_type: [
        "text",
        "number",
        "single_choice",
        "multi_choice",
        "file",
        "date",
      ],
      regime_tributario: [
        "simples_nacional",
        "lucro_presumido",
        "lucro_real",
        "mei",
      ],
      saving_type: ["negotiated", "avoidance", "process", "specification"],
      sourcing_project_status: [
        "backlog",
        "planning",
        "execution",
        "negotiation",
        "implementation",
        "completed",
        "cancelled",
      ],
      sourcing_status: [
        "draft",
        "published",
        "in_progress",
        "evaluation",
        "awarded",
        "cancelled",
      ],
      sourcing_type: ["rfi", "rfp", "rfq", "auction"],
      status_producao_enum: [
        "pendente",
        "primeira_peca",
        "em_producao",
        "personalizando",
        "concluido",
      ],
      tenant_status: ["active", "suspended", "trial", "churned"],
      tipo_produto_enum: ["importado", "fabricado", "personalizado"],
      workflow_node_type: [
        "start",
        "end",
        "approval",
        "condition",
        "action",
        "delay",
      ],
      workflow_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
