-- Function to add tenant_id to a table if it doesn't exist
CREATE OR REPLACE FUNCTION public.add_tenant_id_to_table(p_table_name text)
RETURNS void AS $$
BEGIN
    -- Add column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = p_table_name AND column_name = 'tenant_id'
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) DEFAULT ''00000000-0000-0000-0000-000000000000''', p_table_name);
        EXECUTE format('UPDATE public.%I SET tenant_id = ''00000000-0000-0000-0000-000000000000'' WHERE tenant_id IS NULL', p_table_name);
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', p_table_name);
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', 'idx_' || p_table_name || '_tenant_id', p_table_name);
    END IF;

    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);

    -- Add Policy (Drop old tenant isolation policies if they exist)
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || p_table_name, p_table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', 'tenant_isolation_' || p_table_name, p_table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to Sourcing tables
SELECT add_tenant_id_to_table('sourcing_events');
SELECT add_tenant_id_to_table('sourcing_responses');
SELECT add_tenant_id_to_table('sourcing_invitations');
SELECT add_tenant_id_to_table('auction_bids');
SELECT add_tenant_id_to_table('sourcing_pipeline');
SELECT add_tenant_id_to_table('sourcing_awards');
SELECT add_tenant_id_to_table('sourcing_event_lots');
SELECT add_tenant_id_to_table('sourcing_event_criteria');
SELECT add_tenant_id_to_table('sourcing_event_questions');
SELECT add_tenant_id_to_table('sourcing_response_items');
SELECT add_tenant_id_to_table('sourcing_response_answers');

-- Apply to Contracts tables
SELECT add_tenant_id_to_table('contracts');
SELECT add_tenant_id_to_table('contract_history');
SELECT add_tenant_id_to_table('contract_documents');
SELECT add_tenant_id_to_table('contract_items');
SELECT add_tenant_id_to_table('order_contracts');
SELECT add_tenant_id_to_table('contract_penalties');

-- Apply to Bidding tables
SELECT add_tenant_id_to_table('licitacoes');
SELECT add_tenant_id_to_table('licitacao_propostas');
SELECT add_tenant_id_to_table('licitacao_lances');

-- Apply to Finance/Budget tables
SELECT add_tenant_id_to_table('cost_centers');
SELECT add_tenant_id_to_table('department_budgets');
SELECT add_tenant_id_to_table('budget_transactions');
SELECT add_tenant_id_to_table('payment_history');
SELECT add_tenant_id_to_table('creditos_fornecedor');

-- Apply to Approval tables
SELECT add_tenant_id_to_table('approval_workflows');
SELECT add_tenant_id_to_table('approval_rules');
SELECT add_tenant_id_to_table('approval_steps');
SELECT add_tenant_id_to_table('approval_history');
SELECT add_tenant_id_to_table('approval_hierarchy');
SELECT add_tenant_id_to_table('approval_delegations');

-- Apply to Other tables
SELECT add_tenant_id_to_table('spend_forecasts');
SELECT add_tenant_id_to_table('category_strategies');
SELECT add_tenant_id_to_table('receiving_checklists');
SELECT add_tenant_id_to_table('penalty_escalation_config');
SELECT add_tenant_id_to_table('devolucao_itens');
SELECT add_tenant_id_to_table('devolucoes');
SELECT add_tenant_id_to_table('supplier_bonifications');
SELECT add_tenant_id_to_table('supplier_qualification_scores');
SELECT add_tenant_id_to_table('supplier_documents');
SELECT add_tenant_id_to_table('contact_notes');

-- Cleanup
DROP FUNCTION public.add_tenant_id_to_table(text);
