# Análise de Gaps Enterprise World-Class
## Promo Supply vs Plataformas S2P de Classe Mundial

> **Data:** Abril/2026  
> **Versão:** 1.0  
> **Benchmarks:** SAP Ariba, Coupa, Oracle Procurement Cloud, Ivalua, Jaggaer, GEP Smart, Zycus, Basware  
> **Frameworks de Referência:** Gartner Magic Quadrant for Source-to-Pay Suites, Forrester Wave Procurement, IDC MarketScape, Hackett Group Digital World Class

---

## 1. Sumário Executivo

O Promo Supply é uma plataforma de procurement moderna, bem arquitetada, com forte cobertura nas áreas de **P2P operacional** (Procure-to-Pay), workflow de aprovação, gestão de fornecedores básica, contratos com SLA executável e IA aplicada a tarefas pontuais. Comparado com suites enterprise de classe mundial, posiciona-se em estágio **"Defined/Integrated" (nível 3 de 5)** segundo o modelo Hackett, com lacunas relevantes para atingir os níveis **"Optimized" (4)** e **"World Class" (5)**.

### Score de Maturidade por Pilar (escala 0-5)

| Pilar S2P | Promo Supply | World Class | Gap |
|-----------|:------------:|:-----------:|:---:|
| Spend Analytics & Taxonomia | 2.0 | 5.0 | -3.0 |
| Strategic Sourcing (RFx/Auction) | 1.5 | 5.0 | -3.5 |
| Contract Lifecycle Management | 3.5 | 5.0 | -1.5 |
| Supplier Relationship Mgmt (SRM) | 3.0 | 5.0 | -2.0 |
| Procure-to-Pay (P2P) | 4.0 | 5.0 | -1.0 |
| Invoice Management & e-Invoicing | 2.5 | 5.0 | -2.5 |
| Catalog & Punchout | 1.5 | 5.0 | -3.5 |
| Category Management | 1.0 | 5.0 | -4.0 |
| Risk & Compliance (ESG) | 2.5 | 5.0 | -2.5 |
| Services Procurement / T&E | 0.5 | 5.0 | -4.5 |
| **Média Ponderada** | **2.4** | **5.0** | **-2.6** |

### Top 10 Gaps Críticos (Priorizados)

| # | Gap | Pilar | Impacto |
|:-:|-----|-------|---------|
| 1 | Multi-tenant / Multi-empresa real | Técnico | Crítico |
| 2 | Strategic Sourcing (RFx + Reverse Auction) | Sourcing | Crítico |
| 3 | Spend Analytics com taxonomia UNSPSC/CNAE | Analytics | Crítico |
| 4 | Catálogos eletrônicos + PunchOut (cXML/OCI) | Catalog | Alto |
| 5 | Internacionalização (i18n, multi-moeda, FX) | Técnico | Alto |
| 6 | SSO/SAML/SCIM + Federação de Identidade | Segurança | Alto |
| 7 | Integração ERP nativa (SAP, TOTVS, Oracle) | Integração | Alto |
| 8 | e-Invoicing nacional completo (NFS-e, CT-e, EFD) | Fiscal | Alto |
| 9 | Category Management & Sourcing Pipeline | Sourcing | Alto |
| 10 | Workflow Designer no-code + SoD automatizado | Governança | Médio |

---

## 2. Metodologia & Benchmarks de Referência

### 2.1 Plataformas Comparadas

| Plataforma | Posicionamento | Escopo |
|------------|----------------|--------|
| **SAP Ariba** | Líder Gartner MQ S2P (2024) | Suite completa S2P + Network B2B |
| **Coupa** | Líder Gartner MQ S2P | BSM (Business Spend Mgmt) unificado |
| **Oracle Procurement Cloud** | Líder Gartner | Integração nativa com Oracle ERP |
| **Ivalua** | Líder Gartner | Plataforma única S2P configurável |
| **Jaggaer** | Líder Gartner | Forte em sourcing direto/indireto |
| **GEP Smart** | Visionário Gartner | Plataforma unified com IA Quantum |
| **Zycus** | Challenger | Suite cognitiva (Merlin AI) |
| **Basware** | Líder em e-Invoicing | AP automation e compliance fiscal |

### 2.2 Frameworks Aplicados

- **Hackett Digital World Class Model** — 5 níveis de maturidade
- **Gartner CAPS** (Customer Adoption & Performance Score)
- **Forrester TEI** (Total Economic Impact)
- **APQC PCF** (Process Classification Framework) — categoria 4.0 Procurement
- **CIPS Maturity Model** (Chartered Institute of Procurement & Supply)

### 2.3 Critérios de Avaliação

Cada pilar é avaliado em 5 dimensões: **Funcionalidade**, **Profundidade**, **Automação/IA**, **Integração**, **Experiência do Usuário**.

---

## 3. Matriz de Maturidade S2P (10 Pilares)

### 3.1 Spend Analytics & Classificação Taxonômica

**Estado Atual (Promo Supply):** Dashboards executivos com KPIs operacionais (saving, lead time, OTIF), drill-down por comprador, fornecedor e categoria simples. Sem taxonomia padronizada.

