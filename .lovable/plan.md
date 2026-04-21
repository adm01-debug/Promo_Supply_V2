
## Plano: Análise de Gaps Enterprise World-Class

### Objetivo
Criar `docs/GAPS_ENTERPRISE_WORLD_CLASS.md` comparando o Promo Supply com benchmarks de plataformas enterprise de Procurement/S2P de classe mundial (SAP Ariba, Coupa, Oracle Procurement Cloud, Ivalua, Jaggaer, GEP Smart, Zycus) e identificando lacunas funcionais, técnicas e estratégicas.

### Fase 1 — Exploração (read-only)
1. Reler `LEVANTAMENTO_FUNCIONALIDADES_v2.md` e `FUNCIONALIDADES_SEM_UI.md` para baseline preciso do que já existe.
2. Cruzar com `ANALISE_GAPS_MELHORIAS.md` para evitar duplicar gaps já catalogados.
3. Pesquisa web focada em frameworks enterprise: Source-to-Pay (S2P), Procure-to-Pay (P2P), Strategic Sourcing, SRM, Spend Analytics, Category Management, Contract Lifecycle Management (CLM), e padrões Gartner/Forrester para Procurement Suites.
4. Verificar áreas técnicas enterprise (multi-tenant, multi-idioma, multi-moeda, SSO/SAML, audit imutável, SOC2, LGPD/GDPR, observabilidade, BCP/DR).

### Fase 2 — Estrutura do Documento
```text
1. Sumário Executivo (score de maturidade por pilar)
2. Metodologia & Benchmarks de referência
3. Matriz de Maturidade S2P (10 pilares)
   3.1  Spend Analytics & Classificação Taxonômica (UNSPSC)
   3.2  Strategic Sourcing (RFI/RFP/RFQ/Reverse Auction)
   3.3  Contract Lifecycle Management (CLM completo)
   3.4  Supplier Relationship Management (SRM 360)
   3.5  Procure-to-Pay (P2P automatizado)
   3.6  Invoice Management & e-Invoicing
   3.7  Catalog & Punchout (cXML/OCI)
   3.8  Category Management & Sourcing Pipeline
   3.9  Risk & Compliance (ESG, sanctions screening)
   3.10 Travel & Expense / Services Procurement (SOW)
4. Gaps Técnicos Enterprise
   - Multi-tenant / Multi-empresa / Multi-filial
   - Internacionalização (i18n, l10n, multi-moeda, FX)
   - SSO/SAML/SCIM, Federação de Identidade
   - API pública, Webhooks gerenciados, Marketplace
   - Observabilidade (OpenTelemetry, SIEM)
   - Compliance (SOC2, ISO 27001, LGPD/GDPR DPIA)
   - BCP/DR, RPO/RTO, backup geo-redundante
5. Gaps de Inteligência (IA/ML avançada)
   - Should-cost modeling, price benchmarking externo
   - Tail-spend management, maverick spend detection
   - Autonomous sourcing agents
   - NLP para extração de cláusulas contratuais
6. Gaps de Integração
   - ERP (SAP, Oracle, TOTVS, Senior, Protheus)
   - e-Invoicing nacional (NFS-e, CT-e, MDF-e, EFD)
   - Bancos (PIX QR dinâmico, conciliação OFX)
   - Marketplace B2B (Mercado Livre, Amazon Business)
   - PunchOut bidirecional
7. Gaps de Experiência (UX/Mobile/Acessibilidade)
   - App nativo iOS/Android
   - Voice ordering, chatbot procurement
   - White-label / theming por cliente
8. Gaps de Governança & Workflow
   - Segregation of Duties (SoD) automatizada
   - Delegação programada e calendar-aware
   - Política de compras versionada
   - Workflow designer no-code
9. Roadmap Priorizado (matriz Esforço x Impacto)
10. Apêndice: Tabela comparativa Promo Supply vs SAP Ariba vs Coupa
```

### Fase 3 — Entrega
- Criar `docs/GAPS_ENTERPRISE_WORLD_CLASS.md` (denso, sem emojis, tabelas markdown, ~800-1200 linhas).
- Usar pesquisa web para garantir referências atualizadas a padrões enterprise.
- Resumo curto no chat com top 10 gaps críticos e o caminho do arquivo.
- Não alterar código nem banco.
