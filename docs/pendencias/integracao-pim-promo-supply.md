# Plano: Promo Supply V2 só compras, catálogo só no Promo Gifts V4 (PIM)

> Espelho em markdown, versionado no repo, do plano mantido no Claude Project
> "PROMO SUPPLY V2 | INTEGRAÇÃO - FORNECEDORES"
> (`claude/PLANO_PROMO_SUPPLY_SO_COMPRAS_CATALOGO_NO_PROMO_GIFTS.md`).
> Atualizar este checklist a cada PR do plano que for aberta/mergeada.

## Regra de negócio

Promo Supply V2 = compras. Promo Gifts V4 (PIM, projeto Supabase
`doufsxqlfjyuvxuezpln`) = dono único do catálogo (produto, preço, estoque,
imagem). Três critérios de corte:

1. Dado que muda por si (preço, estoque, imagem) → vive no PIM, lido ao vivo,
   nunca copiado.
2. Dado que é "o que aconteceu" (preço pago, código fiscal usado) → vive na
   compra, escrito uma vez, imutável (congelamento).
3. Dado de identidade (id do produto, código do fornecedor) → vive no PIM; a
   compra guarda só o ponteiro.

## Checklist por fase

### Fase 0 — Reversão temporária

- [ ] **PR 0.1** — revert da PR #230 (proxy de catálogo/cores/fiscalSt XBZ).
  Bloqueada: só pode entrar depois da Fase 2 (bridge) estar no ar.

### Fase 1 — Views de compra no PIM 🔒

- [ ] **PR 1.1** — view `v_compras_catalogo` no PIM (`doufsxqlfjyuvxuezpln`).
- [ ] **PR 1.2** — view `v_compras_precos_faixa` (faixas de preço de
      personalização) no PIM.
- [ ] **PR 1.3** — backfill de `supplier_external_id` no PIM.
  Bloqueadas nesta sessão: regra 8 (DDL em banco de produção de outro repo) e
  nenhum MCP disponível aqui tem acesso de escrita/SQL a `doufsxqlfjyuvxuezpln`.

- [ ] **Secret 🔒** — configurar `EXTERNAL_DB_URL`/`EXTERNAL_DB_KEY` na edge
      function `external-db-bridge` (Promo Supply V2), apontando para o PIM.
  Bloqueado: nenhum MCP disponível aqui escreve secret de edge function em
  `lmypcdfsrgfftzhxawao`; e é item de regra 8 mesmo quando houver acesso.

### Fase 2 — Bridge somente leitura para o PIM

- [x] **PR 2.1** — `_shared/external-bridge-allowlist.ts`: `ALLOWED_TABLES`
      passa a ser só `{ "v_compras_catalogo", "v_compras_precos_faixa" }`;
      remove nomes fantasma (`produtos_externos`, `fornecedores_externos`,
      `spot_pedidos_view`) e RPCs inexistentes; `ALLOWED_OPERATIONS` restrito a
      `select`. Testes novos: tabela fora da allowlist → 403; `insert` em view
      do PIM → 403; `limit` acima de 500 → 400. Mergeada: PR #248 (squash
      `8a61f8c7bfefec90b0a8a1ab1bae86c6f6aadf37`). Execução real de
      `deno test` não verificada nesta sessão (sem runtime Deno disponível).
- [ ] **PR 2.2** — `src/hooks/useCatalogoPim.ts` + `PriceComparator.tsx` /
      `SupplierEcosystemSection.tsx` passam a ler preço/catálogo via bridge.
  Bloqueada: depende do secret acima estar configurado para funcionar em
  runtime (o código pode ser escrito antes, mas não valida sem o secret).

### Fase 3 — Colunas de compra no Promo Supply V2 🔒

