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
    PostgrestVersion: "14.1"
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
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
          updated_at?: string
          valor_maximo?: number | null
        }
        Relationships: []
      }
      approval_history: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          solicitacao_id: string | null
          step_id: string | null
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
          created_at: string
          created_by: string | null
          descricao: string | null
          escalacao_automatica: boolean
          escalacao_para: string | null
          id: string
          niveis_aprovacao: number
          nome: string
          prioridade: number
          requer_unanimidade: boolean
          tempo_limite_horas: number
          updated_at: string
          valor_max: number
          valor_min: number
        }
        Insert: {
          aprovadores?: Json
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escalacao_automatica?: boolean
          escalacao_para?: string | null
          id?: string
          niveis_aprovacao?: number
          nome: string
          prioridade?: number
          requer_unanimidade?: boolean
          tempo_limite_horas?: number
          updated_at?: string
          valor_max?: number
          valor_min?: number
        }
        Update: {
          aprovadores?: Json
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escalacao_automatica?: boolean
          escalacao_para?: string | null
          id?: string
          niveis_aprovacao?: number
          nome?: string
          prioridade?: number
          requer_unanimidade?: boolean
          tempo_limite_horas?: number
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
          prazo_limite: string | null
          status: string
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
          prazo_limite?: string | null
          status?: string
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
          prazo_limite?: string | null
          status?: string
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
          prazo_limite: string | null
          rule_id: string | null
          solicitacao_id: string | null
          status: string
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
          prazo_limite?: string | null
          rule_id?: string | null
          solicitacao_id?: string | null
          status?: string
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
          prazo_limite?: string | null
          rule_id?: string | null
          solicitacao_id?: string | null
          status?: string
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
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
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
      categorias: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_notes: {
        Row: {
          author_id: string | null
          contact_id: string
          content: string
          created_at: string
          fornecedor_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          contact_id: string
          content: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          contact_id?: string
          content?: string
          created_at?: string
          fornecedor_id?: string | null
          id?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
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
          description: string | null
          end_date: string
          id: string
          min_quality_score: number | null
          min_supplier_score: number | null
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
          description?: string | null
          end_date: string
          id?: string
          min_quality_score?: number | null
          min_supplier_score?: number | null
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
          description?: string | null
          end_date?: string
          id?: string
          min_quality_score?: number | null
          min_supplier_score?: number | null
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
          title?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      cotacoes: {
        Row: {
          anexos: Json | null
          avaliador_id: string | null
          condicao_pagamento: string | null
          created_at: string
          data_avaliacao: string | null
          desconto_percentual: number | null
          fornecedor_id: string | null
          id: string
          numero: string
          observacoes: string | null
          prazo_entrega: number
          quantidade: number
          score_prazo: number | null
          score_preco: number | null
          score_qualidade: number | null
          score_total: number | null
          selecionada: boolean | null
          solicitacao_id: string | null
          status: string
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
          data_avaliacao?: string | null
          desconto_percentual?: number | null
          fornecedor_id?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          prazo_entrega?: number
          quantidade?: number
          score_prazo?: number | null
          score_preco?: number | null
          score_qualidade?: number | null
          score_total?: number | null
          selecionada?: boolean | null
          solicitacao_id?: string | null
          status?: string
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
          data_avaliacao?: string | null
          desconto_percentual?: number | null
          fornecedor_id?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          prazo_entrega?: number
          quantidade?: number
          score_prazo?: number | null
          score_preco?: number | null
          score_qualidade?: number | null
          score_total?: number | null
          selecionada?: boolean | null
          solicitacao_id?: string | null
          status?: string
          updated_at?: string
          validade_proposta?: string | null
          valor_frete?: number | null
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
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
            foreignKeyName: "cotacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
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
            foreignKeyName: "creditos_fornecedor_utilizado_em_pagamento_id_fkey"
            columns: ["utilizado_em_pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_filter_favorites: {
        Row: {
          category_filter: string | null
          created_at: string
          id: string
          is_default: boolean | null
          name: string
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
          period_filter?: string | null
          show_comparison?: boolean | null
          supplier_filter?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      department_budgets: {
        Row: {
          ano: number
          centro_custo: string
          created_at: string
          created_by: string | null
          departamento: string
          id: string
          mes: number | null
          updated_at: string
          valor_comprometido: number
          valor_total: number
          valor_utilizado: number
        }
        Insert: {
          ano?: number
          centro_custo: string
          created_at?: string
          created_by?: string | null
          departamento: string
          id?: string
          mes?: number | null
          updated_at?: string
          valor_comprometido?: number
          valor_total?: number
          valor_utilizado?: number
        }
        Update: {
          ano?: number
          centro_custo?: string
          created_at?: string
          created_by?: string | null
          departamento?: string
          id?: string
          mes?: number | null
          updated_at?: string
          valor_comprometido?: number
          valor_total?: number
          valor_utilizado?: number
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
        ]
      }
      fiscal_documents: {
        Row: {
          chave_acesso: string | null
          created_at: string
          data_emissao: string | null
          fornecedor_id: string | null
          id: string
          numero_nf: string
          pdf_url: string | null
          pedido_id: string | null
          reconciliation_notes: string | null
          reconciliation_status: string | null
          serie: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          valor_desconto: number | null
          valor_frete: number | null
          valor_impostos: number | null
          valor_produtos: number | null
          valor_total: number
          xml_url: string | null
        }
        Insert: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_nf: string
          pdf_url?: string | null
          pedido_id?: string | null
          reconciliation_notes?: string | null
          reconciliation_status?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_impostos?: number | null
          valor_produtos?: number | null
          valor_total?: number
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string | null
          created_at?: string
          data_emissao?: string | null
          fornecedor_id?: string | null
          id?: string
          numero_nf?: string
          pdf_url?: string | null
          pedido_id?: string | null
          reconciliation_notes?: string | null
          reconciliation_status?: string | null
          serie?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          valor_desconto?: number | null
          valor_frete?: number | null
          valor_impostos?: number | null
          valor_produtos?: number | null
          valor_total?: number
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
            foreignKeyName: "fiscal_documents_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
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
          prazo_medio_entrega: number | null
          razao_social: string
          saldo_comprometido: number | null
          segmento: string | null
          status: string
          telefone: string | null
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
          prazo_medio_entrega?: number | null
          razao_social: string
          saldo_comprometido?: number | null
          segmento?: string | null
          status?: string
          telefone?: string | null
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
          prazo_medio_entrega?: number | null
          razao_social?: string
          saldo_comprometido?: number | null
          segmento?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_contracts: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_contracts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          aprovador_id: string | null
          chave_nf: string | null
          comprovante_url: string | null
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
          pedido_id: string | null
          status: string
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          aprovador_id?: string | null
          chave_nf?: string | null
          comprovante_url?: string | null
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
          pedido_id?: string | null
          status?: string
          updated_at?: string
          valor: number
          valor_pago?: number | null
        }
        Update: {
          aprovador_id?: string | null
          chave_nf?: string | null
          comprovante_url?: string | null
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
          pedido_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
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
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pedido_itens: {
        Row: {
          created_at: string
          descricao: string
          id: string
          pedido_id: string | null
          produto_id: string | null
          quantidade: number
          quantidade_recebida: number | null
          unidade: string | null
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          pedido_id?: string | null
          produto_id?: string | null
          quantidade?: number
          quantidade_recebida?: number | null
          unidade?: string | null
          valor_total: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          pedido_id?: string | null
          produto_id?: string | null
          quantidade?: number
          quantidade_recebida?: number | null
          unidade?: string | null
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
          data_emissao: string
          data_entrega: string | null
          data_previsao: string | null
          desconto: number | null
          endereco_entrega: string | null
          fornecedor_id: string
          id: string
          numero: string
          observacoes: string | null
          solicitacao_id: string | null
          status: string
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
          data_emissao?: string
          data_entrega?: string | null
          data_previsao?: string | null
          desconto?: number | null
          endereco_entrega?: string | null
          fornecedor_id: string
          id?: string
          numero: string
          observacoes?: string | null
          solicitacao_id?: string | null
          status?: string
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
          data_emissao?: string
          data_entrega?: string | null
          data_previsao?: string | null
          desconto?: number | null
          endereco_entrega?: string | null
          fornecedor_id?: string
          id?: string
          numero?: string
          observacoes?: string | null
          solicitacao_id?: string | null
          status?: string
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
            foreignKeyName: "pedidos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
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
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          codigo: string
          created_at: string
          descricao: string | null
          estoque_minimo: number | null
          id: string
          nome: string
          preco_medio: number | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          id?: string
          nome: string
          preco_medio?: number | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          id?: string
          nome?: string
          preco_medio?: number | null
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      rate_limit_logs: {
        Row: {
          blocked: boolean
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
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
          prioridade: string
          quantidade: number
          solicitante_id: string | null
          status: string
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
          prioridade?: string
          quantidade?: number
          solicitante_id?: string | null
          status?: string
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
          prioridade?: string
          quantidade?: number
          solicitante_id?: string | null
          status?: string
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
      calculate_supplier_qualification_score: {
        Args: { p_fornecedor_id: string }
        Returns: number
      }
      check_budget_availability: {
        Args: { p_centro_custo: string; p_valor: number }
        Returns: Json
      }
      check_escalation: { Args: never; Returns: undefined }
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      clear_login_lockout: { Args: { _email: string }; Returns: undefined }
      find_approval_rule: {
        Args: { p_categoria_id?: string; p_valor: number }
        Returns: string
      }
      generate_sequential_number: {
        Args: { prefix: string; table_name: string }
        Returns: string
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
      recalculate_saldo_comprometido: {
        Args: { p_fornecedor_id: string }
        Returns: number
      }
      record_failed_login: { Args: { _email: string }; Returns: Json }
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
    },
  },
} as const
