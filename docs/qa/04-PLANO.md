# 04 — Plano de correção (etapas 001–NNN)

> Produzido pela auditoria QA de 2026-11-22/23 sobre o HEAD `d9c58bc`. Os achados referenciados estão em `03-ACHADOS.md`; o estado de execução fica em `05-PROGRESSO.md`.

---

## Instruções para o agente executor

Você vai executar este plano **sem acesso ao agente que o escreveu e sem esta conversa**. Tudo o que você precisa está neste arquivo, em `03-ACHADOS.md` e no código. Siga estas regras:

1. **Uma etapa por vez, na ordem**, respeitando o campo `Depende de`. Cada etapa em sua **própria branch** `claude/<fix|feat|chore|ci>-<slug>-<AAMMDD-HHMM>` criada a partir de `main` atualizado, e sua **própria PR**. Nunca commite em `main`. Nunca escreva em branch que você não criou.
2. **Antes de mudar qualquer coisa, releia a evidência da etapa no código atual.** Se o arquivo, a linha ou o comportamento já não corresponde ao descrito, **pare essa etapa**: marque-a em `05-PROGRESSO.md` como `[~] NNN — não se aplica mais — <o que o código mostra hoje, com arquivo:linha>` e siga para a próxima etapa independente. Não "adapte" a etapa para um problema diferente.
3. **Corrija a causa raiz com a menor mudança possível.** Não refatore, não renomeie, não reorganize, não "melhore" e não comente o que a etapa não pede. Não reescreva arquivo inteiro para mudar poucas linhas. Dependência nova ou bump de versão maior só se indispensável — e avise no corpo da PR.
4. **Problema novo encontrado no caminho não é corrigido na hora.** Anote em `05-PROGRESSO.md`, na seção "Achados novos durante a execução", com `arquivo:linha` e uma linha de impacto. Siga a etapa.
5. **Etapa marcada `Precisa de aprovação humana: sim` fica com a PR ABERTA**, com o corpo explicando o que muda e o que foi verificado, e você chama o dono. **Não mergeie.** Isso vale sempre que a etapa envolver migration/DDL em produção, CI/workflows, segredo, infraestrutura, deleção de dado, mudança de arquitetura ou de custo.
6. Etapa com `Precisa de aprovação humana: não` e pronta (CI verde, sem conflito, escopo comum) você **mergeia por squash e apaga a branch à mão** (`delete_branch_on_merge=false` neste repositório). Depois confira o deploy (merge em `main` = produção na Vercel) e registre.
7. **Uma etapa só é concluída com a verificação do campo `Como verificar` EXECUTADA e a evidência anotada** em `05-PROGRESSO.md` (saída do comando, resultado da consulta, linha do log). "Deveria funcionar" não conclui etapa. Se a verificação não pode ser executada no seu ambiente, diga isso explicitamente no progresso e deixe a etapa como `[!] bloqueada`.
8. Antes de abrir a PR: `npm run typecheck`, `npx eslint <arquivos tocados>` e `npx vitest run <caminho dos testes tocados>`. Para edge function: `deno check --no-lock supabase/functions/<pasta>/index.ts` e `deno test --allow-net --allow-env --allow-read supabase/functions/<pasta>`. **Só erro que você introduziu conta**; erro herdado da `main` vai para "Achados novos".
9. **Regra de ouro deste repositório** (`AGENTS.md`): o Promo Supply V2 é **compras**. Produto, estoque e preço nascem no PIM (Promo Gifts V4). Nenhuma etapa deste plano autoriza criar tabela/cron/edge de catálogo aqui, chamar endpoint de catálogo de fornecedor, nem cadastrar produto à mão. O único caminho de leitura é a edge `external-db-bridge`.
10. **Banco:** não existe ledger de migration neste repositório e nenhum workflow aplica DDL automaticamente. Ordem obrigatória para qualquer etapa com DDL: **arquivo de migration → PR → merge → deploy do código → apply**, e **pergunte ao dono qual é o caminho do apply** antes do primeiro DDL. Nunca aplique DDL destrutivo.
11. **Antes de começar qualquer etapa**, liste as PRs abertas. Se houver PR aberta tocando os mesmos arquivos, **pare e avise o dono** — não trabalhe nela nem abra outra por cima.
12. O estado inicial medido em 2026-11-22 era: `typecheck` 0 erros, `eslint` 0 erros/10 warnings, `vitest` 2311 passam/12 skip, `build` OK. **Se algum desses já estiver vermelho quando você começar, isso é regressão posterior à auditoria** — registre e trate antes de seguir.

### Como ler cada etapa

`Onda` = bloco de prioridade (1 a 8). `Severidade` = impacto do achado que ela resolve. `Camada` = onde a mudança acontece. `Achados resolvidos` = IDs de `03-ACHADOS.md`. `Caminho recomendado` é o campo mais importante: diz por onde começar, que padrão já existente no repositório seguir (com arquivo de referência) e **que atalho tentador evitar**.

### Ondas

| onda | tema | critério de entrada |
|---|---|---|
| 1 | Segurança e risco de perda de dado | nada depende dela; começa aqui |
| 2 | Fluxos principais quebrados | depois que a onda 1 não muda mais o modelo de acesso |
| 3 | Integridade de dados e regras de negócio | depois que o fluxo grava |
| 4 | Funcionalidades incompletas | depois que a regra está certa |
| 5 | Robustez: erros, estados, concorrência | depois que a função existe |
| 6 | Desempenho | depois que está correto |
| 7 | Experiência de uso e consistência | depois que está rápido |
| 8 | Higiene: código morto, CI, observabilidade | pode correr em paralelo com 6–7 |

---
