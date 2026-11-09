"""Regressões offline do gerador de regras; não acessam banco nem APIs de LLM."""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("generate.py")
SPEC = importlib.util.spec_from_file_location("context_rules_generate", SCRIPT)
generator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(generator)


class CurrentSqlSourcesTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="context-rules-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.files = []

    def write(self, name, content):
        file = self.root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content, encoding="utf-8")
        self.files.append(file)
        return file

    def schema(self):
        return generator.parse_sql_schema(self.root, self.files)

    def test_foreign_migration_cannot_replace_current_table(self):
        current = "supabase/migrations/20260101000000_orders.sql"
        self.write(current, "CREATE TABLE public.orders (id uuid, created_at timestamptz);")
        self.write("supabase/migrations/_foreign/another-project/20250101000000_orders.sql",
                   "CREATE TABLE public.orders (id uuid, changed_at timestamptz);")
        schema = self.schema()
        self.assertEqual([c["name"] for c in schema["tables"]["orders"]["columns"]], ["id", "created_at"])
        self.assertEqual(schema["tables"]["orders"]["src"], current)
        self.assertEqual(schema["sources"], [current])

    def test_superseded_migration_cannot_undo_current_changes(self):
        self.write("supabase/migrations/20260101000000_orders.sql", "CREATE TABLE public.orders (id uuid);")
        self.write("supabase/migrations/20260102000000_status.sql", "ALTER TABLE public.orders ADD COLUMN status text;")
        self.write("supabase/migrations/_superseded/20250101000000_orders.sql", "DROP TABLE public.orders;")
        schema = self.schema()
        self.assertIn("orders", schema["tables"])
        self.assertEqual([c["name"] for c in schema["tables"]["orders"]["columns"]], ["id", "status"])
        self.assertEqual(len(schema["sources"]), 2)

    def test_archived_objects_do_not_contribute_to_schema_or_rules(self):
        sql = """
CREATE TYPE order_state AS ENUM ('open', 'done');
CREATE TABLE public.orders (id uuid PRIMARY KEY, status order_state DEFAULT 'open', amount numeric CHECK (amount >= 0));
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING (true);
CREATE FUNCTION public.ensure_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'amount cannot be negative';
  RETURN NEW;
END;
$$;
CREATE TRIGGER ensure_order_before BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.ensure_order();
CREATE INDEX orders_status ON public.orders (status);
CREATE VIEW public.open_orders AS SELECT * FROM public.orders;
GRANT SELECT ON public.orders TO authenticated;
COMMENT ON TABLE public.orders IS 'Current orders';
SELECT cron.schedule('daily_orders', '0 0 * * *', $$SELECT 1$$);
"""
        self.write("supabase/migrations/20260101000000_orders.sql", sql)
        self.write("supabase/seed.sql", "INSERT INTO public.orders (id) VALUES ('current');")
        expected = self.schema()
        for key in ("tables", "policies", "triggers", "functions", "enums", "indexes", "cron_jobs",
                    "views", "rls", "grants", "raises", "seed", "comments"):
            self.assertTrue(expected[key], key)
        self.write("supabase/migrations/_foreign/old-project/20240101000000_schema.sql",
                   sql.replace("orders", "foreign_orders").replace("order_state", "foreign_state").replace("ensure_order", "ensure_foreign"))
        self.write("supabase/migrations/_superseded/20240102000000_seed.sql", "INSERT INTO public.orders (id) VALUES ('historical');")
        self.assertEqual(self.schema(), expected)

    def test_archive_only_repository_has_no_current_sql_schema(self):
        self.write("db/migrations/_foreign/old.sql", "CREATE TABLE old_foreign (id uuid);")
        self.write("db/migrations/_superseded/old.sql", "CREATE TABLE old_superseded (id uuid);")
        schema = self.schema()
        self.assertEqual(schema["sources"], [])
        self.assertEqual(schema["tables"], {})

    def test_exact_directory_names_leave_other_sql_sources_visible(self):
        # O nome de um diretório acima da raiz do repo não muda seu significado.
        self.root = self.root / "_foreign" / "project"
        paths = [
            "supabase/migrations/_foreign.sql",
            "supabase/migrations/_superseded.sql",
            "supabase/migrations/customer_foreign/active.sql",
            "supabase/migrations/_superseded_backup/active.sql",
            "packages/store/prisma/migrations/20260101/active.sql",
            "db/current.sql",
            "sql/current.sql",
            "database/current.sql",
            "prisma/current.sql",
            "custom/schema.sql",
        ]
        for index, name in enumerate(paths):
            self.write(name, f"CREATE TABLE current_{index} (id uuid);")
        schema = self.schema()
        self.assertEqual(schema["sources"], sorted(paths))
        self.assertEqual(set(schema["tables"]), {f"current_{i}" for i in range(len(paths))})

    def test_current_prisma_and_types_fallback_remain_available(self):
        self.write("prisma/schema.prisma", "model Store {\n id String @id\n}\n")
        self.write("src/database.types.ts", """
export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
        }
      }
    }
  }
}
""")
        schema = self.schema()
        self.assertEqual(set(schema["tables"]), {"Store", "customers"})
        self.assertEqual(schema["tables"]["Store"]["origin"], "prisma")
        self.assertEqual(schema["tables"]["customers"]["origin"], "types.ts")

    def test_archived_sql_is_not_current_code_but_remains_in_file_inventory(self):
        current = self.write("supabase/migrations/20260101000000_retention.sql", "SELECT now() - interval '7 days';")
        archived = self.write("supabase/migrations/_superseded/20250101000000_retention.sql", "SELECT now() - interval '365 days';")
        self.assertTrue(generator.analyze_code_file(current, self.root)["temporal"])
        self.assertIsNone(generator.analyze_code_file(archived, self.root))
        files = generator.walk_repo(self.root, self.root / "output")
        self.assertEqual(set(files), {current, archived})

    def test_cli_rules_profile_uses_current_schema_and_temporal_rules(self):
        current = "supabase/migrations/20260101000000_orders.sql"
        archived = "supabase/migrations/_superseded/20250101000000_orders.sql"
        self.write(current, "CREATE TABLE public.orders (id uuid, created_at timestamptz);\nSELECT now() - interval '7 days';")
        self.write(archived, "CREATE TABLE public.orders (id uuid, historical_status text);\nSELECT now() - interval '365 days';")
        subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.root), "--out", "output",
                        "--profile", "regras", "--no-pointer"], check=True, capture_output=True, text=True, timeout=30)
        context = json.loads((self.root / "output/context.json").read_text(encoding="utf-8"))
        self.assertEqual(context["schema"]["sources"], [current])
        self.assertEqual([c["name"] for c in context["schema"]["tables"]["orders"]["columns"]], ["id", "created_at"])
        self.assertEqual(context["rules"]["temporal"], [{"file": current, "line": "SELECT now() - interval '7 days';"}])
        self.assertIn(current, context["code_files"])
        self.assertNotIn(archived, context["code_files"])
        self.assertEqual(context["meta"]["files_total"], 2)
        rendered = (self.root / "output/07-REGRAS-DE-NEGOCIO.md").read_text(encoding="utf-8")
        self.assertIn("7 days", rendered)
        self.assertNotIn("365 days", rendered)
        self.assertNotIn("historical_status", rendered)
        self.assertFalse((self.root / "AGENTS.md").exists())


