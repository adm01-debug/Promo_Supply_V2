-- Restringe as policies de entity_versions a usuarios autenticados.
--
-- Causa: em producao, a tabela `entity_versions` (finalidade: historico/auditoria
-- de versoes de entidades) mantem duas policies para role `public`:
--   - "Users can view versions"  FOR SELECT USING (true)   -> qualquer um, sem login
--   - "Users can insert versions" FOR INSERT WITH CHECK (auth.uid() = changed_by ...)
-- A migration 20260521142029_security_hardening.sql da main ja troca a SELECT por
-- authenticated, mas nao foi aplicada em producao (schema_migrations registra apenas
-- as 2 migrations de 2024). O problema: a role `public` pode hoje ler e escrever
-- esta tabela sem estar autenticada.
--
-- A tabela esta vazia em producao e nao tem consumers ativos (so types.ts).
-- Nenhum codigo consulta entity_versions (git grep: nenhuma referencia fora de
-- migrations e types.ts). A correcao restringe a menor privilegio possivel:
-- leitura e escrita apenas para usuarios autenticados, sem depender de tenant_id
-- (ausente em producao) — mesmo fallback da hardening da main.

BEGIN;

-- SELECT public -> authenticated
DROP POLICY IF EXISTS "Users can view versions" ON public.entity_versions;
DROP POLICY IF EXISTS "Authenticated can view versions" ON public.entity_versions;
CREATE POLICY "Authenticated can view versions"
  ON public.entity_versions FOR SELECT
  TO authenticated
  USING (true);

-- INSERT public -> authenticated
DROP POLICY IF EXISTS "Users can insert versions" ON public.entity_versions;
DROP POLICY IF EXISTS "Authenticated can insert versions" ON public.entity_versions;
CREATE POLICY "Authenticated can insert versions"
  ON public.entity_versions FOR INSERT
  TO authenticated
  WITH CHECK (changed_by IS NULL OR auth.uid() = changed_by);

-- Se aplicada mais de uma vez, garante que as policies antigas da hardening
-- tambem nao fiquem orfas (aplicacao interrompida apos o DROP).
DROP POLICY IF EXISTS "Users can view versions in their tenant" ON public.entity_versions;

COMMIT;