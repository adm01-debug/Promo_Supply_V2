-- Gap 10: Workflow Designer & SoD Automatizado

-- Enum para tipos de nós de workflow
CREATE TYPE public.workflow_node_type AS ENUM ('start', 'end', 'approval', 'condition', 'action', 'delay');

-- Enum para status de instância de workflow
CREATE TYPE public.workflow_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- Tabela de Templates de Workflow
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- e.g., 'purchase_order_created', 'invoice_received'
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Nós (Nodes) do Workflow
CREATE TABLE public.workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  type workflow_node_type NOT NULL,
  label TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x INT NOT NULL DEFAULT 0,
  position_y INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Conexões (Edges) do Workflow
CREATE TABLE public.workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  source_node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.workflow_nodes(id) ON DELETE CASCADE,
  condition_expression TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Instâncias de Workflow (Execuções)
CREATE TABLE public.workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  entity_type TEXT NOT NULL, -- e.g., 'purchase_order'
  entity_id UUID NOT NULL,
  status workflow_status NOT NULL DEFAULT 'pending',
  current_node_id UUID REFERENCES public.workflow_nodes(id),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Aprovações de Workflow
CREATE TABLE public.workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.workflow_nodes(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  approver_id UUID REFERENCES auth.users(id), -- Null if pending
  role_required public.app_role,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Logs de Workflow
CREATE TABLE public.workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  node_id UUID REFERENCES public.workflow_nodes(id),
  event_type TEXT NOT NULL, -- 'node_entry', 'node_exit', 'error', 'decision'
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Função para verificar Segregation of Duties (SoD)
CREATE OR REPLACE FUNCTION public.check_workflow_sod(
  p_instance_id UUID,
  p_approver_id UUID,
  p_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator_id UUID;
  v_previous_approver_id UUID;
BEGIN
  -- 1. Verifica se o aprovador é o criador da entidade (e.g., Pedido de Compra)
  -- Assumindo que a entidade tem um campo created_by
  EXECUTE format('SELECT created_by FROM public.purchase_orders WHERE id = %L', p_entity_id) INTO v_creator_id;
  
  IF v_creator_id = p_approver_id THEN
    RETURN FALSE; -- SoD Violation: Creator cannot approve their own request
  END IF;

  -- 2. Verifica se o aprovador já aprovou um passo anterior nesta mesma instância
  SELECT approver_id INTO v_previous_approver_id
  FROM public.workflow_approvals
  WHERE instance_id = p_instance_id
    AND approver_id = p_approver_id
    AND status = 'approved'
  LIMIT 1;

  IF v_previous_approver_id IS NOT NULL THEN
    RETURN FALSE; -- SoD Violation: Same person cannot approve twice in the same flow
  END IF;

  RETURN TRUE;
END;
$$;

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Usando public.current_tenant_id() que deve existir conforme Gap 1)
CREATE POLICY "Tenant isolation for workflow_templates" ON public.workflow_templates
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Tenant isolation for workflow_nodes" ON public.workflow_nodes
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Tenant isolation for workflow_edges" ON public.workflow_edges
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Tenant isolation for workflow_instances" ON public.workflow_instances
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Tenant isolation for workflow_approvals" ON public.workflow_approvals
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Tenant isolation for workflow_logs" ON public.workflow_logs
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());
