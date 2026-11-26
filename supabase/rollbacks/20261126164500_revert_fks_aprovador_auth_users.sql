-- Reversao de 20261126164500_fks_aprovador_auth_users.sql.
-- Nao e aplicada automaticamente (fica fora de supabase/migrations de proposito).
-- Remove as 10 FKs criadas, devolvendo as colunas ao estado anterior.

BEGIN;

DO $$
DECLARE
  r      RECORD;
  v_nome TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('approval_rules',       'escalacao_para'),
      ('approval_steps',       'aprovador_id'),
      ('approval_steps',       'aprovador_efetivo_id'),
      ('approval_delegations', 'delegante_id'),
      ('approval_delegations', 'delegado_id'),
      ('approval_history',     'usuario_id'),
      ('devolucoes',           'solicitante_id'),
      ('devolucoes',           'aprovador_id'),
      ('licitacoes',           'responsavel_id'),
      ('receiving_checklists', 'inspector_id')
    ) AS t(tabela, coluna)
  LOOP
    v_nome := r.tabela || '_' || r.coluna || '_fkey';

    IF to_regclass('public.' || r.tabela) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM pg_constraint
          WHERE conname  = v_nome
            AND conrelid = ('public.' || r.tabela)::regclass
       ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tabela, v_nome);
    END IF;
  END LOOP;
END $$;

COMMIT;
