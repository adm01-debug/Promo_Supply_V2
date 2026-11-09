#!/usr/bin/env python3
"""Regressões offline: uma coleta parcial não pode destruir o SQL já publicado."""

from __future__ import annotations

import contextlib
import copy
import datetime as dt
import importlib.util
import io
import json
import os
import pathlib
import re
import shutil
import sys
import tempfile
import types
import unittest
from unittest import mock


class OfflineConnection:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def execute(self, command):
        if not command.startswith("SET "):
            raise AssertionError("O teste offline não permite consultas ao banco")

    def rollback(self):
        pass


def function(name="demo", value=1):
    return {
        "schema": "public", "name": name, "args": "", "returns": "integer",
        "language": "sql", "kind": "function", "is_trigger_fn": False,
        "security_definer": False, "volatility": "v", "config": [],
        "execute_api_roles": ["authenticated"], "execute_public": False,
        "definition": f"CREATE FUNCTION public.{name}() RETURNS integer LANGUAGE sql AS $$ SELECT {value} $$;",
    }


def migration(version="20260101000000", name="demo", statements=None):
    return {
        "version": version, "name": name,
        "statements": statements if statements is not None else [
            "CREATE TABLE public.demo_table (id integer);",
            "CREATE INDEX demo_id ON public.demo_table (id);",
        ],
    }


def structural_records(records):
    return [{k: v for k, v in row.items() if k != "callers"} for row in records] if records is not None else None


class SnapshotFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="snapshot-sql-test-")
        self.addCleanup(self.temp.cleanup)
        self.out = pathlib.Path(self.temp.name) / "output"

        # Nem driver instalado nem credenciais são necessários. Qualquer tentativa real falha.
        driver = types.ModuleType("psycopg")
        driver.connect = mock.Mock(side_effect=AssertionError("Conexão real proibida no teste"))
        rows = types.ModuleType("psycopg.rows")
        rows.dict_row = object()
        spec = importlib.util.spec_from_file_location("snapshot_tested", pathlib.Path(__file__).with_name("snapshot.py"))
        self.snapshot = importlib.util.module_from_spec(spec)
        env = {
            "SUPABASE_DB_URL": "offline-fixture", "SNAPSHOT_DIR": str(self.out),
            "PGDUMP": "false", "GEN_TYPES": "false", "REPO_ROOT": "",
        }
        with mock.patch.dict(sys.modules, {"psycopg": driver, "psycopg.rows": rows}):
            with mock.patch.dict(os.environ, env, clear=True):
                spec.loader.exec_module(self.snapshot)

        self.source_files = [("src/client.ts", "supabase.rpc('demo')")]

    def collect(self, *, failures=(), functions=None, migrations=None):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.CARRIED.clear()
        snapshot._SLUG_SEEN.clear()
        records = {
            "server": {"server_version": "offline-fixture"},
            "functions": [function()] if functions is None else functions,
            "migrations": [migration()] if migrations is None else migrations,
        }

        def section(name):
            @snapshot.section(name)
            def collect_section(_conn):
                if name in failures:
                    raise PermissionError(f"Falha simulada na seção {name}")
                return copy.deepcopy(records[name])
            return collect_section

        snapshot.DB_SECTIONS = [section(name) for name in records]
        with mock.patch.object(snapshot.psycopg, "connect", return_value=OfflineConnection()):
            with mock.patch.object(snapshot, "scan_code_files", return_value=self.source_files):
                with mock.patch.object(snapshot.urllib.request, "urlopen", side_effect=AssertionError("HTTP proibido no teste")):
                    with mock.patch.object(snapshot.subprocess, "run", side_effect=AssertionError("Comando externo proibido no teste")):
                        with contextlib.redirect_stdout(io.StringIO()):
                            return snapshot.main()

    def metadata(self):
        return json.loads((self.out / "snapshot.json").read_text(encoding="utf-8"))

    def function_sql(self, name="demo"):
        return self.out / "functions" / "public" / f"{name}__{self.snapshot.sha('')}.sql"

    def migration_sql(self, version="20260101000000", name="demo"):
        return self.out / "migrations" / f"{version}_{name}.sql"

    def error_sections(self):
        return {error["section"] for error in self.metadata()["errors"]}


class SnapshotSQLRecoveryTests(SnapshotFixture):
    def test_output_marker_is_created_preserved_and_recovers_legacy_snapshot(self):
        self.out.mkdir()  # diretório existente e vazio também é um alvo novo válido.
        self.assertEqual(self.collect(), 0)
        marker = self.out / self.snapshot.OUTPUT_MARKER
        self.assertEqual(marker.read_text(encoding="utf-8"), self.snapshot.OUTPUT_MARKER_CONTENT)
        marker.unlink()  # snapshot.json v2 identifica uma saída legítima anterior ao marcador.
        self.assertEqual(self.collect(), 0)
        self.assertEqual(marker.read_text(encoding="utf-8"), self.snapshot.OUTPUT_MARKER_CONTENT)

    def test_unowned_nonempty_output_is_rejected_before_collection(self):
        unowned = pathlib.Path(self.temp.name) / "unowned"
        unowned.mkdir()
        sentinel = unowned / "user.txt"
        sentinel.write_text("não apagar", encoding="utf-8")
        self.snapshot.OUT = unowned
        with mock.patch.object(self.snapshot, "introspect_db", side_effect=AssertionError("coleta proibida")):
            with contextlib.redirect_stderr(io.StringIO()) as stderr:
                self.assertEqual(self.snapshot.main(), 2)
        self.assertIn("sem marcador/snapshot válido", stderr.getvalue())
        self.assertEqual(sentinel.read_text(encoding="utf-8"), "não apagar")
        self.assertFalse((unowned / self.snapshot.OUTPUT_MARKER).exists())

    def test_broad_output_paths_are_rejected_before_collection(self):
        cwd = pathlib.Path.cwd().resolve()
        unsafe = {pathlib.Path(cwd.anchor).resolve(), pathlib.Path.home().resolve(), cwd, cwd.parent}
        for path in unsafe:
            with self.subTest(path=path):
                self.snapshot.OUT = path
                with mock.patch.object(self.snapshot, "introspect_db", side_effect=AssertionError("coleta proibida")):
                    with contextlib.redirect_stderr(io.StringIO()) as stderr:
                        self.assertEqual(self.snapshot.main(), 2)
                self.assertIn("SNAPSHOT_DIR inseguro", stderr.getvalue())

    def test_successful_collection_writes_full_sql_with_compact_metadata(self):
        self.assertEqual(self.collect(), 0)
        self.assertEqual(self.function_sql().read_text().strip(), function()["definition"])
        self.assertEqual(self.migration_sql().read_text().strip(), "\n\n".join(migration()["statements"]))
        metadata = self.metadata()
        self.assertIsNone(metadata["db"]["functions"][0]["definition"])
        self.assertEqual(metadata["db"]["migrations"][0]["statements"], 2)
        self.assertEqual(metadata["errors"], [])

    def test_repeated_failures_preserve_sql_counts_hashes_and_db_callers(self):
        self.assertEqual(self.collect(), 0)
        original_function = self.function_sql().read_bytes()
        original_migration = self.migration_sql().read_bytes()
        original_metadata = self.metadata()["db"]
        self.source_files = []

        for _ in range(2):
            self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
            self.assertEqual(self.function_sql().read_bytes(), original_function)
            self.assertEqual(self.migration_sql().read_bytes(), original_migration)
            metadata = self.metadata()
            self.assertEqual(structural_records(metadata["db"]["functions"]), structural_records(original_metadata["functions"]))
            self.assertEqual(metadata["db"]["functions"][0]["callers"]["db"], original_metadata["functions"][0]["callers"]["db"])
            self.assertEqual(metadata["db"]["functions"][0]["callers"]["code"], [])
            self.assertEqual(metadata["db"]["migrations"], original_metadata["migrations"])
            self.assertEqual(set(metadata["carried"]), {"functions", "migrations"})
            self.assertEqual(self.error_sections(), {"functions", "migrations"})
            for name in ("functions", "migrations"):
                self.assertIn("versão anterior", (self.out / f"{name}.md").read_text())
            for name in ("functions.md", "README.md"):
                document = (self.out / name).read_text()
                self.assertIn("| código do repo | coleta atual |", document)
                self.assertIn("| outras funções | coleta anterior; corpos SQL não atualizados |", document)

    def test_failed_functions_allow_healthy_migrations_to_update(self):
        self.collect()
        old_function = self.function_sql().read_bytes()
        statements = ["ALTER TABLE public.demo_table ADD COLUMN name text;"]
        self.assertEqual(self.collect(failures={"functions"}, migrations=[migration(statements=statements)]), 0)
        self.assertEqual(self.function_sql().read_bytes(), old_function)
        self.assertEqual(self.migration_sql().read_text().strip(), statements[0])
        self.assertEqual(self.metadata()["carried"], ["functions"])

    def test_failed_migrations_allow_healthy_functions_to_update(self):
        self.collect()
        old_migration = self.migration_sql().read_bytes()
        changed = function(value=2)
        self.assertEqual(self.collect(failures={"migrations"}, functions=[changed]), 0)
        self.assertEqual(self.function_sql().read_text().strip(), changed["definition"])
        self.assertEqual(self.migration_sql().read_bytes(), old_migration)
        self.assertEqual(self.metadata()["carried"], ["migrations"])

    def test_next_healthy_collection_replaces_sql_and_prunes_removed_objects(self):
        obsolete_migration = migration("20260102000000", "obsolete")
        self.collect(functions=[function(), function("obsolete")], migrations=[migration(), obsolete_migration])
        self.collect(failures={"functions", "migrations"})
        self.assertTrue(self.function_sql("obsolete").is_file())
        self.assertTrue(self.migration_sql("20260102000000", "obsolete").is_file())

        changed = function(value=3)
        statements = ["ALTER TABLE public.demo_table ADD COLUMN enabled boolean;"]
        self.assertEqual(self.collect(functions=[changed], migrations=[migration(statements=statements)]), 0)
        self.assertFalse(self.function_sql("obsolete").exists())
        self.assertFalse(self.migration_sql("20260102000000", "obsolete").exists())
        self.assertEqual(self.function_sql().read_text().strip(), changed["definition"])
        self.assertEqual(self.migration_sql().read_text().strip(), statements[0])
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.metadata()["errors"], [])
        self.assertNotIn("versão anterior", (self.out / "functions.md").read_text())

    def test_missing_previous_sql_is_reported_without_fake_content_or_links(self):
        self.collect()
        original_migrations = self.metadata()["db"]["migrations"]
        shutil.rmtree(self.out / "functions")
        shutil.rmtree(self.out / "migrations")

        self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
        self.assertFalse(self.function_sql().exists())
        self.assertFalse(self.migration_sql().exists())
        self.assertEqual(self.metadata()["db"]["migrations"], original_migrations)
        self.assertTrue({"functions.sql", "migrations.sql"}.issubset(self.error_sections()))
        for name in ("functions", "migrations"):
            document = (self.out / f"{name}.md").read_text()
            self.assertIn("SQL indisponível", document)
            self.assertNotIn(f"]({name}/", document)

    def test_failed_first_collection_does_not_claim_empty_sections(self):
        self.assertEqual(self.collect(failures={"functions", "migrations"}), 0)
        self.assertFalse(self.function_sql().exists())
        self.assertFalse(self.migration_sql().exists())
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.error_sections(), {"functions", "migrations"})
        for name in ("functions", "migrations"):
            document = (self.out / f"{name}.md").read_text()
            self.assertIn("Coleta indisponível", document)
            self.assertNotIn("_nenhum_", document)
            self.assertIn(f"| {name} | n/d |", (self.out / "README.md").read_text())

    def test_successful_empty_sections_are_not_reported_as_collection_failures(self):
        self.assertEqual(self.collect(functions=[], migrations=[]), 0)
        self.assertEqual(self.metadata()["errors"], [])
        self.assertEqual(self.metadata()["carried"], [])
        for name in ("functions", "migrations"):
            self.assertIn("_nenhum_", (self.out / f"{name}.md").read_text())
            self.assertIn(f"| {name} | 0 |", (self.out / "README.md").read_text())

    def test_aggregate_and_window_without_sql_remain_healthy_catalog_entries(self):
        entries = [{**function(f"demo_{kind}"), "kind": kind, "definition": None} for kind in ("aggregate", "window")]
        self.assertEqual(self.collect(functions=entries), 0)
        self.assertEqual(self.error_sections(), set())
        self.assertEqual([f["kind"] for f in self.metadata()["db"]["functions"]], ["aggregate", "window"])
        for entry in entries:
            self.assertFalse(self.function_sql(entry["name"]).exists())
        document = (self.out / "functions.md").read_text()
        self.assertIn("SQL não coletado para este tipo", document)
        self.assertNotIn("](functions/", document)
        self.assertEqual(self.collect(failures={"functions"}), 0)
        self.assertEqual(self.error_sections(), {"functions"})
        self.assertEqual(self.metadata()["carried"], ["functions"])
        self.assertEqual(self.collect(functions=entries), 0)
        self.assertEqual(self.error_sections(), set())


