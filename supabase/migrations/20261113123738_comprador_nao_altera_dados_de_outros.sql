-- security(banco): comprador não altera dados de outros nem troca de organização;
-- lê licitações e pagamentos.
--
-- (a) profiles: o próprio usuário trocava current_organization_id/tenant_id e passava a
--     "pertencer" a outra org (get_user_grupo_id/tenant_in_my_group confiam na coluna).
--     Gatilho só aceita org/tenant em que o usuário tem vínculo (user_tenants/tenants);
--     service_role/postgres/sistema passam. profiles_tenant_isolation (PERMISSIVE ALL)
--     deixava qualquer usuário do grupo editar o perfil de outro → vira só SELECT.
-- (b) solicitacoes: tenant_isolation_solicitacoes PERMISSIVE ALL anulava as demais
--     policies (qualquer um do grupo editava/apagava/aprovava qualquer solicitação).
--     Vira RESTRICTIVE + SELECT do grupo (leitura igual a hoje). Comprador cria só
--     'pendente' (auto-aprovação do sistema continua), edita só as próprias enquanto
--     pendente/rejeitada (pode cancelar), e em solicitação aprovada só faz
--     aprovada → em_andamento (Gerar Ordem) sem tocar outras colunas.
-- (c) escrita restrita por papel em department_budgets, estoque, categorias,
--     approval_rules, approval_steps, cost_centers, produtos, produto_fornecedores.
-- (d) comprador lê licitacoes e pagamentos.
--
-- Idempotente: DROP ... IF EXISTS antes de cada CREATE.

-- ───────────────────────── (a) profiles ─────────────────────────
CREATE OR REPLACE FUNCTION public.guard_profile_org_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Só requisições de usuário (PostgREST: role authenticated/anon) são checadas;
  -- service_role, postgres e auth (handle_new_user) passam.
  IF COALESCE(NULLIF(current_setting('role', true), ''), 'none') NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_tenants ut
        WHERE ut.user_id = NEW.user_id AND ut.tenant_id = NEW.tenant_id
     ) THEN
    RAISE EXCEPTION 'Usuário sem vínculo com o tenant %', NEW.tenant_id USING ERRCODE = '42501';
  END IF;

  IF NEW.current_organization_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.current_organization_id IS DISTINCT FROM OLD.current_organization_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.user_tenants ut
         JOIN public.tenants t ON t.id = ut.tenant_id
        WHERE ut.user_id = NEW.user_id AND t.organization_id = NEW.current_organization_id
     ) THEN
    RAISE EXCEPTION 'Usuário sem vínculo com a organização %', NEW.current_organization_id USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a0_guard_profile_org_change ON public.profiles;
CREATE TRIGGER a0_guard_profile_org_change
  BEFORE INSERT OR UPDATE OF tenant_id, current_organization_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_org_change();

DROP POLICY IF EXISTS "profiles_tenant_isolation" ON public.profiles;
CREATE POLICY "profiles_tenant_isolation" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

