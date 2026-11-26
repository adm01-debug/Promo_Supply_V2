-- DB-10 / etapa 153: colunas de pessoa na cadeia de aprovacao, de devolucao e de
-- recebimento sem FK para auth.users, ao contrario das 58 irmas do banco.
--
-- Causa: as FKs para auth.users foram aplicadas tabela a tabela ao longo do tempo e
-- este conjunto ficou de fora. Sem FK, o banco exige que haja um valor (aprovador_id e
-- NOT NULL), mas nao que esse valor seja um usuario real - e um id invalido atravessa
-- o fluxo inteiro (approval_steps.aprovador_id e copiado de approval_rules.escalacao_para,
-- que tambem nao tinha FK) sem nenhuma checagem.
--
-- ON DELETE por coluna:
--   * NO ACTION - identifica responsavel, igual a solicitacoes_aprovador_id_fkey: e o
--     padrao dominante no banco (35 das 59 FKs para auth.users). Apagar o usuario nao
--     pode zerar quem aprovou, quem delegou, quem solicitou ou quem inspecionou;
--   * SET NULL - apenas approval_history.usuario_id, campo de historico, igual a
--     audit_logs_user_id_fkey.
-- Atalho evitado: ON DELETE CASCADE (usado em 20 das 59) apagaria o passo e o historico
-- de aprovacao junto com o usuario desligado.
--
-- ADD CONSTRAINT ... NOT VALID: a FK passa a valer para toda escrita nova sem exigir
-- que o historico ja gravado esteja limpo. Logo depois cada constraint e validada em
-- subtransacao propria; se houver referencia orfa em producao, a validacao daquela
-- constraint e revertida, fica um WARNING no log e as demais seguem validadas - a
-- migration nao aborta e nao deixa nada pela metade.
--
-- Reversao: supabase/rollbacks/20261126164500_revert_fks_aprovador_auth_users.sql

BEGIN;

DO $$
DECLARE
  r      RECORD;
  v_nome TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('approval_rules',       'escalacao_para',       'NO ACTION'),
      ('approval_steps',       'aprovador_id',         'NO ACTION'),
      ('approval_steps',       'aprovador_efetivo_id', 'NO ACTION'),
      ('approval_delegations', 'delegante_id',         'NO ACTION'),
      ('approval_delegations', 'delegado_id',          'NO ACTION'),
      ('approval_history',     'usuario_id',           'SET NULL'),
      ('devolucoes',           'solicitante_id',       'NO ACTION'),
      ('devolucoes',           'aprovador_id',         'NO ACTION'),
      ('licitacoes',           'responsavel_id',       'NO ACTION'),
      ('receiving_checklists', 'inspector_id',         'NO ACTION')
    ) AS t(tabela, coluna, acao)
  LOOP
    IF to_regclass('public.' || r.tabela) IS NULL THEN
      RAISE EXCEPTION 'tabela ausente em producao: public.%', r.tabela;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = r.tabela
         AND column_name  = r.coluna
    ) THEN
      RAISE EXCEPTION 'coluna ausente em producao: public.%.%', r.tabela, r.coluna;
    END IF;

    v_nome := r.tabela || '_' || r.coluna || '_fkey';

    IF EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname  = v_nome
         AND conrelid = ('public.' || r.tabela)::regclass
    ) THEN
      RAISE NOTICE 'ja existe, preservada: %', v_nome;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE %s NOT VALID',
      r.tabela, v_nome, r.coluna, r.acao
    );
    RAISE NOTICE 'criada: %', v_nome;
  END LOOP;
END $$;

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

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname  = v_nome
         AND conrelid = ('public.' || r.tabela)::regclass
         AND convalidated
    ) THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', r.tabela, v_nome);
        RAISE NOTICE 'validada: %', v_nome;
      EXCEPTION WHEN foreign_key_violation THEN
        RAISE WARNING 'permanece NOT VALID por referencia orfa no historico: %', v_nome;
      END;
    END IF;
  END LOOP;
END $$;

COMMIT;