**World Class (Ariba/Coupa/Ivalua):**
- Taxonomia universal **UNSPSC** (United Nations Standard Products and Services Code) com 8 dígitos
- Mapeamento automático **CNAE** (Brasil) ↔ UNSPSC ↔ NAICS
- **AI Spend Classification** — auto-categorização de NF/PO via NLP
- Cubo OLAP multidimensional (categoria × fornecedor × BU × geografia × tempo × moeda)
- **Spend Cube Visualization** com drill-down infinito
- **Tail Spend Detection** (gastos pulverizados <1% do total)
- **Maverick Spend** (compras fora de contrato/catálogo)
- **Price Variance Analysis** (mesma SKU em fornecedores diferentes)
- **Should-Cost Modeling** (decomposição de custo: matéria-prima + MO + logística + margem)
- Benchmarking externo (Beroe, Bloomberg, IHS Markit)

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Sem taxonomia UNSPSC/CNAE estruturada | Alto |
| Sem auto-classificação por IA | Alto |
| Sem detecção de maverick/tail spend | Alto |
| Sem should-cost modeling | Médio |
| Sem benchmarking externo de preços | Médio |
| Cubo OLAP limitado a queries SQL diretas | Médio |

---

### 3.2 Strategic Sourcing (RFI/RFP/RFQ/Reverse Auction)

**Estado Atual:** Cotações manuais com comparador visual, ranking automático, busca de fornecedores via IA. Sem RFx estruturado nem leilão reverso.

**World Class:**
- **RFI** (Request for Information) — pré-qualificação de mercado
- **RFP** (Request for Proposal) — propostas técnicas + comerciais ponderadas
- **RFQ** (Request for Quotation) — cotação estruturada com line items
- **Reverse Auction** (Leilão Reverso):
  - English Auction (lance descendente público)
  - Dutch Auction (preço sobe até alguém aceitar)
  - Japanese Auction (preço cai em rounds, fornecedor aceita ou desiste)
  - Sealed Bid (proposta fechada)
- **Bid Optimization** com solver matemático (split-award, lot-bidding)
- **Total Cost of Ownership (TCO) Calculator** automático
- **Weighted Scorecard** configurável (preço 40% + qualidade 30% + prazo 20% + ESG 10%)
- **Sourcing Project Workspace** — kanban de projetos de sourcing
- **Supplier Onboarding Portal** integrado ao RFx
- Templates de RFx por categoria com cláusulas pré-aprovadas
- **e-Sourcing Event Calendar** com SLAs por fase

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Ausência total de RFx estruturado | Crítico |
| Sem leilão reverso (live bidding) | Alto |
| Sem bid optimization / split-award | Alto |
| Sem TCO calculator nativo | Alto |
| Scorecard ponderado limitado a 3 dimensões | Médio |
| Sem workspace de projetos de sourcing | Médio |

---

### 3.3 Contract Lifecycle Management (CLM)

**Estado Atual:** Contratos com cláusulas de SLA executáveis, multas automáticas (0.5%/dia até 20%), histórico, documentos anexos, três tipos (fornecimento, prestação, recorrente).

**World Class:**
- **Contract Authoring** com biblioteca de cláusulas aprovadas
- **AI Clause Extraction** (NLP) — extrai obrigações, datas, valores de PDFs
- **Clause Risk Scoring** — classifica cláusulas por risco jurídico
- **Redlining colaborativo** estilo Word com track changes
- **DocuSign/Adobe Sign nativo** com fluxo de assinaturas paralelo/serial
- **Obligation Management** — tracking de SLAs, milestones, deliverables
- **Auto-Renewal Engine** com workflow de renegociação D-90/D-60/D-30
- **Reajustes automáticos** por índice (IGPM, IPCA, CDI, USD/BRL)
- **Contract Repository** com OCR + busca semântica (vector search)
- **Compliance Heatmap** — clausulas obrigatórias vs presentes
- **eSignature compliant** com ICP-Brasil A1/A3
- **Amendment Workflow** (aditivos contratuais)
- **Contract Hierarchy** (master agreement + SOWs filhos)

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Sem authoring nativo (apenas upload de PDF) | Alto |
| Sem AI clause extraction | Alto |
| Sem redlining colaborativo | Médio |
| Sem reajustes automáticos por índice | Médio |
| Sem hierarquia master/SOW | Médio |
| Sem ICP-Brasil A3 (apenas assinatura simples) | Médio |
| Sem busca semântica em repositório | Baixo |

---

### 3.4 Supplier Relationship Management (SRM 360)

**Estado Atual:** Cadastro 360 de fornecedores, qualificação com scorecard, alertas de credit limit (80%/100%), portal básico, scoring 1-5 com pesos automáticos, chat interno.