-- ───────────────────────── (b) solicitacoes ─────────────────────────
CREATE OR REPLACE FUNCTION public.guard_solicitacao_escrita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sistema (postgres/service_role, funções SECURITY DEFINER), admin e coordinator passam.
  IF current_user NOT IN ('authenticated', 'anon')
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'coordinator'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pendente' THEN
      RAISE EXCEPTION 'Solicitação deve ser criada como pendente (recebido: %)', NEW.status USING ERRCODE = '42501';
    END IF;
    IF NEW.organization_id IS NOT NULL AND NEW.organization_id IS DISTINCT FROM public.get_user_grupo_id() THEN
      RAISE EXCEPTION 'Organização da solicitação não é a do usuário' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: fora da própria solicitação ainda não aprovada, só o status pode mudar.
  IF NOT (OLD.solicitante_id = auth.uid() AND OLD.status IN ('pendente', 'rejeitada'))
     AND (to_jsonb(NEW) - ARRAY['status', 'updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta solicitação' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- "a0_" roda antes de a_fill_tenant_id e dos gatilhos de auto-aprovação (ordem alfabética).
DROP TRIGGER IF EXISTS a0_guard_solicitacao_escrita ON public.solicitacoes;
CREATE TRIGGER a0_guard_solicitacao_escrita
  BEFORE INSERT OR UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.guard_solicitacao_escrita();

-- Dado legado: SOL-2026-1008..1010 têm tenant_id = id da ORGANIZAÇÃO (o front envia
-- tenant_id: organizationId; a_fill_tenant_id corrige só inserts novos). Hoje só o admin as vê
-- (policy por papel); com o RESTRICTIVE sumiriam. Corrige para o tenant da org quando ela tem
-- exatamente um tenant. Idempotente: na 2ª execução não acha linha.
UPDATE public.solicitacoes s
   SET tenant_id = t.id
  FROM public.tenants t
 WHERE t.organization_id = s.tenant_id
   AND NOT EXISTS (SELECT 1 FROM public.tenants x WHERE x.id = s.tenant_id)
   AND (SELECT count(*) FROM public.tenants y WHERE y.organization_id = s.tenant_id) = 1;

DROP POLICY IF EXISTS "tenant_isolation_solicitacoes" ON public.solicitacoes;
CREATE POLICY "tenant_isolation_solicitacoes" ON public.solicitacoes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS "solicitacoes_select_grupo" ON public.solicitacoes;
CREATE POLICY "solicitacoes_select_grupo" ON public.solicitacoes
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));

DROP POLICY IF EXISTS "Users can update their own pending requests" ON public.solicitacoes;
DROP POLICY IF EXISTS "solicitacoes_update_proprias_nao_aprovadas" ON public.solicitacoes;
CREATE POLICY "solicitacoes_update_proprias_nao_aprovadas" ON public.solicitacoes
  FOR UPDATE TO authenticated
  USING (solicitante_id = auth.uid() AND status IN ('pendente', 'rejeitada'))
  WITH CHECK (solicitante_id = auth.uid() AND status IN ('pendente', 'cancelada'));

DROP POLICY IF EXISTS "solicitacoes_update_admin_coord" ON public.solicitacoes;
CREATE POLICY "solicitacoes_update_admin_coord" ON public.solicitacoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role));

-- Gerar Ordem (src/pages/gerar-ordem/GerarOrdem.tsx): comprador move aprovada → em_andamento.
DROP POLICY IF EXISTS "solicitacoes_update_comprador_gera_ordem" ON public.solicitacoes;
CREATE POLICY "solicitacoes_update_comprador_gera_ordem" ON public.solicitacoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role) AND status = 'aprovada')
  WITH CHECK (public.has_role(auth.uid(), 'buyer'::app_role) AND status = 'em_andamento');

-- ───────────────────────── (c) escrita por papel ─────────────────────────
-- department_budgets: escrita fica com admin/coordinator e finance (policies existentes).
DROP POLICY IF EXISTS "Users can manage their organization budgets" ON public.department_budgets;

-- estoque: tela /estoque é usada pelo comprador (vincular produto); exclusão só admin/coordinator.
DROP POLICY IF EXISTS "Estoque: gerenciar da própria organização" ON public.estoque;
DROP POLICY IF EXISTS "estoque_insert_papeis" ON public.estoque;
CREATE POLICY "estoque_insert_papeis" ON public.estoque
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_grupo_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))
  );
DROP POLICY IF EXISTS "estoque_update_papeis" ON public.estoque;
CREATE POLICY "estoque_update_papeis" ON public.estoque
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_grupo_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))
  )
  WITH CHECK (
    organization_id = public.get_user_grupo_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))
  );
DROP POLICY IF EXISTS "estoque_delete_admin_coord" ON public.estoque;
CREATE POLICY "estoque_delete_admin_coord" ON public.estoque
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_grupo_id()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role))
  );

-- categorias
DROP POLICY IF EXISTS "Users can manage their organization categories" ON public.categorias;
DROP POLICY IF EXISTS "categorias_escrita_admin_coord" ON public.categorias;
CREATE POLICY "categorias_escrita_admin_coord" ON public.categorias
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role));

-- approval_rules
DROP POLICY IF EXISTS "Users can manage their organization rules" ON public.approval_rules;
DROP POLICY IF EXISTS "approval_rules_escrita_admin_coord" ON public.approval_rules;
CREATE POLICY "approval_rules_escrita_admin_coord" ON public.approval_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role));

