# Deploy (Vercel, Lovable, edge functions) — referência para agentes

Ler quando for confirmar um deploy, mexer em env var do front, domínio ou publicar edge function.

| O que | Valor |
|---|---|
| Front | **Vercel**, projeto `promo-supply-v2`, team `juca1` (IDs `prj_…`/`team_…`: Vercel → Settings, ou `mcp__Vercel__list_projects`) |
| Gatilho | **merge em `main` = deploy de produção.** Não há `vercel.json` na `main`; o build é o default do framework Vite |
| Aliases (levantados por MCP nesta sessão) | `promo-supply-v2.vercel.app`, `promo-supply-v2-juca1.vercel.app`, `promo-supply-v2-git-main-juca1.vercel.app`; framework `vite`, Node `24.x` |
| Domínio próprio | **NÃO VERIFICADO.** `promosupply.com.br` aparece só como `<link rel="canonical">` em `index.html:10` e não foi confirmado como domínio do projeto Vercel |
| Limite de evidência | `mcp__Vercel__get_project` e `list_project_domains` respondem **404** para este projeto com o token da sessão; `list_projects` o lista. Confirme no dashboard antes de agir sobre domínio |
| Lovable | `.lovable/plan.md` (plano antigo, cita "Freight Quest"); `lovable-tagger` ativo **só** em `mode === "development"` (`vite.config.ts:6,33`); `@lovable.dev/cloud-auth-js` nas deps; CSP libera `https://*.lovable.dev` (`index.html:36`). Nenhum config de deploy da Lovable no repo |
| Outros alvos | não existem `vercel.json`, `netlify.toml`, `Dockerfile` nem `docker-compose.yml` |

## Deploy e edge functions

- **Front (Vercel):** deploy automático na `main`. Como **não há branch protection** nem required check
  (`docs/agentes/github-ci.md`), um merge com CI vermelha vai para produção. Depois de mergear, confira o
  deployment (`mcp__Vercel__list_deployments`) e reporte — o AGENTS.md exige deploy confirmado para dizer "pronto".
- **A branch `contexto` não deploya de propósito:** o `contexto.yml` escreve um `vercel.json` com
  `ignoreCommand: exit 0` nela (`contexto.yml:368`). Nunca comite a saída dos geradores na `main`:
  seriam ~144 deploys de produção por dia.
- **Edge functions: deploy manual, nenhum workflow publica.** Grep por `functions deploy` em
  `.github/workflows/` = zero. O caminho é `deploy_edge_functions_promo_supply.sh`:
  `supabase link --project-ref lmypcdfsrgfftzhxawao` (`:31`) + loop de `supabase functions deploy` sobre
  **32** funções listadas (`:33-73`), smoke test em 6 críticas e, no fim, passos manuais (conferir
  `supabase secrets list`, ativar `pg_cron` no dashboard).
- **Há 39 pastas em `supabase/functions/` e 32 na lista do script** — `xbz-proxy`, `xbz-sync-pedidos`,
  `health-dashboard` e parte dos `check-*`/`process-*`/`maintain-partitions` ficam de fora. Rodar o script
  **não** publica tudo; publique a função que você mexeu e diga na PR qual foi.
- **`--no-verify-jwt` divergente do `config.toml`:** o script passa `--no-verify-jwt` para
  `punchout-receive`, `webauthn-authenticate`, `run-audit`, `system-simulation`, `dependency-health` e
  `telemetry` (`:95-102`), mas `supabase/config.toml` declara isso **só** para `migrate-helper`. Um deploy
  pelo CLI padrão (sem o script) fecharia essas 6 — ou um `config.toml` atualizado sem cuidado abriria
  outras. Mexeu em verificação de JWT: alinhe os dois no mesmo PR.
- **`deploy_edge_functions_promo_supply.sh:10` tem a chave anon literal no arquivo.** Anon/publishable é
  pública por design (vai no bundle do front), então não é vazamento de segredo de servidor — mas o script
  deveria lê-la do ambiente, e o `.gitignore` sem entrada de env é o que permitiria commitar uma
  `service_role` por acidente. Segredo de servidor **nunca** no repo: `supabase secrets set` para edges,
  secret do GitHub para workflows.

## Regras de env var do front

- Vars `VITE_*` entram no bundle e são **públicas** — nunca segredo com prefixo `VITE_`.
- **Nunca** colocar `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `EXTERNAL_DB_KEY`, `XBZ_ENCRYPTION_KEY`,
  `LOVABLE_API_KEY`, `RESEND_API_KEY`, `SEFAZ_API_TOKEN`, `SPOT_*` ou `CRON_SECRET` na Vercel: são de
  servidor e vivem nas edge functions (`supabase secrets`).
- O front lê exatamente **duas** vars (`src/integrations/supabase/client.ts:4-5`): `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY`. `VITE_SUPABASE_PROJECT_ID` é usada pelos workflows;
  `VITE_SUPABASE_ANON_KEY` (em `.env.example:8`) e `VITE_BITRIX_WEBHOOK_URL` **não são lidas por código
  nenhum**.
- Não há baseline de env vars da Vercel neste repo (o Zapp tem); mudança de env var é manual no dashboard
  e não deixa rastro no Git — registre na PR o que mudou.