**World Class:**
- **Supplier 360** unificado (cadastro + financeiro + risco + ESG + performance + relacionamento)
- **Supplier Lifecycle Management** — onboarding → qualificação → ativo → off-boarding
- **Supplier Information Management (SIM)** — formulários dinâmicos por categoria
- **Diversity Tracking** (MWBE, BIPOC, LGBTQ+, PCD, indígena)
- **Supplier Risk Intelligence** integrado:
  - **Dun & Bradstreet** (PAYDEX, D&B Rating)
  - **EcoVadis** (sustentabilidade)
  - **RepRisk** (controvérsias ESG)
  - **Refinitiv World-Check** (sanções/PEP)
  - **Serasa Experian / Boa Vista** (Brasil)
- **Supplier Performance Management (SPM)** com KPIs configuráveis e benchmarks de categoria
- **Supplier Development Program** — planos de melhoria com OKRs
- **Innovation Portal** — fornecedores submetem ideias
- **Supplier Day** virtual integrado
- **Supplier Communities** por categoria
- **Two-way Performance Reviews** (cliente também avaliado)

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Sem integração D&B / Serasa / EcoVadis | Alto |
| Sem diversity tracking | Médio |
| Sem supplier development plans | Médio |
| Portal do fornecedor limitado | Alto |
| Sem innovation portal | Baixo |
| Sem two-way reviews | Baixo |

---

### 3.5 Procure-to-Pay (P2P)

**Estado Atual:** Fluxo P2P operacional sólido — solicitação (wizard) → cotação → aprovação multinível → pedido → recebimento (offline) → 3-way match → pagamento. Triggers SQL automatizam transições.

**World Class:**
- **Guided Buying** — assistente que direciona usuário a catálogo correto
- **Punchout** para catálogos externos (Amazon Business, Mercado Livre, Staples)
- **Free-form Requisition** com IA sugerindo categoria/fornecedor preferido
- **Budget Check** em tempo real durante criação (não só na aprovação)
- **Encumbrance Accounting** (compromisso financeiro reservado)
- **Goods Receipt Mobile** com leitura de barcode/QR + foto
- **Service Receipt** com timesheet aprovado
- **Returns & RMA** integrado (Promo Supply tem isso ✓)
- **Procurement Card (P-Card)** integration
- **Petty Cash Management**
- **Shopping Cart Sharing** entre departamentos

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Sem guided buying com IA | Médio |
| Sem PunchOut (cXML/OCI) | Alto |
| Sem encumbrance accounting | Médio |
| Sem service receipt com timesheet | Médio |
| Sem P-Card integration | Baixo |

---

### 3.6 Invoice Management & e-Invoicing

**Estado Atual:** Upload de XML NF-e, parsing básico, three-way match (PO + NF + recebimento), reconciliação, status de pagamento.

**World Class:**
- **e-Invoice Compliance Engine** multi-país (Brasil, México CFDI, Itália FatturaPA, Chile DTE)
- **Brasil completo:** NF-e, NFS-e, NFC-e, CT-e, MDF-e, EFD-Reinf, EFD-Contribuições, ECF
- **OCR + IDP** (Intelligent Document Processing) para faturas em PDF/papel
- **Touchless Invoice Processing** — STP (Straight-Through Processing) > 80%
- **Dynamic Discounting** (early payment discount automático)
- **Supply Chain Finance** (factoring/risco sacado integrado)
- **Tax Engine** com cálculo automático (ICMS, IPI, PIS, COFINS, ISS, retenções)
- **Tolerance Management** configurável por categoria
- **Invoice Exception Workflow** com IA classificando motivo
- **Self-billing** (RPS — Recibo Provisório de Serviços)
- **Payment Run Optimization** (calendário de pagamentos otimizado por cash flow)

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Apenas NF-e (sem NFS-e, CT-e, MDF-e) | Alto |
| Sem OCR/IDP para faturas em PDF | Alto |
| Sem dynamic discounting | Médio |
| Sem supply chain finance | Médio |
| Sem tax engine nativo | Alto |
| Sem EFD-Reinf / Contribuições | Alto |

---

### 3.7 Catalog & Punchout

**Estado Atual:** Catálogo de produtos interno + integração spot (XBZ via spot-proxy). Sem PunchOut nem catálogos hosted/external.

**World Class:**
- **Hosted Catalogs** — fornecedor sobe CSV/cXML, plataforma indexa
- **PunchOut Catalogs (cXML/OCI)** — usuário "salta" para site do fornecedor, retorna com cart
- **Level 2 PunchOut** (line item detail return)
- **Internal Catalogs** (almoxarifado próprio)
- **Catalog Aggregation** — busca unificada em N catálogos
- **Contract Pricing Overlay** — preço de contrato sobrepõe lista
- **Search Relevance** com vector embeddings + filtros facetados
- **Catalog Compliance Score** — % de compras feitas via catálogo aprovado
- **Item Master Data Management (MDM)** com governança de SKU
- **Image Recognition** para sugestão de produto similar

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Sem PunchOut (cXML/OCI) | Crítico |
| Sem catálogos hosted de múltiplos fornecedores | Alto |
| Sem contract pricing overlay | Alto |
| Sem MDM de itens | Médio |
| Busca sem vector search | Médio |

---

### 3.8 Category Management & Sourcing Pipeline