- [ ] **PR 3.1** — DDL em `lmypcdfsrgfftzhxawao`: colunas `pim_product_id`,
      `pim_variant_id` e campos de congelamento em `solicitacoes`,
      `pedido_itens`, `repurchase_suggestions`, `estoque`.
  Bloqueada: regra 8 (DDL em produção) e nenhum MCP disponível aqui tem
  acesso de escrita SQL a `lmypcdfsrgfftzhxawao`.
- [ ] **PR 3.2** — wiring das colunas acima nos caminhos de escrita e leitura.
  Depende da PR 3.1 existir.

### Fase 4 — Migração dos dados existentes

- [x] **PR 4.1** — `scripts/migracao/reconcilia-produtos-pim.mjs` (somente
      leitura, match por sku → sku_promo → supplier_reference → nome
      normalizado) + README. Mergeada: PR #244
      (squash `621a86cc20e5a44175b37bdfaff3984b83074e9c`).
      **Execução contra dados reais ainda NÃO VERIFICADA** — nenhum MCP
      disponível nesta sessão tem acesso SQL a `lmypcdfsrgfftzhxawao` ou
      `doufsxqlfjyuvxuezpln` para rodar o script e confirmar a cobertura real.
- [ ] **PR 4.2 🔒** — backfill de `pim_product_id` para os matches exatos
      encontrados pela PR 4.1. Bloqueada: depende da PR 4.1 ter sido
      executada contra dados reais, e é ela própria regra 8 (backfill em
      produção).

### Fase 5 — Remoção do catálogo local

- [ ] **PR 5.1a** — remove código de catálogo do front (telas, componentes,
      hooks que hoje leem catálogo local).
- [ ] **PR 5.1b** — remove código de catálogo das edge functions.
  5.1a/5.1b bloqueadas: plano exige esperar a Fase 2 estar no ar primeiro.
- [ ] **PR 5.2 🔒** — drop das tabelas de catálogo local (`produtos_externos`,
      `fornecedores_externos` etc.) em `lmypcdfsrgfftzhxawao`. Bloqueada até a
      Fase 4 (backfill) estar concluída; depois disso, regra 8 (deleção de
      dado em produção).
- [ ] **PR 5.3** — regeneração de documentação (`DeveloperDocs.tsx` e afins)
      refletindo o novo contrato da bridge.
- [ ] **PR 5.4 🔒** — D-3: desligamento do fluxo direto com SPOT/Stricker.

## Decisões registradas (D-1 a D-6)

Ver detalhamento completo no doc do Project; resumo:

- D-1 a D-6 — critérios de corte de dado (o que é do PIM vs. o que é da
  compra), ordem das fases, e o desligamento do SPOT (D-3) como item
  separado de regra 8.

## Generalização multi-fornecedor (seção 10 do plano)

O PIM já ingere 5 fornecedores (XBZ, SPOT/Stricker, Asia Import, Só Marcas e
futuros). As views da bridge (`v_compras_catalogo`,
`v_compras_precos_faixa`) são agnósticas de fornecedor — filtram só por
`is_active`/`active`/`is_product_supplier` — então adicionar um novo
fornecedor não exige nenhuma mudança de código no Promo Supply V2.

## Bloqueios estruturais desta sessão (recorrentes em várias fases)

- Nenhum MCP disponível nesta sessão tem acesso de escrita/SQL direto a
  `doufsxqlfjyuvxuezpln` (PIM) nem a `lmypcdfsrgfftzhxawao` (Promo Supply V2).
  Os MCPs Supabase disponíveis apontam para `pgxfvjmuubtbowutlide` (Singu V2),
  um projeto diferente.
- Todo item marcado 🔒 acima também exige, pelo próprio plano, PR aberta e
  aviso ao dono sem merge automático (regra 8 do fluxo Git), mesmo quando o
  acesso técnico existir.

## Pendência herdada (fora do escopo deste plano)

- `main` tem quebra de typecheck herdada da PR #242 (colunas de
  `pedido_itens` ainda não refletidas em `src/integrations/supabase/types.ts`
  gerado) — não é erro introduzido pelas PRs deste plano; listada aqui só
  para rastreio.
