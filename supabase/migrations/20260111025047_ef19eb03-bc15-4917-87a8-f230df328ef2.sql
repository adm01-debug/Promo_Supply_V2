-- Create approval rules table for dynamic matrix
CREATE TABLE public.approval_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_min NUMERIC NOT NULL DEFAULT 0,
  valor_max NUMERIC NOT NULL DEFAULT 999999999,
  categoria_id UUID REFERENCES public.categorias(id),
  aprovadores JSONB NOT NULL DEFAULT '[]', -- Array of approver user_ids with order
  tempo_limite_horas INTEGER NOT NULL DEFAULT 24,
  escalacao_automatica BOOLEAN NOT NULL DEFAULT false,
  escalacao_para UUID, -- user_id to escalate to
  niveis_aprovacao INTEGER NOT NULL DEFAULT 1, -- Number of approval levels
  requer_unanimidade BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  prioridade INTEGER NOT NULL DEFAULT 0, -- For rule ordering/priority
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create approval delegations table
CREATE TABLE public.approval_delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delegante_id UUID NOT NULL, -- User who delegates
  delegado_id UUID NOT NULL, -- User who receives delegation
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  motivo TEXT,
  categorias_permitidas JSONB DEFAULT '[]', -- Optional: restrict to specific categories
  valor_maximo NUMERIC, -- Optional: restrict to value limit
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval workflow instances
CREATE TABLE public.approval_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.approval_rules(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated', 'cancelled')),
  etapa_atual INTEGER NOT NULL DEFAULT 1,
  total_etapas INTEGER NOT NULL DEFAULT 1,
  valor NUMERIC NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id),
  prazo_limite TIMESTAMP WITH TIME ZONE,
  escalado_em TIMESTAMP WITH TIME ZONE,
  escalado_para UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval steps for multi-level approvals
CREATE TABLE public.approval_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.approval_workflows(id) ON DELETE CASCADE,
  etapa INTEGER NOT NULL DEFAULT 1,
  aprovador_id UUID NOT NULL, -- Original approver
  aprovador_efetivo_id UUID, -- Actual approver (may be delegate)
  delegacao_id UUID REFERENCES public.approval_delegations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  comentario TEXT,
  decidido_em TIMESTAMP WITH TIME ZONE,
  prazo_limite TIMESTAMP WITH TIME ZONE,
  notificado_em TIMESTAMP WITH TIME ZONE,
  lembrete_enviado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval history/audit
CREATE TABLE public.approval_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.approval_workflows(id) ON DELETE SET NULL,
  solicitacao_id UUID REFERENCES public.solicitacoes(id) ON DELETE SET NULL,
  step_id UUID REFERENCES public.approval_steps(id) ON DELETE SET NULL,
  acao TEXT NOT NULL CHECK (acao IN ('created', 'approved', 'rejected', 'escalated', 'delegated', 'reminder_sent', 'cancelled')),
  usuario_id UUID,
  usuario_nome TEXT,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval_rules
CREATE POLICY "Authenticated users can view active approval rules"
  ON public.approval_rules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage approval rules"
  ON public.approval_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for approval_delegations
