import test from 'node:test';
import assert from 'node:assert/strict';
import {
  limparSql,
  truncarIdentificador,
  estadoVazio,
  aplicarMigration,
  comparar,
} from './paridade-migrations-banco.mjs';

function declarar(sql) {
  return aplicarMigration(estadoVazio(), sql);
}

test('ignora DDL escrita dentro do corpo dollar-quoted de uma funcao', () => {
  const sql = `
    CREATE OR REPLACE FUNCTION public.semeia() RETURNS void AS $$
    BEGIN
      EXECUTE 'CREATE TABLE public.tabela_fantasma (id int)';
    END;
    $$ LANGUAGE plpgsql;
  `;
  const e = declarar(sql);
  assert.ok(e.funcoes.has('semeia'));
  assert.equal(e.tabelas.has('tabela_fantasma'), false);
  assert.ok(!limparSql(sql).includes('tabela_fantasma'));
});

test('objeto criado e depois removido nao e cobrado do banco', () => {
  const e = estadoVazio();
  aplicarMigration(e, 'CREATE TABLE public.temporaria (id int); CREATE INDEX idx_tmp ON public.temporaria (id);');
  aplicarMigration(e, 'DROP INDEX IF EXISTS public.idx_tmp; DROP TABLE IF EXISTS public.temporaria;');
  assert.equal(e.tabelas.size, 0);
  assert.equal(e.indices.size, 0);
});

test('ALTER TABLE ... RENAME TO move o nome em vez de duplicar', () => {
  const e = estadoVazio();
  aplicarMigration(e, 'CREATE TABLE public.antiga (id int);');
  aplicarMigration(e, 'ALTER TABLE public.antiga RENAME TO nova;');
  assert.deepEqual([...e.tabelas], ['nova']);
});

test('objeto fora do schema public nao entra na comparacao', () => {
  const e = declarar(`
    CREATE TABLE auth.sessoes (id int);
    CREATE INDEX idx_fora ON storage.objects (name);
    CREATE POLICY "p fora" ON cron.job FOR SELECT USING (true);
  `);
  assert.equal(e.tabelas.size, 0);
  assert.equal(e.indices.size, 0);
  assert.equal(e.politicas.size, 0);
});

test('truncarIdentificador replica o corte de 63 bytes do Postgres', () => {
  const curto = 'politica_curta';
  assert.equal(truncarIdentificador(curto), curto);

  const longo = 'b'.repeat(80);
  assert.equal(truncarIdentificador(longo).length, 63);

  // Acento ocupa 2 bytes: o corte e por byte, e nao parte o caractere ao meio.
  const comAcento = 'ç'.repeat(40);
  const cortado = truncarIdentificador(comAcento);
  assert.ok(Buffer.from(cortado, 'utf8').length <= 63);
  assert.equal(cortado.includes('\uFFFD'), false);
});

test('nome longo declarado casa com a versao truncada que o banco guarda', () => {
  const nome = 'Buyers coordinators admins can manage repurchase suggestions within tenant';
  const e = declarar(`CREATE POLICY "${nome}" ON public.repurchase_suggestions FOR ALL USING (true);`);
  const real = { politicas: ['buyers coordinators admins can manage repurchase suggestions wi'] };
  assert.deepEqual(comparar(e, real).politicas, []);
});

test('comparar acusa o que falta e respeita a allowlist', () => {
  const e = declarar('CREATE TABLE public.presente (id int); CREATE TABLE public.sumida (id int);');
  assert.deepEqual(comparar(e, { tabelas: ['presente'] }).tabelas, ['sumida']);

  const liberado = comparar(e, { tabelas: ['presente'] }, [{ tipo: 'tabelas', nome: 'SUMIDA' }]);
  assert.deepEqual(liberado.tabelas, []);
});

test('view e materialized view sao classificadas em baldes diferentes', () => {
  const e = declarar(`
    CREATE OR REPLACE VIEW public.v_simples AS SELECT 1;
    CREATE MATERIALIZED VIEW public.mv_pesada AS SELECT 1;
  `);
  assert.deepEqual([...e.views], ['v_simples']);
  assert.deepEqual([...e.matviews], ['mv_pesada']);
});
test('DROP seguido de CREATE no mesmo arquivo mantem o objeto declarado', () => {
  // Padrao idempotente usado em todo o repositorio: o CREATE precisa sobreviver ao
  // DROP que vem antes dele. Com todos os CREATEs aplicados antes dos DROPs, o
  // objeto era apagado do estado e nunca cobrado do banco.
  const e = declarar(`
    DROP POLICY IF EXISTS "leitura" ON public.pedidos;
    CREATE POLICY "leitura" ON public.pedidos FOR SELECT USING (true);
    DROP TRIGGER IF EXISTS audita ON public.pedidos;
    CREATE TRIGGER audita AFTER INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.audita();
    DROP INDEX IF EXISTS idx_pedido;
    CREATE INDEX idx_pedido ON public.pedidos (id);
  `);
  assert.deepEqual([...e.politicas], ['leitura']);
  assert.deepEqual([...e.triggers], ['audita']);
  assert.deepEqual([...e.indices], ['idx_pedido']);
});

test('CREATE seguido de DROP no mesmo arquivo continua removendo o objeto', () => {
  const e = declarar(`
    CREATE POLICY "curta" ON public.pedidos FOR SELECT USING (true);
    DROP POLICY IF EXISTS "curta" ON public.pedidos;
  `);
  assert.equal(e.politicas.size, 0);
});

test('trigger de tabela fora do public nao e cobrado do inventario', () => {
  // `on_auth_user_created` existe no banco, mas em auth.users; o inventario de
  // paridade so lista public, entao olhar apenas o nome do trigger acusava
  // ausencia falsa - e o DROP do trigger de outro schema apagava o homonimo.
  const e = declarar(`
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    CREATE TRIGGER audita_publico AFTER UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.audita();
    CREATE TRIGGER audita_sem_schema BEFORE DELETE ON pedidos FOR EACH ROW EXECUTE FUNCTION public.audita();
    DROP TRIGGER IF EXISTS audita_publico ON auth.users;
  `);
  assert.deepEqual([...e.triggers].sort(), ['audita_publico', 'audita_sem_schema']);
});
