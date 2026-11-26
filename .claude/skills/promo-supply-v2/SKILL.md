---
name: promo-supply-v2
description: Convenções de código e commit do Promo Supply V2 (TypeScript, Conventional Commits). Use ao alterar código, criar testes ou escrever mensagem de commit neste repositório; as regras operacionais ficam em AGENTS.md.
---

# Promo Supply V2 — convenções

As regras de trabalho (banco, fluxo Git, PR, comunicação) estão em `AGENTS.md` na raiz — este skill só
resume convenções de código e commit.

## Commits

Padrão Conventional Commits: `<tipo>(<escopo>): <descrição>` — escopo opcional e minúsculo; assunto com
pelo menos 10 caracteres, sem ponto final; tipos: `feat fix docs style refactor perf test build ci chore
security revert`. Mensagem em PT-BR, modo imperativo, primeira linha curta.

**Nada cobra isso por máquina neste repo:** não existe `.husky/`, `package.json` tem `"prepare": ""` e não
há `commitlint`. Seguir a convenção é responsabilidade de quem escreve o commit.

Exemplo: `fix(cotacao): grava fornecedor selecionado ao fechar a cotação`

## Código

- Linguagem: TypeScript (front Vite + React em `src/`, edge functions Deno em `supabase/functions/`).
- Funções `camelCase`, componentes/classes `PascalCase`, constantes `SCREAMING_SNAKE_CASE`.
- Exports nomeados; siga o padrão de import, de i18n (i18next, `src/locales/` pt/en/es) e de estado
  (TanStack Query para dados do servidor, Zustand em `src/stores/` para estado de UI) do arquivo vizinho.
- Domínio que já tem pasta em `src/features/` recebe o código novo lá (ADR
  `DOCS/ADR/0001-feature-based-architecture.md`); não aumente a pilha de arquivos soltos em `src/hooks/`.
- Acesso ao banco pelo client de `src/integrations/supabase/client.ts` e pelos helpers de
  `src/lib/supabaseQuery.ts` / `supabaseRpc.ts`; `src/integrations/supabase/types.ts` é **gerado** — não editar.
- Em edge function, use os compartilhados de `supabase/functions/_shared/` (`security.ts` para CORS/auth/
  tenant, `logger.ts`, `retry.ts`, `rate_limit.ts`, `idempotency.ts`) em vez de reimplementar.
- Testes unitários ao lado do módulo (`__tests__/`) ou em `tests-e2e/` (Playwright); rode só o que tocou:
  `npx vitest run <caminho>`. Teste de edge em Deno: `*.test.ts` dentro da pasta da função.
- Siga os padrões já existentes no módulo; não desvie sem motivo registrado na PR.