**Estado Atual:** Categorias planas usadas para classificação. Sem gestão estratégica de categoria.

**World Class:**
- **Category Strategy Workspace** por categoria (matriz de Kraljic)
- **Sourcing Pipeline** — funil de oportunidades de saving
- **Saving Tracker** com baseline, target, realized, validated by Finance
- **Category Spend Forecast** com IA (séries temporais)
- **Supplier Power Map** (BCG matrix por categoria)
- **Make vs Buy Analysis**
- **Demand Aggregation** entre BUs
- **Category KPI Dashboards** (% sole source, supplier concentration HHI)
- **Category Calendar** (eventos de mercado, sazonalidade)
- **Saving Methodology** padronizada (Hackett, AT Kearney)

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Sem gestão estratégica de categoria | Alto |
| Sem sourcing pipeline / funil | Alto |
| Sem saving tracker validado por Finance | Médio |
| Sem matriz de Kraljic | Médio |
| Sem demand aggregation | Médio |

---

### 3.9 Risk & Compliance (ESG, Sanctions Screening)

**Estado Atual:** Compliance dashboard básico, qualificação de fornecedor com checklist.

**World Class:**
- **Sanctions Screening** automatizado (OFAC, UN, EU, Brasil CNJ/CEIS/CNEP)
- **AML/KYC** (Anti-Money Laundering / Know Your Customer)
- **PEP Screening** (Politically Exposed Persons)
- **Adverse Media Monitoring** (notícias negativas via NLP)
- **ESG Scoring** integrado (EcoVadis, CDP, MSCI)
- **Carbon Footprint Tracking** (Scope 3 emissions por fornecedor/produto)
- **Modern Slavery Compliance** (UK Modern Slavery Act, AU equivalente)
- **Conflict Minerals** (Dodd-Frank Section 1502)
- **Cyber Risk Assessment** (BitSight, SecurityScorecard)
- **Financial Health Monitoring** contínuo
- **Geopolitical Risk Heat Map**
- **Audit Trail Imutável** (blockchain ou append-only log)
- **GRC Integration** (Governance, Risk, Compliance)

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Sem sanctions screening automatizado | Crítico |
| Sem PEP / AML / KYC | Alto |
| Sem ESG scoring integrado | Alto |
| Sem carbon footprint Scope 3 | Médio |
| Sem cyber risk assessment | Médio |
| Audit trail mutável (não imutável) | Alto |

---

### 3.10 Travel & Expense / Services Procurement (SOW)

**Estado Atual:** Não existe. Foco apenas em compras de materiais/serviços tradicionais.

**World Class:**
- **T&E Management** (Concur, SAP Concur, Coupa Expense)
  - Captura de recibo via foto + OCR
  - Categorização automática
  - Política de despesas configurável
  - Reembolso integrado a folha
  - Cartão corporativo reconciliation
- **Services Procurement / Contingent Workforce:**
  - **SOW Management** (Statement of Work)
  - **VMS** (Vendor Management System) tipo Beeline, Fieldglass
  - **Time & Materials** tracking
  - **Milestone-based billing**
  - **Independent Contractor Compliance** (PJ/CLT no Brasil)
- **Project-based Procurement**
- **Outsourcing Management**

**Gaps Identificados:**
| Gap | Severidade |
|-----|:----------:|
| Ausência total de T&E | Médio |
| Ausência total de SOW/VMS | Médio |
| Sem services procurement estruturado | Médio |

---

## 4. Gaps Técnicos Enterprise

### 4.1 Multi-Tenant / Multi-Empresa / Multi-Filial

**Estado Atual:** Single-tenant. RLS protege dados por usuário, mas não há separação por empresa/BU/filial.

**World Class:**
- **True Multi-Tenancy** com isolamento lógico (schema-per-tenant ou tenant_id)
- **Multi-Org Hierarchy** (holding → empresas → filiais → centros de custo)
- **Inter-company Transactions** (compras entre empresas do grupo)
- **Tenant Configuration Inheritance** (template aplicado a múltiplas BUs)
- **Cross-Tenant Reporting** consolidado para holding
- **White-label** por tenant (logo, cores, domínio próprio)

**Severidade:** Crítica — bloqueia venda para grupos empresariais.

---

### 4.2 Internacionalização (i18n / l10n / Multi-Moeda)

**Estado Atual:** PT-BR único. BRL único. Formatação fixa.

**World Class:**
- **i18n** com 20+ idiomas (EN, ES, FR, DE, IT, ZH, JA, AR-RTL)
- **l10n** completo (formatos de data, números, endereços, telefone)
- **Multi-Moeda** com FX rates atualizadas (Bloomberg, Refinitiv, BCB SGS)
- **Functional Currency vs Transaction Currency**
- **Hedge Accounting** integrado
- **Tax Localization** por país (compliance fiscal)
- **Locale-aware Validation** (CPF/CNPJ vs SSN/EIN vs VAT)
- **Right-to-Left (RTL)** para árabe/hebraico

**Severidade:** Alta — bloqueia expansão internacional.

---

### 4.3 SSO/SAML/SCIM e Federação de Identidade

