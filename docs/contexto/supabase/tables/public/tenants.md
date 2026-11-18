# public.tenants

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `slug` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `cnpj` | `text` | sim |  |  |  |
| 5 | `status` | `tenant_status` | não | `'trial'::tenant_status` |  |  |
| 6 | `plan` | `text` | não | `'starter'::text` |  |  |
| 7 | `settings` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `default_currency` | `character(3)` | não | `'BRL'::bpchar` |  |  |
| 11 | `default_locale` | `text` | não | `'pt-BR'::text` |  |  |
| 12 | `organization_id` | `uuid` | sim |  |  |  |
| 13 | `regime_tributario` | `regime_tributario` | sim |  |  |  |
| 14 | `inscricao_estadual` | `text` | sim |  |  |  |
| 15 | `inscricao_municipal` | `text` | sim |  |  |  |
| 16 | `razao_social` | `text` | sim |  |  |  |
| 17 | `nome_fantasia` | `text` | sim |  |  |  |
| 18 | `uf` | `text` | sim |  |  |  |
| 19 | `endereco_fiscal` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 20 | `cor_identificacao` | `text` | sim | `'#6366f1'::text` |  |  |
| 21 | `empresa_codigo` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| tenants_cnpj_valid | CHECK | `CHECK (cnpj IS NULL OR is_valid_cnpj(cnpj)) NOT VALID` |  |  | não |
| tenants_default_currency_fkey | FOREIGN KEY | `FOREIGN KEY (default_currency) REFERENCES currencies(code)` | NO ACTION | NO ACTION | sim |
| tenants_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| tenants_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| tenants_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.active_sessions | active_sessions_tenant_id_fkey | tenant_id | NO ACTION |
| public.approval_delegations | approval_delegations_tenant_id_fkey | tenant_id | NO ACTION |
| public.approval_hierarchy | approval_hierarchy_tenant_id_fkey | tenant_id | NO ACTION |
| public.approval_history | approval_history_tenant_id_fkey | tenant_id | NO ACTION |
| public.approval_rules | approval_rules_tenant_id_fkey | tenant_id | NO ACTION |
| public.approval_steps | approval_steps_tenant_id_fkey | tenant_id | NO ACTION |
| public.approval_workflows | approval_workflows_tenant_id_fkey | tenant_id | NO ACTION |
| public.auction_bids | auction_bids_tenant_id_fkey | tenant_id | NO ACTION |
| public.audit_logs | audit_logs_tenant_id_fkey | tenant_id | NO ACTION |
| public.audit_logs_202605 | audit_logs_tenant_id_fkey | tenant_id | NO ACTION |
| public.audit_logs_202606 | audit_logs_tenant_id_fkey | tenant_id | NO ACTION |
| public.audit_logs_202607 | audit_logs_tenant_id_fkey | tenant_id | NO ACTION |
| public.audit_logs_202608 | audit_logs_tenant_id_fkey | tenant_id | NO ACTION |
| public.audit_logs_202609 | audit_logs_tenant_id_fkey | tenant_id | NO ACTION |
| public.budget_transactions | budget_transactions_tenant_id_fkey | tenant_id | NO ACTION |
| public.categorias | categorias_tenant_id_fkey | tenant_id | NO ACTION |
| public.category_strategies | category_strategies_tenant_id_fkey | tenant_id | NO ACTION |
| public.contact_notes | contact_notes_tenant_id_fkey | tenant_id | NO ACTION |
| public.contract_documents | contract_documents_tenant_id_fkey | tenant_id | NO ACTION |
| public.contract_history | contract_history_tenant_id_fkey | tenant_id | NO ACTION |
| public.contract_items | contract_items_tenant_id_fkey | tenant_id | NO ACTION |
| public.contract_penalties | contract_penalties_tenant_id_fkey | tenant_id | NO ACTION |
| public.contracts | contracts_tenant_id_fkey | tenant_id | NO ACTION |
| public.cost_centers | cost_centers_tenant_id_fkey | tenant_id | NO ACTION |
| public.cotacoes | cotacoes_tenant_id_fkey | tenant_id | NO ACTION |
| public.creditos_fornecedor | creditos_fornecedor_tenant_id_fkey | tenant_id | NO ACTION |
| public.department_budgets | department_budgets_tenant_id_fkey | tenant_id | NO ACTION |
| public.devolucao_itens | devolucao_itens_tenant_id_fkey | tenant_id | NO ACTION |
| public.devolucoes | devolucoes_tenant_id_fkey | tenant_id | NO ACTION |
| public.erp_connections | erp_connections_tenant_id_fkey | tenant_id | CASCADE |
| public.erp_sync_log | erp_sync_log_tenant_id_fkey | tenant_id | CASCADE |
| public.fiscal_documents | fiscal_documents_tenant_id_fkey | tenant_id | NO ACTION |
| public.fiscal_events | fiscal_events_tenant_id_fkey | tenant_id | NO ACTION |
| public.fornecedores | fornecedores_tenant_id_fkey | tenant_id | NO ACTION |
| public.licitacao_lances | licitacao_lances_tenant_id_fkey | tenant_id | NO ACTION |
| public.licitacao_propostas | licitacao_propostas_tenant_id_fkey | tenant_id | NO ACTION |
| public.licitacoes | licitacoes_tenant_id_fkey | tenant_id | NO ACTION |
| public.notifications | notifications_tenant_id_fkey | tenant_id | NO ACTION |
| public.order_contracts | order_contracts_tenant_id_fkey | tenant_id | NO ACTION |
| public.pagamentos | pagamentos_tenant_id_fkey | tenant_id | NO ACTION |
| public.payment_history | payment_history_tenant_id_fkey | tenant_id | NO ACTION |
| public.pedido_itens | pedido_itens_tenant_id_fkey | tenant_id | NO ACTION |
| public.pedidos | pedidos_tenant_id_fkey | tenant_id | NO ACTION |
| public.penalty_escalation_config | penalty_escalation_config_tenant_id_fkey | tenant_id | NO ACTION |
| public.produtos | produtos_tenant_id_fkey | tenant_id | NO ACTION |
| public.profiles | profiles_empresa_default_id_fkey | empresa_default_id | SET NULL |
| public.profiles | profiles_tenant_id_fkey | tenant_id | NO ACTION |
| public.punchout_catalogs | punchout_catalogs_tenant_id_fkey | tenant_id | CASCADE |
| public.punchout_sessions | punchout_sessions_tenant_id_fkey | tenant_id | CASCADE |
| public.receiving_checklists | receiving_checklists_tenant_id_fkey | tenant_id | NO ACTION |
| public.repurchase_suggestions | repurchase_suggestions_tenant_id_fkey | tenant_id | NO ACTION |
| public.savings_tracker | savings_tracker_tenant_id_fkey | tenant_id | NO ACTION |
| public.scim_provisioning_log | scim_provisioning_log_tenant_id_fkey | tenant_id | CASCADE |
| public.solicitacoes | solicitacoes_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_awards | sourcing_awards_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_event_criteria | sourcing_event_criteria_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_event_lots | sourcing_event_lots_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_event_questions | sourcing_event_questions_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_events | sourcing_events_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_invitations | sourcing_invitations_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_pipeline | sourcing_pipeline_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_projects | sourcing_projects_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_response_answers | sourcing_response_answers_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_response_items | sourcing_response_items_tenant_id_fkey | tenant_id | NO ACTION |
| public.sourcing_responses | sourcing_responses_tenant_id_fkey | tenant_id | NO ACTION |
| public.spend_forecasts | spend_forecasts_tenant_id_fkey | tenant_id | NO ACTION |
| public.sso_configurations | sso_configurations_tenant_id_fkey | tenant_id | CASCADE |
| public.supplier_bonifications | supplier_bonifications_tenant_id_fkey | tenant_id | NO ACTION |
| public.supplier_documents | supplier_documents_tenant_id_fkey | tenant_id | NO ACTION |
| public.supplier_qualification_scores | supplier_qualification_scores_tenant_id_fkey | tenant_id | NO ACTION |
| public.unspsc_codes | unspsc_codes_tenant_id_fkey | tenant_id | NO ACTION |
| public.user_tenants | user_tenants_tenant_id_fkey | tenant_id | CASCADE |
| public.workflow_approvals | workflow_approvals_tenant_id_fkey | tenant_id | NO ACTION |
| public.workflow_audit_log | workflow_audit_log_tenant_id_fkey | tenant_id | CASCADE |
| public.workflow_edges | workflow_edges_tenant_id_fkey | tenant_id | NO ACTION |
| public.workflow_instances | workflow_instances_tenant_id_fkey | tenant_id | NO ACTION |
| public.workflow_logs | workflow_logs_tenant_id_fkey | tenant_id | NO ACTION |
| public.workflow_nodes | workflow_nodes_tenant_id_fkey | tenant_id | NO ACTION |
| public.workflow_sod_rules | workflow_sod_rules_tenant_id_fkey | tenant_id | CASCADE |
| public.workflow_tasks | workflow_tasks_tenant_id_fkey | tenant_id | CASCADE |
| public.workflow_templates | workflow_templates_tenant_id_fkey | tenant_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_tenants_default_currency | btree | default_currency | não | sim |  | `CREATE INDEX idx_tenants_default_currency ON public.tenants USING btree (default_currency)` |
| idx_tenants_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_tenants_organization_id ON public.tenants USING btree (organization_id)` |
| idx_tenants_regime | btree | regime_tributario | não | sim |  | `CREATE INDEX idx_tenants_regime ON public.tenants USING btree (regime_tributario)` |
| idx_tenants_status | btree | status | não | sim | `(status = 'active'::tenant_status)` | `CREATE INDEX idx_tenants_status ON public.tenants USING btree (status) WHERE (status = 'active'::tenant_status)` |
| tenants_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id)` |
| tenants_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug)` |
| uq_tenants_cnpj | btree | cnpj | sim | sim | `(cnpj IS NOT NULL)` | `CREATE UNIQUE INDEX uq_tenants_cnpj ON public.tenants USING btree (cnpj) WHERE (cnpj IS NOT NULL)` |


## Policies (RLS)

### `tenants visible to members`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_tenant(auth.uid(), id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_grant_tenant_access | AFTER | INSERT OR UPDATE | ROW | enabled | public.grant_tenant_access_on_insert |
| trg_normalize_cnpj | BEFORE | INSERT OR UPDATE | ROW | enabled | public.normalize_cnpj_digits |
| update_tenants_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
