# Deep-Dive Técnico — Pilar Strategic Sourcing

**Documento:** Blueprint de produto e engenharia
**Escopo:** RFI / RFP / RFQ + Reverse Auctions
**Versão:** 1.0
**Status:** Draft para aprovação arquitetural
**Referência:** `docs/GAPS_ENTERPRISE_WORLD_CLASS.md` (Gap #2)
**Pré-requisito técnico:** Gap #1 (Multi-tenancy) — recomendado, não bloqueante para MVP single-tenant

---

## 1. Contexto Estratégico

### 1.1 Strategic Sourcing vs Tactical Buying

O módulo atual de **Cotação** do Promo Supply (`src/pages/Cotacao.tsx`, `useCotacoes.ts`) implementa **tactical buying**:

- Uma rodada única de coleta de preços
- Captura manual via `CotacaoManualModal`
- Scoring simples (preço, prazo, qualidade) sem ponderação configurável por evento
- Sem fluxo formal de convite, deadline rígido, ou portal externo do fornecedor
- Sem audit trail de quem viu o quê e quando
- Sem suporte a leilão reverso, sealed bid, ou multi-rodada

**Strategic Sourcing** é uma disciplina formal que cobre o ciclo completo de obtenção de propostas competitivas para gastos relevantes (>R$ 50k típicos), com governança, scoring multi-critério ponderado, e adjudicação rastreável.

### 1.2 Por que o módulo atual não cobre RFx

| Capacidade | Cotação atual | Strategic Sourcing |
|---|---|---|
| Tipos de evento | 1 (cotação livre) | 4 (RFI, RFP, RFQ, Auction) |
| Convite formal | Não | Sim, com deadline e token |
| Portal do fornecedor | Não | Sim, sem cadastro (magic link) |
| Questionário customizável | Não | Sim, com peso por pergunta |
| Critérios ponderados por evento | Não | Sim, configurável |
| Multi-lote | Não | Sim |
| Reverse auction tempo real | Não | Sim, com anti-sniping |
| Audit imutável | Parcial | Completo (lance, view, submit) |
| Adjudicação formal | Não | Sim, com justificativa e aprovação |

### 1.3 Benchmarks de mercado

- **SAP Ariba Sourcing** — referência enterprise; suporta RFx, auction, multi-round, optimization solver
- **Coupa Sourcing** — UX moderna, integração nativa com contracts
- **Jaggaer ASO (Advanced Sourcing Optimizer)** — solver matemático para alocação multi-fornecedor
- **Keelvar** — best-of-breed em auctions e bots de sourcing
- **Promena, ScanMarket, EC Sourcing** — players mid-market

### 1.4 ROI esperado

- **Saving incremental:** 4–8% sobre o gasto endereçado (benchmark Hackett, Aberdeen)
- **Redução cycle time:** 30–50% (de média 21 dias para 10–14 dias)
- **Compliance:** 100% dos eventos auditáveis, vs ~40% atual
- **Cobertura:** meta de 60% do spend addressable em sourcing formal no ano 1

---

## 2. Conceitos & Glossário

| Termo | Definição |
|---|---|
| RFI | Request for Information. Qualificação preliminar, sem compromisso comercial. |
| RFP | Request for Proposal. Proposta técnica + comercial; scoring ponderado multi-critério. |
| RFQ | Request for Quotation. Foco em preço; usado quando especificação está fechada. |
| Reverse Auction | Leilão reverso em tempo real; preço cai a cada lance. |
| English Reverse | Lances descendentes públicos; padrão do MVP. |
| Dutch | Preço sobe a partir de patamar baixo; primeiro a aceitar leva (fora de MVP). |
| Japanese | Sistema de "saída" — fornecedor sai quando não aceita patamar (fora de MVP). |
| Sealed Bid | Lances não visíveis até o fim do evento. |
| Open Bid | Lances visíveis para todos os participantes (default English). |
| Bid Decrement | Decremento mínimo entre lances consecutivos (ex: R$ 100 ou 0,5%). |
| Auto-extension / Anti-sniping | Se lance ocorre nos últimos N minutos, prazo estende +N min. |
| Reserve Price | Preço-teto; lances acima são rejeitados. |
| TCO | Total Cost of Ownership — preço + frete + impostos + custo de manutenção. |
| Should-Cost | Custo teórico calculado bottom-up (matéria-prima + mão-de-obra + margem). |
| Lotting | Agrupamento de itens em lotes que recebem lances independentes. |
| Bundling | Lance único cobrindo múltiplos lotes com desconto combinado. |
| Multi-round | Várias rodadas de RFx; comum em RFP → RFQ → Auction. |

---

## 3. Escopo Funcional

### 3.1 MVP (Fase 1)

**RFI / RFP / RFQ:**
- Wizard de criação em 5 passos
- Convite multi-fornecedor (mínimo 3, máximo 50)
- Questionário customizável (texto, número, escolha única, múltipla, anexo)
- Critérios de scoring com pesos configuráveis (soma = 100%)
- Portal público do fornecedor via magic link (sem cadastro no Promo Supply)
- Comparação side-by-side de respostas
- Award com justificativa textual obrigatória
- Audit trail: convite → visualização → submissão → award

**Reverse Auction (English):**
- Agendamento (data início, duração, decrement, reserve price)
- Lembrete automático 24h e 1h antes
- Lances em tempo real via Supabase Realtime
- Anti-sniping (extensão automática)
- Leaderboard ao vivo
- Award automático opcional (lowest bid wins)

### 3.2 Fase 2

- Multi-lote com bid bundling
- Multi-round (RFP → RFQ → Auction encadeados)
- Dutch e Japanese auctions
- Sealed bid mode
- Savings tracker automático (vs preço-base ou histórico)
- Auto-criação de contrato a partir do award

### 3.3 Fora de Escopo

- Should-cost modeling com ML
- Optimization solvers (allocation matemática)
- Supplier discovery via marketplace externo
- e-Signature integrada ao award (usa flow atual `DigitalSignature`)

---

## 4. Modelo de Dados

### 4.1 Enums

```sql
CREATE TYPE sourcing_type AS ENUM ('rfi', 'rfp', 'rfq', 'auction');

CREATE TYPE sourcing_status AS ENUM (
  'draft', 'published', 'in_progress', 'evaluation', 'awarded', 'cancelled'
);

CREATE TYPE auction_type AS ENUM (
  'english_reverse', 'dutch', 'japanese', 'sealed_bid'
);

CREATE TYPE bid_status AS ENUM ('valid', 'rejected', 'withdrawn', 'winning');

CREATE TYPE invitation_status AS ENUM (
  'pending', 'viewed', 'declined', 'submitted', 'expired'
);

CREATE TYPE question_type AS ENUM (
  'text', 'number', 'single_choice', 'multi_choice', 'file', 'date'
);
```

### 4.2 Tabelas (10)

#### 4.2.1 `sourcing_events`

```sql
CREATE TABLE public.sourcing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,                                       -- alinhar com Gap 1
  numero text NOT NULL UNIQUE,                          -- SRC-2025-000123
  type sourcing_type NOT NULL,
  status sourcing_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categorias(id),
  owner_id uuid NOT NULL,                               -- comprador responsável
  budget_estimate numeric(15,2),
  currency text NOT NULL DEFAULT 'BRL',
  starts_at timestamptz,
  closes_at timestamptz NOT NULL,
  evaluation_deadline timestamptz,
  award_deadline timestamptz,
  visibility text NOT NULL DEFAULT 'private',           -- private | public
  sealed_bid boolean NOT NULL DEFAULT false,
  auction_config jsonb,                                 -- ver 4.2.10
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sourcing_events_status ON sourcing_events(status);
CREATE INDEX idx_sourcing_events_owner ON sourcing_events(owner_id);
CREATE INDEX idx_sourcing_events_closes ON sourcing_events(closes_at) WHERE status IN ('published','in_progress');
CREATE INDEX idx_sourcing_events_metadata ON sourcing_events USING GIN(metadata);
```

#### 4.2.2 `sourcing_event_lots`

```sql
CREATE TABLE public.sourcing_event_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES sourcing_events(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 1,
  codigo text,
  nome text NOT NULL,
  descricao text,
  quantidade numeric(15,4) NOT NULL DEFAULT 1,
  unidade text NOT NULL DEFAULT 'UN',
  preco_referencia numeric(15,2),
  especificacoes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lots_event ON sourcing_event_lots(event_id);
```

#### 4.2.3 `sourcing_event_questions`

```sql
CREATE TABLE public.sourcing_event_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES sourcing_events(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 1,
  type question_type NOT NULL,
  pergunta text NOT NULL,
  ajuda text,
  obrigatoria boolean NOT NULL DEFAULT true,
  peso numeric(5,2) NOT NULL DEFAULT 0,                 -- soma com critérios = 100
  opcoes jsonb,                                          -- para single/multi_choice
  validacao jsonb,                                       -- min, max, regex
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_event ON sourcing_event_questions(event_id);
```

#### 4.2.4 `sourcing_event_criteria`

```sql
CREATE TABLE public.sourcing_event_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES sourcing_events(id) ON DELETE CASCADE,
  nome text NOT NULL,                                    -- preço, prazo, qualidade
  peso numeric(5,2) NOT NULL,                            -- soma = 100
  formula text NOT NULL DEFAULT 'inverse_min',          -- inverse_min | inverse_max | manual
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_criteria_event ON sourcing_event_criteria(event_id);

-- Constraint: soma dos pesos = 100
CREATE OR REPLACE FUNCTION validate_criteria_weights() RETURNS TRIGGER AS $$
DECLARE total numeric;
BEGIN
  SELECT COALESCE(SUM(peso),0) INTO total
  FROM sourcing_event_criteria
  WHERE event_id = COALESCE(NEW.event_id, OLD.event_id);
  IF total > 100.01 THEN
    RAISE EXCEPTION 'Soma dos pesos dos critérios excede 100 (atual: %)', total;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
```

#### 4.2.5 `sourcing_invitations`

```sql
CREATE TABLE public.sourcing_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES sourcing_events(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES fornecedores(id),
  email_contato text NOT NULL,
  nome_contato text,
  token text NOT NULL UNIQUE,                            -- JWT assinado, 7 dias
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  declined_at timestamptz,
  declined_reason text,
  reminder_count int NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  ip_first_view inet,
  UNIQUE (event_id, fornecedor_id)
);

CREATE INDEX idx_invitations_event ON sourcing_invitations(event_id);
CREATE INDEX idx_invitations_token ON sourcing_invitations(token);
CREATE INDEX idx_invitations_status ON sourcing_invitations(status);
```

#### 4.2.6 `sourcing_responses`

```sql
CREATE TABLE public.sourcing_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES sourcing_events(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES sourcing_invitations(id),
  fornecedor_id uuid NOT NULL REFERENCES fornecedores(id),
  total_preco numeric(15,2),
  total_score numeric(6,2),                              -- 0-100
  ranking int,
  observacoes text,
  termos_aceitos boolean NOT NULL DEFAULT false,
  ip_submit inet,
  user_agent text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, fornecedor_id)
);

CREATE INDEX idx_responses_event ON sourcing_responses(event_id);
CREATE INDEX idx_responses_score ON sourcing_responses(event_id, total_score DESC);
```

#### 4.2.7 `sourcing_response_items`

```sql
CREATE TABLE public.sourcing_response_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES sourcing_responses(id) ON DELETE CASCADE,
  lot_id uuid NOT NULL REFERENCES sourcing_event_lots(id),
  preco_unitario numeric(15,2) NOT NULL,
  preco_total numeric(15,2) NOT NULL,
  prazo_dias int,
  validade_dias int,
  marca text,
  modelo text,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (response_id, lot_id)
);
```

#### 4.2.8 `sourcing_response_answers`

```sql
CREATE TABLE public.sourcing_response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES sourcing_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES sourcing_event_questions(id),
  resposta_text text,
  resposta_number numeric,
  resposta_choice jsonb,
  resposta_file_url text,
  score_manual numeric(5,2),                             -- avaliação humana
  UNIQUE (response_id, question_id)
);
```

#### 4.2.9 `auction_bids`

```sql
CREATE TABLE public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES sourcing_events(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES sourcing_invitations(id),
  fornecedor_id uuid NOT NULL REFERENCES fornecedores(id),
  lot_id uuid REFERENCES sourcing_event_lots(id),       -- null = bundle do evento todo
  amount numeric(15,2) NOT NULL,
  status bid_status NOT NULL DEFAULT 'valid',
  rejection_reason text,
  bid_time timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  triggered_extension boolean DEFAULT false
);

CREATE INDEX idx_bids_event_time ON auction_bids(event_id, bid_time DESC);
CREATE INDEX idx_bids_supplier ON auction_bids(fornecedor_id);
CREATE INDEX idx_bids_lot ON auction_bids(lot_id) WHERE lot_id IS NOT NULL;
```

#### 4.2.10 `sourcing_awards`

```sql
CREATE TABLE public.sourcing_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES sourcing_events(id) ON DELETE CASCADE,
  lot_id uuid REFERENCES sourcing_event_lots(id),
  winner_response_id uuid NOT NULL REFERENCES sourcing_responses(id),
  fornecedor_id uuid NOT NULL REFERENCES fornecedores(id),
  valor_adjudicado numeric(15,2) NOT NULL,
  saving_estimado numeric(15,2),
  justificativa text NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  pedido_id uuid REFERENCES pedidos(id),                 -- draft gerado
  contract_id uuid REFERENCES contracts(id),             -- draft gerado
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.3 RLS — Padrões

Reutiliza `has_role(_user_id uuid, _role app_role)` já existente.

```sql
ALTER TABLE sourcing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers manage own events"
  ON sourcing_events FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR (has_role(auth.uid(), 'buyer'::app_role) AND owner_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'coordinator'::app_role)
    OR (has_role(auth.uid(), 'buyer'::app_role) AND owner_id = auth.uid())
  );