**Estado Atual:** Auth Supabase nativo + Google OAuth. MFA TOTP + Passkeys.

**World Class:**
- **SAML 2.0** (Okta, Azure AD, Ping, OneLogin, ADFS)
- **OIDC** (OpenID Connect)
- **SCIM 2.0** para provisioning automático
- **SSO obrigatório** por tenant
- **Just-in-Time (JIT) provisioning**
- **Group/Role mapping** do IdP para roles do app
- **Step-up Authentication** (re-auth para ações críticas)
- **Risk-based Authentication** (impossible travel, device trust)
- **Certificate-based Auth** (smart cards, PIV)
- **Privileged Access Management (PAM)** integration

**Severidade:** Alta — requisito padrão de TI corporativa.

---

### 4.4 API Pública, Webhooks Gerenciados, Marketplace

**Estado Atual:** API Supabase REST/RPC + Realtime. Sem API pública documentada nem webhooks gerenciados.

**World Class:**
- **REST API pública** versionada (v1, v2) com OpenAPI 3.x
- **GraphQL API** opcional
- **Webhooks** com retry, deduplicação, signing (HMAC), dead-letter queue
- **Rate Limiting** por API key + quotas
- **API Marketplace** (parceiros publicam integrações)
- **SDK oficial** (Node, Python, Java, .NET)
- **Sandbox environment** isolado
- **API Analytics** (uso, latência, erros)
- **OAuth 2.0 Client Credentials** para M2M

**Severidade:** Alta — habilita ecossistema de parceiros.

---

### 4.5 Observabilidade (OpenTelemetry, SIEM)

**Estado Atual:** Telemetria de queries própria + logs Supabase.

**World Class:**
- **OpenTelemetry** (traces, metrics, logs unificados)
- **Distributed Tracing** end-to-end (frontend → edge → DB)
- **APM** (Datadog, New Relic, Dynatrace, Grafana Cloud)
- **SIEM Integration** (Splunk, Elastic, Sentinel)
- **Real User Monitoring (RUM)**
- **Synthetic Monitoring** (Playwright em produção)
- **SLO/SLI Dashboards** com error budgets
- **Anomaly Detection** com ML

**Severidade:** Média.

---

### 4.6 Compliance (SOC2, ISO 27001, LGPD/GDPR)

**Estado Atual:** Boas práticas (RLS, audit log, MFA), mas sem certificações.

**World Class:**
- **SOC 2 Type II** (Trust Services Criteria)
- **ISO 27001** + ISO 27701 (privacy)
- **ISO 22301** (BCM)
- **PCI DSS** (se processa cartão)
- **HIPAA** (se setor saúde)
- **LGPD/GDPR DPIA** (Data Protection Impact Assessment)
- **DPO Dashboard** (relatórios de DSAR, breach notification)
- **Data Residency Controls** (escolha de região)
- **Customer-Managed Keys (CMK)** para criptografia
- **Right to be Forgotten** automatizado
- **Data Lineage & Catalog**
- **Penetration Testing** anual

**Severidade:** Alta — bloqueia clientes regulados.

---

### 4.7 BCP/DR — Continuidade de Negócio

**Estado Atual:** Backup gerenciado pelo Supabase.

**World Class:**
- **RPO ≤ 15 min** (Recovery Point Objective)
- **RTO ≤ 1h** (Recovery Time Objective)
- **Multi-region active-active** ou active-passive
- **Backup geo-redundante** com versioning
- **Disaster Recovery Drills** trimestrais documentadas
- **Chaos Engineering** (Gremlin, Litmus)
- **Status Page** público (statuspage.io)
- **Incident Response Playbooks**
- **Postmortem Culture** (RCA público)

**Severidade:** Alta para clientes enterprise.

---

## 5. Gaps de Inteligência (IA/ML Avançada)

**Estado Atual:** 5 edge functions de IA (sugestão de fornecedor, predição de demanda, risco, negociação coach).

**World Class:**

| Capacidade IA | Descrição | Status |
|---------------|-----------|:------:|
| Should-Cost Modeling | Decompõe custo de produto em commodities + MO + logística | Faltante |
| Price Benchmarking Externo | Compara preço pago vs índices de mercado (Beroe, Bloomberg) | Faltante |
| Tail Spend AI | Detecta e consolida gastos pulverizados | Faltante |
| Maverick Spend Detection | Identifica compras fora de contrato/catálogo | Faltante |
| Autonomous Sourcing Agents | Agentes que conduzem cotações sem humano | Faltante |
| NLP Clause Extraction | Extrai obrigações/datas/multas de contratos PDF | Faltante |
| Demand Sensing | Previsão de demanda com sinais externos (clima, eventos) | Parcial |
| Supplier Risk ML | Previsão de falência/inadimplência | Faltante |
| Anomaly Detection em Faturas | Detecta fraude/duplicação | Faltante |
| Conversational Procurement | Chatbot LLM para criar PR via linguagem natural | Faltante |
| Recommended Suppliers | Collaborative filtering por categoria | Parcial |
| Contract Risk Scoring | Classifica risco de cláusulas contratuais | Faltante |

