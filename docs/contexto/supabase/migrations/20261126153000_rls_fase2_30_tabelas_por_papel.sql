-- security(rls): fase 2 do isolamento por tenant -- as 30 tabelas que so' tinham PERMISSIVE FOR ALL
-- (etapa 004 / achado RLS-01, parte 2 -- parte 1 = 20261126140000).
--
-- Causa (mesma da 20261112170347 e da 20261126140000): `tenant_in_my_group(tenant_id)` como
-- PERMISSIVE FOR ALL e' autorizacao total de CRUD para QUALQUER usuario autenticado -- inclusive
-- `viewer` e usuario sem papel em user_roles --, porque policies PERMISSIVE do mesmo comando somam
-- por OR. Medido no snapshot real de producao (docs/contexto/supabase/snapshot.json, branch
-- `contexto`): as 30 tabelas abaixo tem rls_enabled = true e EXATAMENTE 1 policy,
-- `cmd=ALL, permissive=PERMISSIVE, roles={authenticated}, using=with_check=tenant_in_my_group(tenant_id)`.
--
-- Desenho (tres policies por tabela, na ordem em que a RLS as avalia):
--   1. tenant_isolation_<t>  RESTRICTIVE FOR ALL   -- o tenant passa a ser AND obrigatorio em
--      SELECT/INSERT/UPDATE/DELETE. E' a policy que fecha o buraco; nao concede nada sozinha.
--   2. <t>_select_grupo      PERMISSIVE  FOR SELECT -- preserva EXATAMENTE a leitura de hoje:
--      qualquer autenticado do grupo le (o viewer continua lendo, sem regressao).
--   3. <t>_escrita_<papel>   PERMISSIVE  FOR ALL    -- quem pode escrever, por papel, medido no
--      codigo (arquivo:linha em cada bloco). Sem esta policy a tabela perderia a escrita do
--      front; sem a RESTRICTIVE ela continua aberta para qualquer autenticado.
--
-- Nenhuma escrita de edge function depende destas policies: workflow-engine, punchout-setup,
-- punchout-receive, erp-sync, scim-v2 e fiscal-orchestrator usam SUPABASE_SERVICE_ROLE_KEY,
-- que nao passa por RLS. Funcoes SECURITY DEFINER do banco (ex.: update_licitacao_best_bid,
-- fill_tenant_id_from_profile, update_updated_at_column) tambem nao sao afetadas.
--
-- Reversao: supabase/rollbacks/20261126153000_revert_rls_fase2_30_tabelas_por_papel.sql
-- (nao e' aplicada automaticamente; devolve as 30 policies como estavam, PERMISSIVE FOR ALL).
--
-- Aplicar so' depois da revisao: e' DDL em producao (regra 8 do fluxo). Verificacao pos-aplicacao
-- no fim do arquivo.

-- ============================================================================
-- 2. workflow, alcadas e integracao (admin + coordinator)
-- ============================================================================

-- 2.1 workflow_templates -- escrita: admin e coordinator
--     src/pages/admin/WorkflowAdmin.tsx:95-96 (update/insert, rota /admin/workflows).
DROP POLICY IF EXISTS "Tenant isolation for workflow_templates" ON public.workflow_templates

DROP POLICY IF EXISTS tenant_isolation_workflow_templates ON public.workflow_templates

CREATE POLICY tenant_isolation_workflow_templates ON public.workflow_templates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_templates_select_grupo ON public.workflow_templates

CREATE POLICY workflow_templates_select_grupo ON public.workflow_templates
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_templates_escrita_gestao ON public.workflow_templates

CREATE POLICY workflow_templates_escrita_gestao ON public.workflow_templates
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.2 workflow_sod_rules -- escrita: admin e coordinator
--     src/pages/admin/WorkflowAdmin.tsx:120-121 (update/insert).
DROP POLICY IF EXISTS "tenant_isolation_workflow_sod_rules" ON public.workflow_sod_rules

DROP POLICY IF EXISTS tenant_isolation_workflow_sod_rules ON public.workflow_sod_rules

CREATE POLICY tenant_isolation_workflow_sod_rules ON public.workflow_sod_rules
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_sod_rules_select_grupo ON public.workflow_sod_rules

CREATE POLICY workflow_sod_rules_select_grupo ON public.workflow_sod_rules
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_sod_rules_escrita_gestao ON public.workflow_sod_rules

CREATE POLICY workflow_sod_rules_escrita_gestao ON public.workflow_sod_rules
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.3 workflow_nodes -- escrita: admin e coordinator
--     escrita pela edge workflow-engine (service_role); tela de leitura /admin/workflows.
DROP POLICY IF EXISTS "Tenant isolation for workflow_nodes" ON public.workflow_nodes

DROP POLICY IF EXISTS tenant_isolation_workflow_nodes ON public.workflow_nodes

CREATE POLICY tenant_isolation_workflow_nodes ON public.workflow_nodes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_nodes_select_grupo ON public.workflow_nodes

CREATE POLICY workflow_nodes_select_grupo ON public.workflow_nodes
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_nodes_escrita_gestao ON public.workflow_nodes

CREATE POLICY workflow_nodes_escrita_gestao ON public.workflow_nodes
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.4 workflow_edges -- escrita: admin e coordinator
--     escrita pela edge workflow-engine (service_role); tela de leitura /admin/workflows.
DROP POLICY IF EXISTS "Tenant isolation for workflow_edges" ON public.workflow_edges

DROP POLICY IF EXISTS tenant_isolation_workflow_edges ON public.workflow_edges

CREATE POLICY tenant_isolation_workflow_edges ON public.workflow_edges
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_edges_select_grupo ON public.workflow_edges

CREATE POLICY workflow_edges_select_grupo ON public.workflow_edges
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_edges_escrita_gestao ON public.workflow_edges

CREATE POLICY workflow_edges_escrita_gestao ON public.workflow_edges
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.5 workflow_instances -- escrita: admin e coordinator
--     escrita pela edge workflow-engine (service_role); tela de leitura /admin/workflows.
DROP POLICY IF EXISTS "Tenant isolation for workflow_instances" ON public.workflow_instances

DROP POLICY IF EXISTS tenant_isolation_workflow_instances ON public.workflow_instances

CREATE POLICY tenant_isolation_workflow_instances ON public.workflow_instances
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_instances_select_grupo ON public.workflow_instances

CREATE POLICY workflow_instances_select_grupo ON public.workflow_instances
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_instances_escrita_gestao ON public.workflow_instances

CREATE POLICY workflow_instances_escrita_gestao ON public.workflow_instances
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.6 workflow_approvals -- escrita: admin e coordinator
--     escrita pela edge workflow-engine (service_role); tela de leitura /admin/workflows.
DROP POLICY IF EXISTS "Tenant isolation for workflow_approvals" ON public.workflow_approvals

DROP POLICY IF EXISTS tenant_isolation_workflow_approvals ON public.workflow_approvals

CREATE POLICY tenant_isolation_workflow_approvals ON public.workflow_approvals
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_approvals_select_grupo ON public.workflow_approvals

CREATE POLICY workflow_approvals_select_grupo ON public.workflow_approvals
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_approvals_escrita_gestao ON public.workflow_approvals

CREATE POLICY workflow_approvals_escrita_gestao ON public.workflow_approvals
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.7 workflow_logs -- escrita: admin e coordinator
--     escrita pela edge workflow-engine (service_role); tela de leitura /admin/workflows.
DROP POLICY IF EXISTS "Tenant isolation for workflow_logs" ON public.workflow_logs

DROP POLICY IF EXISTS tenant_isolation_workflow_logs ON public.workflow_logs

CREATE POLICY tenant_isolation_workflow_logs ON public.workflow_logs
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_logs_select_grupo ON public.workflow_logs

CREATE POLICY workflow_logs_select_grupo ON public.workflow_logs
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_logs_escrita_gestao ON public.workflow_logs

CREATE POLICY workflow_logs_escrita_gestao ON public.workflow_logs
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.8 workflow_tasks -- escrita: admin e coordinator
--     nenhum call site (medido); escrita prevista pela edge workflow-engine.
DROP POLICY IF EXISTS "tenant_isolation_workflow_tasks" ON public.workflow_tasks

DROP POLICY IF EXISTS tenant_isolation_workflow_tasks ON public.workflow_tasks

CREATE POLICY tenant_isolation_workflow_tasks ON public.workflow_tasks
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_tasks_select_grupo ON public.workflow_tasks

CREATE POLICY workflow_tasks_select_grupo ON public.workflow_tasks
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_tasks_escrita_gestao ON public.workflow_tasks

CREATE POLICY workflow_tasks_escrita_gestao ON public.workflow_tasks
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.9 workflow_audit_log -- escrita: admin e coordinator
--     nenhum call site (medido); trilha de auditoria gravada por rotina/service_role.
DROP POLICY IF EXISTS "tenant_isolation_workflow_audit_log" ON public.workflow_audit_log

DROP POLICY IF EXISTS tenant_isolation_workflow_audit_log ON public.workflow_audit_log

CREATE POLICY tenant_isolation_workflow_audit_log ON public.workflow_audit_log
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_audit_log_select_grupo ON public.workflow_audit_log

CREATE POLICY workflow_audit_log_select_grupo ON public.workflow_audit_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS workflow_audit_log_escrita_gestao ON public.workflow_audit_log

CREATE POLICY workflow_audit_log_escrita_gestao ON public.workflow_audit_log
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.10 approval_hierarchy -- escrita: admin e coordinator
--     nenhum call site (medido); as funcoes de alcada SECURITY DEFINER continuam passando por cima da RLS.
DROP POLICY IF EXISTS "tenant_isolation_approval_hierarchy" ON public.approval_hierarchy

DROP POLICY IF EXISTS tenant_isolation_approval_hierarchy ON public.approval_hierarchy

CREATE POLICY tenant_isolation_approval_hierarchy ON public.approval_hierarchy
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS approval_hierarchy_select_grupo ON public.approval_hierarchy

CREATE POLICY approval_hierarchy_select_grupo ON public.approval_hierarchy
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS approval_hierarchy_escrita_gestao ON public.approval_hierarchy

CREATE POLICY approval_hierarchy_escrita_gestao ON public.approval_hierarchy
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.11 erp_sync_log -- escrita: admin e coordinator
--     escrita pela edge erp-sync (service_role); leitura em /admin.
DROP POLICY IF EXISTS "ERP sync logs are tenant-isolated" ON public.erp_sync_log

DROP POLICY IF EXISTS tenant_isolation_erp_sync_log ON public.erp_sync_log

CREATE POLICY tenant_isolation_erp_sync_log ON public.erp_sync_log
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS erp_sync_log_select_grupo ON public.erp_sync_log

CREATE POLICY erp_sync_log_select_grupo ON public.erp_sync_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS erp_sync_log_escrita_gestao ON public.erp_sync_log

CREATE POLICY erp_sync_log_escrita_gestao ON public.erp_sync_log
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.12 fornecedor_categorias -- escrita: admin e coordinator
--     nenhum call site (medido); cadastro de configuracao lido nas telas de compras.
DROP POLICY IF EXISTS "tenant_isolation_fornecedor_categorias" ON public.fornecedor_categorias

DROP POLICY IF EXISTS tenant_isolation_fornecedor_categorias ON public.fornecedor_categorias

CREATE POLICY tenant_isolation_fornecedor_categorias ON public.fornecedor_categorias
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS fornecedor_categorias_select_grupo ON public.fornecedor_categorias

CREATE POLICY fornecedor_categorias_select_grupo ON public.fornecedor_categorias
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS fornecedor_categorias_escrita_gestao ON public.fornecedor_categorias

CREATE POLICY fornecedor_categorias_escrita_gestao ON public.fornecedor_categorias
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.13 sourcing_pipeline -- escrita: admin e coordinator
--     nenhum call site (medido); lido em /admin/sourcing-pipeline.
DROP POLICY IF EXISTS "tenant isolation sourcing_pipeline" ON public.sourcing_pipeline

DROP POLICY IF EXISTS tenant_isolation_sourcing_pipeline ON public.sourcing_pipeline

CREATE POLICY tenant_isolation_sourcing_pipeline ON public.sourcing_pipeline
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_pipeline_select_grupo ON public.sourcing_pipeline

CREATE POLICY sourcing_pipeline_select_grupo ON public.sourcing_pipeline
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_pipeline_escrita_gestao ON public.sourcing_pipeline

CREATE POLICY sourcing_pipeline_escrita_gestao ON public.sourcing_pipeline
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.14 savings_tracker -- escrita: admin e coordinator
--     nenhum call site (medido); metricas de economia exibidas em /admin/sourcing-pipeline.
DROP POLICY IF EXISTS "tenant_isolation_savings_tracker" ON public.savings_tracker

DROP POLICY IF EXISTS tenant_isolation_savings_tracker ON public.savings_tracker

CREATE POLICY tenant_isolation_savings_tracker ON public.savings_tracker
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS savings_tracker_select_grupo ON public.savings_tracker

CREATE POLICY savings_tracker_select_grupo ON public.savings_tracker
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS savings_tracker_escrita_gestao ON public.savings_tracker

CREATE POLICY savings_tracker_escrita_gestao ON public.savings_tracker
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- 2.15 sourcing_projects -- escrita: admin e coordinator
--     nenhum call site (medido); lido em /admin/sourcing-pipeline.
DROP POLICY IF EXISTS "tenant_isolation_sourcing_projects" ON public.sourcing_projects

DROP POLICY IF EXISTS tenant_isolation_sourcing_projects ON public.sourcing_projects

CREATE POLICY tenant_isolation_sourcing_projects ON public.sourcing_projects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_projects_select_grupo ON public.sourcing_projects

CREATE POLICY sourcing_projects_select_grupo ON public.sourcing_projects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_projects_escrita_gestao ON public.sourcing_projects

CREATE POLICY sourcing_projects_escrita_gestao ON public.sourcing_projects
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role)))

