# scripts/migracao

Scripts de apoio à migração do catálogo (Promo Supply V2 → Promo Gifts V4 / PIM),
parte do plano "Promo Supply só compras, catálogo no Promo Gifts".

## reconcilia-produtos-pim.mjs

PR 4.1 do plano. Para cada linha de `produtos` (Promo Supply V2), procura o
produto correspondente no PIM (`doufsxqlfjyuvxuezpln`) nesta ordem de critério:

1. `sku` → `products.sku`
2. `sku_promo` → `products.sku`
3. `supplier_reference` (via `produto_fornecedores.codigo_no_fornecedor`) → `product_variants.supplier_reference`
4. nome normalizado → `products.name` normalizado (match "provável", não exato)

**Script somente leitura.** Não escreve em nenhum banco, local ou remoto.

### Uso

```bash
node scripts/migracao/reconcilia-produtos-pim.mjs [--out <dir>] [--json] [--help]
```

- `--out <dir>`: diretório de saída do CSV (padrão `docs/migracao`)
- `--json`: imprime o resultado (caminho do CSV + relatório por fornecedor) em JSON no stdout
- `--help`: mostra o uso e sai

### Variáveis de ambiente obrigatórias

| Variável | Projeto | Uso |
|---|---|---|
| `SUPABASE_URL` | Promo Supply V2 (`lmypcdfsrgfftzhxawao`) | ler `produtos`, `produto_fornecedores` |
| `SUPABASE_SERVICE_ROLE_KEY` | idem | service role, bypassa RLS |
| `PROMO_GIFTS_SUPABASE_URL` | PIM (`doufsxqlfjyuvxuezpln`) | ler `products`, `product_variants`, `suppliers` |
| `PROMO_GIFTS_SUPABASE_SECRET_KEY` | idem | service role |

As quatro já existem como secret no GitHub Actions deste repo.

### Saída

- CSV em `<out>/reconcilia-produtos-pim-<timestamp>.csv` com colunas
  `produto_id,codigo,nome,fornecedor_codigo,status,pim_product_id,pim_variant_id,criterio`,
  onde `status` é `match_exato`, `match_provavel` ou `sem_match`.
- Relatório de cobertura por fornecedor no stdout (ou no JSON, se `--json`).

### Resultado esperado

Cobertura alta para fornecedores de catálogo (XBZ, SPOT); baixa para itens de
serviço ou consumo interno, que não são catálogo e permanecem como texto livre
no documento de compra — isso é esperado, não é falha do script.