class SnapshotFailureMatrixTests(SnapshotFixture):
    """24 sequências: seção × histórico/SQL disponível × repetição × recuperação."""

    def exercise_failure_recovery(self, section, history, attempts, recovery):
        if history != "none":
            self.collect(functions=[function(), function("obsolete")],
                         migrations=[migration(), migration("20260102000000", "obsolete")])
            previous = copy.deepcopy(self.metadata()["db"][section])
            sql_before = {p.relative_to(self.out): p.read_bytes() for p in (self.out / section).rglob("*.sql")}
            if history == "metadata_only":
                shutil.rmtree(self.out / section)
        else:
            previous, sql_before = None, {}

        self.source_files = []  # não pode apagar callers da seção que veio do histórico
        for attempt in range(attempts):
            changed_function = function(value=attempt + 20)
            changed_statement = f"ALTER TABLE public.demo_table ADD COLUMN field_{attempt} integer;"
            self.assertEqual(self.collect(failures={section}, functions=[changed_function],
                                         migrations=[migration(statements=[changed_statement])]), 0)
            metadata = self.metadata()
            self.assertEqual(structural_records(metadata["db"][section]), structural_records(previous))
            if section == "functions" and previous:
                self.assertEqual(metadata["db"][section][0]["callers"]["db"], previous[0]["callers"]["db"])
                self.assertEqual(metadata["db"][section][0]["callers"]["code"], [])
            self.assertEqual(metadata["carried"], [section] if history != "none" else [])
            self.assertIn(section, self.error_sections())
            self.assertEqual(f"{section}.sql" in self.error_sections(), history == "metadata_only")
            document = (self.out / f"{section}.md").read_text()
            if history == "complete":
                for relative, contents in sql_before.items():
                    self.assertEqual((self.out / relative).read_bytes(), contents)
                self.assertIn("versão anterior", document)
                self.assertNotIn("SQL indisponível", document)
            else:
                self.assertFalse((self.out / section).exists())
                self.assertNotIn(f"]({section}/", document)
                self.assertIn("SQL indisponível" if history == "metadata_only" else "Coleta indisponível", document)
            if history == "none":
                self.assertIn(f"| {section} | n/d |", (self.out / "README.md").read_text())
            else:
                self.assertIn(f"| {section} | 2 |", (self.out / "README.md").read_text())
                # Falha da coleta não pode transformar registros conhecidos em remoções.
                changes = self.snapshot.diff_fingerprints(
                    self.snapshot.fingerprints({"db": {section: structural_records(previous)}}),
                    self.snapshot.fingerprints({"db": {section: structural_records(metadata["db"][section])}}))
                self.assertEqual(changes, [])
            if section == "functions":
                self.assertEqual(self.migration_sql().read_text().strip(), changed_statement)
            else:
                self.assertEqual(self.function_sql().read_text().strip(), changed_function["definition"])

        self.source_files = [("src/recovered.ts", "supabase.rpc('demo')")]
        final_function = function(value=99)
        final_statement = "ALTER TABLE public.demo_table ADD COLUMN recovered boolean;"
        functions = [] if section == "functions" and recovery == "empty" else [final_function]
        migrations = [] if section == "migrations" and recovery == "empty" else [migration(statements=[final_statement])]
        self.assertEqual(self.collect(functions=functions, migrations=migrations), 0)
        metadata = self.metadata()
        self.assertEqual(metadata["errors"], [])
        self.assertEqual(metadata["carried"], [])
        self.assertFalse(self.function_sql("obsolete").exists())
        self.assertFalse(self.migration_sql("20260102000000", "obsolete").exists())
        document = (self.out / f"{section}.md").read_text()
        self.assertNotIn("versão anterior", document)
        self.assertNotIn("SQL indisponível", document)
        if recovery == "empty":
            self.assertEqual(metadata["db"][section], [])
            self.assertFalse((self.out / section).exists())
            self.assertIn("_nenhum_", document)
        elif section == "functions":
            self.assertEqual(self.function_sql().read_text().strip(), final_function["definition"])
            self.assertEqual(metadata["db"][section][0]["callers"]["code"], [{"file": "src/recovered.ts", "hits": 1}])
        else:
            self.assertEqual(self.migration_sql().read_text().strip(), final_statement)
            self.assertEqual(metadata["db"][section][0]["statements"], 1)


def recovery_case(section, history, attempts, recovery):
    def run(self):
        self.exercise_failure_recovery(section, history, attempts, recovery)
    return run


for _section in ("functions", "migrations"):
    for _history in ("none", "complete", "metadata_only"):
        for _attempts in (1, 3):
            for _recovery in ("changed", "empty"):
                setattr(SnapshotFailureMatrixTests,
                        f"test_{_section}_{_history}_{_attempts}_failures_recover_{_recovery}",
                        recovery_case(_section, _history, _attempts, _recovery))