CREATE POLICY "Viewers read non-draft"
  ON sourcing_events FOR SELECT
  TO authenticated
  USING (status <> 'draft' AND has_role(auth.uid(), 'viewer'::app_role));
```

**RLS de respostas — isolamento entre fornecedores:**

```sql
ALTER TABLE sourcing_responses ENABLE ROW LEVEL SECURITY;

-- Compradores veem todas as respostas de seus eventos
CREATE POLICY "Buyers read responses of own events"
  ON sourcing_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sourcing_events e
      WHERE e.id = sourcing_responses.event_id
        AND (
          has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'coordinator'::app_role)
          OR e.owner_id = auth.uid()
        )
    )
  );

-- Fornecedores acessam APENAS via edge function com token
-- (sem policy direta para anon/authenticated; tudo passa pelo backend)
```

**Bids — leitura controlada por modo (open/sealed):**

```sql
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open auction bids visible during event"
  ON auction_bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sourcing_events e
      WHERE e.id = auction_bids.event_id
        AND e.sealed_bid = false
        AND (
          has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'coordinator'::app_role)
          OR e.owner_id = auth.uid()
        )
    )
  );

CREATE POLICY "Sealed bids only after close"
  ON auction_bids FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sourcing_events e
      WHERE e.id = auction_bids.event_id
        AND e.sealed_bid = true
        AND e.closes_at < now()
        AND (has_role(auth.uid(), 'admin'::app_role) OR e.owner_id = auth.uid())
    )
  );
