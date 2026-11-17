-- ==================================================================
-- audit_logs - DEFAULT sentinela para as colunas da cadeia de hash
-- ==================================================================
-- A migration 20261117210000 criou sequencia/hash_anterior/registro_hash
-- como NOT NULL sem DEFAULT. Quem preenche os tres e o trigger
-- z_audit_logs_hash (BEFORE INSERT), de forma incondicional:
--     NEW.sequencia     := nextval('public.audit_logs_sequencia_seq');
--     NEW.hash_anterior := coalesce(anterior, 'GENESIS');
--     NEW.registro_hash := encode(sha256(...), 'hex');
-- Como o banco nao declara DEFAULT, o gerador de tipos do Supabase marca as
-- tres colunas como OBRIGATORIAS no tipo Insert de audit_logs. Resultado:
-- src/services/auditService.ts (que nao envia - e nao deve enviar - nenhuma
-- delas) passou a nao compilar, e o workflow types-sync reprovou no Gate 1.
--
-- O DEFAULT abaixo e sentinela: ele e avaliado ANTES dos triggers BEFORE, e o
-- trigger sobrescreve os tres valores em 100% dos INSERTs. Nenhum valor
-- sentinela chega a ser persistido. sequencia usa 0 (e nao nextval) justamente
-- para nao consumir a sequence duas vezes por linha e abrir buracos na cadeia.
-- ==================================================================

ALTER TABLE public.audit_logs
  ALTER COLUMN sequencia     SET DEFAULT 0,
  ALTER COLUMN hash_anterior SET DEFAULT 'PENDENTE',
  ALTER COLUMN registro_hash SET DEFAULT 'PENDENTE';

COMMENT ON COLUMN public.audit_logs.sequencia IS
  'Posicao na cadeia de integridade. Preenchida pelo trigger z_audit_logs_hash; o DEFAULT 0 e sentinela e nunca persiste.';
COMMENT ON COLUMN public.audit_logs.hash_anterior IS
  'Hash do registro anterior da cadeia (GENESIS no primeiro). Preenchida pelo trigger z_audit_logs_hash; o DEFAULT e sentinela e nunca persiste.';
COMMENT ON COLUMN public.audit_logs.registro_hash IS
  'SHA-256 do conteudo canonico + hash_anterior. Preenchida pelo trigger z_audit_logs_hash; o DEFAULT e sentinela e nunca persiste.';