class SnapshotFunctionCallerTests(SnapshotFixture):
    def callers(self, files, *, scan_dirs=None, kind="function"):
        root = pathlib.Path(self.temp.name) / "repo"
        for relative, text in files.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        self.snapshot.REPO_ROOT = root
        self.snapshot.CODE_SCAN_DIRS = scan_dirs or ["."]
        db = {"functions": [{**function(), "kind": kind}]}
        with contextlib.redirect_stdout(io.StringIO()):
            self.snapshot.build_function_callers(db)
        return db["functions"][0]["callers"]["code"]

    def test_function_declaration_is_not_a_call(self):
        declarations = {
            "supabase/migrations/001.sql": function()["definition"],
            "supabase/migrations/002.sql": "CREATE OR REPLACE\nFUNCTION public.demo() RETURNS integer AS $$ SELECT 2 $$ LANGUAGE sql;",
            "supabase/migrations/003.sql": "CREATE PROCEDURE public.demo() LANGUAGE sql AS $$ SELECT 1 $$;",
        }
        self.assertEqual(self.callers(declarations), [])

    def test_aggregate_declarations_and_metadata_are_not_calls(self):
        statements = [
            "CREATE AGGREGATE public.demo(integer) (SFUNC = int4pl, STYPE = integer);",
            "DROP AGGREGATE IF EXISTS public.demo(integer);",
            "ALTER AGGREGATE public.demo(integer) OWNER TO postgres;",
            "COMMENT ON AGGREGATE public.demo(integer) IS 'description';",
        ]
        self.assertEqual(self.callers({f"supabase/migrations/{i}.sql": text for i, text in enumerate(statements)}, kind="aggregate"), [])

    def test_ddl_function_signatures_are_not_calls(self):
        statements = [
            "DROP FUNCTION IF EXISTS public.demo();",
            "ALTER FUNCTION public.demo() OWNER TO postgres;",
            "COMMENT ON FUNCTION public.demo() IS 'description';",
            "GRANT EXECUTE ON FUNCTION public.demo() TO authenticated;",
            "REVOKE EXECUTE ON FUNCTION public.demo() FROM anon;",
        ]
        self.assertEqual(self.callers({f"supabase/migrations/{i}.sql": text for i, text in enumerate(statements)}), [])

    def test_real_calls_inside_function_bodies_and_migrations_remain(self):
        text = "CREATE FUNCTION public.demo() RETURNS integer AS $$ SELECT public.demo(); $$ LANGUAGE sql;\nSELECT public.demo();"
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 2}])

    def test_ddl_like_text_does_not_hide_a_real_call_later_in_the_statement(self):
        text = "SELECT audit_note('ALTER FUNCTION public.demo()'), public.demo();"
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 1}])

    def test_multiple_signatures_are_ignored_but_default_argument_calls_remain(self):
        text = ("GRANT EXECUTE ON FUNCTION public.demo(), public.demo(integer) TO authenticated;\n"
                "CREATE FUNCTION public.other(value integer DEFAULT public.demo()) RETURNS integer AS $$ SELECT 1 $$ LANGUAGE sql;")
        self.assertEqual(self.callers({"supabase/migrations/active.sql": text}),
                         [{"file": "supabase/migrations/active.sql", "hits": 1}])

    def test_overlapping_scan_paths_do_not_duplicate_real_calls(self):
        self.assertEqual(self.callers({"src/hooks/useDemo.ts": "supabase.rpc('demo')"}, scan_dirs=["src", "src/hooks"]),
                         [{"file": "src/hooks/useDemo.ts", "hits": 1}])

    def test_historical_and_test_files_do_not_prove_current_usage(self):
        excluded = [
            "supabase/migrations/_foreign/other/old.sql", "supabase/migrations/_superseded/old.sql",
            "src/__tests__/client.ts", "src/tests/client.ts", "src/test/client.ts", "src/__fixtures__/client.ts",
            "src/fixtures/client.ts", "src/__mocks__/client.ts", "src/client.test.ts", "src/client.spec.ts",
            "scripts/ci/client.unit.mjs", "scripts/test_client.py", "server/client_test.go", "src/client.stories.tsx",
        ]
        files = {name: "supabase.rpc('demo'); SELECT public.demo();" for name in excluded}
        files["src/client.ts"] = "supabase.rpc('demo')"
        self.assertEqual(self.callers(files), [{"file": "src/client.ts", "hits": 1}])

    def test_similar_names_operational_scripts_and_custom_scan_paths_remain(self):
        names = ["runtime/testimonials.ts", "runtime/customer_foreign/client.ts", "runtime/_superseded_backup/client.ts",
                 "runtime/fixtures-page.ts", "scripts/operations/sync.ts", "supabase/migrations/_foreign.sql"]
        files = {name: "supabase.rpc('demo')" for name in names}
        # SQL reconhece a chamada SQL, não a sintaxe de RPC do cliente.
        files[names[-1]] = "SELECT public.demo();"
        files["src/not_selected.ts"] = "supabase.rpc('demo')"
        self.assertEqual(self.callers(files, scan_dirs=["runtime", "scripts/operations", "supabase/migrations"]),
                         [{"file": name, "hits": 1} for name in sorted(names)])


class SnapshotCallerFreshnessTests(SnapshotFixture):
    @staticmethod
    def database(stage):
        consumer = function(f"{stage}_consumer")
        consumer["definition"] = f"CREATE FUNCTION public.{stage}_consumer() RETURNS integer AS $$ SELECT public.demo() $$ LANGUAGE sql;"
        return {
            "functions": [function(), consumer],
            "cron": {"jobs": [{"jobid": stage, "jobname": stage, "command": "SELECT public.demo();"}]},
            "triggers": [{"schema": "public", "table": "orders", "name": f"{stage}_trigger", "function": "public.demo"}],
            "views": [{"schema": "public", "name": f"{stage}_view", "definition": "SELECT public.demo();"}],
        }

    def build(self, database, files):
        with mock.patch.object(self.snapshot, "scan_code_files", return_value=files):
            with contextlib.redirect_stdout(io.StringIO()):
                return self.snapshot.build_function_callers(database)

    def previous_database(self):
        previous = self.database("old")
        self.build(previous, [("src/old.ts", "supabase.rpc('demo')")])
        for entry in previous["functions"]:
            entry["definition_sha"] = self.snapshot.sha(entry["definition"])
            entry["definition"] = None
        return previous

    def exercise_sources(self, failed_sources):
        previous = self.previous_database()
        previous_copy = copy.deepcopy(previous)
        current = self.database("new")
        # introspect_db reutiliza a lista anterior; o mapa não pode alterar esse histórico em memória.
        current["functions"] = previous["functions"]
        self.snapshot.CARRIED[:] = ["functions", *failed_sources]
        for source in failed_sources:
            current[source] = previous[source]
        states = self.build(current, [("src/new.ts", "supabase.rpc('demo')")])
        callers = current["functions"][0]["callers"]
        self.assertEqual(callers["code"], [{"file": "src/new.ts", "hits": 1}])
        self.assertEqual(callers["code_total_files"], 1)
        self.assertEqual(callers["db"], ["public.old_consumer"])
        expected = {"cron": ["new:new"], "triggers": ["public.orders.new_trigger"], "views": ["public.new_view"]}
        for source in expected:
            if source in failed_sources:
                self.assertEqual(callers[source], previous_copy["functions"][0]["callers"][source])
                self.assertIn("anterior", states[source])
            else:
                self.assertEqual(callers[source], expected[source])
                self.assertIn("coleta atual", states[source])
        self.assertIn("anterior", states["db"])
        self.assertEqual(previous, previous_copy, "recalcular callers não pode reescrever a base do changelog")
        self.assertEqual([{k: v for k, v in f.items() if k != "callers"} for f in current["functions"]],
                         [{k: v for k, v in f.items() if k != "callers"} for f in previous_copy["functions"]])

        self.snapshot.CARRIED.clear()
        recovered = self.database("recovered")
        states = self.build(recovered, [("src/recovered.ts", "supabase.rpc('demo')")])
        callers = recovered["functions"][0]["callers"]
        self.assertEqual(callers["db"], ["public.recovered_consumer"])
        self.assertEqual(callers["cron"], ["recovered:recovered"])
        self.assertEqual(callers["triggers"], ["public.orders.recovered_trigger"])
        self.assertEqual(callers["views"], ["public.recovered_view"])
        self.assertTrue(all("coleta atual" in state for state in states.values()))

    def test_unavailable_sources_preserve_known_references_without_claiming_freshness(self):
        previous = self.previous_database()
        expected = copy.deepcopy(previous["functions"][0]["callers"])
        current = {"functions": previous["functions"], "cron": None, "triggers": None, "views": None}
        self.snapshot.CARRIED[:] = ["functions"]
        states = self.build(current, None)
        self.assertEqual(current["functions"][0]["callers"], expected)
        for source in ("code", "cron", "triggers", "views"):
            self.assertIn("indisponível", states[source])

    def test_successful_empty_sources_remove_old_references(self):
        previous = self.previous_database()
        current = {"functions": previous["functions"], "cron": {"jobs": []}, "triggers": [], "views": []}
        self.snapshot.CARRIED[:] = ["functions"]
        states = self.build(current, [])
        callers = current["functions"][0]["callers"]
        for source in ("code", "cron", "triggers", "views"):
            self.assertEqual(callers[source], [])
            self.assertIn("coleta atual", states[source])
        self.assertEqual(callers["code_total_files"], 0)
        self.assertEqual(callers["db"], ["public.old_consumer"])

    def test_unreadable_code_preserves_previous_code_references_and_reports_failure(self):
        previous = self.previous_database()
        expected = copy.deepcopy(previous["functions"][0]["callers"]["code"])
        root = pathlib.Path(self.temp.name) / "repo"
        (root / "src").mkdir(parents=True)
        (root / "src/client.ts").write_text("supabase.rpc('demo')", encoding="utf-8")
        self.snapshot.REPO_ROOT = root
        self.snapshot.CODE_SCAN_DIRS = ["src"]
        self.snapshot.CARRIED[:] = ["functions"]
        with mock.patch.object(pathlib.Path, "read_text", side_effect=PermissionError("fixture ilegível")):
            with contextlib.redirect_stdout(io.StringIO()):
                states = self.snapshot.build_function_callers(previous)
        self.assertEqual(previous["functions"][0]["callers"]["code"], expected)
        self.assertIn("indisponível", states["code"])
        self.assertTrue(any(e["section"] == "callers.code" for e in self.snapshot.ERRORS))

    def test_database_callers_include_defaults_on_the_first_definition_line(self):
        consumer = function("consumer")
        consumer["definition"] = (
            "CREATE OR REPLACE FUNCTION public.consumer(value integer DEFAULT public.demo())\n"
            " RETURNS integer\n LANGUAGE sql\n AS $function$ SELECT value $function$;"
        )
        database = {"functions": [function(), consumer]}
        self.build(database, [])
        self.assertEqual(database["functions"][0]["callers"]["db"], ["public.consumer"])
        self.assertEqual(database["functions"][1]["callers"]["db"], [])