-- approval_steps: tenant vira RESTRICTIVE; leitura do grupo mantida (approveStep lê todas as
-- etapas do workflow); comprador cria etapas só do workflow da própria solicitação
-- (createWorkflow em useApprovalWorkflow.ts); skip só em workflow já rejeitado (rejectStep).
DROP POLICY IF EXISTS "tenant_isolation_approval_steps" ON public.approval_steps;
CREATE POLICY "tenant_isolation_approval_steps" ON public.approval_steps
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));
DROP POLICY IF EXISTS "approval_steps_select_grupo" ON public.approval_steps;
CREATE POLICY "approval_steps_select_grupo" ON public.approval_steps
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));
DROP POLICY IF EXISTS "approval_steps_escrita_admin_coord" ON public.approval_steps;
CREATE POLICY "approval_steps_escrita_admin_coord" ON public.approval_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role));
DROP POLICY IF EXISTS "approval_steps_insert_workflow_proprio" ON public.approval_steps;
CREATE POLICY "approval_steps_insert_workflow_proprio" ON public.approval_steps
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.approval_workflows w
      JOIN public.solicitacoes s ON s.id = w.solicitacao_id
     WHERE w.id = approval_steps.workflow_id AND s.solicitante_id = auth.uid()
  ));
DROP POLICY IF EXISTS "approval_steps_skip_workflow_rejeitado" ON public.approval_steps;
CREATE POLICY "approval_steps_skip_workflow_rejeitado" ON public.approval_steps
  FOR UPDATE TO authenticated
  USING (status = 'pending' AND EXISTS (
    SELECT 1 FROM public.approval_workflows w WHERE w.id = approval_steps.workflow_id AND w.status = 'rejected'
  ))
  WITH CHECK (status = 'skipped');

-- cost_centers: tenant vira RESTRICTIVE; leitura do grupo mantida; escrita admin/coordinator.
DROP POLICY IF EXISTS "tenant_isolation_cost_centers" ON public.cost_centers;
CREATE POLICY "tenant_isolation_cost_centers" ON public.cost_centers
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_in_my_group(tenant_id))
  WITH CHECK (public.tenant_in_my_group(tenant_id));
DROP POLICY IF EXISTS "cost_centers_select_grupo" ON public.cost_centers;
CREATE POLICY "cost_centers_select_grupo" ON public.cost_centers
  FOR SELECT TO authenticated
  USING (public.tenant_in_my_group(tenant_id));
DROP POLICY IF EXISTS "cost_centers_escrita_admin_coord" ON public.cost_centers;
CREATE POLICY "cost_centers_escrita_admin_coord" ON public.cost_centers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role));

-- produtos: catálogo (/catalogo-produtos) é mantido pelo comprador via policy com tenant;
-- a policy de INSERT sem checagem de tenant deixava criar produto em outra org.
DROP POLICY IF EXISTS "Buyers can insert produtos" ON public.produtos;

-- produto_fornecedores: escrita exige papel (admin/coordinator/buyer — ProductSupplierManager
-- no catálogo); leitura por tenant mantida.
DROP POLICY IF EXISTS "Users can manage product suppliers within tenant" ON public.produto_fornecedores;
DROP POLICY IF EXISTS "produto_fornecedores_escrita_papeis" ON public.produto_fornecedores;
CREATE POLICY "produto_fornecedores_escrita_papeis" ON public.produto_fornecedores
  FOR ALL TO authenticated
  USING (
    public.tenant_in_my_group(tenant_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))
  )
  WITH CHECK (
    public.tenant_in_my_group(tenant_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(auth.uid(), 'buyer'::app_role))
  );

-- ───────────────────────── (d) comprador lê ─────────────────────────
DROP POLICY IF EXISTS "licitacoes_select_comprador" ON public.licitacoes;
CREATE POLICY "licitacoes_select_comprador" ON public.licitacoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role));

DROP POLICY IF EXISTS "pagamentos_select_comprador" ON public.pagamentos;
CREATE POLICY "pagamentos_select_comprador" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'buyer'::app_role));
