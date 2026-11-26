# L13 — Migrations (inventário em altitude)

> **Método:** 279 arquivos somando 21.209 linhas estão muito acima do teto de leitura linha a linha.
> Conforme a regra de fatiamento, subi a altitude: inventário por operação e por objeto, com contagem
> medida por `grep`, cruzado contra o banco vivo (ver `L12_BANCO_E_RUNTIME.md`).
> Nenhuma migration foi executada. Auditoria é somente leitura.

---

## Volume e distribuição temporal

| Período | Migrations |
|---|---|
| 2024-12 | 2 |
| 2025-01 | 1 |
| 2025-12 | 13 |
| 2026-01 | 5 |
| 2026-03 | 37 |
| 2026-04 | 11 |
| 2026-05 | **81** |
| 2026-06 | 15 |
| 2026-07 | **111** |
| 2026-08 | 3 |
| **Total** | **279** |

**267 das 279 (95,7%)** têm nome no padrão `<timestamp>_<uuid>.sql` — sem descrição semântica. É o padrão de geração automática do Lovable. Consequência prática: **é impossível saber o que uma migration faz pelo nome**; a intenção de cada mudança de schema só existe dentro do arquivo.

---

## Operações declaradas (ocorrências medidas)

| Operação | Ocorrências |
|---|---|
| `CREATE POLICY` | 489 |
| `CREATE INDEX` | 389 |
| `ALTER TABLE` | 327 |
| `GRANT` | 305 |
| `DROP POLICY` | **277** |
| `CREATE OR REPLACE FUNCTION` | 221 |
| `SECURITY DEFINER` | **208** |
| `INSERT INTO` | **182** |
| `CREATE TABLE` | 169 (→ 147 tabelas distintas) |
| `CREATE TRIGGER` | 138 |
| `cron.schedule` | **73** |
| `DROP TABLE` | 3 |
| `CREATE VIEW` / `CREATE OR REPLACE VIEW` | 1 / 3 |

### Leituras destes números

**489 `CREATE POLICY` contra 277 `DROP POLICY`, resultando em 324 policies vivas.** A razão drop/create de 57% indica que o modelo de segurança foi **reescrito repetidamente**. Não é defeito por si — mas significa que a policy vigente hoje raramente é a da migration que a criou, e que ler o repo não diz qual policy está ativa. Só o banco diz.

**208 `SECURITY DEFINER`.** Funções que rodam com privilégio do dono, contornando RLS. É um volume alto e cada uma é superfície de escalonamento de privilégio se o `search_path` não estiver fixado. Amostragem confirma que as funções de scan mais recentes **fixam** `SET search_path` corretamente (ex.: `20260713110028_...sql`, `20260713110159_...sql`, `20260713110314_...sql`). Não auditei as 208 individualmente — `NAO_VERIFICADO` para o conjunto.

**182 `INSERT INTO` dentro de migrations.** Migration que insere dado mistura schema com carga. É a origem provável do dado semeado medido no L12 (111 documentos de fornecedor apontando para arquivos inexistentes, 23 códigos UNSPSC, 3 moedas). Torna a migration não-idempotente e polui o ambiente de produção com dado de demonstração.

**Apenas 4 `CREATE VIEW` em 279 migrations, mas o banco tem 2 views em `public`.** Coerente. As "148 views" do panorama inicial são majoritariamente de schemas de sistema/extensões.

---

## 🔴 O subsistema de observabilidade foi CONSTRUÍDO e depois DESLIGADO

Este é o achado mais interessante do lote, e ele muda a interpretação do `L12`.

- **73 chamadas `cron.schedule`** aparecem nas migrations.
- **11 cron jobs** existem vivos, **todos de housekeeping** (`DELETE`/`ANALYZE`).
- **30 nomes distintos** aparecem em `cron.unschedule`.

Os jobs desagendados formam um sistema de saúde de banco completo:

`run-all-health-scans-hourly` · `scan-blocking-locks-1m` · `scan-lock-waits-2min` · `scan-idle-in-txn-2m` · `scan-long-running-txn-5min` · `scan-slow-query-hotspots-1h` · `scan-unused-indexes-weekly` · `scan-duplicate-indexes-weekly` · `scan-invalid-dup-indexes-daily` · `scan-unindexed-fks-weekly` · `scan-tables-without-pk-daily` · `scan-sequence-exhaustion-daily` · `scan-xid-wraparound-daily` · `scan-replication-slots-30m` · `scan-temp-file-usage-10min` · `scan-temp-spill-15m` · `scan-schema-hygiene-weekly` · `scan-stale-alerts-daily` · `scan-scan-runs-sla` · `scan-dangerous-statements` · `pg-activity-watchdog` · `ensure-audit-logs-next-partition` · `archive-audit-logs-old-partitions` · `archive-telemetry-logs-old-partitions` · `lgpd_retention_daily` · `cleanup_expired_password_resets_daily` · `check_secret_rotation_due_daily` · `cleanup-health-scan-runs-daily` · `cleanup-integration-outbox-daily` · `cleanup-webhook-events-daily`

