# AGENTS.md — Promo_Supply_V2

Regras de ouro — Perfil Otimizado (Hermes Agent / multi-agente).
Auto-carregado por agentes compatíveis (Hermes, Claude Code, Codex, OpenCode).

## Idioma

**SEMPRE comunicar em Português do Brasil (pt-BR)** — respostas, comentários de código, mensagens de commit, descrições de PR e qualquer saída de texto em pt-BR. Nunca alternar para inglês.

## Sistema

- **Repo:** adm01-debug/Promo_Supply_V2
- **Visibilidade:** privado
- **Descrição:** —
- **Branch padrão:** main

## Regra de ouro antes de agir

0. **Leia o contexto gerado antes de planejar:** `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`. Ele diz qual das três fontes (banco real / código / regras de negócio) é dona de cada fato. Detalhe em `docs/agentes/contexto-ia.md`.
1. **Leia o README.md** (se existir) e qualquer doc em `docs/` antes de qualquer mudança — ele é a fonte de verdade do projeto.
2. **Pronto = ligado em produção com tráfego real.** Código existir não é pronto.
3. **Diagnóstico antes de patch.** Em bug de produção: leia logs/estado real antes de qualquer fix.

## GIT: Isolamento Worktree (OBRIGATÓRIO)

**NUNCA usar `git checkout -b` diretamente.** Sempre criar worktree isolado:

```bash
# 1. Gerar ID único
HERMES_BRANCH_ID="{{ h$(date +%s | tail -c 7) }}"
BRANCH="fix/hermes-${HERMES_BRANCH_ID}-<descricao>"
WORKSPACE="$HOME/hermes-workspaces/chat-${HERMES_BRANCH_ID}"

# 2. Criar worktree
git worktree add "$WORKSPACE" -b "$BRANCH" && cd "$WORKSPACE"

# 3. Verificar isolamento
[ "$(git branch --show-current)" = "$BRANCH" ] || exit 1

# ... trabalhar, commit, push, PR, merge ...

# 4. Cleanup obrigatório
git branch -D "$BRANCH"
git worktree remove "$WORKSPACE" --force
git worktree prune
```

**Por quê:** múltiplos agentes/chats no mesmo repo = colisão de branches.

## PR Flow

branch → commit (--no-verify) → push → PR via GitHub → CI → merge squash → delete branch.
Workers/editores NUNCA mexem em git/branches — só o orquestrador.

## Regras de trabalho

1. **Aja como dev sênior e decida.** Escolha de biblioteca, nome de arquivo, abordagem de fix: decida e siga. Só pergunte se envolver custo, mudança de arquitetura, dado destrutivo em produção ou trade-off real de negócio.
2. **Verdade acima de validação.** Não sabe → diga. Falhou → diga. Nunca "sucesso" fabricado.
3. **Zero churn / diff mínimo.** Não refatore nem reescreva arquivo inteiro para mudar 3 linhas.
4. **Execução end-to-end.** Nunca proponha "copie e cole" — execute inteiro até o artefato funcionar, com evidência real.

## Contexto gerado (scripts autônomos)

O repositório se mantém descrito sozinho. **Não leia o repo inteiro para descobrir onde algo fica** — leia a fonte certa.

| Preciso de… | Fonte (dona do fato) | Onde ler |
|---|---|---|
| Rotas, telas, módulos, hooks, edge functions, grafo de imports, testes, convenções | **código** | `docs/contexto/codigo/INDEX.md` |
| Tabelas, colunas, RLS/policies, funções, triggers, cron, storage, lints — como está **em produção agora** | **banco real** | `docs/contexto/supabase/` |
| O que pode/não pode: RLS por operação, estados, validações, fórmulas, prazos, erros de negócio, lacunas | **regras de negócio** | `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` |
| Quem é dono de cada fato + frescor de cada fonte | **índice** | `docs/contexto/00-INDEX.md` |

Tudo isso vive na branch gerada **`contexto`** (nunca em `main`, nunca abra PR dela):

```bash
git fetch origin contexto
git show origin/contexto:docs/contexto/00-INDEX.md
git show origin/contexto:docs/contexto/codigo/INDEX.md
git show origin/contexto:docs/contexto/supabase/lints.md   # antes de mexer em RLS/função/índice
```

Pelo MCP do GitHub: `github_get_file(owner='adm01-debug', repo='Promo_Supply_V2', path='docs/contexto/00-INDEX.md', ref='contexto')`.
Repo privado: `raw.githubusercontent.com` só responde com token.

Quem gera (`.github/workflows/contexto.yml`, a cada push em `main` e a cada 10 min):

- `scripts/ai-context/gerar.mjs` → `codigo/` (zero dependência, ~1 s)
- `scripts/supabase_snapshot/snapshot.py` → `supabase/` (precisa do secret `SUPABASE_DB_URL`)
- `scripts/regras_negocio/generate.py` → `regras/` (stdlib, ~8 s)
- `scripts/regras_negocio/indice.py` → `00-INDEX.md`

Regra que só o negócio sabe → escreva em `docs/contexto/regras/manual/*.md` **na main**; entra no 07 com prioridade máxima e nunca é sobrescrita.

Rodar local: `npm run contexto:codigo`, `npm run contexto:regras`, `npm run contexto:indice`. Testes dos geradores: `npm run test:scripts`.
Mexeu em `scripts/ai-context/`, `scripts/regras_negocio/` ou `scripts/supabase_snapshot/` → rode `npm run test:scripts` antes da PR.