class SnapshotHeartbeatTests(SnapshotFixture):
    def manifest(self):
        return json.loads((self.out / "manifest.json").read_text(encoding="utf-8"))

    def collect_at(self, instant, **options):
        class FrozenDateTime(dt.datetime):
            @classmethod
            def now(cls, tz=None):
                return instant.astimezone(tz) if tz is not None else instant.replace(tzinfo=None)
        with mock.patch.object(self.snapshot.dt, "datetime", FrozenDateTime):
            return self.collect(**options)

    def unified_index(self):
        script = pathlib.Path(__file__).resolve().parents[1] / "regras_negocio" / "indice.py"
        spec = importlib.util.spec_from_file_location("heartbeat_index", script)
        index = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(index)
        arguments = [str(script), "--repo", self.temp.name, "--out", "INDEX.md", "--remote", "owner/repo",
                     "--head", "a" * 40, "--fonte", "banco real=output"]
        with mock.patch.object(sys, "argv", arguments):
            with mock.patch.object(index, "git", side_effect=AssertionError("manifest/CHANGELOG dispensam fallback Git")):
                with contextlib.redirect_stderr(io.StringIO()):
                    self.assertEqual(index.main(), 0)
        return (pathlib.Path(self.temp.name) / "INDEX.md").read_text(encoding="utf-8")

    def test_unchanged_collection_refreshes_utc_heartbeat_without_structural_changes(self):
        first = dt.datetime(2026, 1, 1, 0, 0, tzinfo=dt.timezone.utc)
        second = first + dt.timedelta(minutes=10)
        self.assertEqual(self.collect_at(first), 0)
        original_manifest = self.manifest()
        original_snapshot = (self.out / "snapshot.json").read_bytes()
        original_changelog = (self.out / "CHANGELOG.md").read_bytes()
        original_fingerprints = self.snapshot.fingerprints(self.metadata())
        self.assertEqual(self.collect_at(second), 0)
        current_manifest = self.manifest()
        self.assertEqual(original_manifest["gerado_em"], "2026-01-01T00:00:00Z")
        self.assertEqual(current_manifest["gerado_em"], "2026-01-01T00:10:00Z")
        self.assertEqual(dt.datetime.fromisoformat(current_manifest["gerado_em"]).utcoffset(), dt.timedelta(0))
        self.assertEqual(current_manifest["entrada"], "README.md")
        self.assertEqual(current_manifest["gerador"], "scripts/supabase_snapshot/snapshot.py")
        self.assertEqual(current_manifest["erros"], [])
        self.assertEqual(current_manifest["carried"], [])
        self.assertEqual((self.out / "snapshot.json").read_bytes(), original_snapshot)
        self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), original_changelog)
        self.assertEqual(self.snapshot.fingerprints(self.metadata()), original_fingerprints)

    def test_partial_heartbeat_includes_collection_and_render_errors(self):
        self.collect()
        shutil.rmtree(self.out / "functions")
        self.assertEqual(self.collect(failures={"functions"}), 0)
        manifest = self.manifest()
        self.assertEqual(manifest["erros"], self.metadata()["errors"])
        self.assertEqual({error["section"] for error in manifest["erros"]}, {"functions", "functions.sql"})
        self.assertEqual(manifest["carried"], ["functions"])
        self.assertIn("| parcial ·", self.unified_index())

    def test_recovery_clears_heartbeat_errors_and_carried_sections(self):
        self.collect()
        self.collect(failures={"functions", "migrations"})
        self.assertTrue(self.manifest()["erros"])
        self.assertEqual(set(self.manifest()["carried"]), {"functions", "migrations"})
        self.assertEqual(self.collect(), 0)
        self.assertEqual(self.manifest()["erros"], [])
        self.assertEqual(self.manifest()["carried"], [])

    def test_index_prefers_current_heartbeat_to_old_structural_changelog(self):
        self.collect()
        (self.out / "CHANGELOG.md").write_text("# Histórico\n\n## 2000-01-01 00:00 UTC\n", encoding="utf-8")
        document = self.unified_index()
        self.assertIn("| ok ·", document)
        self.assertNotIn("desatualizado", document)
        (self.out / "manifest.json").unlink()
        self.assertIn("| desatualizado ·", self.unified_index())

    def test_unavailable_collection_does_not_renew_previous_heartbeat(self):
        self.collect()
        before = (self.out / "manifest.json").read_bytes()
        with mock.patch.object(self.snapshot, "introspect_db", return_value=({"functions": None, "migrations": None}, {})):
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(self.snapshot.main(), 1)
        self.assertEqual((self.out / "manifest.json").read_bytes(), before)

    def test_interrupted_render_does_not_publish_a_completed_heartbeat(self):
        with mock.patch.object(self.snapshot, "render_simple", side_effect=RuntimeError("falha de escrita simulada")):
            with self.assertRaisesRegex(RuntimeError, "falha de escrita"):
                self.collect()
        self.assertFalse((self.out / "manifest.json").exists())


def source_freshness_case(failed_sources):
    def run(self):
        self.exercise_sources(failed_sources)
    return run


for _mask in range(8):
    _sources = tuple(source for bit, source in enumerate(("cron", "triggers", "views")) if _mask & (1 << bit))
    setattr(SnapshotCallerFreshnessTests, f"test_functions_carried_with_{'_'.join(_sources) or 'no_other_failure'}",
            source_freshness_case(_sources))


