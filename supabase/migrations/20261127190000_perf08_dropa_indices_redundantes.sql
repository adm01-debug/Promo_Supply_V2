-- ============================================================================
-- PERF-08 (etapa 221): remove 24 indices btree que sao prefixo EXATO de outro
-- indice btree NAO parcial da MESMA tabela, e por isso nunca sao escolhidos
-- para nada que o indice maior ja' nao resolva.
--
-- PROVA (estrutural, verificavel no git -- nao depende de stats de producao)
--   Para cada par abaixo vale: (a) os dois indices sao btree, (b) nenhum dos
--   dois e' UNIQUE nem tem clausula WHERE (um indice parcial NAO cobre o
--   prefixo de forma geral -- por isso idx_saved_filters_default, que tem
--   WHERE is_default = true, foi ignorado como cobertura), (c) a lista de
--   colunas do menor e' prefixo literal da lista do maior. Btree com prefixo
--   igualado por = e' percorrivel pelo indice maior na mesma ordem, entao o
--   menor so' ocupa espaco e custa escrita (todo INSERT/UPDATE/DELETE mantem
--   os dois).
--
-- O QUE **NAO** FOI DERRUBADO, DE PROPOSITO
--   - idx_saved_filters_user_entity: o unico indice que poderia cobri-lo
--     (idx_saved_filters_default) e' PARCIAL em is_default = true, ou seja nao
--     serve para "todos os filtros do usuario".
--   - qualquer indice UNIQUE ou parcial UNIQUE (uq_system_alerts_open_scan_sla,
--     unique_entity_version, exchange_rates_..._key, licitacao_propostas_..._key):
--     zero scan em unico significa zero conflito, nao inutilidade.
--   - approval_delegations_no_overlap (gist, impede delegacao sobreposta).
--   - idx_spot_produtos_name (a estrategia de busca do catalogo SPOT ainda vai
--     mudar -- PERF-06).
--   - os outros ~317 indices sem scan: a maioria esta em tabela sem dado, onde
--     zero scan nao prova nada.
--
-- GUARDA DE LOCK
--   DROP INDEX precisa de lock exclusivo na tabela; com lock_timeout curto a
--   transacao aborta em vez de enfileirar escritas atras de uma tabela ocupada.
--   O canal de apply roda tudo em UMA transacao, entao abortar = nada aplicado.
--
-- REVERSAO
--   docs/qa/reversao/20261127190000_perf08_dropa_indices_redundantes_revert.sql
--   (cria os 24 indices de volta, com o mesmo nome e as mesmas colunas; para
--   aplicar pelo canal versionado, copie o arquivo para supabase/migrations/
--   com um timestamp novo e rode o workflow aplicar-migration-prod.yml)
-- ============================================================================

SET LOCAL lock_timeout = '10s';

-- idx_approval_steps_workflow_id (workflow_id) -> coberto por idx_approval_steps_workflow_status_prazo
DROP INDEX IF EXISTS public.idx_approval_steps_workflow_id;

-- idx_approval_workflows_org (organization_id) -> coberto por idx_approval_workflows_org_status
DROP INDEX IF EXISTS public.idx_approval_workflows_org;

-- idx_audit_logs_entity_type (entity_type) -> coberto por idx_audit_logs_entity_type_id
DROP INDEX IF EXISTS public.idx_audit_logs_entity_type;

-- idx_categorias_org (organization_id) -> coberto por idx_categorias_org_ativo_nome
DROP INDEX IF EXISTS public.idx_categorias_org;

-- idx_cotacoes_fornecedor (fornecedor_id) -> coberto por idx_cotacoes_fornecedor_created
DROP INDEX IF EXISTS public.idx_cotacoes_fornecedor;

-- idx_cotacoes_solicitacao (solicitacao_id) -> coberto por idx_cotacoes_solicitacao_fornecedor
DROP INDEX IF EXISTS public.idx_cotacoes_solicitacao;

-- idx_cotacoes_status (status) -> coberto por idx_cotacoes_dashboard
DROP INDEX IF EXISTS public.idx_cotacoes_status;

-- idx_fornecedores_org (organization_id) -> coberto por idx_fornecedores_org_status_razao
DROP INDEX IF EXISTS public.idx_fornecedores_org;

-- idx_pagamentos_org (organization_id) -> coberto por idx_pagamentos_org_status_due
DROP INDEX IF EXISTS public.idx_pagamentos_org;

-- idx_pagamentos_status (status) -> coberto por idx_pagamentos_dashboard
DROP INDEX IF EXISTS public.idx_pagamentos_status;

-- idx_pagamentos_vencimento (data_vencimento) -> coberto por idx_pagamentos_vencimento_status
DROP INDEX IF EXISTS public.idx_pagamentos_vencimento;

-- idx_pedidos_fornecedor (fornecedor_id) -> coberto por idx_pedidos_fornecedor_created
DROP INDEX IF EXISTS public.idx_pedidos_fornecedor;

-- idx_pedidos_organization_id (organization_id) -> coberto por idx_pedidos_org_status_created
DROP INDEX IF EXISTS public.idx_pedidos_organization_id;

-- idx_pedidos_status (status) -> coberto por idx_pedidos_dashboard
DROP INDEX IF EXISTS public.idx_pedidos_status;

-- idx_produtos_org (organization_id) -> coberto por idx_produtos_org_ativo_nome
DROP INDEX IF EXISTS public.idx_produtos_org;

-- idx_rate_limit_logs_ip (ip_address) -> coberto por idx_rate_limit_logs_ident_endpoint_window
DROP INDEX IF EXISTS public.idx_rate_limit_logs_ip;

-- idx_saved_filters_user_id (user_id) -> coberto por idx_saved_filters_user_entity
DROP INDEX IF EXISTS public.idx_saved_filters_user_id;

-- idx_solicitacoes_organization_id (organization_id) -> coberto por idx_solicitacoes_org_status_created
DROP INDEX IF EXISTS public.idx_solicitacoes_organization_id;

-- idx_solicitacoes_status (status) -> coberto por idx_solicitacoes_dashboard
DROP INDEX IF EXISTS public.idx_solicitacoes_status;

-- idx_workflow_approvals_instance_id (instance_id) -> coberto por idx_workflow_approvals_instance_node_approver
DROP INDEX IF EXISTS public.idx_workflow_approvals_instance_id;

-- idx_workflow_edges_source_node_id (source_node_id) -> coberto por idx_workflow_edges_source_target
DROP INDEX IF EXISTS public.idx_workflow_edges_source_node_id;

-- idx_workflow_logs_instance_id (instance_id) -> coberto por idx_workflow_logs_instance_node
DROP INDEX IF EXISTS public.idx_workflow_logs_instance_id;

-- idx_xbz_pedidos_tenant (tenant_id) -> coberto por idx_xbz_pedidos_emissao
DROP INDEX IF EXISTS public.idx_xbz_pedidos_tenant;

-- idx_xbz_produtos_tenant (tenant_id) -> coberto por idx_xbz_produtos_last_synced
DROP INDEX IF EXISTS public.idx_xbz_produtos_tenant;
