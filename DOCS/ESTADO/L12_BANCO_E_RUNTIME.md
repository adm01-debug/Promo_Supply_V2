# L12 — Banco de Dados e Runtime (VERIFICADO em produção)

> **Status de verificação:** `VERIFICADO` — executado contra o banco de produção via MCP `SUPABASE - PROMO SUPPLY`, em **somente leitura**. Zero DDL, zero DML, zero migration, zero deploy.
> **Data da medição:** 2026-08-16.

---

## Panorama medido

| Métrica | Valor medido |
|---|---|
| Tamanho do banco | 37 MB |
| Tabelas em `public` | **162** |
| Views em `public` | **2** (`v_system_health_overview` + 1) |
| Materialized views | 1 |
| Funções em `public` | **356** |
| Triggers em `public` (não-internos) | **96** |
| Policies RLS (total do banco) | **324** |
| Extensões instaladas | 7 |
| Usuários em `auth.users` | **11** |
| **Buckets de Storage** | **0** |
| **Objetos em Storage** | **0** |
| Cron jobs ativos | 11 |

> Nota sobre "3.791 funções": o `db_overview` conta todos os schemas, incluindo extensões. O número relevante para o sistema é **356 funções em `public`**.

---

## 🔴 ACHADO 1 — O ambiente NÃO é reconstruível a partir do repositório

Este é o achado mais grave da auditoria inteira.

### 1a. Não existe rastreio de migrations aplicadas

A tabela `supabase_migrations.schema_migrations` **não existe** neste projeto. Há **279 arquivos de migration** versionados em `supabase/migrations/` e **zero** registro de quais foram aplicadas.

Consequência: é impossível saber, por meio do banco, o que já rodou. Não há como reproduzir o ambiente nem validar um deploy.

### 1b. Seis tabelas de negócio existem em produção e NÃO são criadas por nenhuma migration

Verificado duas vezes: por diff de conjuntos e, depois, individualmente por tabela.

| Tabela em produção | Linhas reais | Migrations que a **mencionam** | Migrations que a **criam** |
|---|---|---|---|
| `supplier_documents` | 111 | 8 | **0** |
| `supplier_qualification_scores` | 10 | 5 | **0** |
| `qualification_history` | 31 | 4 | **0** |
| `qualification_requirements` | 15 | 2 | **0** |
| `geo_access_logs` | 0 | 4 | **0** |
| `blocked_countries` | 0 | 2 | **0** |

Comando de verificação usado por tabela:
`grep -rhiE "create table (if not exists )?(public\.)?\"?<tabela>\b" supabase/migrations/` → **0 ocorrências** em todas as seis.

As migrations *aplicam policies e índices* sobre tabelas que elas próprias nunca criam. Um `supabase db reset` a partir do repo falha ou gera banco quebrado.

### 1c. Cinco tabelas são criadas por migrations e NÃO existem em produção

`cron_heartbeats` · `entity_versions` · `historico_compras` · `password_reset_tokens` · `saved_filters`

Para todas as cinco, o `CREATE TABLE` **existe** no repo (verificado individualmente) e a tabela **não existe** no banco. Ou as migrations nunca foram aplicadas, ou as tabelas foram removidas fora do versionamento.

> **Errata do próprio autor:** meu diff automático também acusou `for`, `public` e `to` como "tabelas ausentes". São **falsos-positivos do meu regex**, não achados. Registrado aqui para que ninguém aja sobre eles.

### 1d. Drift adicional aceitável (não é defeito)

11 partições (`audit_logs_2026xx`, `telemetry_logs_2026xx`) existem no banco sem `CREATE TABLE` no repo. Isso é **esperado**: partições são criadas dinamicamente. Não conta como drift problemático.

---

## 🔴 ACHADO 2 — Nenhum job agendado invoca edge function. A automação agendada não roda.

Os 11 cron jobs foram lidos com `select jobname, command from cron.job`. **Todos os 11 são housekeeping** — `DELETE`, `ANALYZE`, `pg_stat_statements_reset()`. **Nenhum** faz `net.http_post` nem invoca edge function.

