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
      contracts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contract_number: string
          contract_type: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          payment_terms: string | null
          renewal_notice_days: number | null
          renewal_type: string | null
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
          contract_number: string
          contract_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          payment_terms?: string | null
          renewal_notice_days?: number | null
          renewal_type?: string | null
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
          contract_number?: string
          contract_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          payment_terms?: string | null
          renewal_notice_days?: number | null
          renewal_type?: string | null
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
            foreignKeyName: "cotacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
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
          nome_fantasia: string | null
          observacoes: string | null
          prazo_medio_entrega: number | null
          razao_social: string
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
          nome_fantasia?: string | null
          observacoes?: string | null
          prazo_medio_entrega?: number | null
          razao_social: string
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
          nome_fantasia?: string | null
          observacoes?: string | null
          prazo_medio_entrega?: number | null
          razao_social?: string
          segmento?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
          website?: string | null
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
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "pedidos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
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
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_challenges: { Args: never; Returns: undefined }
      generate_sequential_number: {
        Args: { prefix: string; table_name: string }
        Returns: string
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
