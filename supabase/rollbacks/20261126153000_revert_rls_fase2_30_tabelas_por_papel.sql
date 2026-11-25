-- rollback: devolve as 30 tabelas da 20261126153000 ao estado anterior (PERMISSIVE FOR ALL).
-- Uso: psql -v ON_ERROR_STOP=1 -f supabase/rollbacks/20261126153000_revert_rls_fase2_30_tabelas_por_papel.sql
-- Efeito: apaga as 3 policies por tabela e recria a unica policy original, com o nome original.
-- ATENCAO: voltar para PERMISSIVE FOR ALL reabre o buraco (qualquer autenticado escreve).

-- sso_configurations
DROP POLICY IF EXISTS tenant_isolation_sso_configurations ON public.sso_configurations;
DROP POLICY IF EXISTS sso_configurations_select_grupo ON public.sso_configurations;
DROP POLICY IF EXISTS sso_configurations_escrita_admin ON public.sso_configurations;
CREATE POLICY "SSO configurations isolated by tenant" ON public.sso_configurations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- scim_provisioning_log
DROP POLICY IF EXISTS tenant_isolation_scim_provisioning_log ON public.scim_provisioning_log;
DROP POLICY IF EXISTS scim_provisioning_log_select_grupo ON public.scim_provisioning_log;
DROP POLICY IF EXISTS scim_provisioning_log_escrita_admin ON public.scim_provisioning_log;
CREATE POLICY "SCIM logs isolated by tenant" ON public.scim_provisioning_log
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_templates
DROP POLICY IF EXISTS tenant_isolation_workflow_templates ON public.workflow_templates;
DROP POLICY IF EXISTS workflow_templates_select_grupo ON public.workflow_templates;
DROP POLICY IF EXISTS workflow_templates_escrita_gestao ON public.workflow_templates;
CREATE POLICY "Tenant isolation for workflow_templates" ON public.workflow_templates
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_sod_rules
DROP POLICY IF EXISTS tenant_isolation_workflow_sod_rules ON public.workflow_sod_rules;
DROP POLICY IF EXISTS workflow_sod_rules_select_grupo ON public.workflow_sod_rules;
DROP POLICY IF EXISTS workflow_sod_rules_escrita_gestao ON public.workflow_sod_rules;
CREATE POLICY "tenant_isolation_workflow_sod_rules" ON public.workflow_sod_rules
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_nodes
DROP POLICY IF EXISTS tenant_isolation_workflow_nodes ON public.workflow_nodes;
DROP POLICY IF EXISTS workflow_nodes_select_grupo ON public.workflow_nodes;
DROP POLICY IF EXISTS workflow_nodes_escrita_gestao ON public.workflow_nodes;
CREATE POLICY "Tenant isolation for workflow_nodes" ON public.workflow_nodes
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_edges
DROP POLICY IF EXISTS tenant_isolation_workflow_edges ON public.workflow_edges;
DROP POLICY IF EXISTS workflow_edges_select_grupo ON public.workflow_edges;
DROP POLICY IF EXISTS workflow_edges_escrita_gestao ON public.workflow_edges;
CREATE POLICY "Tenant isolation for workflow_edges" ON public.workflow_edges
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_instances
DROP POLICY IF EXISTS tenant_isolation_workflow_instances ON public.workflow_instances;
DROP POLICY IF EXISTS workflow_instances_select_grupo ON public.workflow_instances;
DROP POLICY IF EXISTS workflow_instances_escrita_gestao ON public.workflow_instances;
CREATE POLICY "Tenant isolation for workflow_instances" ON public.workflow_instances
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_approvals
DROP POLICY IF EXISTS tenant_isolation_workflow_approvals ON public.workflow_approvals;
DROP POLICY IF EXISTS workflow_approvals_select_grupo ON public.workflow_approvals;
DROP POLICY IF EXISTS workflow_approvals_escrita_gestao ON public.workflow_approvals;
CREATE POLICY "Tenant isolation for workflow_approvals" ON public.workflow_approvals
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_logs
DROP POLICY IF EXISTS tenant_isolation_workflow_logs ON public.workflow_logs;
DROP POLICY IF EXISTS workflow_logs_select_grupo ON public.workflow_logs;
DROP POLICY IF EXISTS workflow_logs_escrita_gestao ON public.workflow_logs;
CREATE POLICY "Tenant isolation for workflow_logs" ON public.workflow_logs
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_tasks
DROP POLICY IF EXISTS tenant_isolation_workflow_tasks ON public.workflow_tasks;
DROP POLICY IF EXISTS workflow_tasks_select_grupo ON public.workflow_tasks;
DROP POLICY IF EXISTS workflow_tasks_escrita_gestao ON public.workflow_tasks;
CREATE POLICY "tenant_isolation_workflow_tasks" ON public.workflow_tasks
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- workflow_audit_log
DROP POLICY IF EXISTS tenant_isolation_workflow_audit_log ON public.workflow_audit_log;
DROP POLICY IF EXISTS workflow_audit_log_select_grupo ON public.workflow_audit_log;
DROP POLICY IF EXISTS workflow_audit_log_escrita_gestao ON public.workflow_audit_log;
CREATE POLICY "tenant_isolation_workflow_audit_log" ON public.workflow_audit_log
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- approval_hierarchy
DROP POLICY IF EXISTS tenant_isolation_approval_hierarchy ON public.approval_hierarchy;
DROP POLICY IF EXISTS approval_hierarchy_select_grupo ON public.approval_hierarchy;
DROP POLICY IF EXISTS approval_hierarchy_escrita_gestao ON public.approval_hierarchy;
CREATE POLICY "tenant_isolation_approval_hierarchy" ON public.approval_hierarchy
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- erp_sync_log
DROP POLICY IF EXISTS tenant_isolation_erp_sync_log ON public.erp_sync_log;
DROP POLICY IF EXISTS erp_sync_log_select_grupo ON public.erp_sync_log;
DROP POLICY IF EXISTS erp_sync_log_escrita_gestao ON public.erp_sync_log;
CREATE POLICY "ERP sync logs are tenant-isolated" ON public.erp_sync_log
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- fornecedor_categorias
DROP POLICY IF EXISTS tenant_isolation_fornecedor_categorias ON public.fornecedor_categorias;
DROP POLICY IF EXISTS fornecedor_categorias_select_grupo ON public.fornecedor_categorias;
DROP POLICY IF EXISTS fornecedor_categorias_escrita_gestao ON public.fornecedor_categorias;
CREATE POLICY "tenant_isolation_fornecedor_categorias" ON public.fornecedor_categorias
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_pipeline
DROP POLICY IF EXISTS tenant_isolation_sourcing_pipeline ON public.sourcing_pipeline;
DROP POLICY IF EXISTS sourcing_pipeline_select_grupo ON public.sourcing_pipeline;
DROP POLICY IF EXISTS sourcing_pipeline_escrita_gestao ON public.sourcing_pipeline;
CREATE POLICY "tenant isolation sourcing_pipeline" ON public.sourcing_pipeline
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- savings_tracker
DROP POLICY IF EXISTS tenant_isolation_savings_tracker ON public.savings_tracker;
DROP POLICY IF EXISTS savings_tracker_select_grupo ON public.savings_tracker;
DROP POLICY IF EXISTS savings_tracker_escrita_gestao ON public.savings_tracker;
CREATE POLICY "tenant_isolation_savings_tracker" ON public.savings_tracker
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_projects
DROP POLICY IF EXISTS tenant_isolation_sourcing_projects ON public.sourcing_projects;
DROP POLICY IF EXISTS sourcing_projects_select_grupo ON public.sourcing_projects;
DROP POLICY IF EXISTS sourcing_projects_escrita_gestao ON public.sourcing_projects;
CREATE POLICY "tenant_isolation_sourcing_projects" ON public.sourcing_projects
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_events
DROP POLICY IF EXISTS tenant_isolation_sourcing_events ON public.sourcing_events;
DROP POLICY IF EXISTS sourcing_events_select_grupo ON public.sourcing_events;
DROP POLICY IF EXISTS sourcing_events_escrita_ordem ON public.sourcing_events;
CREATE POLICY "tenant_isolation_sourcing_events" ON public.sourcing_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_event_criteria
DROP POLICY IF EXISTS tenant_isolation_sourcing_event_criteria ON public.sourcing_event_criteria;
DROP POLICY IF EXISTS sourcing_event_criteria_select_grupo ON public.sourcing_event_criteria;
DROP POLICY IF EXISTS sourcing_event_criteria_escrita_ordem ON public.sourcing_event_criteria;
CREATE POLICY "tenant_isolation_sourcing_event_criteria" ON public.sourcing_event_criteria
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_event_lots
DROP POLICY IF EXISTS tenant_isolation_sourcing_event_lots ON public.sourcing_event_lots;
DROP POLICY IF EXISTS sourcing_event_lots_select_grupo ON public.sourcing_event_lots;
DROP POLICY IF EXISTS sourcing_event_lots_escrita_ordem ON public.sourcing_event_lots;
CREATE POLICY "tenant_isolation_sourcing_event_lots" ON public.sourcing_event_lots
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_event_questions
DROP POLICY IF EXISTS tenant_isolation_sourcing_event_questions ON public.sourcing_event_questions;
DROP POLICY IF EXISTS sourcing_event_questions_select_grupo ON public.sourcing_event_questions;
DROP POLICY IF EXISTS sourcing_event_questions_escrita_ordem ON public.sourcing_event_questions;
CREATE POLICY "tenant_isolation_sourcing_event_questions" ON public.sourcing_event_questions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_invitations
DROP POLICY IF EXISTS tenant_isolation_sourcing_invitations ON public.sourcing_invitations;
DROP POLICY IF EXISTS sourcing_invitations_select_grupo ON public.sourcing_invitations;
DROP POLICY IF EXISTS sourcing_invitations_escrita_ordem ON public.sourcing_invitations;
CREATE POLICY "tenant_isolation_sourcing_invitations" ON public.sourcing_invitations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_responses
DROP POLICY IF EXISTS tenant_isolation_sourcing_responses ON public.sourcing_responses;
DROP POLICY IF EXISTS sourcing_responses_select_grupo ON public.sourcing_responses;
DROP POLICY IF EXISTS sourcing_responses_escrita_ordem ON public.sourcing_responses;
CREATE POLICY "tenant_isolation_sourcing_responses" ON public.sourcing_responses
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_response_items
DROP POLICY IF EXISTS tenant_isolation_sourcing_response_items ON public.sourcing_response_items;
DROP POLICY IF EXISTS sourcing_response_items_select_grupo ON public.sourcing_response_items;
DROP POLICY IF EXISTS sourcing_response_items_escrita_ordem ON public.sourcing_response_items;
CREATE POLICY "tenant_isolation_sourcing_response_items" ON public.sourcing_response_items
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_response_answers
DROP POLICY IF EXISTS tenant_isolation_sourcing_response_answers ON public.sourcing_response_answers;
DROP POLICY IF EXISTS sourcing_response_answers_select_grupo ON public.sourcing_response_answers;
DROP POLICY IF EXISTS sourcing_response_answers_escrita_ordem ON public.sourcing_response_answers;
CREATE POLICY "tenant_isolation_sourcing_response_answers" ON public.sourcing_response_answers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- sourcing_awards
DROP POLICY IF EXISTS tenant_isolation_sourcing_awards ON public.sourcing_awards;
DROP POLICY IF EXISTS sourcing_awards_select_grupo ON public.sourcing_awards;
DROP POLICY IF EXISTS sourcing_awards_escrita_ordem ON public.sourcing_awards;
CREATE POLICY "tenant_isolation_sourcing_awards" ON public.sourcing_awards
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- licitacao_lances
DROP POLICY IF EXISTS tenant_isolation_licitacao_lances ON public.licitacao_lances;
DROP POLICY IF EXISTS licitacao_lances_select_grupo ON public.licitacao_lances;
DROP POLICY IF EXISTS licitacao_lances_escrita_ordem ON public.licitacao_lances;
CREATE POLICY "tenant_isolation_licitacao_lances" ON public.licitacao_lances
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- auction_bids
DROP POLICY IF EXISTS tenant_isolation_auction_bids ON public.auction_bids;
DROP POLICY IF EXISTS auction_bids_select_grupo ON public.auction_bids;
DROP POLICY IF EXISTS auction_bids_escrita_ordem ON public.auction_bids;
CREATE POLICY "tenant_isolation_auction_bids" ON public.auction_bids
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- punchout_sessions
DROP POLICY IF EXISTS tenant_isolation_punchout_sessions ON public.punchout_sessions;
DROP POLICY IF EXISTS punchout_sessions_select_grupo ON public.punchout_sessions;
DROP POLICY IF EXISTS punchout_sessions_escrita_ordem ON public.punchout_sessions;
CREATE POLICY "tenant isolation punchout_sessions" ON public.punchout_sessions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

-- fiscal_events
DROP POLICY IF EXISTS tenant_isolation_fiscal_events ON public.fiscal_events;
DROP POLICY IF EXISTS fiscal_events_select_grupo ON public.fiscal_events;
DROP POLICY IF EXISTS fiscal_events_escrita_ordem ON public.fiscal_events;
CREATE POLICY "fiscal_events tenant isolation" ON public.fiscal_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));