| Job | Comando (resumo) | Execuções | Falhas | Última execução |
|---|---|---|---|---|
| `cleanup-health-scan-runs` | `DELETE FROM health_scan_runs` | 14 | 0 | 2026-08-16 02:00 |
| `cleanup-system-alerts` | `DELETE FROM system_alerts` | 14 | 0 | 2026-08-16 02:10 |
| `cleanup-telemetry-logs` | `DELETE FROM telemetry_logs` | 14 | 0 | 2026-08-16 02:20 |
| `cleanup-deadlock-snapshots` | `DELETE FROM deadlock_snapshots` | 14 | 0 | 2026-08-16 02:30 |
| `cleanup-rate-limit-logs` | `DELETE FROM rate_limit_logs` | 342 | 0 | 2026-08-16 18:45 |
| `cleanup-geo-access-logs` | `DELETE FROM geo_access_logs` | 14 | 0 | 2026-08-16 03:00 |
| `cleanup-query-telemetry` | `DELETE FROM query_telemetry` | 14 | 0 | 2026-08-16 03:10 |
| `weekly-vacuum-analyze` | `ANALYZE ...` | 2 | 0 | 2026-08-16 04:00 |
| `reset-pg-stat-statements` | `pg_stat_statements_reset()` | 2 | 0 | 2026-08-10 05:00 |
| `cleanup-checkpoint-snapshots` | `DELETE FROM checkpoint_snapshots` | 2 | 0 | 2026-08-16 03:30 |
| `cleanup-wal-rate-snapshots` | `DELETE FROM wal_rate_snapshots` | 2 | 0 | 2026-08-16 03:00 |

**Veredito:** a manutenção de banco 🟢 funciona bem (0 falhas em 434 execuções). Mas toda edge function cujo propósito é rodar em horário — `check-sla-alerts`, `check-expiry-alerts`, `check-approval-escalations`, `check-cotacao-followup`, `weekly-report`, `weekly-summary-report`, `process-outbox`, `alert-dispatcher`, `maintain-partitions` — **não tem agendador em produção**. Só rodam se alguém chamar na mão.

Este é o padrão clássico de *feature que falha sem erro visível*: ninguém abre chamado porque nada quebra na tela.

---

## 🔴 ACHADO 3 — Storage vazio, com 111 documentos referenciando arquivos inexistentes

- `storage.buckets` = **0**
- `storage.objects` = **0**
- `public.supplier_documents` = **111 linhas**, com `file_url` no formato `certs/Grafica/Alvara.pdf`, `certs/Renner/ContratoSocial.pdf`, `certs/Bematech/AtestadoFinanceiro.pdf`…

Não existe bucket algum onde esses caminhos possam resolver. Toda funcionalidade de upload, download ou visualização de documento de fornecedor está **quebrada por ausência de infraestrutura**, e os 111 registros são **dado semeado (fictício)**.

Isso também rebaixa `generate-contract-pdf` e `migrate-storage-paths`: sem bucket, não há onde gravar.

---

## 🟨 ACHADO 4 — Seis tabelas `v_*` são lixo acidental em produção

`v_kpis`, `v_trends`, `v_pipeline`, `v_cotacao_status`, `v_top_categories`, `v_urgent_items` **não são views** — são **tabelas** (`relkind = 'r'`), cada uma com 0 ou 1 linha, e a coluna se chama literalmente `jsonb_build_object` / `jsonb_agg`. Essa assinatura é de `CREATE TABLE x AS SELECT jsonb_build_object(...)`.

Conteúdo medido de `v_trends`: meses `Mar` a `Aug` com `pedidos: 0, cotacoes: 0, economia: 0` — resultado congelado no instante da criação.

Todas as seis têm **RLS habilitado e ZERO policies** — as únicas seis tabelas do banco nessa condição. Com RLS ligado e nenhuma policy, a leitura é negada a todos os papéis não-privilegiados.

### Correção a uma conclusão precipitada (registrada de propósito)

Minha primeira leitura foi que *"o dashboard lê KPIs congelados em zero"*. **Isso está errado e teria levado a um diagnóstico grave equivocado.** A verificação independente mostrou:

1. A migration `20260519114020_...sql` define uma **RPC real e funcional**, `get_compras_dashboard_metrics`, que calcula de `solicitacoes`/`pedidos`. Os nomes `v_kpis`, `v_trends` etc. ali são **variáveis locais plpgsql**, não tabelas.
2. O front consome a RPC, não as tabelas: `src/hooks/useDashboardKPIs.ts:75` e `src/lib/supabaseRpc.ts:127`.
3. `grep` por `from('v_kpis'` e congêneres em `src/` e `supabase/functions/` retorna **nenhum consumidor** das seis tabelas.