MIG = "supabase/migrations/"


class EmbeddedDdlTests(unittest.TestCase):
    """DDL que o parser plano não via: bloco DO, EXECUTE, ALTER composto, DROP em cascata."""
    setUp = CurrentSqlSourcesTests.setUp
    write = CurrentSqlSourcesTests.write
    schema = CurrentSqlSourcesTests.schema

    def policies(self, schema=None):
        return {(p["table"], p["name"]): p for p in (schema or self.schema())["policies"]}

    def test_static_ddl_inside_do_block_is_applied_in_order(self):
        self.write(MIG + "001.sql", """
CREATE TYPE app_role AS ENUM ('admin');
CREATE TABLE public.produtos (id uuid);
CREATE POLICY "antiga" ON public.produtos FOR SELECT USING (true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'produtos' AND policyname = 'Buyers can insert produtos') THEN
    CREATE POLICY "Buyers can insert produtos" ON public.produtos FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'buyer'));
  END IF;
  DROP POLICY IF EXISTS "antiga" ON public.produtos;
  ALTER TYPE app_role ADD VALUE 'supplier';
  ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
  CREATE TRIGGER trg_produtos BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.touch();
END $$;
""")
        schema = self.schema()
        self.assertEqual(set(self.policies(schema)), {("produtos", "Buyers can insert produtos")})
        self.assertEqual(self.policies(schema)[("produtos", "Buyers can insert produtos")]["cmd"], "INSERT")
        self.assertEqual(schema["enums"]["app_role"], ["admin", "supplier"])
        self.assertEqual(schema["rls"], {"produtos": "enabled"})
        self.assertEqual([t["name"] for t in schema["triggers"]], ["trg_produtos"])
        self.assertEqual(schema["dynamic_ddl"], [])

    def test_execute_format_over_literal_array_and_helper_call(self):
        self.write(MIG + "001.sql", """
CREATE TABLE public.pedidos (id uuid);
CREATE TABLE public.contratos (id uuid, tenant_id uuid);
CREATE POLICY tenant_isolation_pedidos ON public.pedidos FOR ALL USING (id IS NOT NULL);
DO $$
DECLARE
  t_name text;
  alvo text[] := ARRAY['pedidos', 'tabela_que_nao_existe'];
BEGIN
  FOREACH t_name IN ARRAY alvo LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID', t_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || t_name, t_name);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', 'tenant_isolation_' || t_name, t_name);
    END IF;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.add_tenant(p_table text) RETURNS void AS $fn$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id())', 'Tenant de ' || p_table, p_table);
END;
$fn$ LANGUAGE plpgsql;
SELECT add_tenant('contratos');
""")
        schema = self.schema()
        policies = self.policies(schema)
        self.assertEqual(set(policies), {("pedidos", "tenant_isolation_pedidos"), ("contratos", "Tenant de contratos")})
        isolation = policies[("pedidos", "tenant_isolation_pedidos")]
        self.assertEqual((isolation["roles"], isolation["using"], isolation["check"]),
                         ("authenticated", "tenant_id = public.current_tenant_id()", "tenant_id = public.current_tenant_id()"))
        self.assertEqual(schema["rls"], {"pedidos": "enabled", "contratos": "enabled"})
        self.assertEqual([c["name"] for c in schema["tables"]["pedidos"]["columns"]], ["id", "tenant_id"])
        self.assertEqual(set(schema["tables"]), {"pedidos", "contratos"})  # tabela inexistente não vira tabela fantasma
        self.assertEqual(schema["dynamic_ddl"], [])

    def test_dollar_quoted_execute_and_catalog_conditions(self):
        self.write(MIG + "001.sql", """
CREATE TABLE public.versoes (id uuid);
CREATE TABLE public.perfis (id uuid, tenant_id uuid);
CREATE POLICY "ja existe" ON public.perfis FOR SELECT USING (false);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'versoes' AND column_name = 'tenant_id') THEN
    EXECUTE $POL$ CREATE POLICY "por tenant" ON public.versoes FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id()) $POL$;
  ELSE
    EXECUTE $POL$ CREATE POLICY "so autenticado" ON public.versoes FOR SELECT TO authenticated USING (true) $POL$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'perfis' AND policyname = 'ja existe') THEN
    CREATE POLICY "ja existe" ON public.perfis FOR SELECT USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'tenant_id') THEN
    EXECUTE 'CREATE POLICY "perfis por tenant" ON public.perfis FOR SELECT USING (tenant_id = public.current_tenant_id())';
  END IF;
END $$;
""")
        schema = self.schema()
        policies = self.policies(schema)
        self.assertEqual(set(policies), {("versoes", "so autenticado"), ("perfis", "ja existe"), ("perfis", "perfis por tenant")})
        self.assertEqual(policies[("perfis", "ja existe")]["using"], "false")  # a política que já existia não é recriada
        self.assertEqual(schema["dynamic_ddl"], [])

    def test_runtime_only_ddl_is_reported_instead_of_silently_ignored(self):
        self.write(MIG + "001.sql", """
CREATE TABLE public.logs (id uuid, user_id uuid);
CREATE POLICY "aberta" ON public.logs FOR INSERT WITH CHECK (true);
""")
        self.write(MIG + "002.sql", """
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'logs' AND cmd = 'INSERT' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.logs', pol.policyname);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'aberta' AND qual = 'true') THEN
    CREATE POLICY "restrita" ON public.logs FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;
""")
        schema = self.schema()
        self.assertEqual([d["src"] for d in schema["dynamic_ddl"]], [MIG + "002.sql"] * 2)
        self.assertIn("DROP POLICY IF EXISTS %I ON public.logs", schema["dynamic_ddl"][0]["stmt"])
        self.assertIn('CREATE POLICY "restrita"', schema["dynamic_ddl"][1]["stmt"])
        subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.root), "--out", "output", "--profile", "regras",
                        "--no-pointer"], check=True, capture_output=True, text=True, timeout=30)
        context = json.loads((self.root / "output/context.json").read_text(encoding="utf-8"))
        self.assertEqual([i["where"] for i in context["audit"]["issues"] if i["kind"] == "ddl dinâmico"], [[MIG + "002.sql"]])
        for name in ("07-REGRAS-DE-NEGOCIO.md", "10-ACESSO-E-SEGURANCA.md"):
            rendered = (self.root / "output" / name).read_text(encoding="utf-8")
            self.assertIn("NÃO VERIFICADO:** 2 comando(s) em 1 migration(s)", rendered, name)
            self.assertIn("`logs`", rendered.split("NÃO VERIFICADO:**")[1].split("\n")[0], name)

    def test_alter_function_changes_what_the_audit_says_about_security_definer(self):
        definer = "RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NULL; END; $$;"
        self.write(MIG + "001.sql", f"""
CREATE FUNCTION public.corrigida() {definer}
CREATE FUNCTION public.varrida() {definer}
ALTER FUNCTION public.corrigida() SET search_path = public;
""")
        self.write(MIG + "002.sql", """
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid, p.proname FROM pg_proc p WHERE p.prosecdef LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', r.proname, pg_get_function_identity_arguments(r.oid));
  END LOOP;
END $$;
""")
        self.write(MIG + "003.sql", f"CREATE FUNCTION public.nova() {definer}")
        schema = self.schema()
        self.assertEqual({n: f["search_path"] for n, f in schema["functions"].items()}, {"corrigida": True, "varrida": False, "nova": False})
        subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.root), "--out", "output", "--profile", "regras",
                        "--no-pointer"], check=True, capture_output=True, text=True, timeout=30)
        issues = [i["msg"] for i in json.loads((self.root / "output/context.json").read_text(encoding="utf-8"))["audit"]["issues"] if i["kind"] == "segurança"]
        self.assertEqual(len(issues), 2, issues)
        self.assertIn("`varrida`", issues[0])
        self.assertIn("002.sql` aplica `ALTER FUNCTION … SET search_path` em runtime depois dela — NÃO VERIFICADO", issues[0])
        self.assertEqual(issues[1], "função `nova` é SECURITY DEFINER sem `set search_path` (risco de escalação)")

    def test_drop_table_view_and_function_take_their_dependents(self):
        self.write(MIG + "001.sql", """
CREATE TABLE public.tokens (id uuid);
CREATE TABLE public.outra (id uuid);
CREATE TABLE public.mycascade (id uuid);
CREATE TABLE public.b (id uuid);
CREATE TABLE public.c (id uuid);
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dona" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "fica" ON public.outra FOR SELECT USING (true);
CREATE TRIGGER trg_tokens BEFORE INSERT ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.f();
CREATE INDEX idx_tokens ON public.tokens (id);
CREATE VIEW public.v_tokens AS SELECT * FROM public.tokens;
CREATE FUNCTION public.scan(_limite numeric) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'limite antigo'; END; $$;
CREATE OR REPLACE FUNCTION public.scan() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RAISE EXCEPTION 'sem limite'; END; $$;
CREATE FUNCTION public.some() RETURNS void LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'vai sumir'; END; $$;
""")
        self.write(MIG + "002.sql", """
DROP TABLE IF EXISTS public.tokens CASCADE;
DROP TABLE public.mycascade;
DROP TABLE "b", public.c;
DROP VIEW IF EXISTS public.v_tokens;
DROP FUNCTION IF EXISTS public.scan(numeric);
DROP FUNCTION public.some();
""")
        schema = self.schema()
        self.assertEqual(set(schema["tables"]), {"outra"})
        self.assertEqual(set(self.policies(schema)), {("outra", "fica")})
        self.assertEqual((schema["triggers"], schema["indexes"], schema["rls"], schema["views"]), ([], [], {}, {}))
        self.assertEqual(set(schema["functions"]), {"scan"})  # a sobrecarga scan() continua existindo
        self.assertTrue(schema["functions"]["scan"]["security_definer"])
        self.assertEqual([r["msg"] for r in schema["raises"]], ["sem limite"])

    def test_alter_table_with_several_actions_and_trigger_update_of_columns(self):
        self.write(MIG + "001.sql", """
CREATE TABLE public.contratos (id uuid, status text, CONSTRAINT contratos_status_check CHECK (status IN ('rascunho')));
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS multa numeric(10,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS observacao text DEFAULT 'a, b',
  ADD COLUMN IF NOT EXISTS score numeric CHECK (score >= 0);
ALTER TABLE public.contratos DROP CONSTRAINT IF EXISTS contratos_status_check, ADD CONSTRAINT contratos_status_check CHECK (status IN ('rascunho', 'ativo'));
CREATE TRIGGER trg_recalcula AFTER INSERT OR UPDATE OF multa, score OR DELETE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.recalcula();
ALTER TABLE public.contratos RENAME TO acordos;
""")
        schema = self.schema()
        self.assertEqual([c["name"] for c in schema["tables"]["acordos"]["columns"]], ["id", "status", "multa", "observacao", "score"])
        self.assertEqual(schema["tables"]["acordos"]["constraints"], ["constraint contratos_status_check CHECK (status IN ('rascunho', 'ativo'))"])
        self.assertEqual([(t["name"], t["table"], t["when"]) for t in schema["triggers"]],
                         [("trg_recalcula", "acordos", "AFTER INSERT OR UPDATE OF MULTA, SCORE OR DELETE")])

    def test_create_if_not_exists_keeps_first_definition_and_alter_policy_wins(self):
        self.write(MIG + "001.sql", """
CREATE TYPE tenant_status AS ENUM ('trial', 'active');
CREATE TABLE IF NOT EXISTS public.tenants (id uuid, status tenant_status NOT NULL DEFAULT 'trial');
CREATE POLICY membros ON public.tenants FOR ALL TO authenticated USING (id IS NOT NULL);
""")
        self.write(MIG + "002.sql", """
CREATE TABLE IF NOT EXISTS public.tenants (id uuid, status TEXT NOT NULL DEFAULT 'active');
ALTER POLICY membros ON public.tenants TO authenticated, service_role USING (public.pertence(id)) WITH CHECK (public.pertence(id));
ALTER POLICY membros ON public.tenants RENAME TO "membros do tenant";
COMMENT ON TABLE public.tenants IS 'cliente -- não é comentário';
CREATE TABLE public.depois_do_comentario (id uuid);
""")
        schema = self.schema()
        self.assertEqual(schema["tables"]["tenants"]["columns"][1]["type"], "tenant_status NOT NULL DEFAULT 'trial'")
        policy = self.policies(schema)[("tenants", "membros do tenant")]
        self.assertEqual((policy["roles"], policy["using"], policy["check"], policy["src"]),
                         ("authenticated, service_role", "public.pertence(id)", "public.pertence(id)", MIG + "002.sql"))
        self.assertEqual(schema["comments"]["table:tenants"], "cliente -- não é comentário")
        self.assertIn("depois_do_comentario", schema["tables"])

    def test_views_of_generated_types_are_not_tables_without_rls(self):
        self.write("src/integrations/supabase/types.ts", """
export type Database = {
  public: {
    Tables: {
      pedidos: {
        Row: {
          id: string
        }
      }
    }
    Views: {
      v_resumo: {
        Row: {
          total: number | null
        }
      }
    }
  }
}
""")
        schema = self.schema()
        self.assertEqual(set(schema["tables"]), {"pedidos"})
        self.assertEqual(set(schema["views"]), {"v_resumo"})


