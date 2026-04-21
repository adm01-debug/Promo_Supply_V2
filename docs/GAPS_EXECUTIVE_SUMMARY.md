# Promo Supply — Resumo Executivo de Gaps Enterprise

> Versão slide-ready do documento técnico `GAPS_ENTERPRISE_WORLD_CLASS.md`
> Audiência: C-Level, Board, Comitê de TI e Procurement
> Data: Janeiro/2026 — Versão 1.0

---

## Slide 1 — Capa

**Título:** Promo Supply vs. Suítes S2P de Classe Mundial
**Subtítulo:** Diagnóstico de Maturidade, Top 10 Gaps Críticos e Roadmap de 12 Meses
**Benchmarks:** SAP Ariba · Coupa · Oracle Procurement Cloud · Ivalua · Jaggaer · GEP Smart
**Documento técnico de apoio:** `docs/GAPS_ENTERPRISE_WORLD_CLASS.md`

---

## Slide 2 — Diagnóstico em 1 Número

### Maturidade S2P Atual

| Indicador | Valor |
|---|---|
| **Score Promo Supply** | **2.4 / 5.0** |
| Nível de maturidade | **Nível 3 — Defined / Integrated** |
| Score SAP Ariba (referência) | 4.6 / 5.0 |
| Score Coupa (referência) | 4.5 / 5.0 |
| **Gap absoluto vs. líderes** | **−2.1 pontos** |

### Leitura
- Base sólida em P2P operacional, aprovação multinível, contratos e auditoria.
- Defasagem material em **Strategic Sourcing**, **Spend Analytics**, **multi-tenancy**, **integrações ERP** e **compliance enterprise** (SOC2/ISO 27001).

---

## Slide 3 — Top 10 Gaps Críticos

| # | Gap | Impacto | Esforço | Prioridade |
|---|---|:---:|:---:|:---:|
| 1 | Multi-tenancy real (isolamento por tenant + RLS) | Alto | Alto | P0 |
| 2 | Strategic Sourcing — RFI / RFP / RFQ + Reverse Auction | Alto | Alto | P0 |
| 3 | Spend Analytics com taxonomia UNSPSC | Alto | Médio | P0 |
| 4 | PunchOut bidirecional (cXML / OCI) | Alto | Médio | P1 |
| 5 | i18n + multi-moeda + FX automático | Médio | Médio | P1 |
| 6 | SSO corporativo (SAML 2.0 / SCIM / OIDC) | Alto | Baixo | P0 |
| 7 | Conectores ERP nativos (SAP, TOTVS, Protheus, Senior) | Alto | Alto | P1 |
| 8 | e-Invoicing nacional completo (NFS-e, CT-e, MDF-e, EFD) | Alto | Alto | P1 |
| 9 | Category Management + Sourcing Pipeline | Médio | Médio | P2 |
| 10 | Workflow Designer no-code (BPMN-like) | Médio | Alto | P2 |

**P0 = bloqueador para venda enterprise · P1 = diferencial competitivo · P2 = sustentação de longo prazo**

---

## Slide 4 — Maturidade por Pilar S2P

| Pilar S2P | Promo Supply | Líder de Mercado | Δ |
|---|:---:|:---:|:---:|
| Spend Analytics & Classificação | 1.5 | 5.0 | −3.5 |
| Strategic Sourcing (RFx + Auction) | 1.0 | 5.0 | −4.0 |
| Contract Lifecycle Management | 3.5 | 4.5 | −1.0 |
| Supplier Relationship Management | 3.0 | 4.5 | −1.5 |
| Procure-to-Pay | 4.0 | 4.5 | −0.5 |
| Invoice Management & e-Invoicing | 2.5 | 4.5 | −2.0 |
| Catalog & PunchOut | 1.5 | 4.5 | −3.0 |
| Category Management | 1.0 | 4.0 | −3.0 |
| Risk & Compliance (ESG, sanctions) | 2.5 | 4.5 | −2.0 |
| Services Procurement (SOW) / T&E | 1.0 | 4.0 | −3.0 |
| **Média ponderada** | **2.4** | **4.55** | **−2.15** |

