# Tipos customizados (enums, domains, composites)

| tipo | kind | valores / definição | usado em |
|---|---|---|---|
| public.app_role | enum | admin, coordinator, buyer, finance, viewer | public.role_permissions.role, public.sso_configurations.default_role, public.user_roles.role, public.user_tenants.role, public.workflow_approvals.role_required, public.workflow_tasks.assigned_to_role |
| public.audit_action_type | enum | create, update, delete, view, export, login, logout, approve, reject, cancel | public.audit_logs.action_type |
| public.audit_entity_type | enum | solicitacao, cotacao, pedido, pagamento, fornecedor, usuario, configuracao, relatorio | public.audit_logs.entity_type |
| public.audit_event_type | enum | create, update, delete, approve, reject, auth, security, export |  |
| public.bid_status | enum | valid, rejected, withdrawn, winning | public.auction_bids.status |
| public.invitation_status | enum | pending, viewed, declined, submitted, expired | public.sourcing_invitations.status |
| public.log_level | enum | info, warn, error, debug | public.telemetry_logs.level |
| public.question_type | enum | text, number, single_choice, multi_choice, file, date | public.sourcing_event_questions.type |
| public.regime_tributario | enum | simples_nacional, lucro_presumido, lucro_real, mei | public.aliquotas_tributarias.regime, public.tenants.regime_tributario |
| public.saving_type | enum | negotiated, avoidance, process, specification | public.savings_tracker.type |
| public.sourcing_project_status | enum | backlog, planning, execution, negotiation, implementation, completed, cancelled | public.sourcing_projects.status |
| public.sourcing_status | enum | draft, published, in_progress, evaluation, awarded, cancelled | public.sourcing_events.status |
| public.sourcing_type | enum | rfi, rfp, rfq, auction | public.sourcing_events.type |
| public.status_producao_enum | enum | pendente, primeira_peca, em_producao, personalizando, concluido | public.pedido_itens.status_producao |
| public.tenant_status | enum | active, suspended, trial, churned | public.tenants.status |
| public.tipo_produto_enum | enum | importado, fabricado, personalizado | public.produtos.tipo_produto |
| public.workflow_node_type | enum | start, end, approval, condition, action, delay | public.workflow_nodes.type |
| public.workflow_status | enum | pending, running, completed, failed, cancelled | public.workflow_instances.status |