**Classificação correta:** as seis tabelas são **⬛ lixo de banco** — provavelmente criadas por alguém executando trechos do corpo da função como `CREATE TABLE AS`. Não afetam funcionalidade. São problema de **higiene e de superfície de segurança**, não de dado falso no dashboard.

A única view `v_*` legítima é `v_system_health_overview`, que **é view de verdade e tem consumidor**: `src/pages/admin/HealthDashboard.tsx:148` e `supabase/functions/health-dashboard/index.ts:96`.

---

## ACHADO 5 — 99 das 162 tabelas (61%) estão completamente vazias

Contagem exata via `query_to_xml` (não estimativa de `reltuples`).

### Tabelas COM dados (63 de 162 = 39%)

| Tabela | Linhas | Tabela | Linhas |
|---|---|---|---|
| `telemetry_logs` | 9.310 | `licitacao_propostas` | 13 |
| `system_alerts` | 6.348 | `produtos` | 12 |
| `telemetry_logs_legacy_20260712` | 567 | `profiles` | 11 |
| `telemetry_logs_202605` | 560 | `solicitacoes` | **11** |
| `wal_rate_snapshots` | 289 | `fiscal_events` | 10 |
| `checkpoint_snapshots` | 288 | `fornecedores` | **10** |
| `temp_file_snapshots` | 145 | `supplier_qualification_scores` | 10 |
| `security_definer_baseline` | 117 | `categorias` | 9 |
| `supplier_documents` | 111 | `workflow_templates` | 8 |
| `estoque_movimentacoes` | 72 | `cost_centers` | 7 |
| `cotacoes` | **61** | `licitacoes` | 7 |
| `telemetry_logs_202607` | 50 | `pedido_itens` | **7** |
| `login_attempts` | 46 | `workflow_sod_rules` | 7 |
| `pedidos` | **34** | `sourcing_event_lots` | 6 |
| `budget_audit_logs` | 32 | `sourcing_events` | 6 |
| `department_budgets` | 32 | `contracts` | 5 |
| `qualification_history` | 31 | `savings_tracker` | 5 |
| `sourcing_invitations` | 30 | `sourcing_projects` | 5 |
| `estoque` | 24 | `account_lockouts` | 4 |
| `unspsc_codes` | 23 | `punchout_catalogs` | 4 |
| `fiscal_documents` | 20 | `user_roles` | 4 |
| `sourcing_event_criteria` | 18 | `user_tenants` | 4 |
| `licitacao_lances` | 17 | `currencies` | 3 |
| `qualification_requirements` | 15 | `devolucoes` | 3 |
| `audit_logs` | 14 | `notification_preferences` | 3 |
| | | `pagamentos` | 3 |

Demais com 1–2 linhas: `fornecedor_categorias`, `user_tour_preferences`, `blocked_ips`, `creditos_fornecedor`, `organizations`, `tenants`, `user_filter_preferences`, e as 5 tabelas-lixo `v_*`.

### Leitura honesta desses números

**73% do volume do banco é telemetria e alerta do próprio sistema** (`telemetry_logs` 9.310 + `system_alerts` 6.348 = 15.658 de ~18.500 linhas totais). O dado de negócio real é minúsculo: **11 solicitações, 61 cotações, 34 pedidos, 7 itens de pedido, 3 pagamentos, 3 devoluções, 10 fornecedores, 12 produtos**.

Isso caracteriza um sistema em **estágio de piloto/demonstração**, não em operação. Note a incoerência interna: 34 pedidos mas apenas **7 itens de pedido** — a maioria dos pedidos não tem item, o que indica dado semeado em vez de fluxo real percorrido.

### Módulos inteiros com 100% das tabelas vazias — features dormentes

