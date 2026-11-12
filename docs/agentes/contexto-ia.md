# Contexto para agentes de IA — como funciona e como operar

Sistema de scripts autônomos que mantém o repositório descrito sozinho. Portado do `adm01-debug/Zapp_Web_V2`.
Regras de uso no `AGENTS.md`, seção "Contexto gerado"; aqui está como o pipeline funciona e como diagnosticá-lo.

## Desenho

UM workflow (`.github/workflows/contexto.yml`), TRÊS produtores independentes (um job cada), UM índice, UMA branch.

| Produtor | Script | Escreve | Dono do fato |
|---|---|---|---|
| código | `scripts/ai-context/gerar.mjs` (Node, zero dep) | `docs/contexto/codigo/` | onde o código vive, quem chama quem |
| banco real | `scripts/supabase_snapshot/snapshot.py` (Python + psycopg) | `docs/contexto/supabase/` | schema/RLS/funções **em produção agora** |
| regras de negócio | `scripts/regras_negocio/generate.py` (stdlib) | `docs/contexto/regras/` | o que pode/não pode |
| índice | `scripts/regras_negocio/indice.py` | `docs/contexto/00-INDEX.md` | quem é dono de cada fato + frescor |

Se duas fontes discordarem, vale o dono. Item marcado **NÃO VERIFICADO** precisa ser confirmado na fonte dona.

## Onde o resultado fica, e por quê

Branch gerada **`contexto`** — nunca na `main`, nunca por PR.

- A Vercel está ligada ao repo: um commit em `main` a cada 10 min seria um deploy de produção a cada 10 min.
- O push é feito com `GITHUB_TOKEN`, que por política do GitHub **não dispara outros workflows** (anti-loop).
- O job escreve um `vercel.json` com `ignoreCommand: exit 0` na própria branch, então a Vercel não faz nem preview dela.
- Só há commit quando alguma fonte mudou de verdade. Métricas voláteis do banco (`stats.*`, `cron-runs.md`) esperam 60 min para não gerar commit a cada coleta.

Ler sem trocar de branch:

```bash
git fetch origin contexto
git show origin/contexto:docs/contexto/00-INDEX.md
git show origin/contexto:docs/contexto/codigo/INDEX.md
git show origin/contexto:docs/contexto/supabase/lints.md
```

## Gatilhos e custo

- `push` em `main` nos paths de código/banco/scripts/`manual/` → regera `codigo/` e `regras/` (não coleta banco).
- `schedule` a cada hora, no minuto 3 → só coleta o que mudou; o banco sempre coleta.
- `workflow_dispatch` → tem `force` para ignorar o estado anterior.

O repo é **privado**, então minuto de Actions é cobrado. O `gate` compara o HEAD da `main` com o `commit` dos
manifests já publicados: no agendamento, `codigo/` e `regras/` só rodam se a `main` mudou. O job do banco é o
que roda sempre. Para reduzir custo, baixe a frequência do `cron` em `contexto.yml` (ex.: `3 */6 * * *`).

## Secrets

| Secret | Para que | Estado |
|---|---|---|
| `SUPABASE_DB_URL` | coleta do banco ao vivo (`snapshot.py`) | **não existe ainda** |
| `SUPABASE_ACCESS_TOKEN` | `inventario-estado-semanal.yml` (Management API, só leitura) | **não existe ainda** |

Sem `SUPABASE_DB_URL` o job do banco sai **verde com aviso** e as outras duas fontes continuam funcionando —
de propósito, para não pintar 144 runs/dia de vermelho. No `workflow_dispatch` ele falha, para a pessoa ver.

`SUPABASE_DB_URL` precisa ser o **session pooler** (não a conexão direta: o host direto é só IPv6 e o runner
do GitHub não tem IPv6) e de preferência o usuário `postgres` (o `cron.job` tem RLS por `current_user`; um
role read-only comum enxerga zero jobs). O coletor abre a sessão em `default_transaction_read_only = on` —
nada é escrito. Formato:

```
postgresql://postgres.<ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres
```

Detalhe completo, incluindo o SQL de um role read-only alternativo: `scripts/supabase_snapshot/README.md`.

## Project ref do Supabase (divergência resolvida em 2026-11-08)

Oficial: **`lmypcdfsrgfftzhxawao`**. O commit `0bdc3cb` alinhou o código ativo (`supabase/config.toml`,
`vite.config.ts`, `index.html`, `src/pages/admin/SSOConfig.tsx`, `src/tests/load/backend-stress.yml`,
`tests-rls/`), que antes apontava para `trwgmplubeqxrxpncdgf` e `apuzcrkeqodktmpwobnz`.

Nenhum script deste sistema tem ref escrito no código: o destino vem do secret. Ainda assim, **os comentários
de `contexto.yml`, `types-sync.yml`, `inventario-estado-semanal.yml`, `inventario/README.md` e dos READMEs de
`scripts/types-sync/` e `scripts/supabase_snapshot/` continuam descrevendo a divergência antiga como atual** —
estão desatualizados. Fonte de verdade do ref: `docs/agentes/banco.md`.

## Regras que só o negócio sabe

`docs/contexto/regras/manual/*.md` **na main** (o resto de `docs/contexto/` é gitignored). Copie
`TEMPLATE-regras-de-negocio.md` para `regras.md` e escreva. Entra na seção A do
`07-REGRAS-DE-NEGOCIO.md` com prioridade máxima e nunca é sobrescrito. Editar `manual/` na main dispara o workflow.

## Rodar local

```bash
npm run contexto:codigo    # ~1 s
npm run contexto:regras    # ~8 s
npm run contexto:indice
npm run test:scripts       # testes dos três geradores (23 testes)
```

A saída local é gitignored. `npm run contexto:banco` exige `SUPABASE_DB_URL` no ambiente.

## Diagnóstico

| Sintoma | Causa provável |
|---|---|
| "nada mudou em nenhuma das fontes" no job `publicar` | nenhuma das três fontes mudou desde a última publicação — não é bug |
| "Só métricas/manifests mudaram … aguardando" | janela de 60 min das métricas voláteis do banco — não é bug |
| pasta `supabase/` velha na branch | `SUPABASE_DB_URL` ausente ou coleta falhou; veja `docs/contexto/supabase/errors.md` |
| seções faltando no snapshot | permissão do role; `errors.md` lista cada seção que falhou |
| workflow vermelho no job `codigo` | o teste `scripts/ai-context/gerar.unit.mjs` falhou — alguém mexeu no gerador |

## Não faça

- Não edite nada em `docs/contexto/` que não esteja em `regras/manual/` — é sobrescrito.
- Não abra PR da branch `contexto` e não faça merge dela em `main`.
- Não comite a saída dos geradores na `main` (o `.gitignore` já impede).
- Não troque o push do `publicar` por um PAT: `GITHUB_TOKEN` é o que garante o anti-loop.