-- ============================================================================
-- 1. administracao (admin)
-- ============================================================================

-- 1.1 sso_configurations -- escrita: so' admin
--     src/pages/admin/SSOConfig.tsx:107 upsert (rota /admin/sso, requiredRole="admin");
--     a edge scim-v2 le/escreve com service_role (nao passa por RLS).
DROP POLICY IF EXISTS "SSO configurations isolated by tenant" ON public.sso_configurations

DROP POLICY IF EXISTS tenant_isolation_sso_configurations ON public.sso_configurations

CREATE POLICY tenant_isolation_sso_configurations ON public.sso_configurations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sso_configurations_select_grupo ON public.sso_configurations

CREATE POLICY sso_configurations_select_grupo ON public.sso_configurations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sso_configurations_escrita_admin ON public.sso_configurations

CREATE POLICY sso_configurations_escrita_admin ON public.sso_configurations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role)))

-- 1.2 scim_provisioning_log -- escrita: so' admin
--     nenhum call site em src/, supabase/functions/ nem tests-e2e/ (medido);
--     escreve a edge scim-v2 com service_role.
DROP POLICY IF EXISTS "SCIM logs isolated by tenant" ON public.scim_provisioning_log

DROP POLICY IF EXISTS tenant_isolation_scim_provisioning_log ON public.scim_provisioning_log

