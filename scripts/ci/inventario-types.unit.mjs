// Agregador das suites de scripts/inventario/* e scripts/types-sync/*, que vivem em
// scripts/ci/inventario-types/. Existe por um motivo so: o glob `scripts/ci/*.unit.mjs` do guards.yml
// nao desce em subpastas, e o check-test-inventory.mjs so considera coberta uma suite alcancada por
// import estatico de uma suite que o workflow ja roda. Importar aqui as seis suites faz o CI executar
// cada caso uma unica vez (as suites da subpasta NAO casam o glob) e reprova suite nova que esquecer
// de entrar nesta lista.
//
// Recurso externo ausente (rg, git, typescript, bash/dash, Postgres, pgbouncer) vira `skip` com o
// motivo, nunca falha. O Postgres efemero so sobe com INVENTARIO_TEST_PG_BIN (ver
// scripts/ci/inventario-types/pg.mjs); por padrao nenhum cluster e criado.
import './inventario-types/banco.unit.mjs';
import './inventario-types/gates.unit.mjs';
import './inventario-types/gentypes.unit.mjs';
import './inventario-types/identidade.unit.mjs';
import './inventario-types/repo.unit.mjs';
import './inventario-types/rotas.unit.mjs';
