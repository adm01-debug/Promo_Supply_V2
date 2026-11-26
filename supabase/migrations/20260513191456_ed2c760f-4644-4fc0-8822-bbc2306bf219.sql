-- 1. Regras de SoD (Segregation of Duties)
CREATE TABLE public.workflow_sod_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  incompatible_roles public.app_role[] NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tarefas de Workflow (Ações de Usuários)
-- Nota: workflow_instances já existe no banco
CREATE TABLE public.workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  assigned_to_role public.app_role,
  assigned_to_user UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected', 'cancelled')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  outcome TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Log de Auditoria Detalhado
CREATE TABLE public.workflow_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.workflow_tasks(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  old_state JSONB,
  new_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.workflow_sod_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento
CREATE POLICY "tenant_isolation_workflow_sod_rules" ON public.workflow_sod_rules
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_workflow_tasks" ON public.workflow_tasks
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation_workflow_audit_log" ON public.workflow_audit_log
  FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id());

-- Índices
CREATE INDEX idx_workflow_tasks_assigned_user ON public.workflow_tasks(assigned_to_user) WHERE status = 'pending';
CREATE INDEX idx_workflow_tasks_instance ON public.workflow_tasks(instance_id);