class SnapshotDBStatsTests(SnapshotFixture):
    """Catálogo e resultados sintéticos; nenhum driver, socket ou banco real."""

    def stats(self, *, schema="extensions", auth_error=False, top=15, failure=None, empty=False):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.STAT_STATEMENTS_TOP = top
        calls = []

        def query(_conn, sql, params=None):
            calls.append((sql, params))
            compact = " ".join(sql.split())
            if "pg_extension" in compact:
                extension = params[0] if params else "pg_stat_statements"
                if extension == "pgmq":
                    return [{"present": 1}]
                if failure == "catalog":
                    raise PermissionError("catálogo indisponível na fixture")
                if schema is None:
                    return []
                if "extnamespace" in compact:
                    return [{"schema": schema}]
                return [{"present": 1}]  # has_ext do código anterior
            if "total_exec_time" in compact:
                # O backend de teste não inclui a extensão no search_path.
                # Aceita somente um identificador SQL delimitado, não texto cru.
                relation = re.search(
                    r'FROM\s+("(?:""|[^"])*")\.pg_stat_statements\s+s', sql, re.I)
                if relation is None or relation.group(1)[1:-1].replace('""', '"') != schema:
                    raise RuntimeError('relation "pg_stat_statements" does not exist')
                if failure == "permission":
                    raise PermissionError("view sem permissão na fixture")
                if failure == "missing":
                    raise RuntimeError("view removida depois da consulta ao catálogo")
                if failure == "timeout":
                    raise TimeoutError("statement timeout simulado")
                if failure == "row":
                    return [{"query": None}]
                return [] if empty else [{
                    "role": "fixture_reader", "calls": 3, "total_ms": 8,
                    "mean_ms": 2.67, "rows": 3, "query": "select 'literal-fixture'",
                }]
            if "pg_database_size" in compact:
                if failure == "database":
                    raise RuntimeError("banco indisponível na fixture")
                return [{"s": 123456}]
            if "pg_stat_activity" in compact:
                return [{"usename": "fixture_reader", "state": "idle", "n": 2}]
            if "sum(pg_total_relation_size" in compact:
                return [{"schema": "public", "bytes": 45678}]
            if "FROM storage.objects" in compact:
                return [{"bucket_id": "fixture", "objects": 2, "bytes": 42}]
            if "FROM auth." in compact:
                if auth_error:
                    raise PermissionError("permission denied for schema auth")
                if "auth.identities" in compact:
                    return [{"provider": "fixture", "users": 5}]
                if "auth.mfa_factors" in compact:
                    return [{"factor_type": "totp", "status": "verified", "total": 2}]
                return [{"c": 5}]
            if "pgmq.metrics_all()" in compact:
                return [{"queue_name": "fixture", "queue_length": 3, "newest_msg_age_sec": 1,
                         "oldest_msg_age_sec": 2, "total_messages": 4}]
            raise AssertionError(f"Consulta não prevista no modelo offline: {compact[:70]}")

        with mock.patch.object(snapshot, "q", side_effect=query):
            with mock.patch.object(snapshot.urllib.request, "urlopen", side_effect=AssertionError("HTTP proibido")):
                with contextlib.redirect_stdout(io.StringIO()):
                    result = snapshot.get_db_stats(OfflineConnection())
        errors = {error["section"] for error in snapshot.ERRORS}
        return result, calls, errors

    def assert_core_metrics(self, stats, auth_error):
        self.assertIsInstance(stats, dict, "Falha opcional não deve descartar db_stats")
        self.assertEqual(stats["database_bytes"], 123456)
        self.assertEqual(stats["connections"], [{"usename": "fixture_reader", "state": "idle", "n": 2}])
        self.assertEqual(stats["schema_bytes"], [{"schema": "public", "bytes": 45678}])
        self.assertEqual(stats["storage"], [{"bucket_id": "fixture", "objects": 2, "bytes": 42}])
        self.assertEqual(stats["queues"][0]["queue_length"], 3)
        self.assertEqual(bool(stats["auth"]), not auth_error)

    def exercise_schema(self, schema, auth_error):
        stats, calls, errors = self.stats(schema=schema, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertEqual(stats["top_queries"][0]["query"], "select '?'")
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        lookup = [(sql, params) for sql, params in calls if "extnamespace" in sql]
        self.assertEqual(len(lookup), 1)
        top_calls = [(sql, params) for sql, params in calls if "total_exec_time" in sql]
        self.assertEqual(len(top_calls), 1)
        # Sem binds, '%' no identificador não vira placeholder do psycopg.
        self.assertIsNone(top_calls[0][1])
        self.assertIn("LIMIT 15", top_calls[0][0])

    def exercise_availability(self, present, top, auth_error):
        stats, calls, errors = self.stats(schema="extensions" if present else None,
                                         top=top, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        self.assertEqual("top_queries" in stats, present and top > 0)
        stat_calls = [(sql, params) for sql, params in calls
                      if "total_exec_time" in sql or "extnamespace" in sql or params == ("pg_stat_statements",)]
        if top <= 0:
            self.assertEqual(stat_calls, [])
        elif present:
            self.assertEqual(len(stat_calls), 2)
            self.assertIn("LIMIT 1", stat_calls[-1][0])
        else:
            self.assertEqual(len(stat_calls), 1)

    def exercise_failure(self, failure, auth_error):
        stats, _, errors = self.stats(failure=failure, auth_error=auth_error)
        self.assert_core_metrics(stats, auth_error)
        self.assertNotIn("top_queries", stats)
        expected = {"db_stats.top_queries"} | ({"db_stats.auth"} if auth_error else set())
        self.assertEqual(errors, expected)

    def exercise_recovery(self, auth_error, empty):
        failed, _, errors = self.stats(failure="permission", auth_error=auth_error)
        self.assert_core_metrics(failed, auth_error)
        self.assertIn("db_stats.top_queries", errors)
        recovered, _, errors = self.stats(empty=empty, auth_error=auth_error)
        self.assert_core_metrics(recovered, auth_error)
        self.assertEqual(errors, {"db_stats.auth"} if auth_error else set())
        self.assertEqual(len(recovered["top_queries"]), 0 if empty else 1)
        self.assertNotIn("top_queries", failed, "Recuperação não deve alterar o resultado anterior")

    def test_schema_is_resolved_again_after_extension_moves(self):
        first, _, first_errors = self.stats(schema="extensions")
        second, _, second_errors = self.stats(schema='Stats "new"')
        self.assert_core_metrics(first, False)
        self.assert_core_metrics(second, False)
        self.assertEqual(first_errors | second_errors, set())
        self.assertEqual(first["top_queries"], second["top_queries"])

    def test_partial_metrics_remain_in_rendered_json_and_markdown(self):
        stats, _, errors = self.stats(failure="missing", auth_error=True)
        self.assert_core_metrics(stats, True)
        self.snapshot.render_stats({"db_stats": stats}, {}, {})
        rendered = json.loads((self.out / "stats.json").read_text())["db"]["db_stats"]
        self.assertEqual(rendered["database_bytes"], 123456)
        self.assertEqual(rendered["queues"][0]["queue_name"], "fixture")
        self.assertNotIn("top_queries", rendered)
        self.assertTrue((self.out / "stats.md").exists())
        self.assertEqual(errors, {"db_stats.auth", "db_stats.top_queries"})

    def test_mandatory_database_failure_keeps_section_error_contract(self):
        stats, _, errors = self.stats(failure="database")
        self.assertIsNone(stats)
        self.assertEqual(errors, {"db_stats"})


class SnapshotConfigurationTests(unittest.TestCase):
    def test_invalid_integer_environment_is_reported_without_traceback(self):
        script = pathlib.Path(__file__).with_name("snapshot.py")
        for key, value in (("CRON_RUNS_PER_JOB", "x"), ("STAT_STATEMENTS_TOP", "1.5"),
                           ("CODE_SCAN_MAX_FILES", "")):
            with self.subTest(key=key):
                driver = types.ModuleType("psycopg")
                driver.connect = mock.Mock(side_effect=AssertionError("conexão proibida"))
                rows = types.ModuleType("psycopg.rows")
                rows.dict_row = object()
                spec = importlib.util.spec_from_file_location(f"snapshot_invalid_{key}", script)
                snapshot = importlib.util.module_from_spec(spec)
                env = {"SUPABASE_DB_URL": "offline-fixture", key: value}
                with mock.patch.dict(sys.modules, {"psycopg": driver, "psycopg.rows": rows}):
                    with mock.patch.dict(os.environ, env, clear=True):
                        spec.loader.exec_module(snapshot)
                with contextlib.redirect_stderr(io.StringIO()) as stderr:
                    self.assertEqual(snapshot.main(), 2)
                message = stderr.getvalue()
                self.assertIn(f"Configuração inválida: {key}", message)
                self.assertNotIn("Traceback", message)


def table(name="orders", **overrides):
    record = {
        "schema": "public", "name": name, "kind": "table", "rls_enabled": True, "rls_forced": False,
        "owner": "postgres", "comment": None, "is_partition": False, "parent": None, "partition_key": None,
        "partition_bound": None, "replica_identity": "default", "from_extension": False,
    }
    record.update(overrides)
    return record


def column(name="id", table_name="orders"):
    return {"schema": "public", "table": table_name, "position": 1, "name": name, "type": "integer", "nullable": False,
            "default": None, "identity": None, "generated": None, "comment": None, "is_enum": False}


def policy(name="owner_only", table_name="orders"):
    return {"schema": "public", "table": table_name, "name": name, "permissive": "PERMISSIVE", "roles": ["authenticated"],
            "cmd": "SELECT", "using": "(owner = auth.uid())", "with_check": None}


class SnapshotPartialOutputTests(SnapshotFixture):
    """Seção que falhou não pode aparecer como "_nenhum_" dentro do arquivo que o agente lê."""

    VOLATILE = {"cron_runs", "table_stats", "index_stats", "db_stats"}

    def collect_sections(self, records, failures=()):
        snapshot = self.snapshot
        snapshot.ERRORS.clear()
        snapshot.CARRIED.clear()
        snapshot._SLUG_SEEN.clear()
        records = {"server": {"server_version": "offline-fixture"}, **records}

        def section(name):
            @snapshot.section(name, volatile=name in self.VOLATILE)
            def collect_section(_conn):
                if name in failures:
                    raise PermissionError(f"Falha simulada na seção {name}")
                return copy.deepcopy(records[name])
            return collect_section

        snapshot.DB_SECTIONS = [section(name) for name in records]
        with mock.patch.object(snapshot.psycopg, "connect", return_value=OfflineConnection()):
            with mock.patch.object(snapshot, "scan_code_files", return_value=[]):
                with contextlib.redirect_stdout(io.StringIO()):
                    return snapshot.main()

    def table_file(self):
        return (self.out / "tables" / "public" / "orders.md").read_text(encoding="utf-8")

    def records(self, policies=None):
        return {"tables": [table()], "columns": [column()], "constraints": [], "indexes": [],
                "policies": [policy()] if policies is None else policies, "triggers": [],
                "grants": {"tables": [], "columns": [], "sequences": [], "default_privileges": []},
                "cron_runs": [], "table_stats": [], "index_stats": [], "db_stats": {}}

    def test_healthy_collection_has_no_warning_and_keeps_real_rls_alert(self):
        self.assertEqual(self.collect_sections(self.records(policies=[])), 0)
        document = self.table_file()
        self.assertNotIn("⚠️ Seção", document)
        self.assertIn("RLS habilitado **sem policies**", document)
        for name in ("tables.md", "stats.md", "cron-runs.md"):
            self.assertNotIn("⚠️ Seção", (self.out / name).read_text(encoding="utf-8"))

    def test_first_collection_failures_are_flagged_inside_each_table_file(self):
        failed = {"columns", "constraints", "indexes", "policies", "triggers", "grants",
                  "cron_runs", "table_stats", "index_stats", "db_stats"}
        self.assertEqual(self.collect_sections(self.records(), failures=failed), 0)
        document = self.table_file()
        for name in ("columns", "constraints", "indexes", "policies", "triggers", "grants"):
            self.assertIn(f"Seção `{name}` indisponível", document)
        # Policies não coletadas não provam "RLS sem policies".
        self.assertNotIn("sem policies", document)
        index = (self.out / "tables.md").read_text(encoding="utf-8")
        self.assertIn("Seção `columns` indisponível", index)
        self.assertIn("Seção `policies` indisponível", index)
        stats = (self.out / "stats.md").read_text(encoding="utf-8")
        for name in ("table_stats", "index_stats", "db_stats"):
            self.assertIn(f"Seção `{name}` indisponível", stats)
        self.assertIn("Seção `cron_runs` indisponível", (self.out / "cron-runs.md").read_text(encoding="utf-8"))

    def test_carried_sections_are_flagged_as_previous_inside_each_table_file(self):
        self.assertEqual(self.collect_sections(self.records()), 0)
        self.assertEqual(self.collect_sections(self.records(policies=[]), failures={"policies"}), 0)
        document = self.table_file()
        self.assertIn("Seção `policies` não pôde ser atualizada", document)
        self.assertIn("### `owner_only`", document)
        self.assertNotIn("Seção `columns`", document)
        self.assertEqual(self.collect_sections(self.records()), 0)
        self.assertNotIn("⚠️ Seção", self.table_file())


class SnapshotSecretTests(SnapshotFixture):
    DSN = "postgresql://postgres.ref:pAss%SEGREDOabc@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

    def workflow_guard(self):
        """Mesma expressão do passo "Guard — nenhum segredo na saída" do contexto.yml."""
        workflow = pathlib.Path(__file__).resolve().parents[2] / ".github" / "workflows" / "contexto.yml"
        found = re.search(r"grep -rIEl '([^']+)' \"\$SNAPSHOT_DIR\"", workflow.read_text(encoding="utf-8"))
        self.assertIsNotNone(found, "guard de segredos não encontrado no contexto.yml")
        return re.compile(found.group(1))

    def test_scrub_covers_basic_auth_dynamic_sql_passwords_and_dsn(self):
        cases = [
            ('{"Authorization":"Basic U0VOVElORUxBdXNlcjpTRU5USU5FTEFwYXNzMTIz"}', '{"Authorization":"Basic [REDACTED]"}'),
            ('{"Authorization":"Bearer abcdefghijklmnop0123"}', '{"Authorization":"Bearer [REDACTED]"}'),
            ("EXECUTE 'ALTER ROLE x PASSWORD ''segredo-dinamico''';", "EXECUTE 'ALTER ROLE x PASSWORD ''[REDACTED]''';"),
            ("ALTER ROLE x PASSWORD 'it''s-secret';", "ALTER ROLE x PASSWORD '[REDACTED]';"),
            ("ALTER ROLE x PASSWORD 'simples';", "ALTER ROLE x PASSWORD '[REDACTED]';"),
            ("ALTER ROLE x PASSWORD NULL; SELECT 'a';", "ALTER ROLE x PASSWORD NULL; SELECT 'a';"),
            ("select dblink('postgresql://app:segredo-dsn@db.test:5432/app')", "select dblink('postgresql://[REDACTED]@db.test:5432/app')"),
            ("-- basic authentication is required", "-- basic authentication is required"),
        ]
        for text, expected in cases:
            with self.subTest(text=text):
                self.assertEqual(self.snapshot.scrub(text), expected)

    def test_scrubbed_text_never_trips_the_workflow_secret_guard(self):
        guard = self.workflow_guard()
        secrets = [
            "select dblink('postgresql://app:segredo-dsn@db.test:5432/app')",
            "postgres://postgres.ref:segredo@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
            '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZSJ9.abcdefghijklmnop"}',
            "apikey: sb_secret_abcdefgh12345678", "key sb_publishable_abcdefgh12345678",
            "IF chave LIKE 'sb_secret_%' THEN", "-- aceita sb_publishable_ e sb_secret_abc",
        ]
        for text in secrets:
            with self.subTest(text=text):
                self.assertRegex(text, guard, "a fixture precisa ser um segredo que o guard reconhece")
                self.assertNotRegex(self.snapshot.scrub(text), guard)

    def test_slug_never_yields_hidden_files_or_parent_directories(self):
        slug = self.snapshot.slug
        self.assertEqual([slug(name) for name in ("..", ".oculta", "../escape", "v1.2.", "a.b", "Órgão_Ação", "___")],
                         ["_", "oculta", "escape", "v1.2", "a.b", "rg_o_A_o", "_"])
        self.assertEqual(self.collect(functions=[{**function(".oculta"), "schema": ".."}]), 0)
        written = [p.relative_to(self.out).as_posix() for p in (self.out / "functions").rglob("*.sql")]
        self.assertEqual(written, [f"functions/_/oculta__{self.snapshot.sha('')}.sql"])
        self.assertIn(f"](functions/_/oculta__{self.snapshot.sha('')}.sql)", (self.out / "functions.md").read_text(encoding="utf-8"))

    def test_mask_dsn_removes_url_and_password_fragments_from_driver_messages(self):
        cases = [  # (SUPABASE_DB_URL, mensagem do driver/subprocesso, trechos proibidos, trecho preservado)
            (self.DSN, 'invalid percent-encoded token: "pAss%SEGREDOabc"', ["SEGREDO", "pAss"], "invalid percent-encoded token"),
            ("postgresql://u:p@ss:w/rd%x@127.0.0.1:5432/db", 'invalid percent-encoded token: "rd%x@127.0.0.1:5432/db"', ["rd%x"], "token"),
            ("postgresql://u:SEGREDOxyz@abc@127.0.0.1:5432/db", "failed to resolve host 'abc@127.0.0.1': erro", ["abc@"], "failed to resolve host"),
            ("postgresql://u:Xy/SEGREDO@127.0.0.1:5432/db", 'invalid integer value "Xy" for connection option "port"', ['"Xy"'], '"port"'),
            ("u:SEGREDOsemesquema@127.0.0.1:5432/db", 'missing "=" after "u:SEGREDOsemesquema@127.0.0.1:5432/db" in connection info string', ["SEGREDO"], 'missing "="'),
            ("host=127.0.0.1 user=postgres password=SEGREDOkv dbname=db", "falha com SEGREDOkv no meio", ["SEGREDO"], "falha com"),
            (self.DSN, f"Command '['pg_dump', '--schema', 'public', '{self.DSN}']' timed out after 600 seconds", ["SEGREDO", "pAss"], "timed out after 600 seconds"),
            (self.DSN, 'connection to server at "aws-0-sa-east-1.pooler.supabase.com", port 5432 failed: FATAL:  password authentication failed for user "postgres.ref"',
             ["SEGREDO"], 'server at "aws-0-sa-east-1.pooler.supabase.com", port 5432 failed: FATAL:  password authentication failed for user "postgres.ref"'),
            ("postgresql://postgres@127.0.0.1:5432/db", 'connection to server at "127.0.0.1", port 5432 failed', [], 'connection to server at "127.0.0.1", port 5432 failed'),
        ]
        for url, message, forbidden, kept in cases:
            with self.subTest(url=url):
                self.snapshot.DB_URL = url
                masked = self.snapshot.mask_dsn(message)
                for fragment in forbidden:
                    self.assertNotIn(fragment, masked)
                self.assertIn(kept, masked)

    def test_subprocess_timeout_does_not_write_the_connection_string(self):
        snapshot = self.snapshot
        snapshot.DB_URL, snapshot.PGDUMP = self.DSN, True
        timeout = snapshot.subprocess.TimeoutExpired(["pg_dump", "--schema", "public", self.DSN], 600)
        with mock.patch.object(snapshot.shutil, "which", return_value="/usr/bin/pg_dump"):
            with mock.patch.object(snapshot.subprocess, "run", side_effect=timeout):
                with contextlib.redirect_stdout(io.StringIO()) as output:
                    self.assertIsNone(snapshot.run_pg_dump())
        recorded = json.dumps(snapshot.ERRORS) + output.getvalue()
        self.assertIn("timed out", recorded)
        self.assertNotIn("SEGREDO", recorded)
        self.assertNotIn("pAss", recorded)

    def test_pg_dump_output_is_scrubbed_like_every_other_database_text(self):
        snapshot = self.snapshot
        snapshot.PGDUMP = True
        dump = types.SimpleNamespace(returncode=0, stderr="", stdout=(
            "-- Dumped from database version 17\nCREATE FUNCTION public.f() RETURNS void AS $$\n"
            "  PERFORM net.http_post('https://x.test', '{\"Authorization\": \"Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoieCJ9.abcdefghijklmnop\"}');\n"
            "  EXECUTE 'ALTER ROLE x PASSWORD ''segredo-do-dump''';\n$$;\n"))
        with mock.patch.object(snapshot.shutil, "which", return_value="/usr/bin/pg_dump"):
            with mock.patch.object(snapshot.subprocess, "run", return_value=dump):
                with contextlib.redirect_stdout(io.StringIO()):
                    text = snapshot.run_pg_dump()
        self.assertIn("CREATE FUNCTION public.f()", text)
        self.assertNotIn("Dumped from", text)
        self.assertNotIn("eyJhbGci", text)
        self.assertNotIn("segredo-do-dump", text)

    def test_connection_failure_exits_1_without_traceback_or_password(self):
        snapshot = self.snapshot
        snapshot.DB_URL = self.DSN
        failure = RuntimeError('invalid percent-encoded token: "pAss%SEGREDOabc"\nsegunda linha')
        with mock.patch.object(snapshot.psycopg, "connect", side_effect=failure):
            with contextlib.redirect_stdout(io.StringIO()) as output, contextlib.redirect_stderr(io.StringIO()) as errors:
                self.assertEqual(snapshot.main(), 1)
        printed = output.getvalue() + errors.getvalue()
        self.assertIn("Falha ao conectar no banco (RuntimeError): invalid percent-encoded token", printed)
        self.assertIn("percent-encoding", printed)
        for fragment in ("SEGREDO", "pAss", "Traceback", "segunda linha"):
            self.assertNotIn(fragment, printed)
        # Só o marcador de posse da pasta: nenhuma saída que pareça coleta concluída.
        self.assertEqual([p.name for p in self.out.iterdir()], [snapshot.OUTPUT_MARKER])


class RecordingConnection:
    """Conexão falsa que registra a ordem dos comandos e se cada um rodou dentro de transação."""

    def __init__(self, rows=(), failure=None):
        self.rows, self.failure = list(rows), failure
        self.log, self.outside, self.depth = [], [], 0

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    @contextlib.contextmanager
    def transaction(self):
        self.log.append("BEGIN")
        self.depth += 1
        try:
            yield
        except BaseException:
            self.log.append("ROLLBACK")
            raise
        else:
            self.log.append("COMMIT")
        finally:
            self.depth -= 1

    def execute(self, sql, params=None):
        self.log.append(sql)
        if not self.depth:
            self.outside.append(sql)

    def cursor(self, row_factory=None):
        connection = self

        class Cursor:
            def __enter__(self):
                return self

            def __exit__(self, *_):
                return False

            def execute(self, sql, params=None):
                connection.execute(sql, params)
                if connection.failure:
                    raise connection.failure

            def fetchall(self):
                return connection.rows

        return Cursor()

    def rollback(self):
        pass


class SnapshotReadOnlyTransactionTests(SnapshotFixture):
    """Somente leitura e prazos por transação: SET de sessão vaza para outros clientes de um pooler."""

    def test_every_query_runs_inside_its_own_read_only_transaction(self):
        snapshot = self.snapshot
        conn = RecordingConnection(rows=[{"command": "Authorization: Bearer abcdefghijklmnop0123"}])
        rows = snapshot.q(conn, "SELECT 1")
        self.assertEqual(conn.log, ["BEGIN", snapshot.TX_GUARD, "SELECT 1", "COMMIT"])
        self.assertEqual(conn.outside, [])
        self.assertEqual(rows, [{"command": "Authorization: Bearer [REDACTED]"}])
        self.assertIn("SET TRANSACTION READ ONLY", snapshot.TX_GUARD)
        self.assertIn("SET LOCAL statement_timeout", snapshot.TX_GUARD)
        self.assertIn("SET LOCAL lock_timeout", snapshot.TX_GUARD)
        self.assertIsNone(re.search(r"\bSET\s+(?!TRANSACTION\b|LOCAL\b)", snapshot.TX_GUARD), "SET de sessão no guard")

    def test_failed_query_rolls_back_and_propagates_to_the_section(self):
        conn = RecordingConnection(failure=PermissionError("permission denied for schema vault"))
        with self.assertRaises(PermissionError):
            self.snapshot.q(conn, "SELECT name FROM vault.secrets")
        self.assertEqual(conn.log[-1], "ROLLBACK")
        self.assertEqual(conn.outside, [])

    def test_collection_never_changes_session_settings(self):
        snapshot = self.snapshot
        conn = RecordingConnection(rows=[{"present": 1}])

        @snapshot.section("extensions")
        def collect_section(connection):
            return snapshot.has_ext(connection, "pg_cron")

        snapshot.DB_SECTIONS = [collect_section]
        with mock.patch.object(snapshot.psycopg, "connect", return_value=conn):
            with contextlib.redirect_stdout(io.StringIO()):
                database, _ = snapshot.introspect_db(None)
        self.assertEqual(database, {"extensions": True})
        self.assertEqual(conn.outside, [], "comando fora de transação (SET de sessão vaza em pooler transaction mode)")
        self.assertEqual(conn.log[:2], ["BEGIN", snapshot.TX_GUARD])
        source = pathlib.Path(__file__).with_name("snapshot.py").read_text(encoding="utf-8")
        self.assertEqual(re.findall(r"conn\.execute\(([^)]*)\)", source), ["TX_GUARD"],
                         "toda consulta deve passar por q(); conn.execute direto escapa da transação READ ONLY")


class SnapshotCatalogQueryTests(SnapshotFixture):
    """Regressões de SQL sem banco: captura o texto enviado a q() e exercita os padrões em Python."""

    def run_section(self, getter, answers=()):
        captured, pending = [], list(answers)

        def query(_conn, sql, params=None):
            captured.append(" ".join(sql.split()))
            return pending.pop(0) if pending else []

        self.snapshot.ERRORS.clear()
        with mock.patch.object(self.snapshot, "q", side_effect=query):
            with contextlib.redirect_stdout(io.StringIO()):
                data = getter(OfflineConnection())
        self.assertEqual(self.snapshot.ERRORS, [])
        return captured, data

    def test_constraint_columns_keep_the_declared_order(self):
        (sql,), _ = self.run_section(self.snapshot.get_constraints)
        self.assertEqual(sql.count("WITH ORDINALITY k(attnum, ord)"), 2)
        self.assertEqual(sql.count("ORDER BY k.ord) AS columns") + sql.count("ORDER BY k.ord) AS ref_columns"), 2)

    def test_foreign_key_lint_accepts_any_column_order_and_ignores_partial_or_invalid_indexes(self):
        queries, lints = self.run_section(self.snapshot.get_lints)
        self.assertEqual(lints, [])
        (sql,) = [text for text in queries if "con.contype = 'f'" in text]
        self.assertIn("ORDER BY k.ord) AS cols", sql)
        self.assertIn("ix.indisvalid AND ix.indpred IS NULL", sql)
        self.assertEqual(sql.count("@>"), 2)
        self.assertNotIn("= con.conkey::int2[]", sql)

    def test_security_invoker_accepts_every_true_spelling(self):
        queries, _ = self.run_section(self.snapshot.get_views)
        lint_queries, _ = self.run_section(self.snapshot.get_lints)
        (lint,) = [text for text in lint_queries if "c.relkind = 'v'" in text]
        self.assertIn(f"NOT {self.snapshot.SECURITY_INVOKER_ON}", lint)
        self.assertIn(f"(c.relkind = 'v' AND {self.snapshot.SECURITY_INVOKER_ON}) AS security_invoker", queries[0])
        self.assertNotIn("security_invoker=true%", queries[0] + lint)
        pattern = re.compile(re.search(r"o ~\* '([^']+)'", self.snapshot.SECURITY_INVOKER_ON).group(1), re.I)
        for option in ("security_invoker=on", "security_invoker=true", "security_invoker=1", "security_invoker=yes",
                       "security_invoker=TRUE", "security_invoker=t"):
            self.assertRegex(option, pattern)
        for option in ("security_invoker=off", "security_invoker=false", "security_invoker=0", "security_invoker=no",
                       "security_barrier=true", "x_security_invoker=on"):
            self.assertNotRegex(option, pattern)

    def test_server_reads_timezone_and_the_configured_statement_timeout(self):
        answers = [[{"name": "timezone", "setting": "America/Sao_Paulo"}, {"name": "statement_timeout", "setting": "120000"}],
                   [{"db": "postgres"}]]
        queries, server = self.run_section(self.snapshot.get_server, answers)
        self.assertIn("lower(name) AS name", queries[0])
        self.assertIn("WHERE lower(name) IN (", queries[0])
        self.assertIn("CASE WHEN name = 'statement_timeout' THEN reset_val ELSE setting END", queries[0])
        self.assertEqual(server["timezone"], "America/Sao_Paulo")

    def test_foreign_server_options_redact_by_key_substring(self):
        (sql,), _ = self.run_section(self.snapshot.get_foreign)
        pattern = re.search(r"regexp_replace\(o, '([^']+)', '\\1=\[REDACTED\]', 'i'\)", sql)
        self.assertIsNotNone(pattern, sql)
        redact = lambda option: re.sub(pattern.group(1), r"\1=[REDACTED]", option, flags=re.I)
        for key in ("password", "api_key", "aws_secret_access_key", "aws_access_key_id", "sa_key", "api_token",
                    "client_secret", "conn_string", "motherduck_token", "Service_Key"):
            self.assertEqual(redact(f"{key}=valor-secreto"), f"{key}=[REDACTED]")
        for option in ("region=sa-east-1", "api_url=https://erp.test/v1?token=abc", "project_id=demo"):
            self.assertEqual(redact(option), option)

    def test_grants_come_from_catalog_acls_visible_to_any_role(self):
        queries, grants = self.run_section(self.snapshot.get_grants)
        self.assertEqual(set(grants), {"tables", "columns", "sequences", "default_privileges"})
        for sql in queries[:2]:
            self.assertNotIn("information_schema.", sql)
            self.assertIn("aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner)))", sql)
        self.assertIn("aclexplode(att.attacl)", queries[1])


class SnapshotManagementApiTests(SnapshotFixture):
    """Falha transitória da Management API reaproveita a coleta anterior, como as seções do banco."""

    RESPONSES = {
        "/projects/ref": {"id": "ref", "name": "Fixture", "region": "sa-east-1"},
        "/projects/ref/functions": [{"slug": "zeta", "name": "zeta", "version": 2}, {"slug": "alfa", "name": "alfa", "version": 1}],
        "/projects/ref/secrets": [{"name": "ERP_TOKEN", "value": "valor-secreto"}],
        "/projects/ref/config/auth": {"site_url": "https://app.test", "smtp_pass": "valor-secreto"},
        "/projects/ref/postgrest": {"db_schema": "public"},
        "/projects/ref/config/database/pooler": [{"pool_mode": "transaction"}],
    }

    def collect_api(self, failing=()):
        snapshot = self.snapshot
        snapshot.PROJECT_REF, snapshot.ACCESS_TOKEN = "ref", "token-fixture"

        def api(path):
            path = path.split("?")[0]
            if path in failing:
                raise snapshot.urllib.error.HTTPError(path, 500, "erro interno", None, None)
            if path not in self.RESPONSES:
                raise snapshot.urllib.error.HTTPError(path, 404, "não encontrado", None, None)
            return copy.deepcopy(self.RESPONSES[path])

        with mock.patch.object(snapshot, "api", side_effect=api):
            return self.collect()

    def test_transient_api_failure_keeps_previous_edge_functions_and_changelog(self):
        self.assertEqual(self.collect_api(), 0)
        first = self.metadata()
        changelog = (self.out / "CHANGELOG.md").read_bytes()
        self.assertEqual([f["slug"] for f in first["api"]["edge_functions"]], ["alfa", "zeta"])
        self.assertNotIn("valor-secreto", (self.out / "snapshot.json").read_text(encoding="utf-8"))

        failing = {"/projects/ref/functions", "/projects/ref/config/auth"}
        self.assertEqual(self.collect_api(failing=failing), 0)
        metadata = self.metadata()
        self.assertEqual(metadata["api"]["edge_functions"], first["api"]["edge_functions"])
        self.assertEqual(metadata["api"]["auth_config"], first["api"]["auth_config"])
        self.assertEqual(metadata["carried"], ["api.edge_functions", "api.auth_config"])
        self.assertEqual(self.error_sections(), {"api.edge_functions", "api.auth_config"})
        self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), changelog, "falha de API não é remoção")
        self.assertTrue((self.out / "edge-functions" / "alfa" / "README.md").is_file())
        self.assertIn("versão anterior", (self.out / "edge-functions.md").read_text(encoding="utf-8"))
        self.assertIn("versão anterior", (self.out / "auth.md").read_text(encoding="utf-8"))

        self.assertEqual(self.collect_api(), 0)
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.metadata()["errors"], [])
        self.assertEqual((self.out / "CHANGELOG.md").read_bytes(), changelog)
        self.assertNotIn("versão anterior", (self.out / "edge-functions.md").read_text(encoding="utf-8"))

    def test_first_collection_api_failure_has_nothing_to_carry(self):
        self.assertEqual(self.collect_api(failing={"/projects/ref/functions"}), 0)
        self.assertEqual(self.metadata()["carried"], [])
        self.assertEqual(self.metadata()["api"]["edge_functions"], [])
        self.assertEqual(self.error_sections(), {"api.edge_functions"})


