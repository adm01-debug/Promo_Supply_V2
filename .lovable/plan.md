
## Plano: Deep-Dive Técnico — Pilar Strategic Sourcing

### Objetivo
Criar `docs/DEEP_DIVE_STRATEGIC_SOURCING.md` — especificação técnica completa do pilar de Strategic Sourcing (RFI/RFP/RFQ + Reverse Auctions), o segundo gap mais crítico identificado no `GAPS_ENTERPRISE_WORLD_CLASS.md`. Documento serve como blueprint de produto + engenharia, denso, com SQL/TS inline, pronto para o time executar.

### Estrutura do Documento (~1200-1800 linhas)

#### 1. Contexto Estratégico
- O que é Strategic Sourcing vs Tactical Buying (cotação atual do Promo Supply)
- Por que o módulo atual de Cotação não cobre RFx (uma rodada, manual, sem governança, sem scoring multi-critério)
- Benchmarks: SAP Ariba Sourcing, Coupa Sourcing, Jaggaer ASO, Keelvar (auctions)
- ROI esperado: 4-8% saving incremental, redução cycle time 30-50%

#### 2. Conceitos & Glossário
- RFI (Request for Information) — qualificação preliminar
- RFP (Request for Proposal) — proposta técnica + comercial, scoring ponderado
- RFQ (Request for Quotation) — preço puro, geralmente após RFP
- Reverse Auction — leilão reverso em tempo real (English reverse, Dutch, Japanese, Sealed-bid)
- Sealed Bid vs Open Bid; Bid Decrement; Auto-extension; Anti-sniping
- Total Cost of Ownership (TCO) e Should-Cost
- Lotting, bundling, multi-round sourcing

#### 3. Escopo Funcional (MVP vs Fases)

**MVP (Fase 1):**
- RFI/RFP/RFQ com convite multi-fornecedor, questionário customizável, scoring ponderado, comparação side-by-side, award decision com justificativa
- Reverse Auction English (preço descendente), real-time via Realtime, anti-sniping, audit trail completo

**Fase 2:**
- Multi-lote, multi-round, Dutch/Japanese auctions, bid masking, savings tracker automático, integração com contracts (auto-criar contrato do winner)

**Fora de escopo MVP:**
- Should-cost modeling com ML, optimization solvers (knapsack), supplier discovery via marketplace

#### 4. Modelo de Dados (DDL Postgres completo)

Tabelas principais (10):

```text
sourcing_events           — header (RFI/RFP/RFQ/AUCTION), status, owner, deadlines
sourcing_event_lots       — lotes/itens (1 evento → N lotes)
sourcing_event_questions  — questionário (texto, número, escolha, anexo, ponderado)
sourcing_event_criteria   — critérios de scoring (preço, prazo, qualidade) com pesos
sourcing_invitations      — convites (1 evento → N fornecedores), token único, status
sourcing_responses        — resposta header por fornecedor (submitted_at, total_score)
sourcing_response_items   — preço/prazo por lote
sourcing_response_answers — respostas ao questionário
auction_bids              — lances do leilão (event, supplier, amount, ts, ip)
sourcing_awards           — decisão de adjudicação (winner, justificativa, approved_by)
```

Cada tabela com:
- Colunas tipadas (uuid, numeric(15,2), timestamptz, jsonb p/ metadata)
- Enums (`sourcing_type`, `sourcing_status`, `auction_type`, `bid_status`)
- Índices (btree em FKs, GIN em jsonb, parcial em status='active')
- RLS policies usando `has_role` + `current_tenant_id()` (alinhado ao Gap 1 multi-tenancy)
- Triggers: `update_total_score`, `validate_bid_decrement`, `auto_extend_auction`, `set_updated_at`
- Função `award_sourcing_event(event_id, winner_id)` security definer

#### 5. Edge Functions (8 novas)

| Função | Propósito | Trigger |
|---|---|---|
| `sourcing-publish-event` | publicar evento, enviar convites por email | manual |
| `sourcing-supplier-portal-auth` | gerar magic link p/ portal fornecedor (token) | público |
| `sourcing-submit-response` | receber resposta validada do fornecedor | público c/ token |
| `sourcing-calculate-scores` | calcular scoring ponderado multi-critério | trigger ao submeter |
| `auction-place-bid` | validar e registrar lance (decrement, deadline, anti-sniping) | público c/ token |
| `auction-broadcast-state` | broadcast Realtime do estado do leilão | a cada lance |
| `sourcing-award-event` | adjudicar, notificar todos, gerar contrato draft | manual c/ aprovação |
| `check-sourcing-deadlines` | cron diário p/ alertas de deadline | scheduled |

Padrões obrigatórios: POST-only (405 em outros métodos), JWT validation manual via `auth.getUser(token)` exceto endpoints públicos com token específico de convite, CORS, Zod validation.

#### 6. Fluxos End-to-End (texto + diagrama ASCII)

**Fluxo RFP:**
```
Comprador cria evento → adiciona lotes/perguntas/critérios → seleciona fornecedores
  → publish (edge fn envia emails com magic link)
  → fornecedores acessam portal (sem login Promo Supply, só token)
  → submetem resposta antes do deadline
  → trigger calcula scores ponderados
  → comprador vê comparativo side-by-side
  → seleciona winner com justificativa → award (gera draft contract)
```

**Fluxo Reverse Auction:**
```
Pré-requisito: RFP/RFQ qualificou N fornecedores
  → comprador agenda auction (start, duration, decrement, reserve price)
  → 24h antes: edge fn envia lembrete
  → no horário: portal abre, fornecedores entram
  → cada lance: validate decrement >= mínimo, < lance atual, > reserve
  → broadcast via Realtime para todos os participantes
  → últimos 2 min: anti-sniping (lance estende +2min)
  → fim: lowest bid wins → award automático (configurável)
```

