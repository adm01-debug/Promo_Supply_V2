
## Plano: Documento Técnico de Implementação — Top 10 Gaps Críticos

### Objetivo
Criar `docs/PLANO_IMPLEMENTACAO_TOP10_GAPS.md` — guia técnico detalhado para implementação dos 10 gaps críticos identificados em `GAPS_ENTERPRISE_WORLD_CLASS.md`. Documento serve como blueprint de engenharia para o time executar (sem ainda alterar código/banco).

### Estrutura do Documento

Para cada um dos 10 gaps, uma seção padronizada com:

1. **Contexto & Justificativa** (1 parágrafo)
2. **Escopo Funcional** (bullets do que entra/não entra no MVP)
3. **Arquitetura Proposta** (componentes, fluxo, integrações)
4. **Modelo de Dados** — DDL Postgres sugerido (CREATE TABLE, índices, RLS policies, triggers, enums)
5. **Edge Functions necessárias** (nome, propósito, payload, secrets)
6. **Componentes Frontend** (páginas, hooks, stores)
7. **Pontos de integração com código existente** (referências a arquivos atuais)
8. **Estimativa** (pessoas-semana por papel: backend, frontend, data, devops)
9. **Critérios de aceite** (checklist mensurável)
10. **Riscos & mitigações**

### Os 10 Gaps Cobertos

| # | Gap | Foco técnico principal |
|---|---|---|
| 1 | Multi-tenancy real | `tenants` table + `tenant_id` em todas as tabelas + RLS reforçada via `current_tenant_id()` security definer |
| 2 | Strategic Sourcing (RFI/RFP/RFQ + Reverse Auction) | `rfx_events`, `rfx_invitations`, `rfx_responses`, `auction_bids` + edge function `rfx-orchestrator` + Realtime para auction |
| 3 | Spend Analytics + UNSPSC | `unspsc_codes` (seed catálogo), `spend_classifications`, view materializada `spend_cube` + página de analytics |
| 4 | PunchOut bidirecional (cXML/OCI) | Edge function `punchout-setup-request` + `punchout-order-message`, parser XML, sessão temporária |
| 5 | i18n + multi-moeda + FX | `currencies`, `exchange_rates` (sync diário via edge function), `react-i18next` com pt-BR/en/es, campo `currency` em pedidos/cotações |
| 6 | SSO SAML/OIDC + SCIM | Configuração via Lovable Cloud Auth (SAML nativo) + tabela `sso_configurations` + edge function `scim-provisioning` |
| 7 | Conectores ERP (SAP/TOTVS) | `erp_connections`, `erp_sync_log`, `erp_field_mappings` + edge functions `erp-sync-pedidos`, `erp-sync-fornecedores` (REST/SOAP/IDoc) |
| 8 | e-Invoicing nacional (NFS-e/CT-e/MDF-e) | `fiscal_documents`, `fiscal_xml_storage` + integração via gateway (Focus NFe ou similar) + edge function `fiscal-issuer` |
| 9 | Category Management + Sourcing Pipeline | `categories` (hierárquico), `category_strategies`, `sourcing_pipeline` (kanban-like) + página `/categorias` |
| 10 | Workflow Designer no-code | `workflow_definitions` (JSON BPMN-like), `workflow_instances`, `workflow_steps` + componente React Flow para designer visual |

### Detalhes Adicionais

- **Ordem de execução** alinhada ao roadmap Q1→Q4 do documento de gaps
- **Tabela consolidada de migrations** (lista de todas as novas tabelas/enums por gap)
- **Tabela consolidada de edge functions** (~20 novas funções)
- **Tabela consolidada de secrets necessários** (Focus NFe API, ERP credentials, FX provider, etc.)
- **Tabela consolidada de novas dependências npm** (react-i18next, react-flow, @xmldom/xmldom, etc.)
- **Apêndice: Templates de RLS policies** reutilizáveis para multi-tenancy
- **Apêndice: Diagrama de dependências** entre os 10 gaps (qual bloqueia qual)

### Entrega

- Criar `docs/PLANO_IMPLEMENTACAO_TOP10_GAPS.md` (denso, sem emojis, ~1500-2200 linhas markdown com SQL/TypeScript inline em code blocks)
- **Não executar** nenhuma migration nem alterar código nesta fase — é apenas documentação
- Resumo curto no chat com link para o arquivo e top-3 dependências críticas
- Seguir padrões de memória: RLS estrita, `has_role`, edge functions com auth manual + POST-only, sem `*:not(...)` em CSS, max 400 linhas por arquivo TS quando implementado
