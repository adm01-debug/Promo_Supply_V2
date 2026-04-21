
## Plano: Comparativo com ERPs Brasileiros (TOTVS Protheus SIGACOM e Senior Sapiens)

### Objetivo
Criar `docs/COMPARATIVO_ERP_BRASILEIROS.md` — análise comparativa do Promo Supply contra os dois principais ERPs brasileiros no módulo de Suprimentos/Compras: **TOTVS Protheus SIGACOM** e **Senior Sapiens Suprimentos**. Foco em realidade brasileira (NF-e, SPED, ICMS-ST, Bloco K, fornecedores locais), em vez do enfoque global anterior (Ariba/Coupa).

### Por que este comparativo é mais relevante
- TOTVS detém ~35% do mercado ERP no Brasil; Senior é forte em mid-market industrial
- Compradores brasileiros avaliam alternativas vs. esses dois, não vs. Ariba
- Compliance fiscal brasileiro (NF-e, CT-e, SPED, EFD-Reinf) é diferencial decisivo
- Integração com bancos nacionais (Inter, Itaú, Bradesco) e marketplaces (Mercado Livre B2B)

### Fase 1 — Pesquisa (web search)
1. Buscar features oficiais do TOTVS Protheus SIGACOM (módulo Compras)
2. Buscar features oficiais do Senior Sapiens Suprimentos / Gestão de Compras
3. Validar pontos de diferenciação típicos: cotação eletrônica, portal fornecedor, integração fiscal, workflow de aprovação

### Fase 2 — Estrutura do Documento (~600-900 linhas)

```text
docs/COMPARATIVO_ERP_BRASILEIROS.md

1. Sumário Executivo
   - Posicionamento Promo Supply vs TOTVS vs Senior em 1 parágrafo
   - Score consolidado (tabela 3 colunas)

2. Metodologia
   - 12 dimensões avaliadas (1-5)
   - Fontes (sites oficiais, docs públicas, comunidade TDN)

3. Perfil dos Concorrentes
   3.1 TOTVS Protheus SIGACOM — arquitetura ADVPL, módulo dentro do ERP, força fiscal
   3.2 Senior Sapiens Suprimentos — plataforma HCM+ERP, SaaS opcional, BPM nativo
   3.3 Promo Supply — best-of-breed cloud-native, foco UX, IA

4. Comparativo por Dimensão (12 tabelas)
   D1  Solicitação de Compras
   D2  Cotação / RFQ eletrônica
   D3  Portal do Fornecedor
   D4  Pedido de Compra & Aprovação
   D5  Recebimento & Three-Way Match
   D6  Contratos
   D7  Pagamentos & Integração Bancária
   D8  Compliance Fiscal Nacional (NF-e, CT-e, SPED, EFD-Reinf, Bloco K)
   D9  BI / Analytics / KPIs
   D10 UX, Mobile, PWA
   D11 IA & Automação (negociação, sugestão fornecedor, previsão demanda)
   D12 TCO, Implantação, Time-to-Value

5. Matriz Consolidada de Maturidade
   - Tabela 12x3 com notas 1-5 e cores
   - Score médio ponderado

6. Onde o Promo Supply Vence (10+ pontos)
   - UX moderna, IA generativa, dashboards executivos, mobile-first, etc.

7. Onde TOTVS Vence (gaps Promo Supply)
   - Profundidade fiscal nativa, integração SPED automática, ecossistema TDN, base instalada

8. Onde Senior Vence (gaps Promo Supply)
   - BPM workflow designer no-code, integração HCM nativa, suporte regional

9. Gaps Críticos do Promo Supply para Competir no Mid-Market Brasileiro
   - Top 8 gaps (NF-e nativa, SPED automático, EFD-Reinf, integração TOTVS/Senior bidirecional, Bloco K, ICMS-ST, multi-empresa fiscal, conector bancário CNAB nativo)

10. Estratégia de Posicionamento
    - "Compras Best-of-Breed que conversa com seu ERP"
    - Plug TOTVS/Senior via conector ao invés de substituir

11. Roadmap Recomendado (90 dias)
    - Quick wins para fechar lacunas críticas

12. Apêndices
    A. Tabela detalhada de funcionalidades (40+ linhas)
    B. Glossário fiscal brasileiro
    C. Fontes consultadas
```

### Entrega
- Criar `docs/COMPARATIVO_ERP_BRASILEIROS.md` (denso, sem emojis, tabelas markdown, ~700 linhas)
- Atualizar `docs/GAPS_ENTERPRISE_WORLD_CLASS.md` apenas se identificar gap fiscal brasileiro ainda não listado (decisão durante execução)
- Resumo curto no chat com top 5 gaps específicos vs ERPs brasileiros e link do arquivo
- Não alterar código nem banco
