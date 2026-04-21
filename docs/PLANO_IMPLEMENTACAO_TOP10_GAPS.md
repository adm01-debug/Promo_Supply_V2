# Plano de Implementação Técnico — Top 10 Gaps Críticos Enterprise

**Versão:** 1.0
**Data:** 2026-04-21
**Audiência:** Engenharia (Backend, Frontend, Data, DevOps), Arquitetura, Tech Lead
**Documento-pai:** [GAPS_ENTERPRISE_WORLD_CLASS.md](./GAPS_ENTERPRISE_WORLD_CLASS.md)
**Resumo executivo:** [GAPS_EXECUTIVE_SUMMARY.md](./GAPS_EXECUTIVE_SUMMARY.md)

---

## Sumário

1. [Visão Geral & Premissas](#visao-geral)
2. [Ordem de Execução (Roadmap Q1–Q4)](#ordem)
3. [Diagrama de Dependências](#dependencias)
4. **Gap 1** — [Multi-tenancy real](#gap-1)
5. **Gap 2** — [Strategic Sourcing (RFx + Reverse Auction)](#gap-2)
6. **Gap 3** — [Spend Analytics + UNSPSC](#gap-3)
7. **Gap 4** — [PunchOut bidirecional (cXML/OCI)](#gap-4)
8. **Gap 5** — [i18n + multi-moeda + FX](#gap-5)
9. **Gap 6** — [SSO SAML/OIDC + SCIM](#gap-6)
10. **Gap 7** — [Conectores ERP (SAP/TOTVS)](#gap-7)
11. **Gap 8** — [e-Invoicing nacional (NFS-e/CT-e/MDF-e)](#gap-8)
12. **Gap 9** — [Category Management + Sourcing Pipeline](#gap-9)
13. **Gap 10** — [Workflow Designer no-code](#gap-10)
14. [Tabela consolidada de migrations](#consol-migrations)
15. [Tabela consolidada de edge functions](#consol-edges)
16. [Tabela consolidada de secrets](#consol-secrets)
17. [Tabela consolidada de dependências npm](#consol-deps)
18. [Apêndice A — Templates RLS multi-tenant](#apx-rls)
19. [Apêndice B — Padrões de edge function](#apx-edge)

---

<a id="visao-geral"></a>

## 1. Visão Geral & Premissas

**Stack atual** (não negociável): React 18 + Vite + TS + Tailwind, Supabase Postgres + Edge Functions Deno, Lovable Cloud Auth, Realtime, Storage.

**Padrões obrigatórios** (memória do projeto):
- RLS estrita em todas as tabelas; `has_role(auth.uid(), 'role')` para checagens de papel.
- Roles separadas em `user_roles` (já existente). Nunca em `profiles`.
- Edge Functions: POST-only, validação manual de JWT no código, CORS padrão, validação Zod.
- Arquivos TS/TSX ≤ 400 linhas — quebrar antes.
- Sem `*:not(...)` global em CSS.
- Tokens semânticos HSL via `index.css` + `tailwind.config.ts`.
- Realtime debounce 250ms; React Query staleTime 30s padrão.

**Estimativas** em pessoas-semana (PS), papéis: BE (Backend/SQL), FE (Frontend), DT (Data/Analytics), DO (DevOps/Infra), QA.

**Total agregado estimado:** 53 PS ≈ 1 ano com squad de 5 (4 dev + 1 QA), aproximadamente 30% de buffer.

---

<a id="ordem"></a>

## 2. Ordem de Execução (Roadmap Q1–Q4)

| Trim | Gaps | Justificativa |
|------|------|---------------|
| Q1 | 1, 6 | Multi-tenancy + SSO desbloqueiam vendas enterprise. Tudo que vem depois assume `tenant_id`. |
| Q2 | 2, 3, 5 | RFx + Spend + i18n compõem o pacote "world-class procurement". |
| Q3 | 4, 7, 8 | Integrações externas (PunchOut, ERP, NFe) — exigem fundação sólida. |
| Q4 | 9, 10 | Category Mgmt e Workflow Designer são camadas de otimização sobre base estável. |

---

<a id="dependencias"></a>

## 3. Diagrama de Dependências

```
                     ┌──── Gap 1 (Multi-tenancy) ────┐
                     │     bloqueia TODOS os outros  │
                     ▼                               ▼
              Gap 6 (SSO)                    Gap 5 (i18n/FX)
                     │                               │
                     ▼                               ▼
       ┌────── Gap 2 (RFx) ──── Gap 3 (Spend) ──────┤
       │             │                               │
       ▼             ▼                               ▼
  Gap 9 (Cat Mgmt)  Gap 4 (PunchOut)         Gap 7 (ERP)
                                                     │
                                                     ▼
                                              Gap 8 (NFe)
                                                     │
                                                     ▼
                                          Gap 10 (Workflow Designer)
```

**Bloqueadores duros:** 1 → 6 → 2/3/5 → 4/7/8 → 9/10.

---

<a id="gap-1"></a>

## Gap 1 — Multi-tenancy real

### 1.1 Contexto & Justificativa
O sistema hoje é single-tenant (todos os usuários compartilham `public.*`). Para venda enterprise/SaaS multi-cliente é mandatório isolar dados por organização cliente, garantindo zero leak via RLS e auditoria por tenant.

### 1.2 Escopo Funcional (MVP)
- Criar conceito de `tenant` (organização cliente).
- Cada usuário pertence a 1 ou mais tenants (com role por tenant).
- Toda tabela de domínio (~40 tabelas) ganha `tenant_id` com RLS forçando `tenant_id = current_tenant_id()`.
- Switch de tenant no header para usuários multi-tenant.
- Migration de dados existentes para tenant default `legacy`.

**Fora do MVP:** white-labeling visual por tenant, billing por tenant, cross-tenant reports.

### 1.3 Arquitetura Proposta
- Tabela `tenants` + `user_tenants` (N:N com role local).
- Função SECURITY DEFINER `current_tenant_id()` que lê de `app.current_tenant` (custom JWT claim) ou fallback para `user_tenants.default`.
- Hook `useCurrentTenant()` que injeta header `X-Tenant-Id` em todas as chamadas Supabase.
- Edge Function `set-tenant-context` valida que usuário pertence ao tenant antes de retornar JWT enriquecido.

### 1.4 Modelo de Dados

```sql
-- Enum
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'churned');

-- Tabela principal
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  status tenant_status NOT NULL DEFAULT 'trial',
  plan TEXT NOT NULL DEFAULT 'starter',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_status ON public.tenants(status) WHERE status = 'active';

-- Membership
CREATE TABLE public.user_tenants (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  is_default BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE UNIQUE INDEX idx_user_tenants_one_default
  ON public.user_tenants(user_id) WHERE is_default = true;

-- Função para resolver tenant atual
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  -- 1. Tenta pegar de claim custom no JWT
  v_tenant := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
  IF v_tenant IS NOT NULL THEN
    RETURN v_tenant;
  END IF;
  -- 2. Fallback: tenant default do usuário
  SELECT tenant_id INTO v_tenant
  FROM public.user_tenants
  WHERE user_id = auth.uid() AND is_default = true
  LIMIT 1;
  RETURN v_tenant;
END;
$$;

-- Função para checar se usuário pertence ao tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenants
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  );
$$;

-- RLS em tenants e user_tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants visible to members"
  ON public.tenants FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(auth.uid(), id));

CREATE POLICY "user_tenants own rows"
  ON public.user_tenants FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

**Migration em massa** (script gerador): para cada tabela de domínio existente:
```sql
ALTER TABLE public.<tabela> ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
UPDATE public.<tabela> SET tenant_id = '<legacy_tenant_uuid>'::uuid WHERE tenant_id IS NULL;
ALTER TABLE public.<tabela> ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_<tabela>_tenant ON public.<tabela>(tenant_id);

-- Refazer RLS adicionando tenant check
DROP POLICY "<existing>" ON public.<tabela>;
CREATE POLICY "tenant isolation <tabela>"
  ON public.<tabela> FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
```

### 1.5 Edge Functions

| Nome | Propósito | Payload | Secrets |
|------|-----------|---------|---------|
| `set-tenant-context` | Valida tenant e retorna sessão atualizada com claim `tenant_id` | `{ tenant_id }` | `SUPABASE_SERVICE_ROLE_KEY` |
| `tenant-provisioning` | Cria tenant + admin + dados iniciais (categorias, roles) | `{ name, slug, admin_email, plan }` | `SUPABASE_SERVICE_ROLE_KEY` |

### 1.6 Componentes Frontend
- `src/hooks/useCurrentTenant.ts` — context + zustand store.
- `src/components/tenant/TenantSwitcher.tsx` — dropdown no header.
- `src/components/tenant/TenantOnboarding.tsx` — wizard de criação.
- `src/pages/admin/TenantsAdmin.tsx` — admin global (super-admin).

### 1.7 Pontos de integração
- `src/integrations/supabase/client.ts` — adicionar header `X-Tenant-Id` via `global.headers` dinâmico.
- `src/hooks/useAuth.tsx` — expor `currentTenantId`, `availableTenants`.
- Todos os hooks de domínio (`useFornecedores`, `usePedidos`, etc.) — sem mudança (RLS resolve).

### 1.8 Estimativa
| Papel | PS |
|-------|----|
| BE | 4.0 |
| FE | 1.5 |
| DT | 0.5 (script de migração) |
| DO | 0.5 |
| QA | 1.5 |
| **Total** | **8.0** |

### 1.9 Critérios de aceite
- [ ] Usuário em tenant A NUNCA vê dado de tenant B (teste pgTAP automatizado em todas as 40 tabelas).
- [ ] Switch de tenant atualiza UI em < 500ms.
- [ ] `current_tenant_id()` retorna corretamente em 100% das chamadas autenticadas.
- [ ] Migração de dados legacy preserva 100% dos registros (count antes/depois).
- [ ] Auditoria registra `tenant_id` em todos os eventos.

### 1.10 Riscos & Mitigações
| Risco | Mitigação |
|-------|-----------|
| Esquecer `tenant_id` em alguma tabela nova | Lint SQL via CI: query informational_schema procurando tabelas sem `tenant_id` |
| RLS recursiva | Sempre usar SECURITY DEFINER para resolver tenant |
| Performance (todo SELECT ganha 1 filtro) | Índices `(tenant_id, ...)` compostos nas queries quentes |

---

<a id="gap-2"></a>

## Gap 2 — Strategic Sourcing (RFI/RFP/RFQ + Reverse Auction)

### 2.1 Contexto & Justificativa
Hoje só existe cotação 1:N simples. Falta processo estruturado de sourcing estratégico (RFI exploratório, RFP qualitativo, RFQ quantitativo) e leilão reverso eletrônico — funcionalidades-chave em SAP Ariba/Coupa que geram 5–15% de saving adicional vs cotação tradicional.

### 2.2 Escopo Funcional (MVP)
- Criar evento RFx (RFI/RFP/RFQ) com calendário, critérios ponderados, lista de convidados.
- Convite automático por email com link tokenizado (sem login para fornecedor responder).
- Workspace de comparação multi-fornecedor com weighted scoring.
- Reverse auction English (decrescente) com lance mínimo, anti-sniping (extensão automática).
- Realtime para auction (lances ao vivo).

**Fora do MVP:** auction Dutch/Japanese, sealed-bid, RFx multi-round.

### 2.3 Arquitetura Proposta
- Tabelas `rfx_events`, `rfx_criteria`, `rfx_invitations`, `rfx_responses`, `rfx_response_items`, `auction_bids`.
- Edge function `rfx-orchestrator` controla lifecycle (publish, remind, close, award).
- Edge function `auction-runtime` valida lances + emite via Realtime.
- Portal externo `/rfx/respond/:token` (sem auth) para fornecedor.

### 2.4 Modelo de Dados

```sql
CREATE TYPE rfx_type AS ENUM ('RFI', 'RFP', 'RFQ', 'AUCTION');
CREATE TYPE rfx_status AS ENUM ('draft', 'published', 'in_progress', 'closed', 'awarded', 'cancelled');

CREATE TABLE public.rfx_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  numero TEXT NOT NULL,
  type rfx_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categorias(id),
  status rfx_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  close_at TIMESTAMPTZ NOT NULL,
  award_deadline TIMESTAMPTZ,
  budget_estimated NUMERIC(15,2),
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  -- Auction-specific
  auction_start_price NUMERIC(15,2),
  auction_decrement_min NUMERIC(15,2),
  auction_anti_sniping_seconds INT DEFAULT 60,
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  awarded_to_supplier_id UUID REFERENCES fornecedores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, numero)
);

CREATE TABLE public.rfx_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfx_id UUID NOT NULL REFERENCES rfx_events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL CHECK (weight BETWEEN 0 AND 100),
  scoring_type TEXT NOT NULL CHECK (scoring_type IN ('numeric','scale_1_5','boolean')),
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE public.rfx_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfx_id UUID NOT NULL REFERENCES rfx_events(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  invite_token TEXT NOT NULL UNIQUE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  declined BOOLEAN NOT NULL DEFAULT false,
  decline_reason TEXT
);

CREATE INDEX idx_rfx_invitations_token ON rfx_invitations(invite_token);

CREATE TABLE public.rfx_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfx_id UUID NOT NULL REFERENCES rfx_events(id) ON DELETE CASCADE,
  invitation_id UUID NOT NULL REFERENCES rfx_invitations(id),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  total_value NUMERIC(15,2),
  delivery_days INT,
  payment_terms TEXT,
  weighted_score NUMERIC(5,2),
  rank INT,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rfx_response_criteria (
  response_id UUID NOT NULL REFERENCES rfx_responses(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES rfx_criteria(id) ON DELETE CASCADE,
  raw_value JSONB NOT NULL,
  normalized_score NUMERIC(5,2),
  PRIMARY KEY (response_id, criterion_id)
);

CREATE TABLE public.auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfx_id UUID NOT NULL REFERENCES rfx_events(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  bid_value NUMERIC(15,2) NOT NULL,
  bid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_winning BOOLEAN NOT NULL DEFAULT false,
  source_ip INET
);

CREATE INDEX idx_auction_bids_event_value ON auction_bids(rfx_id, bid_value);

-- RLS
ALTER TABLE rfx_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rfx tenant isolation" ON rfx_events FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids;
```

### 2.5 Edge Functions

| Nome | Propósito | Payload | Secrets |
|------|-----------|---------|---------|
| `rfx-orchestrator` | Publish, remind, close, calc score, award | `{ action, rfx_id, ... }` | `RESEND_API_KEY`, `SERVICE_ROLE` |
| `rfx-respond-public` | Submeter resposta via token (sem JWT user) | `{ token, items, criteria }` | `SERVICE_ROLE` |
| `auction-place-bid` | Validar lance + anti-sniping | `{ token, bid_value }` | `SERVICE_ROLE` |
| `rfx-cron-close` | Cron diário: fecha RFx vencidos | — | `SERVICE_ROLE` |

### 2.6 Componentes Frontend
- `src/pages/sourcing/RFxList.tsx`, `RFxCreate.tsx`, `RFxDetail.tsx`, `RFxAward.tsx`.
- `src/pages/sourcing/AuctionRoom.tsx` — sala ao vivo com gráfico de lances.
- `src/pages/public/RFxRespond.tsx` — formulário público tokenizado.
- `src/hooks/useRFx.ts`, `useAuctionBids.ts` (com Realtime subscription).

### 2.7 Pontos de integração
- `src/pages/Cotacao.tsx` → adicionar CTA "Converter em RFx".
- `src/pages/Solicitacoes.tsx` → originar RFx a partir de solicitação aprovada.
- Reaproveitar `ComparadorCotacoes.tsx` como base do `RFxComparison`.

### 2.8 Estimativa
| Papel | PS |
|-------|----|
| BE | 3.5 |
| FE | 3.0 |
| DT | 0.5 |
| QA | 1.0 |
| **Total** | **8.0** |

### 2.9 Critérios de aceite
- [ ] Convidar 10 fornecedores → 100% recebem email com link válido.
- [ ] Score calculado conforme weights da rubrica.
- [ ] Auction: 50 lances/seg sem inconsistência (test stress).
- [ ] Anti-sniping estende prazo se lance < N segundos do fim.

### 2.10 Riscos & Mitigações
| Risco | Mitigação |
|-------|-----------|
| Tokens públicos vazados | Token de 256 bits + expiração + revogação manual |
| Race condition em lances | Função SQL atomic com `FOR UPDATE` |
| Email rate-limit Resend | Bulk com batch 50/min |

---

<a id="gap-3"></a>

## Gap 3 — Spend Analytics + UNSPSC

### 3.1 Contexto & Justificativa
Sem classificação UNSPSC (United Nations Standard Products and Services Code) é impossível fazer spend cube comparável ao mercado, identificar maverick spend, ou benchmark setorial. Top-tier procurement exige spend visibility em ≥ 95% do gasto.

### 3.2 Escopo Funcional (MVP)
- Importar catálogo UNSPSC nível 4 (~5.000 códigos PT-BR).
- Auto-classificar itens via LLM (Lovable AI Gateway) com fallback manual.
- Spend Cube: dimensões (categoria UNSPSC, fornecedor, centro de custo, período); medidas (gasto, # transações, ticket médio, # fornecedores únicos).
- Dashboards: Pareto 80/20, maverick spend, savings por categoria, tail-spend.

**Fora do MVP:** UNSPSC nível 5, integração com benchmarks externos.

### 3.3 Arquitetura Proposta
- Tabela `unspsc_codes` (seed inicial via migration).
- Tabela `spend_classifications` (item → código UNSPSC + confiança + revisor).
- View materializada `spend_cube` refrescada a cada 1h via pg_cron.
- Edge function `classify-spend-batch` consome itens não classificados, chama LLM, grava.

### 3.4 Modelo de Dados

```sql
CREATE TABLE public.unspsc_codes (
  code TEXT PRIMARY KEY, -- ex: '44121701'
  segment TEXT NOT NULL,    -- '44'
  family TEXT NOT NULL,     -- '4412'
  class TEXT NOT NULL,      -- '441217'
  commodity TEXT NOT NULL,  -- '44121701'
  title_pt TEXT NOT NULL,
  title_en TEXT,
  description TEXT
);
CREATE INDEX idx_unspsc_segment ON unspsc_codes(segment);

CREATE TABLE public.spend_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_table TEXT NOT NULL CHECK (source_table IN ('pedido_itens','contract_items')),
  source_id UUID NOT NULL,
  unspsc_code TEXT NOT NULL REFERENCES unspsc_codes(code),
  confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  classified_by TEXT NOT NULL CHECK (classified_by IN ('llm','manual','rule')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id)
);

CREATE INDEX idx_spend_class_tenant_code ON spend_classifications(tenant_id, unspsc_code);

-- View materializada
CREATE MATERIALIZED VIEW public.spend_cube AS
SELECT
  p.tenant_id,
  uc.segment,
  uc.family,
  uc.class,
  sc.unspsc_code,
  uc.title_pt AS category_name,
  p.fornecedor_id,
  f.razao_social AS supplier_name,
  date_trunc('month', p.created_at) AS period,
  SUM(pi.quantidade * pi.valor_unitario) AS total_spend,
  COUNT(DISTINCT p.id) AS num_transactions,
  AVG(pi.quantidade * pi.valor_unitario) AS avg_ticket,
  COUNT(DISTINCT p.fornecedor_id) AS num_unique_suppliers
FROM pedidos p
JOIN pedido_itens pi ON pi.pedido_id = p.id
JOIN spend_classifications sc ON sc.source_table='pedido_itens' AND sc.source_id=pi.id
JOIN unspsc_codes uc ON uc.code = sc.unspsc_code
JOIN fornecedores f ON f.id = p.fornecedor_id
WHERE p.status NOT IN ('cancelado')
GROUP BY 1,2,3,4,5,6,7,8,9;

CREATE UNIQUE INDEX idx_spend_cube_pk
  ON spend_cube(tenant_id, unspsc_code, fornecedor_id, period);

-- Refresh hourly via pg_cron
SELECT cron.schedule('refresh-spend-cube', '0 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.spend_cube; $$);
```

### 3.5 Edge Functions

| Nome | Propósito | Payload | Secrets |
|------|-----------|---------|---------|
| `classify-spend-batch` | LLM classifica até 100 itens não-classificados | `{ batch_size?: 100 }` | `LOVABLE_API_KEY` |
| `spend-export` | Exporta spend cube em CSV/XLSX | `{ filters }` | — |

**Modelo LLM:** `google/gemini-2.5-flash-lite` (custo baixo, suficiente para classificação).

### 3.6 Componentes Frontend
- `src/pages/SpendAnalytics.tsx` — overview com Pareto, treemap, sparkline.
- `src/pages/spend/CategoryDrilldown.tsx`.
- `src/components/spend/MaverickSpendAlert.tsx`.
- `src/components/spend/UNSPSCPicker.tsx` — autocomplete hierárquico.

### 3.7 Pontos de integração
- `src/pages/Pedidos.tsx` → coluna "Categoria UNSPSC".
- `src/pages/historico/*` → filtros por categoria.
- `src/pages/DashboardExecutivo.tsx` → KPI "Spend coverage %".

### 3.8 Estimativa
| Papel | PS |
|-------|----|
| BE | 1.5 |
| FE | 2.0 |
| DT | 1.5 (seed UNSPSC + view materializada) |
| QA | 0.5 |
| **Total** | **5.5** |

### 3.9 Critérios de aceite
- [ ] ≥ 90% dos itens dos últimos 12 meses classificados.
- [ ] Refresh do cube < 30s.
- [ ] Dashboard Pareto carrega < 1.5s para 100k linhas.

### 3.10 Riscos
| Risco | Mitigação |
|-------|-----------|
| Erro LLM em classificação | Limite de confiança 0.7; fila de revisão manual abaixo |
| Tamanho do seed UNSPSC | Importar via COPY em migração one-shot |

---

<a id="gap-4"></a>

## Gap 4 — PunchOut bidirecional (cXML/OCI)

### 4.1 Contexto & Justificativa
PunchOut permite que comprador "saia" do sistema para o catálogo do fornecedor, configure pedido lá, e retorne com cart pré-preenchido. Padrão setorial enterprise (cXML para EUA, OCI para SAP/Europa). Sem isso, é difícil vender para grandes corporações brasileiras com filiais multinacionais.

### 4.2 Escopo Funcional (MVP)
- Suporte cXML 1.2 (Ariba) — outbound `PunchOutSetupRequest` e inbound `PunchOutOrderMessage`.
- Cadastro de catálogos PunchOut por fornecedor (URL + credenciais).
- Sessão temporária com return URL.
- Conversão de cart retornado em solicitação interna.

**Fora do MVP:** OCI 5.0 (SAP), cXML hosted catalog.

### 4.3 Arquitetura
- Edge function `punchout-setup` gera XML, POST para fornecedor, recebe URL de redirecionamento.
- Frontend abre URL em iframe/new tab; fornecedor faz POST de retorno para `punchout-receive`.
- `punchout-receive` parseia XML, cria solicitação rascunho, redireciona usuário.

### 4.4 Modelo de Dados

```sql
CREATE TABLE public.punchout_catalogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  protocol TEXT NOT NULL CHECK (protocol IN ('cxml','oci')),
  setup_url TEXT NOT NULL,
  identity TEXT NOT NULL,
  shared_secret_encrypted TEXT NOT NULL, -- pgcrypto
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.punchout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  catalog_id UUID NOT NULL REFERENCES punchout_catalogs(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  buyer_cookie TEXT NOT NULL UNIQUE, -- entregue ao fornecedor
  return_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'opened',
  raw_request_xml TEXT,
  raw_response_xml TEXT,
  cart_payload JSONB,
  created_solicitacao_id UUID REFERENCES solicitacoes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX idx_punchout_sessions_cookie ON punchout_sessions(buyer_cookie);
```

### 4.5 Edge Functions

| Nome | Propósito | Secrets |
|------|-----------|---------|
| `punchout-setup` | Monta cXML SetupRequest, POST ao fornecedor, devolve URL | `SERVICE_ROLE`, `PUNCHOUT_ENCRYPTION_KEY` |
| `punchout-receive` | Recebe POST cXML do fornecedor, parseia, cria solicitação | `SERVICE_ROLE` |

**Dependência:** `xmldom` ou `fast-xml-parser` (Deno-compatible).

### 4.6 Componentes Frontend
- `src/components/sourcing/PunchOutLauncher.tsx` — botão "Comprar via catálogo".
- `src/pages/admin/PunchOutCatalogs.tsx` — CRUD.

### 4.7 Estimativa
| Papel | PS |
|-------|----|
| BE | 2.5 |
| FE | 1.0 |
| QA | 1.0 |
| **Total** | **4.5** |

### 4.9 Critérios de aceite
- [ ] Teste E2E com Ariba sandbox funcional.
- [ ] Falhas de XML mal-formado retornam 400 com causa clara.
- [ ] Shared secret criptografado at-rest (pgcrypto AES-256).

### 4.10 Riscos
| Risco | Mitigação |
|-------|-----------|
| Variações cXML por fornecedor | Validador strict + lista de fornecedores certificados |
| Sessão expirada | TTL 4h; reabertura sem perda de cart |

---

<a id="gap-5"></a>

## Gap 5 — i18n + multi-moeda + FX

### 5.1 Contexto & Justificativa
UI 100% em PT-BR e moeda única BRL bloqueia uso por subsidiárias multinacionais. Conversão FX é mandatória para consolidação de spend global.

### 5.2 Escopo Funcional (MVP)
- 3 locales: pt-BR, en-US, es-419.
- Persistência de preferência por usuário.
- Campo `currency` em pedidos/cotações/contratos (default conforme tenant).
- Tabela de cotações FX atualizada diariamente (provider gratuito tipo `exchangerate.host`).
- Função SQL `fx_convert(amount, from, to, date)` para reports.

**Fora do MVP:** RTL (árabe/hebraico), pluralização complexa, hedging.

### 5.3 Arquitetura
- `react-i18next` + `i18next-browser-languagedetector`.
- Arquivos JSON em `src/locales/{pt-BR,en-US,es-419}/common.json` e por domínio.
- Edge function `fx-sync-daily` cron 06:00 UTC.

### 5.4 Modelo de Dados

```sql
CREATE TABLE public.currencies (
  code CHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places SMALLINT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO currencies (code,name,symbol) VALUES
('BRL','Real Brasileiro','R$'),
('USD','US Dollar','$'),
('EUR','Euro','€'),
('CNY','Yuan Chinês','¥');

CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  quote_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  rate NUMERIC(18,8) NOT NULL,
  rate_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'exchangerate.host',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency, rate_date, source)
);
CREATE INDEX idx_fx_lookup ON exchange_rates(base_currency, quote_currency, rate_date DESC);

CREATE OR REPLACE FUNCTION public.fx_convert(
  _amount NUMERIC, _from CHAR(3), _to CHAR(3), _date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN _from = _to THEN _amount
    ELSE _amount * (
      SELECT rate FROM exchange_rates
      WHERE base_currency = _from AND quote_currency = _to AND rate_date <= _date
      ORDER BY rate_date DESC LIMIT 1
    ) END;
$$;

-- Adicionar currency em tabelas relevantes
ALTER TABLE pedidos ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'BRL' REFERENCES currencies(code);
ALTER TABLE cotacoes ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'BRL' REFERENCES currencies(code);
ALTER TABLE contracts ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'BRL' REFERENCES currencies(code);

ALTER TABLE profiles ADD COLUMN preferred_locale TEXT NOT NULL DEFAULT 'pt-BR';
ALTER TABLE tenants ADD COLUMN default_currency CHAR(3) NOT NULL DEFAULT 'BRL';
ALTER TABLE tenants ADD COLUMN default_locale TEXT NOT NULL DEFAULT 'pt-BR';
```

### 5.5 Edge Functions

| Nome | Propósito |
|------|-----------|
| `fx-sync-daily` | Cron: GET https://api.exchangerate.host/latest?base=BRL → upsert |

### 5.6 Componentes Frontend
- `src/i18n/index.ts` — config react-i18next.
- `src/components/i18n/LocaleSwitcher.tsx`, `CurrencyDisplay.tsx`.
- `src/hooks/useFormatCurrency.ts`.

### 5.7 Estimativa
| Papel | PS |
|-------|----|
| BE | 1.0 |
| FE | 3.5 (extração de strings em ~150 componentes) |
| QA | 0.5 |
| **Total** | **5.0** |

### 5.9 Critérios de aceite
- [ ] 100% das strings da UI extraídas (linter `i18next-extract`).
- [ ] FX atualizado diariamente em ≤ 30s.
- [ ] Conversões tomam câmbio do dia da transação, não de hoje.

---

<a id="gap-6"></a>

## Gap 6 — SSO SAML/OIDC + SCIM

### 6.1 Contexto & Justificativa
Compras enterprise exigem SSO corporativo (Okta, Azure AD, Google Workspace) e provisionamento automático SCIM. Sem isso, processo de adoção em grandes contas leva meses.

### 6.2 Escopo Funcional (MVP)
- SAML 2.0 via Lovable Cloud Auth nativo (tool `configure_saml_sso`).
- Tabela `sso_configurations` por tenant (mapping de domínio → IdP).
- SCIM 2.0 endpoint para provisioning (Users + Groups).

### 6.3 Arquitetura
- SAML: usar capability nativa do Lovable Cloud — sem implementação custom.
- SCIM: edge function `scim-v2` que expõe `/Users`, `/Groups` com bearer token.

### 6.4 Modelo de Dados

```sql
CREATE TABLE public.sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  protocol TEXT NOT NULL CHECK (protocol IN ('saml','oidc')),
  idp_metadata_url TEXT,
  email_domains TEXT[] NOT NULL,
  scim_token_hash TEXT, -- bcrypt
  scim_token_last4 CHAR(4),
  default_role app_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.scim_provisioning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  operation TEXT NOT NULL,
  target_email TEXT,
  status TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.5 Edge Functions
| Nome | Propósito |
|------|-----------|
| `scim-v2` | RFC 7644 — `/Users`, `/Groups` (GET/POST/PUT/DELETE) |
| `sso-jit-provisioning` | Cria `user_tenants` + role default no primeiro login SAML |

### 6.6 Componentes Frontend
- `src/pages/admin/SSOConfig.tsx` — wizard de configuração.

### 6.7 Estimativa
| Papel | PS |
|-------|----|
| BE | 2.0 |
| FE | 1.0 |
| DO | 0.5 |
| QA | 0.5 |
| **Total** | **4.0** |

### 6.9 Critérios de aceite
- [ ] Login SAML com Okta sandbox em ≤ 3s.
- [ ] SCIM PUT /Users/{id} desativa usuário em ≤ 5s.
- [ ] Domínios não-autorizados rejeitados.

---

<a id="gap-7"></a>

## Gap 7 — Conectores ERP (SAP/TOTVS)

### 7.1 Contexto & Justificativa
Sem integração ERP, comprador faz dupla digitação de pedidos/notas/pagamentos. Conectar SAP S/4HANA (REST) e TOTVS Protheus (REST/SOAP) é pré-requisito para vender em mercado brasileiro mid+enterprise.

### 7.2 Escopo Funcional (MVP)
- 1 conector SAP (REST OData), 1 TOTVS (REST Datasul/Protheus).
- Sync bidirecional: pedidos (out), fornecedores (in), notas fiscais (in), pagamentos (out).
- Field mapping configurável.
- Log de sincronização com replay.

**Fora do MVP:** SOAP IDoc nativo, Oracle EBS.

### 7.3 Arquitetura
- Edge functions stateless por entidade.
- Cron a cada 15min para sync incremental (delta por `updated_at`).
- Filas via `pg_notify` para sync on-demand.

### 7.4 Modelo de Dados

```sql
CREATE TABLE public.erp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  erp_type TEXT NOT NULL CHECK (erp_type IN ('sap_s4','totvs_protheus','totvs_datasul','oracle_ebs')),
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('basic','oauth2','apikey')),
  credentials_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.erp_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES erp_connections(id) ON DELETE CASCADE,
  entity TEXT NOT NULL CHECK (entity IN ('fornecedor','pedido','pagamento','nota_fiscal')),
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  transform_fn TEXT, -- ex: 'cnpj_only_digits'
  UNIQUE (connection_id, entity, source_field)
);

CREATE TABLE public.erp_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  connection_id UUID NOT NULL REFERENCES erp_connections(id),
  entity TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  record_id UUID,
  external_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success','error','retry')),
  error_message TEXT,
  payload JSONB,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_erp_sync_status ON erp_sync_log(connection_id, status, created_at DESC);
```

### 7.5 Edge Functions

| Nome | Propósito |
|------|-----------|
| `erp-sync-fornecedores` | Pull fornecedores do ERP (cron 15min) |
| `erp-sync-pedidos` | Push pedidos aprovados ao ERP |
| `erp-sync-pagamentos` | Push baixas de pagamento |
| `erp-sync-notas` | Pull NFs do ERP para 3-way matching |
| `erp-test-connection` | Healthcheck on-demand |

### 7.6 Componentes Frontend
- `src/pages/admin/ERPConnections.tsx`.
- `src/pages/admin/ERPSyncLog.tsx` — replay e retry.

### 7.7 Estimativa
| Papel | PS |
|-------|----|
| BE | 4.0 |
| FE | 1.5 |
| DT | 1.0 (mapping templates) |
| QA | 1.5 |
| **Total** | **8.0** |

### 7.9 Critérios de aceite
- [ ] Sync completo de 10k fornecedores em ≤ 5min.
- [ ] Retry exponencial em 3 falhas; alerta admin.
- [ ] Idempotência: re-sync não duplica.

---

<a id="gap-8"></a>

## Gap 8 — e-Invoicing nacional (NFS-e/CT-e/MDF-e)

### 8.1 Contexto & Justificativa
Recebimento, validação e armazenamento de XMLs fiscais é compliance fiscal obrigatório no Brasil. Hoje a tabela `fiscal_documents` armazena dados mas não emite/consulta SEFAZ.

### 8.2 Escopo Funcional (MVP)
- Recepção via gateway (Focus NFe) de NFe/NFS-e/CT-e do fornecedor.
- Validação de chave de acesso.
- Armazenamento XML em storage bucket criptografado.
- Reconciliação automática NF ↔ Pedido ↔ Recebimento (3-way).

**Fora do MVP:** emissão própria (saída), MDF-e operacional.

### 8.3 Arquitetura
- Webhook do Focus NFe → edge function `fiscal-webhook-receive`.
- Validação SEFAZ via API Focus NFe.
- Storage: bucket `fiscal-xml` (private).

### 8.4 Modelo de Dados

```sql
-- Estender existente
ALTER TABLE fiscal_documents
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id),
  ADD COLUMN sefaz_validation_status TEXT,
  ADD COLUMN sefaz_validated_at TIMESTAMPTZ,
  ADD COLUMN xml_storage_path TEXT,
  ADD COLUMN cancellation_event JSONB;

CREATE TABLE public.fiscal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  fiscal_document_id UUID NOT NULL REFERENCES fiscal_documents(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('manifestation','cancellation','disagreement','operation_unaware')),
  event_xml TEXT NOT NULL,
  event_protocol TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Storage bucket** (via migration storage): `fiscal-xml` private; policy: leitura por finance/admin do tenant.

### 8.5 Edge Functions

| Nome | Propósito |
|------|-----------|
| `fiscal-webhook-receive` | Recebe XML do Focus NFe, valida, persiste |
| `fiscal-sefaz-consult` | Consulta SEFAZ por chave de acesso |
| `fiscal-3way-match` | Cron: tenta match NF↔Pedido↔Recebimento |

**Secret novo:** `FOCUS_NFE_API_KEY`.

### 8.6 Componentes Frontend
- Reaproveitar `src/pages/DocumentosFiscais.tsx` (já existente). Adicionar modal de download XML, status SEFAZ.

### 8.7 Estimativa
| Papel | PS |
|-------|----|
| BE | 2.5 |
| FE | 1.0 |
| QA | 1.0 |
| **Total** | **4.5** |

### 8.9 Critérios de aceite
- [ ] 100% das NFs recebidas têm XML armazenado.
- [ ] 3-way match auto-resolve ≥ 80% dos casos.

---

<a id="gap-9"></a>

## Gap 9 — Category Management + Sourcing Pipeline

### 9.1 Contexto & Justificativa
Sourcing maduro requer estratégia por categoria (matriz Kraljic, plano de ação, owner). Sem isso, comprador é reativo, não estratégico.

### 9.2 Escopo Funcional (MVP)
- Categorias hierárquicas (3 níveis) ligadas a UNSPSC.
- Estratégia por categoria: posição Kraljic, owner, próximo evento sourcing, savings target.
- Pipeline kanban: ideia → análise → RFx → negociação → contrato → ativo.

### 9.3 Arquitetura
- Reaproveitar `categorias` existente; adicionar campos.
- Nova tabela `category_strategies`.
- `sourcing_pipeline` com FK a `rfx_events` quando aplicável.

### 9.4 Modelo de Dados

```sql
ALTER TABLE categorias
  ADD COLUMN parent_id UUID REFERENCES categorias(id),
  ADD COLUMN unspsc_segment TEXT REFERENCES unspsc_codes(code),
  ADD COLUMN owner_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);

CREATE TYPE kraljic_quadrant AS ENUM ('strategic','leverage','bottleneck','non_critical');

CREATE TABLE public.category_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  categoria_id UUID NOT NULL REFERENCES categorias(id) UNIQUE,
  kraljic kraljic_quadrant NOT NULL,
  annual_spend_target NUMERIC(15,2),
  savings_target_pct NUMERIC(5,2),
  next_sourcing_at DATE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE pipeline_stage AS ENUM ('idea','analysis','rfx','negotiation','contract','active','closed');

CREATE TABLE public.sourcing_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  categoria_id UUID REFERENCES categorias(id),
  title TEXT NOT NULL,
  stage pipeline_stage NOT NULL DEFAULT 'idea',
  estimated_value NUMERIC(15,2),
  estimated_savings_pct NUMERIC(5,2),
  owner_user_id UUID REFERENCES auth.users(id),
  rfx_id UUID REFERENCES rfx_events(id),
  contract_id UUID REFERENCES contracts(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 9.5 Componentes Frontend
- `src/pages/categorias/CategoryStrategy.tsx` — matriz Kraljic interativa.
- `src/pages/categorias/SourcingPipelineKanban.tsx`.
- Reaproveitar `KanbanBoard.tsx` existente.

### 9.7 Estimativa
| Papel | PS |
|-------|----|
| BE | 1.0 |
| FE | 2.0 |
| QA | 0.5 |
| **Total** | **3.5** |

---

<a id="gap-10"></a>

## Gap 10 — Workflow Designer no-code

### 10.1 Contexto & Justificativa
Hoje workflows de aprovação são hard-coded em SQL/triggers. Cliente enterprise exige customização sem código (subprocessos, condicionais, paralelos, time-based).

### 10.2 Escopo Funcional (MVP)
- Designer visual baseado em React Flow (nós: start, condition, approver, parallel, timer, end).
- Persistência JSON BPMN-like (subset).
- Engine que executa instâncias e cria `workflow_steps` dinâmicas.

### 10.3 Modelo de Dados

```sql
CREATE TABLE public.workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  trigger_entity TEXT NOT NULL CHECK (trigger_entity IN ('solicitacao','pedido','contrato','pagamento')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  graph JSONB NOT NULL, -- {nodes:[], edges:[]}
  created_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.workflow_node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL,
  input JSONB,
  output JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### 10.4 Edge Functions

| Nome | Propósito |
|------|-----------|
| `workflow-engine-tick` | Cron 1min: avança instâncias prontas |
| `workflow-instance-start` | Cria instância a partir de evento |
| `workflow-action-callback` | Recebe decisão de approver |

### 10.5 Componentes Frontend
- `src/pages/admin/WorkflowDesigner.tsx` — React Flow.
- `src/components/workflow/NodePalette.tsx`.
- `src/pages/admin/WorkflowInstances.tsx` — observability.

**Dependência:** `reactflow`.

### 10.7 Estimativa
| Papel | PS |
|-------|----|
| BE | 2.5 |
| FE | 3.0 |
| QA | 1.0 |
| **Total** | **6.5** |

### 10.10 Riscos
| Risco | Mitigação |
|-------|-----------|
| Loops infinitos em workflow | Limite de 100 execuções por instância |
| Migração de workflows hard-coded | Manter ambos durante 1 sprint |

---

<a id="consol-migrations"></a>

## 14. Tabela consolidada de migrations

| Gap | Tabelas novas | Enums novos | Funções novas |
|-----|--------------|-------------|---------------|
| 1 | tenants, user_tenants | tenant_status | current_tenant_id, user_belongs_to_tenant |
| 2 | rfx_events, rfx_criteria, rfx_invitations, rfx_responses, rfx_response_criteria, auction_bids | rfx_type, rfx_status | — |
| 3 | unspsc_codes, spend_classifications, spend_cube (mview) | — | — |
| 4 | punchout_catalogs, punchout_sessions | — | — |
| 5 | currencies, exchange_rates | — | fx_convert |
| 6 | sso_configurations, scim_provisioning_log | — | — |
| 7 | erp_connections, erp_field_mappings, erp_sync_log | — | — |
| 8 | fiscal_events (+ ALTER fiscal_documents) | — | — |
| 9 | category_strategies, sourcing_pipeline (+ ALTER categorias) | kraljic_quadrant, pipeline_stage | — |
| 10 | workflow_definitions, workflow_instances, workflow_node_executions | — | — |

**Total:** ~28 novas tabelas, 7 novos enums, 3 novas funções.

---

<a id="consol-edges"></a>

## 15. Tabela consolidada de edge functions

| Gap | Funções |
|-----|---------|
| 1 | set-tenant-context, tenant-provisioning |
| 2 | rfx-orchestrator, rfx-respond-public, auction-place-bid, rfx-cron-close |
| 3 | classify-spend-batch, spend-export |
| 4 | punchout-setup, punchout-receive |
| 5 | fx-sync-daily |
| 6 | scim-v2, sso-jit-provisioning |
| 7 | erp-sync-fornecedores, erp-sync-pedidos, erp-sync-pagamentos, erp-sync-notas, erp-test-connection |
| 8 | fiscal-webhook-receive, fiscal-sefaz-consult, fiscal-3way-match |
| 10 | workflow-engine-tick, workflow-instance-start, workflow-action-callback |

**Total:** 22 novas edge functions.

---

<a id="consol-secrets"></a>

## 16. Tabela consolidada de secrets

| Secret | Para |
|--------|------|
| `PUNCHOUT_ENCRYPTION_KEY` | Gap 4 |
| `FOCUS_NFE_API_KEY` | Gap 8 |
| `EXCHANGE_RATE_API_KEY` (opcional, free tier funciona) | Gap 5 |
| `ERP_DEFAULT_CREDENTIALS_KEY` | Gap 7 (encrypt das creds armazenadas) |
| `SCIM_TOKEN_SIGNING_KEY` | Gap 6 |

Já disponíveis: `LOVABLE_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

<a id="consol-deps"></a>

## 17. Tabela consolidada de dependências npm

| Pacote | Gap | Motivo |
|--------|-----|--------|
| `react-i18next`, `i18next`, `i18next-browser-languagedetector` | 5 | i18n |
| `reactflow` | 10 | Workflow designer |
| `fast-xml-parser` | 4, 8 | Parse cXML/NFe |
| `zod` (já presente) | todos | Validação edge fns |
| `date-fns-tz` | 5 | Timezones em FX |

Edge functions (Deno via esm.sh): `xmldom`, `xmlbuilder2` para Gap 4.

---

<a id="apx-rls"></a>

## Apêndice A — Templates RLS multi-tenant

**Padrão A: tabela com tenant_id e user_id (dado pessoal por usuário dentro do tenant)**
```sql
CREATE POLICY "<tabela> own rows" ON public.<tabela> FOR ALL TO authenticated
USING (tenant_id = current_tenant_id() AND user_id = auth.uid())
WITH CHECK (tenant_id = current_tenant_id() AND user_id = auth.uid());
```

**Padrão B: tabela compartilhada no tenant (todos do tenant veem)**
```sql
CREATE POLICY "<tabela> tenant read" ON public.<tabela> FOR SELECT TO authenticated
USING (tenant_id = current_tenant_id());

CREATE POLICY "<tabela> tenant write" ON public.<tabela> FOR INSERT TO authenticated
WITH CHECK (tenant_id = current_tenant_id() AND has_role(auth.uid(), 'buyer'));
```

**Padrão C: somente admin/coordenador altera**
```sql
CREATE POLICY "<tabela> admin manage" ON public.<tabela> FOR ALL TO authenticated
USING (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'coordinator')))
WITH CHECK (tenant_id = current_tenant_id() AND (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'coordinator')));
```

---

<a id="apx-edge"></a>

## Apêndice B — Padrão de Edge Function

```ts
// supabase/functions/<name>/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({ /* ... */ });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // Auth manual
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user } } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ... lógica

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
```

---

**Fim do documento.**