```

### 4.4 Triggers

```sql
-- Trigger: recalcular total_score ao mudar response_items ou response_answers
CREATE OR REPLACE FUNCTION recalc_response_score() RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.edge_url') || '/sourcing-calculate-scores',
    body := jsonb_build_object('response_id', COALESCE(NEW.response_id, OLD.response_id))::text,
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_recalc_score_items
  AFTER INSERT OR UPDATE OR DELETE ON sourcing_response_items
  FOR EACH ROW EXECUTE FUNCTION recalc_response_score();

-- Trigger: validar decremento e estender auction
CREATE OR REPLACE FUNCTION validate_and_extend_auction() RETURNS TRIGGER AS $$
DECLARE
  evt sourcing_events%ROWTYPE;
  current_lowest numeric;
  decrement numeric;
  reserve numeric;
  ext_minutes int;
BEGIN
  SELECT * INTO evt FROM sourcing_events WHERE id = NEW.event_id;
  IF evt.status NOT IN ('in_progress') THEN
    RAISE EXCEPTION 'Auction not in progress';
  END IF;
  IF NEW.bid_time > evt.closes_at THEN
    RAISE EXCEPTION 'Auction closed';
  END IF;

  decrement := COALESCE((evt.auction_config->>'min_decrement')::numeric, 0);
  reserve := COALESCE((evt.auction_config->>'reserve_price')::numeric, 0);
  ext_minutes := COALESCE((evt.auction_config->>'extension_minutes')::int, 2);

  SELECT MIN(amount) INTO current_lowest
    FROM auction_bids
    WHERE event_id = NEW.event_id
      AND status = 'valid'
      AND COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::uuid) =
          COALESCE(NEW.lot_id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF current_lowest IS NOT NULL AND NEW.amount > current_lowest - decrement THEN
    RAISE EXCEPTION 'Bid must be at least % below current lowest %', decrement, current_lowest;
  END IF;
  IF reserve > 0 AND NEW.amount > reserve THEN
    RAISE EXCEPTION 'Bid above reserve price';
  END IF;

  -- Anti-sniping
  IF evt.closes_at - NEW.bid_time < (ext_minutes || ' minutes')::interval THEN
    UPDATE sourcing_events
       SET closes_at = NEW.bid_time + (ext_minutes || ' minutes')::interval
     WHERE id = NEW.event_id;
    NEW.triggered_extension := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_bid
  BEFORE INSERT ON auction_bids
  FOR EACH ROW EXECUTE FUNCTION validate_and_extend_auction();
```

### 4.5 Função `award_sourcing_event`

```sql
CREATE OR REPLACE FUNCTION award_sourcing_event(
  _event_id uuid,
  _winner_response_id uuid,
  _justificativa text
) RETURNS uuid AS $$
DECLARE
  award_id uuid;
  evt sourcing_events%ROWTYPE;
  resp sourcing_responses%ROWTYPE;
BEGIN
  SELECT * INTO evt FROM sourcing_events WHERE id = _event_id;
  IF evt.owner_id <> auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO resp FROM sourcing_responses WHERE id = _winner_response_id;

  INSERT INTO sourcing_awards (event_id, winner_response_id, fornecedor_id, valor_adjudicado, justificativa, approved_by, approved_at)
  VALUES (_event_id, _winner_response_id, resp.fornecedor_id, resp.total_preco, _justificativa, auth.uid(), now())
  RETURNING id INTO award_id;

  UPDATE sourcing_events SET status = 'awarded', updated_at = now() WHERE id = _event_id;
  RETURN award_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 5. Edge Functions

Padrões obrigatórios (alinhados a `mem://constraints/edge-functions`):
- POST-only (405 em outros métodos), exceto webhooks específicos
- Auth manual via `supabase.auth.getUser(token)` para endpoints internos
- Endpoints públicos do portal validam **token de convite** assinado (HS256, 7 dias)
- CORS configurado, Zod para validação de payload
- Sem `verify_jwt` para edge fns públicas (configurar em `supabase/config.toml`)

### 5.1 Tabela de funções

| Função | Auth | Trigger | Propósito |
|---|---|---|---|
| `sourcing-publish-event` | JWT (buyer/admin) | manual | Validar evento, gerar tokens, enviar emails |
| `sourcing-supplier-portal-auth` | Token público | público | Trocar token de convite por sessão temp |
| `sourcing-submit-response` | Token público | público | Receber e validar resposta do fornecedor |
| `sourcing-calculate-scores` | Service role | DB trigger | Recalcular scoring ponderado |
| `auction-place-bid` | Token público | público | Validar e inserir lance |
| `auction-broadcast-state` | Service role | trigger pós-lance | Push Realtime agregado |
| `sourcing-award-event` | JWT (buyer/admin) | manual | Adjudicar + gerar drafts pedido/contrato |
| `check-sourcing-deadlines` | Service role | cron diário | Lembretes 24h/1h, fechar eventos vencidos |

### 5.2 Skeleton — `auction-place-bid`

```typescript
// supabase/functions/auction-place-bid/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BidSchema = z.object({
  invitation_token: z.string().min(20),
  event_id: z.string().uuid(),
  lot_id: z.string().uuid().nullable().optional(),
  amount: z.number().positive(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = BidSchema.parse(await req.json());
    const secret = Deno.env.get("SOURCING_TOKEN_SECRET")!;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const payload = await verify(body.invitation_token, key) as
      { invitation_id: string; event_id: string; fornecedor_id: string };

    if (payload.event_id !== body.event_id) {
      return new Response(JSON.stringify({ error: "token_mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: max 1 lance / 500ms por fornecedor
    const { data: recent } = await admin.from("auction_bids")
      .select("id, bid_time")
      .eq("fornecedor_id", payload.fornecedor_id)
      .eq("event_id", body.event_id)
      .order("bid_time", { ascending: false })
      .limit(1).maybeSingle();
    if (recent && Date.now() - new Date(recent.bid_time).getTime() < 500) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin.from("auction_bids").insert({
      event_id: body.event_id,
      invitation_id: payload.invitation_id,
      fornecedor_id: payload.fornecedor_id,
      lot_id: body.lot_id ?? null,
      amount: body.amount,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
      user_agent: req.headers.get("user-agent"),
    }).select().single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Broadcast assíncrono (debounce server-side em outra fn)
    await admin.functions.invoke("auction-broadcast-state", {
      body: { event_id: body.event_id },
    });

    return new Response(JSON.stringify({ ok: true, bid: data }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

### 5.3 Skeleton — `sourcing-calculate-scores`

```typescript
// Cálculo ponderado:
//   score_criterio = formula(valor_fornecedor, melhor_valor) * 100
//   total_score = SUM(score_criterio * peso_criterio / 100) + SUM(score_pergunta * peso_pergunta / 100)
// Para preço: inverse_min => menor preço = 100; preço_atual = 100 * (menor / atual)
// Para prazo: inverse_min => menor prazo = 100
// Para qualidade (manual): score_manual de 0-100 entra direto
```

### 5.4 `auction-broadcast-state` — debounce 200ms

```typescript
// Padrão: usar in-memory cache (Map<event_id, timer>) com setTimeout 200ms
// Ao receber novo evento: cancela timer anterior, agenda novo
// Quando timer dispara: faz SELECT do estado atual e .send() no canal
const debouncers = new Map<string, number>();

function scheduleBroadcast(eventId: string, fn: () => Promise<void>) {
  const t = debouncers.get(eventId);
  if (t) clearTimeout(t);
  debouncers.set(eventId, setTimeout(async () => {
    debouncers.delete(eventId);
    await fn();
  }, 200) as unknown as number);
}
```

---

## 6. Fluxos End-to-End

### 6.1 Fluxo RFP

```
[Comprador]
  └─> /sourcing/novo (Wizard 5 passos)
       1. Tipo: RFP
       2. Escopo: lotes, especificações, budget
       3. Fornecedores: seleção via useFornecedores (filtra qualificados)
       4. Critérios + Questionário (pesos = 100)
       5. Revisão + Publish
  └─> sourcing-publish-event
       ├─> Gera token JWT (7d) por convite
       ├─> Envia email (template RFx)
       └─> status = 'published'

[Fornecedor]
  └─> Email com link /portal-sourcing/:token
       ├─> sourcing-supplier-portal-auth valida token
       ├─> Mostra evento, lotes, perguntas
       ├─> Preenche resposta (drafts salvos a cada 30s)
       └─> Submit
            └─> sourcing-submit-response
                 ├─> Valida campos obrigatórios + termos
                 ├─> Insere response + items + answers
                 └─> Trigger -> sourcing-calculate-scores

[Comprador]
  └─> /sourcing/:id (tab Comparativo)
       ├─> ResponseComparator (side-by-side, ordenado por score)
       ├─> ScoringMatrix (heatmap)
       └─> Award
            └─> sourcing-award-event (>R$50k requer aprovação multi-nível)
                 ├─> award_sourcing_event(event, winner)
                 ├─> Cria draft pedido (vincula pedido_id)
                 ├─> Cria draft contract (vincula contract_id)
                 └─> Notifica todos os fornecedores (winner + losers)
```

### 6.2 Fluxo Reverse Auction

```
Pré-condição: RFP/RFQ qualificou N fornecedores

[Comprador]
  └─> /sourcing/:id/auction → "Agendar leilão"
       config: starts_at, duration, min_decrement, reserve_price, extension_minutes
       └─> status = 'published'
            └─> check-sourcing-deadlines envia lembretes 24h e 1h

[Início do auction]
  └─> status = 'in_progress'
  └─> Portal abre para fornecedores convidados
  └─> Frontend: useAuctionRealtime subscribe canal `auction:{event_id}`

[Cada lance]
  Fornecedor → auction-place-bid
    ├─> Valida token + rate limit (500ms)
    ├─> Trigger SQL valida decremento, reserve, deadline
    ├─> Se últimos 2min: estende +2min e marca triggered_extension
    └─> auction-broadcast-state (debounce 200ms)
         └─> channel.send({ type: 'broadcast', event: 'state', payload: {...} })

[Fim do auction]
  └─> check-sourcing-deadlines fecha evento (status = 'evaluation')
  └─> Se config.auto_award = true → award_sourcing_event(lowest_bid)
  └─> Senão → comprador adjudica manualmente
```

### 6.3 Diagrama de estados

```
draft ──publish──> published ──open──> in_progress ──close──> evaluation
                                                                   │
                                                                   ├─award──> awarded
                                                                   │
                                                                   └─cancel─> cancelled

Transições especiais:
  published → cancelled (se nenhum convite aceito antes do start)
  in_progress → cancelled (admin override, motivo obrigatório)
```

---

## 7. UI / Frontend

### 7.1 Páginas

| Rota | Arquivo | Descrição |
|---|---|---|
| `/sourcing` | `src/pages/Sourcing.tsx` | Lista de eventos com filtros (tipo, status, owner, período) |
| `/sourcing/novo` | `src/pages/SourcingWizard.tsx` | Wizard 5 passos |
| `/sourcing/:id` | `src/pages/SourcingDetail.tsx` | Detalhe com 6 tabs |
| `/sourcing/:id/auction` | `src/pages/SourcingAuction.tsx` | Leilão ao vivo |
| `/portal-sourcing/:token` | `src/pages/PortalSourcing.tsx` | Portal público fornecedor |

### 7.2 Componentes (~15)

```
src/components/sourcing/
  SourcingEventCard.tsx              ~120 linhas
  SourcingWizard.tsx                 ~250 linhas (orquestra 5 steps)
  wizard/
    Step1Type.tsx
    Step2Scope.tsx                   (LotEditor inline)
    Step3Suppliers.tsx               (reusa useFornecedores)
    Step4Criteria.tsx                (CriteriaWeightEditor + QuestionEditor)
    Step5Review.tsx
  CriteriaWeightEditor.tsx           ~180 linhas (validação soma=100)
  LotEditor.tsx                      ~200 linhas
  QuestionEditor.tsx                 ~220 linhas
  ResponseComparator.tsx             ~280 linhas (referência: ComparadorCotacoes)
  ScoringMatrix.tsx                  ~150 linhas (heatmap recharts)
  AuctionLiveBoard.tsx               ~300 linhas
  BidHistoryChart.tsx                ~120 linhas (recharts line)
  CountdownTimer.tsx                 ~80 linhas
  AwardDecisionModal.tsx             ~200 linhas
  SupplierPortalForm.tsx             ~350 linhas (mobile-first)
  MagicLinkAuth.tsx                  ~100 linhas
```

Todos respeitam `mem://constraints/file-size` (max 400 linhas).

### 7.3 Hooks

```
src/hooks/
  useSourcingEvents.ts               CRUD + filtros (React Query)
  useSourcingResponses.ts            Lista respostas + scoring
  useAuctionRealtime.ts              Channel Supabase + debounce client (alinhado mem://constraints/query-performance)
  useSourcingScoring.ts              Cálculo client-side preview
  useSourcingDraft.ts                Auto-save draft 30s
```

### 7.4 Stores

```
src/stores/sourcingDraftStore.ts     Zustand persist localStorage
                                     Estado do wizard (steps, validação)
```

### 7.5 Reutilização do código atual

| Atual | Como é reutilizado |
|---|---|
| `useFornecedores` | Lista de fornecedores no Step 3, filtra por qualificação |
| `useApprovalWorkflow` | Award >R$ 50k aciona workflow (mem://features/approval-workflow) |
| `useSupplierQualification` | Bloqueia convite a fornecedores não qualificados |
| `RealNotificationCenter` | Notificações de novos lances, deadline, award |
| `auditService` | Log de view/submit/bid/award |
| `useFeedback` + `Celebration` | Toast no award (mem://design/animations) |
| `ComparadorCotacoes` | UX referência para `ResponseComparator` |
| `DigitalSignature` | Assinatura no aceite de termos pelo fornecedor |
| `KanbanBoard` | Possível visão Kanban dos eventos por status |

### 7.6 Design — Dark Premium

Seguir `mem://design/theme` e `mem://design/layout-spacing`:
- Background `#0a0e1a` com glassmorphism nos cards
- Accent `#3b82f6` para CTAs primários
- Spacing denso (compatível com ERP)
- `recharts` com paleta semantic (`hsl(var(--primary))`, `hsl(var(--destructive))`)
- Animations via tokens já existentes (`celebrate`, `glow-pulse`)

---

## 8. Pontos de Integração

| Sistema atual | Integração |
|---|---|
| `useCotacoes` | RFQ "express" pode reusar lógica simples, ou exportar cotações existentes para sourcing event |
| `Pedidos` (`usePedidos`) | Award gera draft de pedido (`status='rascunho'`) com items do winner |
| `Contratos` (`useContracts`) | Award com `auction_config.recurring=true` gera draft de contract |
| `useApprovalWorkflow` | Threshold R$ 50k aplica workflow multi-nível existente |
| `useSupplierQualification` | Bloqueia convite a fornecedores `score < min_supplier_score` |
| `useBudgetManagement` | Valida `budget_estimate` contra `department_budgets` |
| `auditService` | `audit_logs` recebe entries com `entity_type='sourcing_event'` |
| `useRealNotifications` | Notifica buyer/owner em cada lance e ao final |
| `check-sla-alerts` | Padrão estendido para deadlines de sourcing |

---

## 9. Estimativa Detalhada

| Papel | Pessoas-semana | Detalhe |
|---|---|---|
| Backend (DDL, RLS, triggers, funções SQL) | 4 | 10 tabelas, 5 enums, 6 triggers, 1 função award |
| Edge Functions (8 funções + testes Deno) | 2 | ~150-300 linhas cada |
| Frontend páginas (5) | 4 | Wizard é o mais pesado |
| Frontend componentes (15) | 4 | Mantendo <400 linhas/arquivo |
| Hooks + stores | 1 | 5 hooks, 1 store |
| Realtime infra (broadcast debounce, client subscribe) | 2 | Carga 50 bidders |
| Portal fornecedor (público, mobile-first) | 2 | Página + formulário + auth |
| QA + testes (unit + e2e + carga auction) | 3 | k6 / Playwright |
| Documentação técnica + treinamento | 1 | Vídeos + manual |
| **Total** | **23 pessoas-semana** | ~5,5 meses 1 dev / ~2,5 meses 2 devs paralelos |

Custo aproximado (R$ 25k/pessoa-mês): **R$ 144k**
Saving estimado ano 1 (4% sobre R$ 20M endereçados): **R$ 800k**
ROI: **5,5x no ano 1**

---

## 10. Critérios de Aceite

- [ ] Comprador cria RFP completo (5 fornecedores, 3 lotes, 4 critérios, 6 perguntas) em <5 minutos
- [ ] Fornecedor recebe email, abre portal, submete resposta sem cadastro no Promo Supply
- [ ] Scoring calculado automaticamente em <2s após submit
- [ ] `ResponseComparator` carrega <1s para 10 fornecedores × 5 lotes
- [ ] Auction com 20 bidders simultâneos: latência <500ms entre lance e broadcast
- [ ] Anti-sniping: lance nos últimos 2min estende prazo +2min (verificável em audit)
- [ ] Award gera draft de pedido com items do winner + draft contract (se recorrente)
- [ ] Audit trail: log de view, submit, bid, award com user_id, ip, timestamp
- [ ] RLS: fornecedor A não consegue acessar (via API direta) resposta do fornecedor B
- [ ] Sealed bid: nenhum lance visível antes de `closes_at`, mesmo via SQL direto (RLS bloqueia)
- [ ] Carga: 50 bidders × 100 lances cada não derruba Realtime (testado k6)
- [ ] Mobile: portal fornecedor 100% funcional em 375px de largura
- [ ] WCAG AA em todas as 5 páginas (mem://preference/accessibility)

---

## 11. Riscos & Mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| Latência Realtime >50 bidders | Alta | Debounce server-side 200ms, broadcast agregado, fallback polling 1s |
| Vazamento de respostas (RLS bug) | Crítica | Testes de penetração, audit log de todo SELECT em sourcing_responses, code review obrigatório |
| Adoção dos fornecedores | Alta | Portal mobile-first, sem cadastro, multi-idioma fase 2, vídeo onboarding 90s |
| Conflito legal (auction vinculante?) | Média | Termos de aceite obrigatórios + DigitalSignature + log IP/UA → prova de não-repúdio |
| Performance scoring 50 forn × 20 critérios | Média | Trigger async via edge fn, cache em `total_score` |
| Token JWT vazado/compartilhado | Média | TTL 7 dias, single-use opcional, log de IP, revogação manual |
| Coleta de PII de fornecedores externos | Média | LGPD: política de privacidade no portal, retenção 5 anos pós-evento |
| Edge function timeout (>30s) | Baixa | Operações longas via background; portal usa skeleton/optimistic UI |
| Migração de cotações antigas | Baixa | Importer opcional (não bloqueante para go-live) |

---

## Apêndices

### A. Wireframes ASCII

#### A.1 `/sourcing` (lista)

```
┌─────────────────────────────────────────────────────────────────┐
│  Sourcing Events                                  [+ Novo]      │
├─────────────────────────────────────────────────────────────────┤
│  [Filtros: Tipo ▾] [Status ▾] [Owner ▾] [Período ▾]   🔍 ___   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│  │ SRC-2025-00123 │ │ SRC-2025-00122 │ │ SRC-2025-00121 │       │
│  │ RFP            │ │ AUCTION        │ │ RFI            │       │
│  │ Brindes Q2     │ │ Camisetas 5k un│ │ Mapeamento     │       │
│  │ status: in_pr  │ │ status: live   │ │ status: draft  │       │
│  │ closes 2d 4h   │ │ ⏱ 12min restant│ │ owner: João    │       │
│  │ 8/12 respond   │ │ 6 bidders ativ │ │                │       │
│  └────────────────┘ └────────────────┘ └────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

#### A.2 `/sourcing/:id/auction` (live)

```
┌─────────────────────────────────────────────────────────────────┐
│  AUCTION • SRC-2025-00122 • Camisetas 5.000 un                  │
│  ⏱ 00:11:42 restantes  •  6 bidders ativos  •  reserva R$ 15k   │
├─────────────────────────────────────────────────────────────────┤
│  [Gráfico de lances ─ tempo no X, R$ no Y]                      │
│   R$                                                            │
│   18k ╲___                                                      │
│   16k     ╲___                                                  │
│   14k         ╲___╲___╲___                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Leaderboard (Open Bid)              Eventos                    │
│  ─────────────────────────           ─────────────────────────  │
│  1. Forn ABC   R$ 14.200  🟢 you    14:32 ABC bid R$14.200      │
│  2. Forn XYZ   R$ 14.380              ↑ extended +2min           │
│  3. Forn QWE   R$ 14.500             14:30 XYZ bid R$14.380     │
│  4. Forn JKL   R$ 14.700             ...                        │
└─────────────────────────────────────────────────────────────────┘
```

#### A.3 `/portal-sourcing/:token` (mobile 375px)

```
┌─────────────────────────┐
│ Promo Supply ▸ Portal   │
├─────────────────────────┤
│ Bem-vindo, ABC Brindes  │
│ Evento RFP • Brindes Q2 │
│ Encerra em 2d 4h        │
├─────────────────────────┤
│ LOTES (3)               │
│ ┌─────────────────────┐ │
│ │ 1. Camiseta básica  │ │
│ │ Qtd: 5.000 UN       │ │
│ │ Preço unit: R$ ____ │ │
│ │ Prazo (dias): ____  │ │
│ └─────────────────────┘ │
│ [+ próximo lote]        │
├─────────────────────────┤
│ PERGUNTAS (4)           │
│ 1. Capacidade mensal?   │
│    [____________]       │
│ ...                     │
├─────────────────────────┤
│ ☐ Aceito os termos      │
│ [  Submeter Proposta  ] │
└─────────────────────────┘
```

### B. Payload Realtime `auction:{event_id}`

```json
{
  "type": "broadcast",
  "event": "state",
  "payload": {
    "event_id": "uuid",
    "current_lowest": 14200.00,
    "leader_supplier": "ABC",
    "bid_count": 47,
    "active_bidders": 6,
    "closes_at": "2025-04-21T14:45:00Z",
    "extended": true,
    "last_bid": {
      "amount": 14200.00,
      "supplier_name": "ABC",
      "bid_time": "2025-04-21T14:32:18Z"
    }
  }
}
```

### C. Templates de RLS reutilizáveis

```sql
-- Macro: dono ou role privilegiada
CREATE OR REPLACE FUNCTION owns_or_privileged(_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = _owner
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'coordinator'::app_role);
$$;

-- Aplicar em policies:
-- USING (owns_or_privileged(owner_id))
```

### D. Configuração `supabase/config.toml` (para edge fns públicas)

```toml
[functions.sourcing-supplier-portal-auth]
verify_jwt = false

[functions.sourcing-submit-response]
verify_jwt = false

[functions.auction-place-bid]
verify_jwt = false

[functions.auction-broadcast-state]
verify_jwt = false

[functions.check-sourcing-deadlines]
verify_jwt = false
```

### E. Secrets necessários

| Secret | Uso |
|---|---|
| `SOURCING_TOKEN_SECRET` | HMAC para JWT de convite |
| `RESEND_API_KEY` | Envio de emails (já existe se módulo de notificações usar) |
| `SUPABASE_SERVICE_ROLE_KEY` | Já existe; usado por edge fns admin |

### F. Dependências NPM novas

| Pacote | Uso |
|---|---|
| `react-countdown` (opcional) | CountdownTimer |
| (nenhuma outra crítica — `recharts`, `zod`, `zustand`, `@supabase/supabase-js` já existem) |

### G. Diagrama de dependências entre features

```
Multi-tenancy (Gap 1)  ─── recomendado, não bloqueante p/ MVP single-tenant
        │
        ▼
Strategic Sourcing (Gap 2)
        │
        ├──> usa: useFornecedores, useApprovalWorkflow, useSupplierQualification, auditService
        │
        ▼
Pode habilitar: Category Management (Gap 9), Spend Analytics (Gap 3)
```

---

## Top 3 Decisões Arquiteturais que Precisam de Aprovação

1. **Auth do portal do fornecedor:** magic link (token JWT 7 dias) **sem cadastro** no Promo Supply, vs cadastro completo do fornecedor com login.
   - Recomendação: **magic link** (menor fricção, padrão de mercado em RFx).

2. **Realtime debounce strategy:** broadcast agregado server-side a cada **200ms**, vs cada lance individual.
   - Recomendação: **200ms agregado** para suportar >50 bidders sem flood.

3. **Multi-tenancy bloqueante?** Construir Sourcing já com `tenant_id` em todas as tabelas (mesmo que vazio), vs adicionar em refactor depois.
   - Recomendação: **incluir `tenant_id` desde o início** (custo marginal baixo, evita migration cara depois).

---

**Fim do documento.**
Próximos passos sugeridos:
1. Revisão das 3 decisões acima pelo time de arquitetura
2. Criação do issue épico no tracker com as ~30 sub-tasks
3. Spike de 3 dias no Realtime de auction (validar latência com k6 antes de comprometer roadmap)
