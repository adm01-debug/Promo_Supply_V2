# Deploy (Vercel, Lovable, edge functions) — referência para agentes

Ler quando for confirmar um deploy, mexer em env var do front, domínio ou publicar edge function.

| O que | Valor |
|---|---|
| Front | **Vercel**, projeto `promo-supply-v2`, team `juca1` (IDs `prj_…`/`team_…`: Vercel → Settings, ou `mcp__Vercel__list_projects`) |
| Gatilho | **merge em `main` = deploy de produção.** `vercel.json` existe na `main` desde a #50 (rewrites da SPA) e a #314 acrescentou os headers de segurança; o build é o default do framework Vite |
| Aliases (levantados por MCP nesta sessão) | `promo-supply-v2.vercel.app`, `promo-supply-v2-juca1.vercel.app`, `promo-supply-v2-git-main-juca1.vercel.app`; framework `vite`, Node `24.x` |
| Domínio próprio | **NÃO VERIFICADO.** `promosupply.com.br` aparece só como `<link rel="canonical">` em `index.html:10` e não foi confirmado como domínio do projeto Vercel |
| Limite de evidência | `mcp__Vercel__get_project` e `list_project_domains` respondem **404** para este projeto com o token da sessão; `list_projects` o lista. Confirme no dashboard antes de agir sobre domínio |
| Lovable | `.lovable/plan.md` (plano antigo, cita "Freight Quest"); `lovable-tagger` ativo **só** em `mode === "development"` (`vite.config.ts:6,33`); `@lovable.dev/cloud-auth-js` nas deps; CSP libera `https://*.lovable.dev` (`index.html:36`). Nenhum config de deploy da Lovable no repo |
| Outros alvos | não existem `netlify.toml`, `Dockerfile` nem `docker-compose.yml` (`git ls-tree origin/main --name-only`) |

## Deploy e edge functions

- **Front (Vercel):** deploy automático na `main`. A proteção de `main` exige **um** check obrigatório
  (`Contratos da automação local`) e nenhuma revisão
  (`gh api /repos/adm01-debug/Promo_Supply_V2/branches/main/protection`), então um merge com CI vermelha nos
  demais checks vai para produção — o detalhe dos checks está em `docs/agentes/github-ci.md`. Depois de mergear,
  confira o deployment (`mcp__Vercel__list_deployments`) e reporte — o AGENTS.md exige deploy confirmado para
  dizer "pronto".
- **A branch `contexto` não deploya de propósito:** o `contexto.yml` escreve um `vercel.json` com
  `ignoreCommand: exit 0` nela (`contexto.yml:369`). Nunca comite a saída dos geradores na `main`:
  seriam ~144 deploys de produção por dia.
- **Edge functions: o workflow publica, o script é o caminho de lote.** `deploy-edge-functions.yml` roda em push
  na `main` que toque `supabase/functions/**` (ou o próprio yml) e no dispatch manual (uma função, lista ou todas),
  chamando `supabase functions deploy` — grep por `functions deploy` em `.github/workflows/` = **1** hit, esse
  workflow. O `deploy_edge_functions_promo_supply.sh` continua sendo o deploy manual em lote:
  `supabase link --project-ref lmypcdfsrgfftzhxawao` + loop de `supabase functions deploy` sobre **31** funções
  listadas (`FUNCTIONS=(`), smoke test em 6 críticas e, no fim, passos manuais (conferir `supabase secrets list`,
  ativar `pg_cron` no dashboard). `--dry-run` mostra o plano sem chamar nada, `--only a,b` publica só as citadas,
  e o script **sai 1** se algum deploy ou smoke test falhar.
- **`migrate-helper` está bloqueada no script (`BLOCKED_FUNCTIONS`) e não pode voltar para a lista:** o
  código em `supabase/functions/migrate-helper/index.ts` devolve `service_role` e `SUPABASE_DB_URL` a quem
  mandar uma chave que está fixa no próprio arquivo. Foi removida em `58f4fc8` e voltou em `97b6efc`
  ("Visual edit in Lovable"). Apagar a pasta e despublicar a função em produção: só com o dono.
- **Há 43 pastas em `supabase/functions/` (41 com `index.ts`) e 31 na lista do script** — `xbz-proxy`,
  `xbz-sync-pedidos`, `health-dashboard` e parte dos `check-*`/`process-*`/`maintain-partitions` ficam de fora.
  Rodar o script **não** publica tudo; publique a função que você mexeu (ou deixe o workflow publicar o push) e
  diga na PR qual foi.
- **`--no-verify-jwt` tem fonte única: `supabase/config.toml`.** Ele declara `verify_jwt = false` para `scim-v2`,
  `punchout-receive`, `webauthn-authenticate`, `dependency-health` e `receive-os-sync` (etapas 024/025), e o
  script espelha a mesma lista em `NO_JWT_FUNCTIONS` (`deploy_edge_functions_promo_supply.sh:112`): quem não
  está lá sobe com JWT. Guarda de CI: `scripts/ci/scripts-operacionais.unit.mjs` fixa o conjunto exato de
  `--no-verify-jwt`. Mexeu em verificação de JWT: mude `config.toml` e o script no mesmo PR.
- **A chave anon do smoke test não fica mais no script:** vem de `SUPABASE_ANON_KEY` ou, na falta, de
  `VITE_SUPABASE_PUBLISHABLE_KEY` no `.env`. Anon/publishable é pública por design (vai no bundle do front),
  então nunca foi vazamento de segredo de servidor — e o `.gitignore:49-52` bloqueia `.env`/`.env.*` (só
  `.env.example` é versionado), o que evita commitar uma `service_role` por acidente. Segredo de servidor
  **nunca** no repo: `supabase secrets set` para edges, secret do GitHub para workflows.

## Regras de env var do front

- Vars `VITE_*` entram no bundle e são **públicas** — nunca segredo com prefixo `VITE_`.
- **Nunca** colocar `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `EXTERNAL_DB_KEY`, `XBZ_ENCRYPTION_KEY`,
  `OPENROUTER_API_KEY`, `RESEND_API_KEY`, `SEFAZ_API_TOKEN`, `SPOT_*` ou `CRON_SECRET` na Vercel: são de
  servidor e vivem nas edge functions (`supabase secrets`).
- O front lê exatamente **duas** vars (`src/integrations/supabase/client.ts:4-5`): `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY`. `VITE_SUPABASE_PROJECT_ID` é usada pelos workflows;
  `VITE_SUPABASE_ANON_KEY` (em `.env.example:8`) e `VITE_BITRIX_WEBHOOK_URL` **não são lidas por código
  nenhum**.
- Não há baseline de env vars da Vercel neste repo (o Zapp tem); mudança de env var é manual no dashboard
  e não deixa rastro no Git — registre na PR o que mudou.