CREATE POLICY tenant_isolation_scim_provisioning_log ON public.scim_provisioning_log
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS scim_provisioning_log_select_grupo ON public.scim_provisioning_log

CREATE POLICY scim_provisioning_log_select_grupo ON public.scim_provisioning_log
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS scim_provisioning_log_escrita_admin ON public.scim_provisioning_log

CREATE POLICY scim_provisioning_log_escrita_admin ON public.scim_provisioning_log
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role)))

-- ============================================================================
-- 3. sourcing, licitacao e compras (admin + coordinator + buyer + finance)
-- ============================================================================

-- 3.1 sourcing_events -- escrita: admin, coordinator, buyer e finance
--     src/hooks/useLicitacoes.ts:214 insert (rotas /sourcing* = ROLES_ORDEM).
DROP POLICY IF EXISTS "tenant_isolation_sourcing_events" ON public.sourcing_events

DROP POLICY IF EXISTS tenant_isolation_sourcing_events ON public.sourcing_events

CREATE POLICY tenant_isolation_sourcing_events ON public.sourcing_events
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_events_select_grupo ON public.sourcing_events

CREATE POLICY sourcing_events_select_grupo ON public.sourcing_events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_events_escrita_ordem ON public.sourcing_events

CREATE POLICY sourcing_events_escrita_ordem ON public.sourcing_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.2 sourcing_event_criteria -- escrita: admin, coordinator, buyer e finance
--     src/hooks/useLicitacoes.ts:251 (leitura); escrita pela tela de RFx (ROLES_ORDEM).
DROP POLICY IF EXISTS "tenant_isolation_sourcing_event_criteria" ON public.sourcing_event_criteria