#### 7. UI / Frontend (páginas + componentes)

**Novas páginas:**
- `/sourcing` — lista de eventos (cards/tabela, filtros por tipo/status/owner)
- `/sourcing/novo` — wizard 5 passos (tipo → escopo → fornecedores → critérios → revisão)
- `/sourcing/:id` — detalhe com tabs (Visão Geral / Convites / Respostas / Comparativo / Award / Histórico)
- `/sourcing/:id/auction` — tela de leilão ao vivo (gráfico de lances, leaderboard, countdown)
- `/portal-sourcing/:token` — portal público do fornecedor (sem auth Promo Supply)

**Novos componentes (~15):**
- `SourcingEventCard`, `SourcingWizard` (5 steps), `CriteriaWeightEditor`, `LotEditor`
- `ScoringMatrix` (heatmap fornecedor × critério), `ResponseComparator` (side-by-side)
- `AuctionLiveBoard` (Realtime), `BidHistoryChart` (recharts line), `CountdownTimer`
- `AwardDecisionModal`, `SupplierPortalForm`, `MagicLinkAuth`

**Hooks:**
- `useSourcingEvents`, `useSourcingResponses`, `useAuctionRealtime` (Supabase channel), `useSourcingScoring`

**Stores (zustand):**
- `sourcingDraftStore` — draft do wizard (persist localStorage)

**Reutilização do código atual:**
- `useFornecedores` para seleção de convidados
- `useApprovalWorkflow` para aprovação do award (>R$ 5k segue thresholds existentes)
- `RealNotificationCenter` para alertas de deadline
- `ComparadorCotacoes` como referência de UX para `ResponseComparator`

#### 8. Pontos de Integração com Sistema Atual

| Módulo atual | Integração |
|---|---|
| `useCotacoes` | RFQ pode ser modo "express" reutilizando lógica simples |
| `Pedidos` | Award gera draft de pedido vinculado |
| `Contratos` | Award com escopo recorrente gera draft de contrato |
| `useApprovalWorkflow` | Award acima de R$ 50k requer aprovação multi-nível |
| `useSupplierQualification` | Apenas fornecedores qualificados podem ser convidados |
| `auditService` | Todo lance, submissão e award gera log imutável |
| `useFeedback` | Toast de celebração no award |

#### 9. Estimativa Detalhada

| Papel | Pessoas-semana |
|---|---|
| Backend (DDL, RLS, triggers, edge fns) | 6 |
| Frontend (5 páginas, 15 componentes, 4 hooks) | 8 |
| Realtime infra (auction broadcasting, debounce) | 2 |
| Portal fornecedor (público, magic link) | 2 |
| QA + testes (incluindo carga em auction com 50 bidders) | 3 |
| **Total** | **21 pessoas-semana** (~5 meses 1 dev full / 2.5 meses 2 devs) |

#### 10. Critérios de Aceite (checklist mensurável)

- [ ] Comprador cria RFP com 5 fornecedores, 3 lotes, 4 critérios em <5min
- [ ] Fornecedor recebe email, acessa portal sem cadastro, submete resposta
- [ ] Scoring calculado automaticamente em <2s ao submeter
- [ ] Comparativo side-by-side carrega <1s para 10 fornecedores
- [ ] Auction com 20 bidders simultâneos, latência <500ms entre lance e broadcast
- [ ] Anti-sniping estende auction se lance ocorre nos últimos 2min
- [ ] Award gera draft de pedido + contrato automaticamente
- [ ] Audit trail completo (quem viu, quem submeteu, quem deu lance, quem adjudicou)
- [ ] RLS bloqueia fornecedor A de ver resposta do fornecedor B
- [ ] Sealed bid: lances não visíveis até fim do evento

#### 11. Riscos & Mitigações

| Risco | Mitigação |
|---|---|
| Latência do Realtime em auction com >50 bidders | Debounce server-side, broadcast agregado a cada 200ms |
| Fornecedor sem login Promo Supply (portal público) | Magic link com token JWT 7 dias, rate limit por IP, CAPTCHA |
| Vazamento de respostas entre fornecedores | RLS rigorosa + testes de penetração + audit |
| Adoção pelos fornecedores (UX portal) | Portal mobile-first, sem cadastro, multi-idioma na Fase 2 |
| Conflito legal (auction reverso é vinculante?) | Termos de aceite obrigatórios, registro de IP, prova de não-repúdio |
| Performance de scoring com 50 fornecedores × 20 critérios | Trigger async via pg_notify, cache materializado |

#### 12. Apêndices

- **A. DDL completo** (todas as 10 tabelas, enums, índices, RLS, triggers em SQL inline)
- **B. Skeleton TypeScript** das 8 edge functions (header, validation, lógica core)
- **C. Diagrama de estados** do `sourcing_event` (draft → published → in_progress → evaluation → awarded → cancelled)
- **D. Wireframes ASCII** das 5 páginas principais
- **E. Exemplo de payload** Realtime channel `auction:{event_id}`

### Entrega
- Criar `docs/DEEP_DIVE_STRATEGIC_SOURCING.md` (denso, sem emojis, ~1500 linhas markdown)
- **Não executar** migrations nem alterar código — apenas documentação
- Resumo curto no chat com top 3 decisões arquiteturais que precisam de aprovação antes de implementar
- Alinhar com padrões de memória: RLS estrita via `has_role`, edge functions com auth manual, Realtime debounce, max 400 linhas/arquivo TS, sem `*:not(...)` em CSS, dark premium theme
