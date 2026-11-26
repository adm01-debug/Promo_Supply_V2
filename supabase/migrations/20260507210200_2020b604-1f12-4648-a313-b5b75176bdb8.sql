-- Strategic Sourcing Infrastructure (Manual Policy Edition)

-- Enums for Sourcing
DO $$ BEGIN
    CREATE TYPE sourcing_type AS ENUM ('rfi', 'rfp', 'rfq', 'auction');
    CREATE TYPE sourcing_status AS ENUM ('draft', 'published', 'in_progress', 'evaluation', 'awarded', 'cancelled');
    CREATE TYPE invitation_status AS ENUM ('pending', 'viewed', 'declined', 'submitted', 'expired');
    CREATE TYPE question_type AS ENUM ('text', 'number', 'single_choice', 'multi_choice', 'file', 'date');
    CREATE TYPE bid_status AS ENUM ('valid', 'rejected', 'withdrawn', 'winning');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Sourcing Events
CREATE TABLE IF NOT EXISTS public.sourcing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  numero text NOT NULL UNIQUE,
  type sourcing_type NOT NULL,
  status sourcing_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categorias(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  budget_estimate numeric(15,2),
  currency text NOT NULL DEFAULT 'BRL',
  starts_at timestamptz,
  closes_at timestamptz NOT NULL,
  evaluation_deadline timestamptz,
  award_deadline timestamptz,
  sealed_bid boolean NOT NULL DEFAULT false,
  auction_config jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Event Lots
CREATE TABLE IF NOT EXISTS public.sourcing_event_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sourcing_events(id) ON DELETE CASCADE,
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

-- 3. Customizable Questionnaires
CREATE TABLE IF NOT EXISTS public.sourcing_event_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sourcing_events(id) ON DELETE CASCADE,
  ordem int NOT NULL DEFAULT 1,
  type question_type NOT NULL,
  pergunta text NOT NULL,
  ajuda text,
  obrigatoria boolean NOT NULL DEFAULT true,
  peso numeric(5,2) NOT NULL DEFAULT 0,
  opcoes jsonb,
  validacao jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Scoring Criteria
CREATE TABLE IF NOT EXISTS public.sourcing_event_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sourcing_events(id) ON DELETE CASCADE,
  nome text NOT NULL,
  peso numeric(5,2) NOT NULL,
  formula text NOT NULL DEFAULT 'inverse_min',
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Invitations
CREATE TABLE IF NOT EXISTS public.sourcing_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sourcing_events(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  email_contato text NOT NULL,
  nome_contato text,
  token text NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  declined_at timestamptz,
  declined_reason text,
  reminder_count int NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  UNIQUE (event_id, fornecedor_id)
);

-- 6. Responses
CREATE TABLE IF NOT EXISTS public.sourcing_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sourcing_events(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.sourcing_invitations(id),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  total_preco numeric(15,2),
  total_score numeric(6,2),
  ranking int,
  observacoes text,
  termos_aceitos boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, fornecedor_id)
);

-- 7. Response Items
CREATE TABLE IF NOT EXISTS public.sourcing_response_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.sourcing_responses(id) ON DELETE CASCADE,
  lot_id uuid NOT NULL REFERENCES public.sourcing_event_lots(id) ON DELETE CASCADE,
  preco_unitario numeric(15,2) NOT NULL,
  preco_total numeric(15,2) NOT NULL,
  prazo_dias int,
  validade_dias int,
  marca text,
  modelo text,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (response_id, lot_id)
);

-- 8. Response Answers
CREATE TABLE IF NOT EXISTS public.sourcing_response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.sourcing_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.sourcing_event_questions(id) ON DELETE CASCADE,
  resposta_text text,
  resposta_number numeric,
  resposta_choice jsonb,
  resposta_file_url text,
  score_manual numeric(5,2),
  UNIQUE (response_id, question_id)
);

-- 9. Auction Bids
CREATE TABLE IF NOT EXISTS public.auction_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sourcing_events(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.sourcing_invitations(id),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  lot_id uuid REFERENCES public.sourcing_event_lots(id),
  amount numeric(15,2) NOT NULL,
  status bid_status NOT NULL DEFAULT 'valid',
  rejection_reason text,
  bid_time timestamptz NOT NULL DEFAULT now(),
  triggered_extension boolean DEFAULT false
);

-- 10. Sourcing Awards
CREATE TABLE IF NOT EXISTS public.sourcing_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.sourcing_events(id) ON DELETE CASCADE,
  lot_id uuid REFERENCES public.sourcing_event_lots(id),
  winner_response_id uuid NOT NULL REFERENCES public.sourcing_responses(id),
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  valor_adjudicado numeric(15,2) NOT NULL,
  saving_estimado numeric(15,2),
  justificativa text NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  pedido_id uuid REFERENCES public.pedidos(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE sourcing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_event_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_event_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_event_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_response_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE sourcing_awards ENABLE ROW LEVEL SECURITY;

-- Policies for organization isolation
CREATE POLICY "tenant_isolation_sourcing_events" ON public.sourcing_events FOR ALL USING (organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "tenant_isolation_sourcing_event_lots" ON public.sourcing_event_lots FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_events WHERE id = event_id AND organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_sourcing_event_questions" ON public.sourcing_event_questions FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_events WHERE id = event_id AND organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_sourcing_event_criteria" ON public.sourcing_event_criteria FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_events WHERE id = event_id AND organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_sourcing_invitations" ON public.sourcing_invitations FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_events WHERE id = event_id AND organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_sourcing_responses" ON public.sourcing_responses FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_events WHERE id = event_id AND organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_sourcing_response_items" ON public.sourcing_response_items FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_responses r JOIN sourcing_events e ON e.id = r.event_id WHERE r.id = response_id AND e.organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_sourcing_response_answers" ON public.sourcing_response_answers FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_responses r JOIN sourcing_events e ON e.id = r.event_id WHERE r.id = response_id AND e.organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_auction_bids" ON public.auction_bids FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_events WHERE id = event_id AND organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "tenant_isolation_sourcing_awards" ON public.sourcing_awards FOR ALL USING (EXISTS (SELECT 1 FROM sourcing_events WHERE id = event_id AND organization_id = (SELECT current_organization_id FROM profiles WHERE user_id = auth.uid())));