DROP POLICY IF EXISTS tenant_isolation_sourcing_event_criteria ON public.sourcing_event_criteria

CREATE POLICY tenant_isolation_sourcing_event_criteria ON public.sourcing_event_criteria
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_event_criteria_select_grupo ON public.sourcing_event_criteria

CREATE POLICY sourcing_event_criteria_select_grupo ON public.sourcing_event_criteria
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_event_criteria_escrita_ordem ON public.sourcing_event_criteria

CREATE POLICY sourcing_event_criteria_escrita_ordem ON public.sourcing_event_criteria
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.3 sourcing_event_lots -- escrita: admin, coordinator, buyer e finance
--     src/hooks/useLicitacoes.ts:249 (leitura); escrita pela tela de RFx (ROLES_ORDEM).
DROP POLICY IF EXISTS "tenant_isolation_sourcing_event_lots" ON public.sourcing_event_lots

DROP POLICY IF EXISTS tenant_isolation_sourcing_event_lots ON public.sourcing_event_lots

CREATE POLICY tenant_isolation_sourcing_event_lots ON public.sourcing_event_lots
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_event_lots_select_grupo ON public.sourcing_event_lots

CREATE POLICY sourcing_event_lots_select_grupo ON public.sourcing_event_lots
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_event_lots_escrita_ordem ON public.sourcing_event_lots

