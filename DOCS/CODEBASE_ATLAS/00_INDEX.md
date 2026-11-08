# Codebase Atlas — Índice Mestre

> Documentação técnica exaustiva do sistema. Objetivo: qualquer dev (novo ou sênior) consegue navegar, entender e alterar o código com segurança.

## Como usar
- Comece por `01_ARQUITETURA_GERAL.md` para o mapa mental do stack.
- Para "por onde começa a execução?", veja `03_FRONTEND_MAP.md` (boot).
- Para "onde está a regra X?", veja `02_FLUXOS_CRITICOS.md` (fluxos de negócio) ou `04_BACKEND_MAP.md` (schema).
- Sempre que houver `arquivo:linha`, é a fonte da verdade — abra no editor.

## Sumário

| # | Documento | O que responde |
|---|---|---|
| 01 | [Arquitetura Geral](./01_ARQUITETURA_GERAL.md) | Stack, camadas, boot, diagrama macro |
| 02 | [Fluxos Críticos](./02_FLUXOS_CRITICOS.md) | Auth, Compra→Cotação→Pedido→Pagamento, Aprovação, Fiscal (Mermaid) |
| 03 | [Frontend Map](./03_FRONTEND_MAP.md) | `src/` pasta por pasta (features, pages, components) |
| 04 | [Backend Map](./04_BACKEND_MAP.md) | 123 tabelas, funções SQL, triggers, jobs cron |
| 05 | [Edge Functions](./05_EDGE_FUNCTIONS.md) | 32 funções Deno: contrato, auth, side-effects |
| 06 | [UI Components](./06_UI_COMPONENTS.md) | Design system + botões críticos |
| 07 | [Hooks & Stores](./07_HOOKS_STORES.md) | ~60 hooks + 5 stores Zustand |
| 08 | [Segurança & RLS](./08_SEGURANCA_RLS.md) | Modelo multi-tenant, `has_role`, `tenant_in_my_group` |
| 09 | [Observabilidade](./09_OBSERVABILIDADE.md) | Telemetria, alertas, scanners DBA, watchdogs |
| 10 | [Testes & CI](./10_TESTES_CI.md) | Unit, E2E, RLS, contracts, pipeline |
| 11 | [Glossário](./11_GLOSSARIO.md) | Termos de domínio (SKU, RMA, punchout, three-way match…) |

## Convenções
- **Referências:** `caminho/arquivo.ts:linha`.
- **Idioma:** PT-BR (código pode conter identificadores em inglês).
- **Diagramas:** Mermaid — auto-adaptáveis ao tema.
- **RLS:** toda tabela pública tem RLS habilitada; ver doc 08.
- **Multi-tenant:** grupo empresarial → várias empresas (`organizations` → `tenants`).