**Severidade Geral:** Alta — IA é o principal diferenciador competitivo em 2025-2027.

---

## 6. Gaps de Integração

### 6.1 ERP

| ERP | Penetração Brasil | Status Promo Supply |
|-----|:-----------------:|:-------------------:|
| **TOTVS Protheus** | ~35% | Faltante |
| **TOTVS RM** | ~10% | Faltante |
| **SAP S/4HANA** | ~20% | Faltante |
| **SAP Business One** | ~8% | Faltante |
| **Oracle EBS / Fusion** | ~5% | Faltante |
| **Senior Sistemas** | ~7% | Faltante |
| **Sankhya** | ~5% | Faltante |
| **Microsoft Dynamics 365** | ~4% | Faltante |
| **Omie / Bling / Conta Azul** (PME) | ~6% | Faltante |

**Padrões de Integração:**
- IDoc (SAP)
- BAPI / RFC (SAP)
- REST APIs (S/4HANA, Fusion)
- TOTVS Carol / TOTVS API
- Pre-built connectors via iPaaS (MuleSoft, Boomi, Workato)

**Severidade:** Crítica para adoção corporativa.

---

### 6.2 e-Invoicing Nacional

| Documento | Status |
|-----------|:------:|
| NF-e (Nota Fiscal Eletrônica) | Parcial (apenas import) |
| NFS-e (Serviços) | Faltante |
| NFC-e (Consumidor) | Faltante |
| CT-e (Conhecimento Transporte) | Faltante |
| MDF-e (Manifesto) | Faltante |
| EFD-Reinf | Faltante |
| EFD-Contribuições | Faltante |
| ECF (Escrituração Contábil Fiscal) | Faltante |
| SPED Fiscal | Faltante |

---

### 6.3 Bancos & Pagamentos

| Recurso | Status |
|---------|:------:|
| PIX QR estático | Faltante |
| PIX QR dinâmico | Faltante |
| Boleto registrado (CNAB 240/400) | Faltante |
| TED / DOC | Faltante |
| Conciliação OFX / CNAB | Faltante |
| Banco Inter API | Faltante (planejado) |
| Banco do Brasil API | Faltante |
| Itaú API | Faltante |
| Bradesco API | Faltante |
| Santander API | Faltante |
| Open Finance (PSD2 BR) | Faltante |

---

### 6.4 Marketplaces B2B & PunchOut

| Marketplace | Status |
|-------------|:------:|
| Mercado Livre B2B | Faltante |
| Amazon Business | Faltante |
| Alibaba.com | Faltante |
| SAP Ariba Network | Faltante |
| Coupa Supplier Network | Faltante |
| Tradeshift | Faltante |
| XBZ (spot brindes) | Existente ✓ |

---

### 6.5 Outras Integrações Enterprise

- **CRM:** Salesforce, HubSpot, Bitrix24 (parcial), Pipedrive
- **Treasury:** Kyriba, FIS Quantum
- **Tax:** Avalara, Vertex, Sovos, Synchro
- **HRIS:** Workday, ADP, SuccessFactors (para aprovadores)
- **BI:** Power BI, Tableau, Looker, Qlik (export de cubos)
- **DMS:** SharePoint, Box, M-Files, OnBase
- **iPaaS:** MuleSoft, Boomi, Workato, Zapier, Make
- **Comunicação:** Microsoft Teams, Slack, WhatsApp Business

---

## 7. Gaps de Experiência (UX/Mobile/Acessibilidade)

| Recurso | Status | World Class |
|---------|:------:|-------------|
| App nativo iOS/Android | Faltante (PWA apenas) | Apps dedicados Coupa Mobile, Ariba Mobile |
| Voice Ordering | Faltante | "Alexa, order 100 units of X" |
| Procurement Chatbot (LLM) | Faltante | Coupa Sage AI, Ariba Joule |
| White-label completo | Faltante | Tema + logo + domínio + email por tenant |
| Acessibilidade WCAG AAA | Parcial (AA) | Certificação VPAT |
| Modo offline completo | Parcial (recebimento) | Offline em todos módulos |
| Push notifications nativos | Existente ✓ | OK |
| Biometria mobile | Faltante | Face ID / Touch ID |
| AR/VR para inspeção | Faltante | Receiving com AR overlays |
| Acessibilidade em libras | Faltante | Avatar VLibras |

---

## 8. Gaps de Governança & Workflow

### 8.1 Segregation of Duties (SoD) Automatizada

**Estado Atual:** Verificações de role básicas. Sem matriz SoD.

**World Class:**
- **Matriz SoD** pré-configurada (SAP GRC, Pathlock)
- **Conflict Detection** em tempo real (mesma pessoa solicita + aprova + recebe + paga = bloqueio)
- **Compensating Controls** quando SoD não pode ser respeitado
- **Audit Reports** SoX/COSO compliant
- **Rule Engine** configurável

---

### 8.2 Delegação Programada e Calendar-Aware

**Estado Atual:** Delegação manual com data início/fim.