CREATE POLICY sourcing_event_lots_escrita_ordem ON public.sourcing_event_lots
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.4 sourcing_event_questions -- escrita: admin, coordinator, buyer e finance
--     src/hooks/useLicitacoes.ts:250 (leitura); perguntas/esclarecimentos do evento.
DROP POLICY IF EXISTS "tenant_isolation_sourcing_event_questions" ON public.sourcing_event_questions

DROP POLICY IF EXISTS tenant_isolation_sourcing_event_questions ON public.sourcing_event_questions

CREATE POLICY tenant_isolation_sourcing_event_questions ON public.sourcing_event_questions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_event_questions_select_grupo ON public.sourcing_event_questions

CREATE POLICY sourcing_event_questions_select_grupo ON public.sourcing_event_questions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_event_questions_escrita_ordem ON public.sourcing_event_questions

CREATE POLICY sourcing_event_questions_escrita_ordem ON public.sourcing_event_questions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.5 sourcing_invitations -- escrita: admin, coordinator, buyer e finance
--     src/hooks/useLicitacoes.ts:252 (leitura); convites de fornecedor (ROLES_ORDEM).
DROP POLICY IF EXISTS "tenant_isolation_sourcing_invitations" ON public.sourcing_invitations

DROP POLICY IF EXISTS tenant_isolation_sourcing_invitations ON public.sourcing_invitations

CREATE POLICY tenant_isolation_sourcing_invitations ON public.sourcing_invitations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_invitations_select_grupo ON public.sourcing_invitations