LIVE_DB_URL = os.environ.get("SNAPSHOT_TEST_DB_URL", "").strip()
LIVE_FIXTURE = """
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'snapshot_live_reader') THEN
    CREATE ROLE snapshot_live_reader NOLOGIN; GRANT pg_read_all_data TO snapshot_live_reader;
  END IF;
END $$;
CREATE TABLE public.par (x int, y int, PRIMARY KEY (y, x), UNIQUE (x, y));
CREATE TABLE public.filho (id int PRIMARY KEY, a int, b int, c int, d int,
  CONSTRAINT filho_fk FOREIGN KEY (c, a) REFERENCES public.par (x, y),
  CONSTRAINT filho_parcial_fk FOREIGN KEY (d) REFERENCES public.filho (id));
CREATE INDEX filho_a_c ON public.filho (a, c);
CREATE INDEX filho_d_parcial ON public.filho (d) WHERE b IS NULL;
CREATE VIEW public.v_on WITH (security_invoker = on) AS SELECT 1 AS x;
CREATE VIEW public.v_true WITH (security_invoker = true) AS SELECT 1 AS x;
CREATE VIEW public.v_off WITH (security_invoker = off) AS SELECT 1 AS x;
CREATE VIEW public.v_none AS SELECT 1 AS x;
CREATE FOREIGN DATA WRAPPER snapshot_live_fdw;
CREATE SERVER snapshot_live_srv FOREIGN DATA WRAPPER snapshot_live_fdw
  OPTIONS (aws_secret_access_key 'LIVE-SECRET-1', sa_key 'LIVE-SECRET-2', api_token 'LIVE-SECRET-3', region 'sa-east-1');
GRANT SELECT ON public.par TO anon;
GRANT SELECT (a) ON public.filho TO authenticated;
"""