**World Class:**
- Integração com calendário corporativo (Outlook/Google) — detecta férias automaticamente
- Delegação em cascata (se A delega para B e B está fora, vai para C)
- Delegação parcial por categoria/valor (já implementado parcialmente)
- Notificação ao delegante de cada ação tomada

---

### 8.3 Política de Compras Versionada

**Estado Atual:** Regras hardcoded ou em settings.

**World Class:**
- **Policy-as-Code** (OPA — Open Policy Agent)
- Versionamento Git-like de políticas
- A/B testing de políticas
- Policy Engine separado da aplicação
- Audit de quem aprovou cada versão da política

---

### 8.4 Workflow Designer No-Code

**Estado Atual:** Workflows hardcoded (com regras configuráveis).

**World Class:**
- **BPMN 2.0 Designer** drag-and-drop (Camunda, Flowable)
- **Process Mining** para descobrir workflows reais (Celonis, UiPath)
- **Robotic Process Automation (RPA)** integration
- **Decision Tables (DMN)** para regras complexas
- **Forms Builder** dinâmico
- **Approval Matrix Visual Editor**

---

## 9. Roadmap Priorizado (Esforço × Impacto)

### Critérios
- **Impacto:** 1-5 (5 = transformacional)
- **Esforço:** 1-5 (5 = épico, 6+ meses)
- **Score:** Impacto × (6 - Esforço)

### Quick Wins (Score ≥ 16, Esforço ≤ 2)

| ID | Gap | Imp | Esf | Score |
|----|-----|:---:|:---:|:-----:|
| QW-01 | Taxonomia UNSPSC nas categorias | 4 | 1 | 20 |
| QW-02 | Multi-moeda com FX BCB | 4 | 1 | 20 |
| QW-03 | Sanctions screening (CEIS/CNEP API) | 5 | 2 | 20 |
| QW-04 | Maverick spend detection (query) | 4 | 1 | 20 |
| QW-05 | NFS-e import (XML) | 4 | 2 | 16 |
| QW-06 | Audit log imutável (append-only) | 4 | 2 | 16 |
| QW-07 | i18n estrutura base (PT/EN/ES) | 4 | 2 | 16 |

### Estratégicos (Imp ≥ 4, Esf 3-4)

| ID | Gap | Imp | Esf | Score |
|----|-----|:---:|:---:|:-----:|
| ST-01 | Strategic Sourcing (RFx + Reverse Auction) | 5 | 4 | 10 |
| ST-02 | Multi-tenant real | 5 | 5 | 5 |
| ST-03 | SSO SAML/OIDC + SCIM | 5 | 3 | 15 |
| ST-04 | PunchOut cXML/OCI | 5 | 4 | 10 |
| ST-05 | Integração TOTVS Protheus | 5 | 4 | 10 |
| ST-06 | Spend Cube / OLAP | 4 | 3 | 12 |
| ST-07 | Tax Engine BR (ICMS/PIS/COFINS/ISS) | 4 | 4 | 8 |
| ST-08 | Workflow Designer BPMN | 4 | 4 | 8 |
| ST-09 | Conversational Procurement (LLM agent) | 5 | 3 | 15 |
| ST-10 | T&E + SOW Management | 4 | 4 | 8 |

### Transformacionais (Imp = 5, Esf = 5)

| ID | Gap | Imp | Esf | Score |
|----|-----|:---:|:---:|:-----:|
| TR-01 | Marketplace de integrações + API pública | 5 | 5 | 5 |
| TR-02 | Autonomous Sourcing Agents (LLM) | 5 | 5 | 5 |
| TR-03 | App nativo iOS/Android | 4 | 5 | 4 |
| TR-04 | Multi-region active-active | 5 | 5 | 5 |
| TR-05 | SOC2 Type II + ISO 27001 | 5 | 5 | 5 |

### Sequenciamento Sugerido

**Q1 — Quick Wins de Alto Impacto**
- QW-01 (UNSPSC), QW-02 (multi-moeda), QW-03 (sanctions), QW-04 (maverick), QW-06 (audit imutável), QW-07 (i18n)

**Q2 — Habilitadores Enterprise**
- ST-03 (SSO SAML), ST-06 (Spend Cube), ST-09 (LLM conversational), QW-05 (NFS-e)

**Q3 — Sourcing Estratégico**
- ST-01 (RFx + Reverse Auction), ST-04 (PunchOut)

**Q4 — Multi-Tenant + ERP**
- ST-02 (Multi-tenant), ST-05 (TOTVS), ST-07 (Tax Engine)

**Ano 2 — Transformação**
- TR-01 (Marketplace API), TR-02 (Autonomous Agents), TR-03 (Apps nativos), TR-05 (SOC2/ISO27001)

---

## 10. Apêndice — Tabela Comparativa

### 10.1 Promo Supply vs SAP Ariba vs Coupa