As **funções SQL correspondentes continuam existindo** no banco (fazem parte das 356 funções de `public`; verificadas nas migrations `20260713105738`, `20260713110028`, `20260713110159`, `20260713110314`). O que sumiu foi o **agendamento**.

### Por que isso importa

Explica de forma limpa uma evidência do L12 que, sozinha, seria enigmática: **`health_scan_runs` tem 0 linhas**. Não é que o sistema de health scan nunca funcionou — é que ele foi **desmontado**. O código está lá, as funções estão lá, o painel `HealthDashboard.tsx` está lá lendo `v_system_health_overview`, e **nada alimenta a tabela**.

Classificação do subsistema de observabilidade de banco: **🟨 IMPLEMENTADO_PARCIAL** — lógica completa e sofisticada, agendamento removido, portanto zero execução. Não é ⬛ porque as funções são invocáveis manualmente e o painel existe.

Três itens desagendados são de **conformidade e segurança**, não só de performance, e o desligamento deles tem consequência regulatória e operacional direta:
- `lgpd_retention_daily` — retenção de dados pessoais deixou de ser aplicada automaticamente
- `cleanup_expired_password_resets_daily` — tokens de redefinição de senha não expiram por rotina
- `check_secret_rotation_due_daily` — a tabela `secret_rotation_schedule` está vazia (L12) e nada avisa sobre segredo vencido

### Ressalva honesta

Não consegui determinar **se o desligamento foi deliberado** (custo, ruído de alerta, instabilidade) **ou acidental**. As migrations que contêm `cron.unschedule` também redefinem as funções — o padrão `DROP FUNCTION; CREATE OR REPLACE FUNCTION; cron.unschedule` sugere um ciclo de *"desagendar, corrigir, reagendar"* em que **a etapa de reagendar não aconteceu** ou não foi versionada. Isso é hipótese, não medição. **Só o dono do sistema pode responder.**

---

## Apenas 4 migrations agendam chamada HTTP a edge function

Migrations contendo `cron.schedule` **e** (`net.http_post` ou `functions/v1`):
- `supabase/migrations/20260402113249_b5e59bf9-8946-423d-8295-96738436f121.sql`
- `supabase/migrations/20260402114640_da3f3e68-f49b-4af1-8a41-32869d820cda.sql`
- `supabase/migrations/20260507194402_b30cf397-f164-4a9e-b0d1-bbe8d1ecc990.sql`
- `supabase/migrations/20260711153258_f292f3e6-aff3-4382-9b85-99a3edd5224b.sql`

Nenhum dos 11 jobs vivos corresponde a essas quatro (verificado por leitura do `command` de cada job — todos são `DELETE`/`ANALYZE`/`pg_stat_statements_reset`). **Confirma pelo lado do repositório o Achado 2 do L12: nenhuma edge function é disparada por agendador em produção.**

---

## Consolidação com o L12 — o veredito de reconstrutibilidade

| Verificação | Resultado |
|---|---|
| `supabase_migrations.schema_migrations` existe? | **NÃO** — sem rastreio de aplicação |
| Tabelas criadas por migration | 147 distintas |
| Tabelas vivas em `public` | 162 |
| Tabelas vivas **sem** `CREATE TABLE` no repo | 6 de negócio + 11 partições + 6 lixo `v_*` |
| Tabelas no repo **ausentes** do banco | 5 (`cron_heartbeats`, `entity_versions`, `historico_compras`, `password_reset_tokens`, `saved_filters`) |
| Jobs agendados no repo × vivos | 73 `cron.schedule` declarados → 11 vivos, nenhum coincidente com edge functions |

**Veredito: o repositório NÃO reconstrói o ambiente.** Rodar as 279 migrations em base limpa produz um banco diferente do de produção — faltando 6 tabelas de negócio que policies posteriores tentam referenciar (falha em cascata), e sobrando 5 tabelas que produção não tem.

---

## O que NÃO foi coberto neste lote

| Item | Marca |
|---|---|
| Leitura linha a linha das 279 migrations (21.209 linhas) | Fora do teto — inventário em altitude, por decisão declarada |
| Corretude individual das 208 funções `SECURITY DEFINER` | `NAO_VERIFICADO` |
| Corretude lógica das 489 policies declaradas | `NAO_VERIFICADO` — só contagem e existência |
| Ordem de aplicação / idempotência real das migrations | `NAO_VERIFICADO` — exigiria executar em base limpa, o que é proibido pelos guard-rails |
| Se o desligamento dos 30 jobs foi deliberado | Não determinável por código — **decisão do dono** |