@unittest.skipUnless(LIVE_DB_URL, "opcional: SNAPSHOT_TEST_DB_URL aponta para um Postgres LOCAL descartável")
class SnapshotLivePostgresTests(unittest.TestCase):
    """Executa as consultas de catálogo de verdade. Nunca roda no CI e recusa host que não seja loopback."""

    @classmethod
    def setUpClass(cls):
        import psycopg
        from psycopg import conninfo
        cls.psycopg = psycopg
        cls.admin = conninfo.conninfo_to_dict(LIVE_DB_URL)
        if cls.admin.get("host") not in ("127.0.0.1", "localhost", "::1"):
            raise unittest.SkipTest("SNAPSHOT_TEST_DB_URL recusada: só Postgres local (host loopback)")
        cls.database = f"snapshot_live_{os.getpid()}"
        with psycopg.connect(LIVE_DB_URL, autocommit=True) as conn:
            conn.execute(f"CREATE DATABASE {cls.database}")
            conn.execute(f"ALTER DATABASE {cls.database} SET statement_timeout = '7s'")
            conn.execute(f"ALTER DATABASE {cls.database} SET timezone = 'America/Sao_Paulo'")
        cls.url = conninfo.make_conninfo(LIVE_DB_URL, dbname=cls.database)
        with psycopg.connect(cls.url, autocommit=True) as conn:
            conn.execute(LIVE_FIXTURE)
        cls.temp = tempfile.TemporaryDirectory(prefix="snapshot-live-test-")
        spec = importlib.util.spec_from_file_location("snapshot_live", pathlib.Path(__file__).with_name("snapshot.py"))
        cls.snapshot = importlib.util.module_from_spec(spec)
        # O role sem vínculo com grantor/grantee é o caso em que information_schema escondia os grants.
        env = {"SUPABASE_DB_URL": conninfo.make_conninfo(cls.url, options="-c role=snapshot_live_reader"),
               "SNAPSHOT_DIR": str(pathlib.Path(cls.temp.name) / "output"), "PGDUMP": "false", "GEN_TYPES": "false", "REPO_ROOT": ""}
        with mock.patch.dict(os.environ, env, clear=True):
            spec.loader.exec_module(cls.snapshot)
        with contextlib.redirect_stdout(io.StringIO()):
            cls.db, _ = cls.snapshot.introspect_db(None)

    @classmethod
    def tearDownClass(cls):
        with cls.psycopg.connect(LIVE_DB_URL, autocommit=True) as conn:
            conn.execute(f"DROP DATABASE IF EXISTS {cls.database} WITH (FORCE)")
        cls.temp.cleanup()

    def test_constraint_columns_follow_the_declared_order(self):
        constraints = {c["name"]: c for c in self.db["constraints"]}
        self.assertEqual(constraints["par_pkey"]["columns"], ["y", "x"])
        self.assertEqual((constraints["filho_fk"]["columns"], constraints["filho_fk"]["ref_columns"]), (["c", "a"], ["x", "y"]))

    def test_lints_have_no_obvious_false_positive_or_negative(self):
        found = {(lint["code"], lint["object"]) for lint in self.db["lints"]}
        self.assertEqual({o for code, o in found if code == "fk_without_index"}, {"public.filho.filho_parcial_fk"})
        self.assertEqual({o for code, o in found if code == "view_security_definer"}, {"public.v_none", "public.v_off"})
        self.assertEqual({v["name"] for v in self.db["views"] if v["security_invoker"]}, {"v_on", "v_true"})

    def test_foreign_server_credentials_are_redacted(self):
        (server,) = self.db["foreign_servers"]
        self.assertNotIn("LIVE-SECRET", json.dumps(server))
        self.assertIn("region=sa-east-1", server["options"])

    def test_grants_are_visible_to_a_role_outside_grantor_and_grantee(self):
        tables = {(g["table"], g["grantee"]): g["privileges"] for g in self.db["grants"]["tables"]}
        self.assertEqual(tables[("par", "anon")], "SELECT")
        self.assertIn({"schema": "public", "table": "filho", "column": "a", "grantee": "authenticated", "privileges": "SELECT"},
                      self.db["grants"]["columns"])

    def test_server_reports_database_settings_not_the_collector_session(self):
        self.assertEqual(self.db["server"]["timezone"], "America/Sao_Paulo")
        self.assertEqual(self.db["server"]["statement_timeout"], "7000")

    def test_queries_are_read_only_and_leave_the_session_untouched(self):
        with self.psycopg.connect(self.url, autocommit=True, prepare_threshold=None) as conn:
            self.assertEqual(self.snapshot.q(conn, "SELECT current_setting('transaction_read_only') AS ro")[0]["ro"], "on")
            for statement in ("CREATE TABLE public.escrita (id int)", "INSERT INTO public.par VALUES (1, 1)"):
                with self.assertRaisesRegex(self.psycopg.Error, "read-only transaction"):
                    self.snapshot.q(conn, statement)
            session = conn.execute("SELECT current_setting('default_transaction_read_only'), current_setting('statement_timeout'), "
                                   "current_setting('lock_timeout')").fetchone()
            self.assertEqual(session, ("off", "7s", "0"))