| Capacidade | Promo Supply | SAP Ariba | Coupa |
|------------|:------------:|:---------:|:-----:|
| Spend Analytics | Básico | Avançado (Ariba Spend Visibility) | Avançado (Coupa Spend Guard) |
| Strategic Sourcing | Não | Sim (Ariba Sourcing) | Sim (Coupa Sourcing) |
| Reverse Auction | Não | Sim | Sim |
| RFx | Não | Sim | Sim |
| CLM | Médio | Sim (Ariba Contracts + DocuSign) | Sim (Coupa Contracts) |
| SRM 360 | Médio | Sim (Ariba SLP) | Sim (Coupa Risk Aware) |
| P2P | Bom | Sim (Ariba Buying) | Sim (Coupa Procure) |
| e-Invoicing | Básico | Sim (Ariba Invoice) | Sim (Coupa Invoice) |
| PunchOut | Não | Sim (Ariba Network) | Sim (Coupa Open Buy) |
| Catalogs Hosted | Não | Sim | Sim |
| Category Mgmt | Não | Sim (Ariba Category Mgmt) | Sim |
| Risk & Compliance | Básico | Sim (Ariba Risk) | Sim (Risk Aware) |
| T&E | Não | Sim (Concur) | Sim (Coupa Expense) |
| SOW / VMS | Não | Sim (Fieldglass) | Sim (Contingent Workforce) |
| AI/ML | 5 funções | Joule AI | Coupa Sage AI |
| Multi-tenant | Não | Sim | Sim |
| Multi-moeda | Não | Sim (180+) | Sim (160+) |
| Idiomas | 1 (PT-BR) | 28 | 24 |
| SSO SAML/OIDC | Não | Sim | Sim |
| SCIM | Não | Sim | Sim |
| ERP Integration | Não | Nativa (S/4HANA) | 50+ connectors |
| Brasil Fiscal Completo | Não | Parcial (via parceiro) | Parcial |
| SOC2 Type II | Não | Sim | Sim |
| ISO 27001 | Não | Sim | Sim |
| Mobile Nativo | PWA | iOS+Android | iOS+Android |
| Marketplace API | Não | Ariba Network | Coupa App Marketplace |
| Preço (estimado) | Custom | $$$$ | $$$$ |
| Time-to-Value | Semanas | 6-18 meses | 4-12 meses |
| Customização | Alta | Média (configurável) | Média |
| TCO 5 anos (médio porte) | Baixo | $1-5M USD | $800k-3M USD |

### 10.2 Pontos Fortes do Promo Supply

Apesar dos gaps em escala enterprise, o Promo Supply tem **diferenciais competitivos** vs suites globais:

- **Time-to-value muito menor** (semanas vs meses)
- **Customização nativa** sem licenciamento adicional
- **TCO significativamente inferior**
- **UX moderna e dense ERP** (vs UIs legacy de Ariba/Oracle)
- **PWA + offline-first** para recebimento mobile
- **IA acessível** sem add-ons caros
- **Foco no mercado brasileiro** (CNPJ, NF-e nativo, Real)
- **Realtime nativo** via Supabase
- **Stack moderno** (React 18, TypeScript, edge functions)
- **Onboarding tour, command palette, undo global** — UX details que Ariba não tem

### 10.3 Posicionamento Estratégico Recomendado

O Promo Supply deve evitar concorrência direta com Ariba/Coupa em deals enterprise globais e focar em:

1. **Mid-market brasileiro** (R$ 100M-2B faturamento) — sweet spot
2. **Categorias específicas:** brindes, materiais de marketing, indireto operacional
3. **Verticais regulados** (saúde, agro, indústria) com customização
4. **Empresas em digital transformation** que precisam de quick wins
5. **Substituição de planilhas + e-mail + ERP genérico**

À medida que os gaps prioritários forem fechados (multi-tenant, SSO, RFx, ERP), o produto pode subir para deals upper-mid e lower-enterprise.

---

## 11. Conclusão

O Promo Supply é um produto **moderno e bem executado** no espaço **operacional P2P**, com IA aplicada, UX premium e excelente cobertura do core procurement. Para evoluir para **classe mundial**, o foco deve ser:

1. **Curto prazo (6 meses):** Quick wins de alto impacto — sanctions screening, multi-moeda, taxonomia UNSPSC, audit imutável, NFS-e, i18n base.
2. **Médio prazo (12-18 meses):** Habilitadores enterprise — SSO SAML, Spend Cube, RFx, PunchOut, integração TOTVS/SAP, conversational AI.
3. **Longo prazo (24-36 meses):** Transformacionais — multi-tenant verdadeiro, marketplace API, autonomous agents, certificações SOC2/ISO27001, apps nativos.

O caminho é viável e o roadmap proposto entrega valor incremental em cada release, mantendo o diferencial competitivo de **time-to-value** e **TCO** que são marcas registradas da plataforma.

---

> **Próxima Revisão:** Após Q1 (avaliação dos quick wins entregues)  
> **Documentos Relacionados:**  
> - `docs/LEVANTAMENTO_FUNCIONALIDADES_v2.md` — baseline atual  
> - `docs/FUNCIONALIDADES_SEM_UI.md` — gaps internos de UI  
> - `docs/ANALISE_GAPS_MELHORIAS.md` — gaps táticos já catalogados
