-- security(rls): tenant_isolation_* passa de PERMISSIVE para RESTRICTIVE.
--
-- Causa: as policies tenant_isolation_<tabela> (FOR ALL TO authenticated USING tenant_in_my_group(tenant_id))
-- eram PERMISSIVE. O Postgres junta permissivas com OR, entao qualquer usuario logado do tenant, mesmo sem
-- papel em user_roles, passava por elas e as policies por papel (admin/coordinator/buyer/finance) nao
-- restringiam nada. Como RESTRICTIVE, o isolamento de tenant vira um AND obrigatorio e o acesso passa a ser
-- concedido so pelas permissivas por papel/dono que ja existem em cada tabela.
--
-- So entram tabelas em que, para cada operacao que o app usa, ja existe ao menos uma permissiva legitima.
-- Ficaram FORA (continuam PERMISSIVE), motivo detalhado no corpo da PR:
--   * so tem tenant_isolation_* (ficariam sem acesso nenhum): approval_hierarchy, auction_bids,
--     fornecedor_categorias, licitacao_lances, savings_tracker, sourcing_* (12 tabelas), workflow_audit_log,
--     workflow_sod_rules, workflow_tasks e punchout_sessions ("tenant isolation punchout_sessions");
--   * cost_centers (sem permissiva de SELECT/UPDATE/DELETE), notifications (sem permissiva de DELETE),
--     approval_steps (solicitante insere etapas; aprovador le/atualiza as etapas do fluxo inteiro),
--     produtos (tenant_isolation_produtos e FOR SELECT e e a unica leitura do catalogo sem papel),
--     solicitacoes (comprador sem permissiva de UPDATE nem da fila de SELECT; 3 linhas com tenant_id errado).
--
-- Atencao: pedidos, fiscal_documents, licitacoes, pagamentos e category_strategies ainda tem a permissiva
-- "tenant_isolation" (organization_id = get_my_organization()) e department_budgets/categorias/approval_rules/
-- approval_workflows tem "Users can manage their organization ..."; essas continuam liberando o usuario sem
-- papel nessas tabelas ate o dono decidir remove-las.
--
-- Reversao: recriar cada policy abaixo sem "AS RESTRICTIVE".

DROP POLICY IF EXISTS tenant_isolation_active_sessions ON public.active_sessions;
CREATE POLICY tenant_isolation_active_sessions ON public.active_sessions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_approval_delegations ON public.approval_delegations;
CREATE POLICY tenant_isolation_approval_delegations ON public.approval_delegations AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_approval_history ON public.approval_history;
CREATE POLICY tenant_isolation_approval_history ON public.approval_history AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_approval_rules ON public.approval_rules;
CREATE POLICY tenant_isolation_approval_rules ON public.approval_rules AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_approval_workflows ON public.approval_workflows;
CREATE POLICY tenant_isolation_approval_workflows ON public.approval_workflows AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_audit_logs ON public.audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON public.audit_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_budget_transactions ON public.budget_transactions;
CREATE POLICY tenant_isolation_budget_transactions ON public.budget_transactions AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_categorias ON public.categorias;
CREATE POLICY tenant_isolation_categorias ON public.categorias AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_category_strategies ON public.category_strategies;
CREATE POLICY tenant_isolation_category_strategies ON public.category_strategies AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_contact_notes ON public.contact_notes;
CREATE POLICY tenant_isolation_contact_notes ON public.contact_notes AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_contract_documents ON public.contract_documents;
CREATE POLICY tenant_isolation_contract_documents ON public.contract_documents AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_contract_history ON public.contract_history;
CREATE POLICY tenant_isolation_contract_history ON public.contract_history AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_contract_items ON public.contract_items;
CREATE POLICY tenant_isolation_contract_items ON public.contract_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_contract_penalties ON public.contract_penalties;
CREATE POLICY tenant_isolation_contract_penalties ON public.contract_penalties AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_contracts ON public.contracts;
CREATE POLICY tenant_isolation_contracts ON public.contracts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_cotacoes ON public.cotacoes;
CREATE POLICY tenant_isolation_cotacoes ON public.cotacoes AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_creditos_fornecedor ON public.creditos_fornecedor;
CREATE POLICY tenant_isolation_creditos_fornecedor ON public.creditos_fornecedor AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_department_budgets ON public.department_budgets;
CREATE POLICY tenant_isolation_department_budgets ON public.department_budgets AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_devolucao_itens ON public.devolucao_itens;
CREATE POLICY tenant_isolation_devolucao_itens ON public.devolucao_itens AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_devolucoes ON public.devolucoes;
CREATE POLICY tenant_isolation_devolucoes ON public.devolucoes AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_fiscal_documents ON public.fiscal_documents;
CREATE POLICY tenant_isolation_fiscal_documents ON public.fiscal_documents AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_fornecedores ON public.fornecedores;
CREATE POLICY tenant_isolation_fornecedores ON public.fornecedores AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_licitacao_propostas ON public.licitacao_propostas;
CREATE POLICY tenant_isolation_licitacao_propostas ON public.licitacao_propostas AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_licitacoes ON public.licitacoes;
CREATE POLICY tenant_isolation_licitacoes ON public.licitacoes AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_order_contracts ON public.order_contracts;
CREATE POLICY tenant_isolation_order_contracts ON public.order_contracts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_pagamentos ON public.pagamentos;
CREATE POLICY tenant_isolation_pagamentos ON public.pagamentos AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_payment_history ON public.payment_history;
CREATE POLICY tenant_isolation_payment_history ON public.payment_history AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_pedido_itens ON public.pedido_itens;
CREATE POLICY tenant_isolation_pedido_itens ON public.pedido_itens AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_pedidos ON public.pedidos;
CREATE POLICY tenant_isolation_pedidos ON public.pedidos AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_penalty_escalation_config ON public.penalty_escalation_config;
CREATE POLICY tenant_isolation_penalty_escalation_config ON public.penalty_escalation_config AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_receiving_checklists ON public.receiving_checklists;
CREATE POLICY tenant_isolation_receiving_checklists ON public.receiving_checklists AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_spend_forecasts ON public.spend_forecasts;
CREATE POLICY tenant_isolation_spend_forecasts ON public.spend_forecasts AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_supplier_bonifications ON public.supplier_bonifications;
CREATE POLICY tenant_isolation_supplier_bonifications ON public.supplier_bonifications AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_supplier_documents ON public.supplier_documents;
CREATE POLICY tenant_isolation_supplier_documents ON public.supplier_documents AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS tenant_isolation_supplier_qualification_scores ON public.supplier_qualification_scores;
CREATE POLICY tenant_isolation_supplier_qualification_scores ON public.supplier_qualification_scores AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id)) WITH CHECK (public.tenant_in_my_group(tenant_id));