CREATE POLICY "Users can view delegations they are part of"
  ON public.approval_delegations FOR SELECT
  USING (auth.uid() = delegante_id OR auth.uid() = delegado_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create delegations from themselves"
  ON public.approval_delegations FOR INSERT
  WITH CHECK (auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own delegations"
  ON public.approval_delegations FOR UPDATE
  USING (auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete their own delegations"
  ON public.approval_delegations FOR DELETE
  USING (auth.uid() = delegante_id OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for approval_workflows
CREATE POLICY "Authenticated users can view workflows"
  ON public.approval_workflows FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create workflows"
  ON public.approval_workflows FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update workflows"
  ON public.approval_workflows FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for approval_steps
CREATE POLICY "Users can view steps they are assigned to"
  ON public.approval_steps FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Approvers can update their steps"
  ON public.approval_steps FOR UPDATE
  USING (auth.uid() = aprovador_id OR auth.uid() = aprovador_efetivo_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create steps"
  ON public.approval_steps FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for approval_history
CREATE POLICY "Authenticated users can view history"
  ON public.approval_history FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create history"
  ON public.approval_history FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to find applicable approval rule
CREATE OR REPLACE FUNCTION public.find_approval_rule(p_valor NUMERIC, p_categoria_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_rule_id UUID;
BEGIN
  SELECT id INTO v_rule_id
  FROM public.approval_rules
  WHERE ativo = true
    AND p_valor >= valor_min
    AND p_valor <= valor_max
    AND (categoria_id IS NULL OR categoria_id = p_categoria_id)
  ORDER BY 
    CASE WHEN categoria_id IS NOT NULL THEN 0 ELSE 1 END, -- Prefer category-specific rules
    prioridade DESC,
    valor_min DESC
  LIMIT 1;
  
  RETURN v_rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get effective approver (considering delegations)
CREATE OR REPLACE FUNCTION public.get_effective_approver(p_approver_id UUID, p_categoria_id UUID DEFAULT NULL, p_valor NUMERIC DEFAULT NULL)
RETURNS TABLE(approver_id UUID, delegation_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(d.delegado_id, p_approver_id) as approver_id,
    d.id as delegation_id
  FROM (SELECT p_approver_id as uid) base
  LEFT JOIN public.approval_delegations d ON 
    d.delegante_id = p_approver_id
    AND d.ativo = true
    AND now() BETWEEN d.data_inicio AND d.data_fim
    AND (d.categorias_permitidas = '[]'::jsonb OR p_categoria_id IS NULL OR d.categorias_permitidas @> to_jsonb(p_categoria_id))
    AND (d.valor_maximo IS NULL OR p_valor IS NULL OR p_valor <= d.valor_maximo)
  ORDER BY d.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for automatic escalation check
CREATE OR REPLACE FUNCTION public.check_escalation()
RETURNS void AS $$
DECLARE
  v_workflow RECORD;
  v_rule RECORD;
BEGIN
  -- Find workflows that need escalation
  FOR v_workflow IN
    SELECT w.*, r.escalacao_para, r.tempo_limite_horas
    FROM public.approval_workflows w
    JOIN public.approval_rules r ON r.id = w.rule_id
    WHERE w.status = 'pending'
      AND r.escalacao_automatica = true
      AND w.prazo_limite < now()
      AND w.escalado_em IS NULL
  LOOP
    -- Update workflow as escalated
    UPDATE public.approval_workflows
    SET 
      status = 'escalated',
      escalado_em = now(),
      escalado_para = v_workflow.escalacao_para,
      updated_at = now()
    WHERE id = v_workflow.id;
    
    -- Create new step for escalated approver
    INSERT INTO public.approval_steps (
      workflow_id, etapa, aprovador_id, prazo_limite
    ) VALUES (
      v_workflow.id,
      v_workflow.etapa_atual + 1,
      v_workflow.escalacao_para,
      now() + (v_workflow.tempo_limite_horas || ' hours')::interval
    );
    
    -- Log escalation
    INSERT INTO public.approval_history (
      workflow_id, solicitacao_id, acao, detalhes
    ) VALUES (
      v_workflow.id,
      v_workflow.solicitacao_id,
      'escalated',
      jsonb_build_object('escalado_para', v_workflow.escalacao_para, 'motivo', 'Prazo expirado')
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_approval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_approval_rules_updated_at
  BEFORE UPDATE ON public.approval_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_approval_updated_at();

CREATE TRIGGER update_approval_delegations_updated_at
  BEFORE UPDATE ON public.approval_delegations
  FOR EACH ROW EXECUTE FUNCTION public.update_approval_updated_at();

CREATE TRIGGER update_approval_workflows_updated_at
  BEFORE UPDATE ON public.approval_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_approval_updated_at();

-- Enable realtime for workflows and steps
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_steps;