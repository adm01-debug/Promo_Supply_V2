
The user wants an exhaustive, perfectionist inventory of every functionality in the system (both Lovable codebase and GitHub repo). This is a research/documentation task — the output is a comprehensive functional map.

Approach: explore extensively (pages, components, hooks, edge functions, stores, tests, migrations, docs), cross-reference existing source-of-truth docs, and produce a single consolidated `LEVANTAMENTO_FUNCIONALIDADES_v2.md` covering 100% of features.

## Plan: Levantamento Exaustivo de Funcionalidades

### Objetivo
Produzir o documento definitivo `docs/LEVANTAMENTO_FUNCIONALIDADES_v2.md` mapeando **toda e qualquer funcionalidade** do Promo Supply, sem omissões — superando os documentos atuais (`LEVANTAMENTO_FUNCIONALIDADES_COMPLETO.md`, `AUDITORIA_FUNCIONALIDADES.md`).

### Fase 1 — Exploração Sistemática (read-only)
1. **Inventário de páginas** — listar todas as 40+ rotas em `src/pages/` + `src/routes/AppRoutes.tsx` com propósito, role-guard e sub-componentes.
2. **Inventário de componentes de domínio** — varrer `src/components/compras/`, `pagamentos/`, `fornecedores/`, `pedidos/`, `security/`, `mobile/`, `pwa/`, `accessibility/`, `onboarding/`, `notifications/`, `navigation/`, `animations/`, `admin/telemetry/`.
3. **Inventário de hooks** (~50 hooks em `src/hooks/`) — agrupar por domínio (dados, segurança, UX, mobile, IA).
4. **Inventário de Edge Functions** (16) — propósito, autenticação, integrações externas.
5. **Inventário de stores Zustand** (`src/stores/`) — estado global e persistência.
6. **Inventário de tabelas/migrations** — consultar `src/integrations/supabase/types.ts` + `supabase/migrations/` para mapear ~68 tabelas, RLS, triggers e funções SQL.
7. **Inventário de testes** (37 suites / 961 tests) — confirmar regras de negócio cobertas.
8. **Documentação existente** — consolidar conteúdo de `docs/*.md` (POP, KPIs, automações n8n, gaps).

### Fase 2 — Estruturação do Documento
Organizar em capítulos:

```text
1. Visão Geral e Arquitetura
2. Perfis de Usuário & Matriz RBAC
3. Módulos Funcionais (16 módulos)
   3.1  Dashboard & Analytics Executivo
   3.2  Solicitações (Wizard multi-etapas)
   3.3  Cotações & Comparador IA
   3.4  Pedidos & Workflow Kanban
   3.5  Recebimento (com offline)
   3.6  Contas a Pagar & Three-Way Match
   3.7  Contratos Executáveis & SLA
   3.8  Fornecedores 360° + Portal
   3.9  Qualificação & Compliance
   3.10 Devoluções (RMA) & Créditos
   3.11 Catálogo de Produtos & Spot
   3.12 Licitações
   3.13 Recompra Inteligente
   3.14 Documentos Fiscais (XML NF-e)
   3.15 Orçamentos Departamentais
   3.16 Histórico & Relatórios
4. Inteligência Artificial (5 módulos)
5. Segurança (MFA, Passkeys, Geo, IP, Rate-Limit, Lockout, RLS)
6. Integrações Externas (Spot, n8n, External-DB-Bridge, Push)
7. UX Avançado (Onboarding, Atalhos, Command Palette, Undo, Celebrations, Drag-drop)
8. Mobile & PWA (Bottom nav, gestures, offline-sync, install prompt)
9. Acessibilidade (Skip links, ARIA, contraste)
10. Telemetria & Observabilidade
11. Camada de Dados (~68 tabelas, triggers, funções SQL, realtime)
12. Edge Functions (16) — tabela detalhada
13. Hooks (~55) — tabela detalhada
14. Cobertura de Testes (37 suites)
15. Backlog Residual (integrações externas pendentes)
16. Apêndices: rotas completas, env vars, config.toml
```

### Fase 3 — Entrega
- Criar `docs/LEVANTAMENTO_FUNCIONALIDADES_v2.md` (denso, sem emojis, com tabelas markdown).
- Manter `LEVANTAMENTO_FUNCIONALIDADES_COMPLETO.md` original intacto (histórico).
- Adicionar resumo curto no chat apontando o novo arquivo.

### Notas Técnicas
- Apenas leitura nesta fase; nenhuma alteração de código ou banco.
- O GitHub está em sync bidirecional com o Lovable, então o código aqui = código no GitHub. Não há divergência a investigar.
- Documento estimado em 1500-2500 linhas markdown.