def db_stats_case(method, *args):
    def run(self):
        getattr(self, method)(*args)
    return run


for _index, _schema in enumerate((
        "extensions", "public", "analytics", "Query Metrics", 'stats"quoted',
        "select", "stats%raw", 'stats"; DROP TABLE private; --')):
    for _auth_error in (False, True):
        setattr(SnapshotDBStatsTests, f"test_schema_{_index}_auth_{_auth_error}",
                db_stats_case("exercise_schema", _schema, _auth_error))

for _present in (False, True):
    for _top in (0, -1, 1):
        for _auth_error in (False, True):
            setattr(SnapshotDBStatsTests, f"test_available_{_present}_top_{_top}_auth_{_auth_error}",
                    db_stats_case("exercise_availability", _present, _top, _auth_error))

for _failure in ("catalog", "permission", "missing", "timeout", "row"):
    for _auth_error in (False, True):
        setattr(SnapshotDBStatsTests, f"test_failure_{_failure}_auth_{_auth_error}",
                db_stats_case("exercise_failure", _failure, _auth_error))

for _auth_error in (False, True):
    for _empty in (False, True):
        setattr(SnapshotDBStatsTests, f"test_recovery_auth_{_auth_error}_empty_{_empty}",
                db_stats_case("exercise_recovery", _auth_error, _empty))


if __name__ == "__main__":
    unittest.main()