| Módulo | Tabelas vazias | Veredito |
|---|---|---|
| **Aprovações** | `approval_workflows`, `approval_rules`, `approval_steps`, `approval_history`, `approval_hierarchy`, `approval_delegations` (6/6) | Nunca aprovou nada |
| **Workflow engine** | `workflow_instances`, `workflow_tasks`, `workflow_nodes`, `workflow_edges`, `workflow_approvals`, `workflow_logs`, `workflow_audit_log` (7/7) | Motor nunca executou |
| **XBZ (integração)** | `xbz_produtos`, `xbz_pedidos`, `xbz_cores`, `xbz_credentials`, `xbz_carrinho_log`, `xbz_produto_fiscal`, `xbz_pedido_status_history` (7/7) | **Sem credencial cadastrada** → integração nunca conectou |
| **SPOT (integração)** | `spot_produtos`, `spot_estoque`, `spot_pedidos`, `spot_skus`, `spot_sessions`, `spot_customization_options`, `spot_api_sync_log` (7/7) | Idem, nunca sincronizou |
| **ERP** | `erp_connections`, `erp_field_mappings`, `erp_sync_log` (3/3) | Nenhuma conexão configurada |
| **Contratos** | `contract_items`, `contract_documents`, `contract_history`, `contract_penalties`, `order_contracts` (5/6 — só `contracts` tem 5) | Cabeçalho sem corpo |
| **Notificações / Push** | `notifications`, `push_subscriptions`, `alert_subscriptions` (3/3) | Nunca notificou ninguém |
| **Segurança avançada** | `webauthn_credentials`, `webauthn_challenges`, `mfa_settings`, `sso_configurations`, `scim_provisioning_log`, `ip_whitelist`, `geo_settings` (7/7) | Nenhum usuário usa 2FA/WebAuthn/SSO |
| **Fila / Outbox** | `integration_outbox`, `webhook_events` (2/2) | Nenhuma mensagem jamais enfileirada |
| **IA / Previsão** | `negotiation_analyses`, `spend_forecasts`, `repurchase_suggestions`, `category_strategies` (4/4) | Nenhuma análise persistida |
| **RBAC granular** | `permissions`, `role_permissions` (2/2) — mas `user_roles` tem 4 | Papéis existem; permissões finas, não |
| **Recebimento** | `receiving_checklists` (1/1) | Nunca recebeu com checklist |
| **Financeiro** | `payment_history`, `budget_transactions`, `financial_audit_logs` (3/3) | Sem histórico |

**Regra de ouro aplicada:** *pronto = em produção com uso real*. Toda feature acima, por mais completo que esteja seu código, é no máximo **🟨 IMPLEMENTADO_PARCIAL** — nunca ✅.

---

## 🔴 ACHADO 6 — Cinco triggers DUPLICADOS: a mesma função dispara duas vezes no mesmo evento

Descoberto durante a verificação independente (Fase D), não reportado por nenhum lote de código — só é visível no banco vivo.

| Tabela | Função disparada | Triggers duplicados | Evento |
|---|---|---|---|
| `solicitacoes` | `auto_approve_low_value_solicitacao` | `auto_approve_low_value` + `trg_auto_approve_low_value` | **BEFORE INSERT** |
| `solicitacoes` | `validate_solicitacao_status_transition` | `validate_solicitacao_status` + `trg_validate_solicitacao_status` | BEFORE UPDATE |
| `solicitacoes` | `update_updated_at_column` | `update_solicitacoes_updated_at` + `trg_update_solicitacoes_updated_at` | BEFORE UPDATE |
| `supplier_documents` | `trigger_recalculate_qualification_score` | `recalculate_qualification_on_document_change` + `trg_recalculate_qualification_score` | AFTER INSERT/UPDATE |
| `tenants` | `update_updated_at_column` | `update_tenants_updated_at` + `tr_tenants_updated_at` | BEFORE UPDATE |

**Gravidade por caso.** Três são inofensivos: `update_updated_at_column` e a validação de transição são idempotentes — rodar duas vezes dá o mesmo resultado.

Os outros dois **não são idempotentes** e merecem investigação:
- **`auto_approve_low_value_solicitacao` roda duas vezes em cada INSERT de solicitação.** É lógica de *aprovação automática por valor baixo*. Executar duas vezes pode duplicar efeitos colaterais (registro de histórico, notificação, movimentação de orçamento), dependendo do corpo da função.
- **`trigger_recalculate_qualification_score` roda duas vezes** a cada mudança em documento de fornecedor, recalculando score de qualificação em duplicidade. Note que as janelas de evento **divergem**: uma versão cobre `INSERT/DELETE/UPDATE`, a outra só `INSERT/UPDATE` — ou seja, no `DELETE` dispara uma vez e nas demais duas.

**Causa provável:** convenção de nomenclatura mudou (`nome_x` → `trg_nome_x`) e a migration nova criou o trigger renomeado **sem** dropar o antigo. Coerente com os 277 `DROP POLICY` observados no L13: o repositório reescreve objetos repetidamente e nem sempre limpa o anterior.