class CodeExtractionTruthTests(unittest.TestCase):
    """O que sai do código tem de bater com o código: valor inteiro, nada de fragmento apresentado como regra."""
    setUp = CurrentSqlSourcesTests.setUp
    write = CurrentSqlSourcesTests.write

    def analyze(self, name, content):
        return generator.analyze_code_file(self.write(name, content), self.root)

    def test_constants_keep_the_whole_value(self):
        info = self.analyze("src/limites.ts", """
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_MAX_ROWS = 50_000;
const IDLE_TIMEOUT_MS = 30 * MINUTO; // 30 min
const MAX_RETRIES = 5;
const MODO_PADRAO = 'estrito';
const LIMITE_DINAMICO = 10 > x ? 1 : 2;
const TEXTO_COMPOSTO = 'a' + sufixo;
""")
        self.assertEqual({p["name"]: p["value"] for p in info["params"]}, {
            "STALE_MS": "7 * 24 * 60 * 60 * 1000", "DEFAULT_MAX_ROWS": "50_000", "IDLE_TIMEOUT_MS": "30 * MINUTO",
            "MAX_RETRIES": "5", "MODO_PADRAO": "'estrito'"})

    def test_role_checks_need_a_quoted_value_and_comments_must_be_comments(self):
        info = self.analyze("src/acesso.ts", """
// Regra: somente admin pode aprovar pagamento acima do limite
/** Limite máximo por chamada — evita dump silencioso. */
const total = (normalizado * (pesos.prazo / 100)) + desconto_maximo_permitido;
const cor = '#b91c1c; prazo de entrega obrigatório';
if (role === 'admin' || requiredRole.includes(role) || role === requiredRole) return true;
""")
        self.assertEqual(info["role_checks"], ["admin"])
        self.assertEqual(info["rule_comments"], ["Regra: somente admin pode aprovar pagamento acima do limite",
                                                 "Limite máximo por chamada — evita dump silencioso. */"])

    def test_transition_maps_ignore_animation_and_delimit_line_comments(self):
        info = self.analyze("src/pedidos.ts", """
const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };
export const VALID_TRANSITIONS = {
  cancelado: ['pendente'], // Allow reset for corrections
  concluido: [],
};
""")
        self.assertEqual(info["transition_maps"], [{"name": "VALID_TRANSITIONS",
                         "body": "cancelado: ['pendente'], /* Allow reset for corrections */ concluido: [],"}])

    def test_storage_bucket_dom_event_css_and_sql_are_not_business_facts(self):
        ui = self.analyze("src/pages/Tela.tsx", """
const { error } = await supabase.storage
  .from('comprovantes')
  .upload(path, file);
const { data } = await supabase.from('pagamentos').select('id');
if (event.type === 'auction') abrir();
const css = `
  --primary: 60 100% 50%;
`;
const desconto = valor * 0.15;
return <motion.div transition={{ delay: idx * 0.1 }} />;
""")
        self.assertEqual([t["table"] for t in ui["tables"]], ["pagamentos"])
        self.assertEqual(ui["storage"], ["comprovantes"])
        self.assertEqual(ui["webhook_events"], [])
        self.assertEqual(ui["percents"], ["const desconto = valor * 0.15;"])
        edge = self.analyze("supabase/functions/hook/index.ts", "if (event.type === 'payment.confirmed') {}\nconst k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');\n")
        self.assertEqual((edge["webhook_events"], edge["uses_service_role"]), (["payment.confirmed"], True))
        migration = self.analyze("supabase/migrations/001.sql", "GRANT SELECT ON public.pagamentos TO service_role;\n")
        self.assertFalse(migration["uses_service_role"])