CREATE POLICY sourcing_invitations_select_grupo ON public.sourcing_invitations
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_invitations_escrita_ordem ON public.sourcing_invitations

CREATE POLICY sourcing_invitations_escrita_ordem ON public.sourcing_invitations
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.6 sourcing_responses -- escrita: admin, coordinator, buyer e finance
--     nenhum call site de escrita (medido); resposta de fornecedor no fluxo de RFx.
DROP POLICY IF EXISTS "tenant_isolation_sourcing_responses" ON public.sourcing_responses

DROP POLICY IF EXISTS tenant_isolation_sourcing_responses ON public.sourcing_responses

CREATE POLICY tenant_isolation_sourcing_responses ON public.sourcing_responses
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_responses_select_grupo ON public.sourcing_responses

CREATE POLICY sourcing_responses_select_grupo ON public.sourcing_responses
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_responses_escrita_ordem ON public.sourcing_responses

CREATE POLICY sourcing_responses_escrita_ordem ON public.sourcing_responses
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.7 sourcing_response_items -- escrita: admin, coordinator, buyer e finance
--     nenhum call site de escrita (medido); itens da resposta de fornecedor.
DROP POLICY IF EXISTS "tenant_isolation_sourcing_response_items" ON public.sourcing_response_items

DROP POLICY IF EXISTS tenant_isolation_sourcing_response_items ON public.sourcing_response_items

CREATE POLICY tenant_isolation_sourcing_response_items ON public.sourcing_response_items
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_response_items_select_grupo ON public.sourcing_response_items

CREATE POLICY sourcing_response_items_select_grupo ON public.sourcing_response_items
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_response_items_escrita_ordem ON public.sourcing_response_items

CREATE POLICY sourcing_response_items_escrita_ordem ON public.sourcing_response_items
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.8 sourcing_response_answers -- escrita: admin, coordinator, buyer e finance
--     nenhum call site de escrita (medido); respostas item a item.
DROP POLICY IF EXISTS "tenant_isolation_sourcing_response_answers" ON public.sourcing_response_answers

DROP POLICY IF EXISTS tenant_isolation_sourcing_response_answers ON public.sourcing_response_answers

CREATE POLICY tenant_isolation_sourcing_response_answers ON public.sourcing_response_answers
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_response_answers_select_grupo ON public.sourcing_response_answers

CREATE POLICY sourcing_response_answers_select_grupo ON public.sourcing_response_answers
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_response_answers_escrita_ordem ON public.sourcing_response_answers

CREATE POLICY sourcing_response_answers_escrita_ordem ON public.sourcing_response_answers
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.9 sourcing_awards -- escrita: admin, coordinator, buyer e finance
--     nenhum call site de escrita (medido); adjudicacao do evento.
DROP POLICY IF EXISTS "tenant_isolation_sourcing_awards" ON public.sourcing_awards

DROP POLICY IF EXISTS tenant_isolation_sourcing_awards ON public.sourcing_awards

CREATE POLICY tenant_isolation_sourcing_awards ON public.sourcing_awards
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_awards_select_grupo ON public.sourcing_awards

CREATE POLICY sourcing_awards_select_grupo ON public.sourcing_awards
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS sourcing_awards_escrita_ordem ON public.sourcing_awards

CREATE POLICY sourcing_awards_escrita_ordem ON public.sourcing_awards
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.10 licitacao_lances -- escrita: admin, coordinator, buyer e finance
--     src/hooks/useLicitacoes.ts:320 insert; trigger update_licitacao_best_bid (SECURITY DEFINER) atualiza best bid.
DROP POLICY IF EXISTS "tenant_isolation_licitacao_lances" ON public.licitacao_lances

DROP POLICY IF EXISTS tenant_isolation_licitacao_lances ON public.licitacao_lances

CREATE POLICY tenant_isolation_licitacao_lances ON public.licitacao_lances
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS licitacao_lances_select_grupo ON public.licitacao_lances

CREATE POLICY licitacao_lances_select_grupo ON public.licitacao_lances
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS licitacao_lances_escrita_ordem ON public.licitacao_lances