### Pontos fortes (manter e evoluir)
P2P, CLM, SRM básico, auditoria, RBAC, PWA, IA aplicada (sugestão de fornecedor, previsão de demanda).

---

## Slide 5 — Roadmap 4 Trimestres

| Trim. | Tema | Entregas-chave |
|---|---|---|
| **Q1** — Quick Wins de Compliance & Acesso | Fundação Enterprise | SSO SAML/OIDC + SCIM · Audit log imutável (WORM) · OpenTelemetry · Multi-moeda básica · LGPD DPIA |
| **Q2** — Sourcing Estratégico | Receita & Saving | Módulo RFI/RFP/RFQ · Reverse Auction · Spend Analytics + UNSPSC · Catálogo de produtos com preço de referência |
| **Q3** — Integrações & Escala | Plataforma | Multi-tenancy real · Conector ERP (SAP/TOTVS) · PunchOut cXML · e-Invoicing NFS-e/CT-e completo · API pública + Webhooks gerenciados |
| **Q4** — Diferenciação World-Class | IA & UX | Should-cost modeling · Tail-spend / maverick detection · NLP para cláusulas contratuais · Workflow Designer no-code · App nativo iOS/Android |

**Saída esperada ao fim de Q4:** maturidade **3.8–4.0 / 5.0** (Nível 4 — Managed/Optimizing), elegível para RFPs enterprise.

---

## Slide 6 — Investimento & ROI Estimado

### Esforço (pessoas-mês)

| Trimestre | Eng. Backend | Eng. Frontend | Data/IA | DevOps/Sec | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| Q1 | 4 | 2 | 0 | 3 | **9** |
| Q2 | 6 | 4 | 2 | 1 | **13** |
| Q3 | 8 | 4 | 1 | 3 | **16** |
| Q4 | 5 | 5 | 4 | 1 | **15** |
| **Total ano** | **23** | **15** | **7** | **8** | **53 pessoas-mês** |

### ROI esperado (12 meses pós-implantação)

| Alavanca | Faixa de ganho |
|---|---|
| Saving incremental via Strategic Sourcing + Reverse Auction | 4–8% do spend endereçável |
| Redução de tail-spend e maverick buying | 15–25% do gasto fora de contrato |
| Produtividade do time de compras (automação P2P + workflow) | 20–30% de horas |
| Redução de juros/multas por atraso de pagamento (3-way match + e-invoicing) | 0.3–0.6% do AP anual |

### Risco de não agir
- Inelegibilidade para RFPs corporativos (>R$ 500M de receita) por ausência de SSO/SOC2/multi-tenancy.
- Perda de market share para Coupa/Ariba no segmento enterprise nacional.
- Dívida técnica crescente em integrações ERP ad-hoc.

---

## Slide 7 — Recomendação Executiva

### 3 decisões solicitadas ao Board

1. **Aprovar investimento de Q1 (9 pessoas-mês)** para destravar elegibilidade enterprise — SSO, audit imutável, observabilidade, LGPD. **Sem isso, vendas >R$ 500M ficam bloqueadas.**

2. **Priorizar Strategic Sourcing (Q2) sobre novas features táticas** — é a maior alavanca de ROI direto (4–8% de saving incremental) e o principal gap competitivo vs. Ariba/Coupa.

3. **Definir estratégia de multi-tenancy (Q3)** — escolher entre (a) tenancy lógica via RLS reforçada (mais rápido, menor isolamento) ou (b) schema-per-tenant (maior isolamento, maior custo operacional). **Decisão arquitetural irreversível.**

### Próximos passos imediatos (30 dias)
- Validar premissas de esforço com Eng. Lead.
- Selecionar 2–3 clientes-âncora para co-design do módulo de Strategic Sourcing.
- Iniciar processo de certificação SOC2 Type I (pré-requisito para Q3).

---

> **Anexo técnico completo:** `docs/GAPS_ENTERPRISE_WORLD_CLASS.md` (matriz detalhada por pilar, comparativo Promo Supply × SAP Ariba × Coupa, gaps técnicos/IA/integração/UX/governança).