**Não verifiquei o corpo dessas funções** — dizer se a dupla execução causa dano real exige lê-las, e a correção exige DDL em produção, que está fora dos guard-rails desta auditoria. Fica como **decisão do dono**.

---

## ACHADO 7 — Nada propaga aprovação de workflow para a solicitação (confirmado no banco)

Verificação independente de um achado grave reportado pelo lote de páginas do fluxo de compras.

O relato era: `src/hooks/useApprovalWorkflow.ts` grava em `approval_workflows`, `approval_steps` e `approval_history`, mas nunca atualiza `solicitacoes` — logo, aprovar não desbloqueia nada.

**Minha refinação do achado.** O arquivo *toca* `solicitacoes` em `useApprovalWorkflow.ts:95`, mas é um **`.select()`** — lê a solicitação para descobrir o gestor do centro de custo. Não há `.update()`. O relato do lote estava substantivamente correto, e eu registro a precisão para quem for corrigir.

**A pergunta decisiva era outra: existe trigger de banco fazendo a propagação?** Se existisse, o achado se inverteria. Medi:

- `approval_workflows` → **1 trigger apenas**: `update_approval_workflows_updated_at` (só carimba `updated_at`).
- `approval_steps` → **ZERO triggers.**

**Confirmado nos dois lados, código e banco: aprovar um workflow não muda o status da solicitação.** A solicitação permanece `pendente` para sempre.

Contraste instrutivo: `cotacoes` **tem** a automação certa — `trg_cotacao_approved_status` e `trg_auto_transition_on_cotacao_approval` promovem a solicitação quando uma cotação é aprovada. Mas essa automação nunca dispara pela interface, porque a função que marcaria a cotação como aprovada (`selectCotacao`) **não tem chamador** — confirmado por mim com `grep -rn "selectCotacao" src/`, que retorna apenas a definição (`src/features/cotacoes/hooks/useCotacoes.ts:144`) e o export (`:208`).

O banco está mais pronto que a aplicação: a automação existe e está correta, e a UI nunca a aciona.

---

## ACHADO 8 — Cobertura de RLS

- **324 policies** distribuídas em 156 das 162 tabelas.
- **Todas as 162 tabelas têm RLS habilitado.**
- As **únicas 6 sem policy** são exatamente as tabelas-lixo `v_*` (Achado 4) — sem policy, o acesso é negado, o que é o comportamento seguro.

**Veredito: a postura de RLS é sólida.** Não há tabela de negócio exposta sem policy. Este é um ponto genuinamente bom do sistema e deve ser dito como tal.

Ressalva: **não testei se as policies estão corretas** — só que existem. Verificar a lógica de cada uma das 324 exigiria testes com múltiplos usuários autenticados, o que está fora do escopo desta auditoria e é justamente o que os testes de `tests-rls/` deveriam cobrir (ver L11).

---

## O que NÃO foi verificado nesta dimensão

| Item | Motivo | Marca |
|---|---|---|
| Logs de invocação de edge functions | Sem acesso à Management API de logs | `NAO_VERIFICADO` |
| Corretude lógica das 324 policies | Exige sessão multi-usuário autenticada | `NAO_VERIFICADO` |
| Corretude das 356 funções `public` | Exige execução; auditoria é somente leitura | `NAO_VERIFICADO` |
| Se as APIs externas (XBZ, SPOT, ERP) respondem | Tabelas vazias provam ausência de sincronização, não indisponibilidade da API | Parcial |
| Backups e PITR | Não expostos por SQL | `NAO_VERIFICADO` |
| Qual dos 3 projetos Supabase divergentes é o de produção real | Medi **um** projeto (o do MCP), cujas tabelas batem com o domínio do código | Ver ressalva |

### Ressalva metodológica importante

O repositório aponta para **três** identificadores de projeto Supabase distintos:
- `.env` → `lmypcdfsrgfftzhxawao`
- `supabase/config.toml:1` → `trwgmplubeqxrxpncdgf`
- O MCP que eu medi conecta a um terceiro endpoint.

Confirmei que o banco medido **é coerente com o domínio do código** (contém `solicitacoes`, `cotacoes`, `pedidos`, `fornecedores`, `xbz_*`, `spot_*`). Mas **não posso provar** que é o mesmo banco que a aplicação publicada consome. Se não for, parte dos números acima descreve outro ambiente. **Esta ambiguidade é, por si só, um achado grave de configuração** e precisa ser resolvida pelo dono antes de qualquer decisão baseada nestes dados.