CREATE POLICY licitacao_lances_escrita_ordem ON public.licitacao_lances
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.11 auction_bids -- escrita: admin, coordinator, buyer e finance
--     nenhum call site de escrita (medido); lances do leilao reverso (/sourcing/:id/auction = ROLES_ORDEM).
DROP POLICY IF EXISTS "tenant_isolation_auction_bids" ON public.auction_bids

DROP POLICY IF EXISTS tenant_isolation_auction_bids ON public.auction_bids

CREATE POLICY tenant_isolation_auction_bids ON public.auction_bids
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS auction_bids_select_grupo ON public.auction_bids

CREATE POLICY auction_bids_select_grupo ON public.auction_bids
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS auction_bids_escrita_ordem ON public.auction_bids

CREATE POLICY auction_bids_escrita_ordem ON public.auction_bids
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.12 punchout_sessions -- escrita: admin, coordinator, buyer e finance
--     supabase/functions/punchout-setup/index.ts:98 (supabaseAdmin) e punchout-receive (service_role);
--     a sessao e' aberta a partir da tela de compras (ROLES_ORDEM).
DROP POLICY IF EXISTS "tenant isolation punchout_sessions" ON public.punchout_sessions

DROP POLICY IF EXISTS tenant_isolation_punchout_sessions ON public.punchout_sessions

CREATE POLICY tenant_isolation_punchout_sessions ON public.punchout_sessions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS punchout_sessions_select_grupo ON public.punchout_sessions

CREATE POLICY punchout_sessions_select_grupo ON public.punchout_sessions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS punchout_sessions_escrita_ordem ON public.punchout_sessions

CREATE POLICY punchout_sessions_escrita_ordem ON public.punchout_sessions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- 3.13 fiscal_events -- escrita: admin, coordinator, buyer e finance
--     supabase/functions/fiscal-orchestrator/index.ts:119/149 (supabaseAdmin, nao passa por RLS).
DROP POLICY IF EXISTS "fiscal_events tenant isolation" ON public.fiscal_events

DROP POLICY IF EXISTS tenant_isolation_fiscal_events ON public.fiscal_events

CREATE POLICY tenant_isolation_fiscal_events ON public.fiscal_events
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS fiscal_events_select_grupo ON public.fiscal_events

CREATE POLICY fiscal_events_select_grupo ON public.fiscal_events
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id))

DROP POLICY IF EXISTS fiscal_events_escrita_ordem ON public.fiscal_events

CREATE POLICY fiscal_events_escrita_ordem ON public.fiscal_events
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))
  WITH CHECK (public.tenant_in_my_group(tenant_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'coordinator'::public.app_role) OR public.has_role(auth.uid(), 'buyer'::public.app_role) OR public.has_role(auth.uid(), 'finance'::public.app_role)))

-- ============================================================================
-- Conferencia pos-aplicacao (esperado: 90 linhas, 30 RESTRICTIVE + 60 PERMISSIVE)
-- ============================================================================
-- SELECT c.relname AS tabela,
--        count(*) FILTER (WHERE p.polpermissive IS FALSE) AS restrictive,
--        count(*) FILTER (WHERE p.polpermissive IS TRUE)  AS permissive,
--        count(*) AS total
--   FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
--  WHERE c.relname IN ('workflow_sod_rules','workflow_templates','workflow_nodes','workflow_edges',
--        'workflow_instances','workflow_approvals','workflow_logs','workflow_tasks','workflow_audit_log',
--        'sso_configurations','licitacao_lances','approval_hierarchy','auction_bids','savings_tracker',
--        'sourcing_events','sourcing_event_criteria','sourcing_event_lots','sourcing_event_questions',
--        'sourcing_invitations','sourcing_projects','sourcing_responses','sourcing_response_items',
--        'sourcing_response_answers','sourcing_awards','sourcing_pipeline','punchout_sessions',
--        'scim_provisioning_log','erp_sync_log','fiscal_events','fornecedor_categorias')
--  GROUP BY c.relname ORDER BY c.relname;