class RenderedTruthTests(unittest.TestCase):
    """O que o agente lê nos .md: sem 'sem RLS' inventado, sem perfil inventado, sem referência a arquivo que não existe."""
    setUp = CurrentSqlSourcesTests.setUp
    write = CurrentSqlSourcesTests.write

    def run_cli(self, *extra, env=None, check=True):
        return subprocess.run([sys.executable, str(SCRIPT), "--repo", str(self.root), "--out", "output", "--no-pointer", *extra],
                              check=check, capture_output=True, text=True, timeout=30, env=env)

    def read(self, name):
        return (self.root / "output" / name).read_text(encoding="utf-8")

    def test_rules_profile_without_snapshot_tells_the_truth(self):
        self.write(MIG + "001.sql", """
CREATE TYPE app_role AS ENUM ('admin', 'buyer');
CREATE TABLE public.fornecedores (id uuid, cidade text, estado text, status text, status_synced_at timestamptz, status_color text);
CREATE TABLE public.livre (id uuid);
ALTER TABLE public.livre DISABLE ROW LEVEL SECURITY;
""" + "".join(f"CREATE POLICY p{i} ON public.fornecedores FOR SELECT USING (id = {i});\n" for i in range(305)))
        self.write("src/integrations/supabase/types.ts", """
export type Database = {
  public: {
    Tables: {
      so_no_banco: {
        Row: {
          id: string
        }
      }
    }
  }
}
""")
        self.write("src/pages/Tela.tsx", """
if (Notification.permission === 'granted') avisar();
if (user.role === 'admin') liberar();
supabase.from('so_no_banco').select('id');
supabase.from('fornecedores').select('id');
""")
        self.write("scripts/ci/fixture.unit.mjs", "supabase.from('tabela_de_fixture').select('x');\nsupabase.rpc('rpc_de_fixture');\nsupabase.functions.invoke('edge-de-fixture');\n")
        (self.root / "docs/contexto/supabase").mkdir(parents=True)  # pasta do snapshot vazia = snapshot ainda não rodou
        result = self.run_cli("--profile", "regras", "--schema-snapshot", "docs/contexto/supabase")
        self.assertIn("não existe ou está vazio", result.stderr)
        manifest = json.loads(self.read("manifest.json"))
        self.assertEqual(manifest["schema_real_em"], "")
        self.assertEqual(sorted(p.name for p in (self.root / "output").glob("*.md")), manifest["arquivos"][:3])
        context = json.loads(self.read("context.json"))
        rules, access = self.read("07-REGRAS-DE-NEGOCIO.md"), self.read("10-ACESSO-E-SEGURANCA.md")
        self.assertNotIn("`06`", rules + access)  # o perfil regras não escreve o 06
        self.assertIn("snapshot do banco real ainda não gerado", rules)
        self.assertEqual(rules.count("| `fornecedores` | p"), 305)  # nenhuma política cortada da tabela
        self.assertIn("| `so_no_banco` | não encontrado | ? | ? | ? | ? |", access)
        self.assertIn("| `livre` | disabled | sem RLS | sem RLS | sem RLS | sem RLS |", access)
        self.assertEqual((context["access"]["roles"], context["access"]["roles_unconfirmed"]), (["admin", "buyer"], ["granted"]))
        self.assertIn("nenhuma migration do repo liga RLS nela — NÃO VERIFICADO", access)
        self.assertEqual([(c["table"], c["column"]) for c in context["rules"]["state_machines"]["columns"]], [("fornecedores", "status")])
        self.assertEqual([i for i in context["audit"]["issues"] if i["kind"] in ("tabela", "rpc", "edge")], [])

    def test_invalid_profile_from_environment_and_missing_repo_fail_before_writing(self):
        import os
        result = self.run_cli(env={**os.environ, "AI_CONTEXT_PROFILE": "xpto"}, check=False)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("perfil inválido", result.stderr)
        self.assertFalse((self.root / "output").exists())
        missing = self.root / "nao-existe"
        result = subprocess.run([sys.executable, str(SCRIPT), "--repo", str(missing), "--out", "output", "--no-pointer"],
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("--repo não é um diretório", result.stderr)
        self.assertFalse(missing.exists())


INDICE = Path(__file__).with_name("indice.py")
HEAD = "abcdef1234567890"


class IndiceTests(unittest.TestCase):
    """O índice não pode quebrar por causa de uma fonte ruim nem chamar de 'ok' o que não deu para verificar."""
    setUp = CurrentSqlSourcesTests.setUp

    def source(self, name, manifest, files=("a.md",)):
        folder = self.root / name
        folder.mkdir(parents=True)
        if manifest is not None:
            (folder / "manifest.json").write_text(manifest if isinstance(manifest, str) else json.dumps(manifest), encoding="utf-8")
        for file in files:
            (folder / file).write_text("# x\n", encoding="utf-8")

    def run_indice(self, *fontes, repo=None):
        args = [sys.executable, str(INDICE), "--repo", str(repo or self.root), "--out", "00-INDEX.md", "--head", HEAD]
        for fonte in fontes:
            args += ["--fonte", fonte]
        return subprocess.run(args, capture_output=True, text=True, timeout=30)

    def states(self):
        rows = [line.split("|") for line in (self.root / "00-INDEX.md").read_text(encoding="utf-8").splitlines() if line.startswith("| ") and "**" in line]
        return {row[2].strip().strip("*"): row[4].strip() for row in rows}

    @staticmethod
    def stamp(minutes):
        from datetime import datetime, timedelta, timezone
        return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).strftime("%Y-%m-%d %H:%M UTC")

    def test_malformed_source_or_missing_repo_is_refused(self):
        for spec in ("sem-igual", "=docs/x", "código=", "banco real=@contexto"):
            result = self.run_indice(spec)
            self.assertEqual(result.returncode, 2, spec)
            self.assertIn("fonte inválida", result.stderr)
        self.assertFalse((self.root / "00-INDEX.md").exists())
        missing = self.root / "nao-existe"
        result = self.run_indice("a=b", repo=missing)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertFalse(missing.exists())

    def test_bad_manifest_never_breaks_the_index_nor_passes_as_ok(self):
        self.source("corrompido", "{corrompido")
        self.source("lista", "[1, 2]")
        self.source("sem_data", {"gerado_em": "ontem"})
        self.source("futuro", {"gerado_em": self.stamp(180)})
        self.source("relogio", {"gerado_em": self.stamp(2)})
        self.source("entrada_numero", {"gerado_em": self.stamp(-1), "entrada": 5})
        self.source("entrada_fora", {"gerado_em": self.stamp(-1), "entrada": "../sem_data/a.md"})
        self.source("vazia", None, files=())
        result = self.run_indice("A=corrompido", "B=lista", "C=sem_data", "D=futuro", "E=relogio", "F=entrada_numero",
                                 "G=entrada_fora", "H=vazia", "I=nunca_gerada")
        self.assertEqual(result.returncode, 0, result.stderr)
        states = self.states()
        self.assertEqual(states["A"], "não verificável · ⚠️ manifest.json ilegível; data de geração ausente ou ilegível")
        self.assertTrue(states["B"].startswith("não verificável · ⚠️ manifest.json não contém um objeto JSON"), states["B"])
        self.assertEqual(states["C"], "não verificável · ⚠️ data de geração ausente ou ilegível")
        self.assertRegex(states["D"], r"^não verificável · ⚠️ data de geração 1[78]\d min no futuro")
        self.assertEqual(states["E"], "ok · 0 min atrás")
        self.assertRegex(states["F"], r"^ok · \d min atrás$")
        self.assertRegex(states["G"], r"^ok · \d min atrás$")
        self.assertEqual((states["H"], states["I"]), ("ainda não gerado", "ainda não gerado"))
        index = (self.root / "00-INDEX.md").read_text(encoding="utf-8")
        self.assertIn("| `entrada_fora/a.md` |", index)  # `entrada` que sai da pasta é ignorada
        self.assertIn("`nunca_gerada/` (ainda não existe — o produtor não rodou)", index)

    def test_freshness_follows_commit_for_code_and_age_for_database(self):
        self.source("regras", {"gerado_em": self.stamp(-180), "commit": HEAD, "entrada": "a.md"})
        self.source("codigo", {"gerado_em": self.stamp(-1), "commit": "1111111222222"})
        self.source("banco", {"gerado_em": self.stamp(-180)})
        self.assertEqual(self.run_indice("regras de negócio=regras", "código=codigo", "banco real=banco").returncode, 0)
        states = self.states()
        self.assertEqual(states["regras de negócio"], "ok · 3h atrás")
        self.assertRegex(states["código"], r"^desatualizado · \d min atrás · ⚠️ gerado no commit `1111111`, HEAD é `abcdef1`$")
        self.assertRegex(states["banco real"], r"^desatualizado · 3h atrás · ⚠️ desatualizado há 3h0\d$")


if __name__ == "__main__":
    unittest.main()
