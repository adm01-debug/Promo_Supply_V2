# Comparativo: Promo Supply vs TOTVS Protheus SIGACOM vs Senior Sapiens Suprimentos

Documento técnico-comercial comparando o Promo Supply contra os dois principais ERPs brasileiros no domínio de Suprimentos/Compras. Substitui o enfoque global (Ariba/Coupa) por uma análise centrada na realidade fiscal, operacional e de mercado do Brasil.

Versão: 1.0 — abril 2026
Audiência: C-level, líderes de TI, líderes de Suprimentos avaliando substituição/complemento de ERP.

---

## 1. Sumário Executivo

O Promo Supply é uma plataforma cloud-native, best-of-breed, focada em UX premium, IA generativa e mobile-first, com cobertura funcional muito superior a TOTVS Protheus SIGACOM e Senior Sapiens nas dimensões de experiência, analytics e automação inteligente. Em contrapartida, perde de forma estrutural nas dimensões de profundidade fiscal nacional (NF-e/CT-e/SPED/EFD-Reinf/Bloco K), multi-empresa fiscal e integração com legados, onde TOTVS lidera o mercado há mais de duas décadas e Senior tem ofertas maduras. A estratégia recomendada é posicionar o Promo Supply como camada de Procurement best-of-breed que se integra (não substitui) ao ERP fiscal já instalado, fechando 8 gaps críticos via conectores e edge functions ao longo de 90 dias.

| Plataforma | Score médio (1-5) | Forte em | Fraco em |
|---|---|---|---|
| Promo Supply | 3,9 | UX, IA, Analytics, Mobile, Cotação | Fiscal BR, Multi-empresa, ERP nativo |
| TOTVS Protheus SIGACOM | 3,5 | Fiscal BR, ADVPL ecossistema, Industria | UX, IA, Mobile, Cloud, Cotação eletrônica |
| Senior Sapiens Suprimentos | 3,4 | BPM no-code, HCM integrado, SPED | UX, IA, Marketplace, Mobile |

---

## 2. Metodologia

12 dimensões avaliadas em escala 1-5 (1=ausente, 2=básico, 3=funcional, 4=robusto, 5=best-in-class). Avaliação baseada em:

- Documentação pública oficial dos fornecedores
- Comunidade técnica (TDN — TOTVS Developer Network; Senior Cloud Help)
- Casos de uso publicados, RFPs reais e benchmarks de implantação 2023-2025
- Inspeção direta do código e features do Promo Supply (este repositório)

Pesos não aplicados nas tabelas individuais (peso = 1). Score consolidado calculado como média aritmética simples das 12 dimensões. Onde houver diferenciais críticos para o mid-market brasileiro (D7, D8), justifica-se peso maior em decisão de compra real.

---

## 3. Perfil dos Concorrentes

### 3.1 TOTVS Protheus SIGACOM

- Arquitetura: cliente-servidor proprietária, linguagem ADVPL/TLPP rodando em AppServer; banco multi-vendor (Oracle, SQL Server, Postgres) com dicionário próprio (SX*).
- Distribuição: licença on-premise tradicional, opção TOTVS Cloud (single-tenant gerenciado), TCO alto (licenciamento por usuário + manutenção 22% a.a.).
- Módulo SIGACOM (Compras) acoplado ao SIGAEST (Estoque), SIGAFIS (Fiscal), SIGAFIN (Financeiro). Integração interna via tabelas SC1 (solicitação), SC7 (pedido), SC8 (cotação), SF1 (NF entrada).
- Pontos fortes: profundidade fiscal brasileira (atualizações legais via TOTVS Compliance), base instalada gigante (>30 mil clientes), ecossistema de parceiros e bolsa de profissionais ADVPL.
- Pontos fracos: UX defasada (interface SmartClient ou navegador embedded), customizações pesadas exigem ADVPL, ciclo de release lento, mobile fraco (TOTVS App é wrapper).

### 3.2 Senior Sapiens Suprimentos

- Arquitetura: Java/Postgres, plataforma G5 + Sapiens; oferta SaaS (Senior X) crescendo.
- Diferencial histórico: HCM (Gestão de Pessoas) líder; Suprimentos integrado ao HCM (centro de custo, requisitante, aprovador).
- BPM nativo (workflow designer no-code) muito utilizado para aprovações de compras.
- Pontos fortes: SPED nativo, BPM flexível, integração com folha (orçamento por departamento), forte em manufatura e cooperativas.
- Pontos fracos: UX legada em telas antigas, IA incipiente, marketplace fraco, mobile limitado, cotação eletrônica via portal próprio com adoção média.

### 3.3 Promo Supply

- Arquitetura: React 18 + Vite + Tailwind no front; Supabase (Postgres + RLS + Realtime + Edge Functions Deno) no back; Lovable AI Gateway para IA (Gemini, GPT-5).
- Multi-tenant ready (gap em refactor — vide GAPS_ENTERPRISE_WORLD_CLASS), cloud-native, PWA com offline e push.
- Cobertura: solicitação, cotação, pedido, recebimento, contratos, pagamentos, devoluções, qualificação de fornecedor, compliance, IA negociação, dashboards executivos, alertas SLA, three-way match, RBAC, MFA, geo-restrição, audit trail.
- Forças: UX premium dark, IA, analytics, mobile-first, time-to-value baixo (deploy contínuo).
- Fraquezas: fiscal BR ausente nativo, sem multi-empresa fiscal, sem CNAB nativo, sem ecossistema de parceiros, base instalada inicial.

---

## 4. Comparativo por Dimensão

Escala: 1 ausente · 2 básico · 3 funcional · 4 robusto · 5 best-in-class.

### D1 — Solicitação de Compras

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Solicitação multi-item com workflow | Sim, wizard 3 passos | Sim, SC1 | Sim |
| Anexos e justificativa | Sim | Sim | Sim |
| Aprovação multi-nível por valor | Sim (5k/50k) | Sim (matriz SX5) | Sim (BPM no-code) |
| Orçamento por centro de custo | Parcial (department_budgets) | Sim | Sim (forte) |
| UX moderna (mobile, dark theme) | 5 | 2 | 2 |
| **Score** | **4** | **4** | **4** |

### D2 — Cotação / RFQ Eletrônica

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Cotação multi-fornecedor | Sim | Sim (SC8) | Sim |
| Comparador visual side-by-side | Sim | Não nativo | Parcial |
| Scoring multi-critério (preço/prazo/qualidade) | Sim | Manual | Parcial |
| Portal fornecedor nativo | Em construção (Sourcing) | TOTVS Portal Compras (limitado) | Senior Portal |
| Reverse auction | Roadmap (vide deep-dive) | Não | Não |
| **Score** | **4** | **3** | **3** |

### D3 — Portal do Fornecedor

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Login/autocadastro fornecedor | Parcial (PortalFornecedor.tsx) | Sim | Sim |
| Submissão de cotação online | Em construção | Sim | Sim |
| Upload de NF/boleto | Roadmap | Sim | Sim |
| Status de pedido em tempo real | Sim (Realtime) | Não | Parcial |
| Magic link sem cadastro | Roadmap | Não | Não |
| **Score** | **3** | **4** | **4** |

### D4 — Pedido de Compra & Aprovação

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Geração automática a partir de cotação | Sim | Sim | Sim |
| Aprovação multi-nível com escalação | Sim (useApprovalWorkflow) | Sim (SX5) | Sim (BPM) |
| Delegação temporária | Sim | Sim | Sim |
| Histórico imutável | Sim (audit_logs) | Sim | Sim |
| Mobile aprovação | Sim (PWA push) | Fraco | Médio |
| **Score** | **5** | **4** | **4** |

### D5 — Recebimento & Three-Way Match

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Recebimento físico com checklist | Sim (RecebimentoOffline) | Sim | Sim |
| Recebimento offline (PWA) | Sim | Não | Não |
| Three-way match (PO+NF+Recebimento) | Sim (ThreeWayMatchPanel) | Sim (nativo) | Sim |
| Tolerância configurável | Sim (1%) | Sim | Sim |
| Bloqueio automático de pagamento | Sim | Sim | Sim |
| **Score** | **5** | **4** | **4** |

### D6 — Contratos

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| CLM com vigência e renovação | Sim | Sim (SIGAGCT) | Sim |
| Penalidades automáticas (0,5% a.d., cap 20%) | Sim | Manual | Manual |
| Geração de PDF (edge function) | Sim | Sim | Sim |
| Assinatura digital | Parcial (DigitalSignature) | Integração externa | Integração externa |
| Histórico de alterações | Sim | Sim | Sim |
| **Score** | **4** | **4** | **3** |

### D7 — Pagamentos & Integração Bancária

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Agendamento e aprovação | Sim | Sim | Sim |
| CNAB 240/400 nativo | **Não** | Sim (multi-banco) | Sim (multi-banco) |
| API Banco Inter (PIX, boleto) | Roadmap | Via parceiro | Via parceiro |
| Conciliação bancária automática | Não | Sim | Sim |
| Crédito de fornecedor (RMA) | Sim (creditos_fornecedor) | Manual | Manual |
| **Score** | **3** | **5** | **5** |

### D8 — Compliance Fiscal Nacional

A dimensão decisiva no mid-market BR.

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| NF-e entrada (XML parsing, validação SEFAZ) | **Não** | Sim | Sim |
| CT-e (transporte) | Não | Sim | Sim |
| SPED Fiscal/Contribuições/EFD-Reinf | Não | Sim (TOTVS Compliance) | Sim |
| Bloco K (estoque produção) | Não | Sim | Parcial |
| ICMS-ST, DIFAL, IPI, PIS/COFINS | Não | Sim (motor fiscal) | Sim |
| Atualização contínua (legislação) | N/A | Sim (assinatura) | Sim |
| **Score** | **1** | **5** | **5** |

### D9 — BI / Analytics / KPIs

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Dashboard executivo C-level | Sim (DashboardExecutivo) | TOTVS Analytics (extra) | Senior X Analytics (extra) |
| KPIs de comprador (saving, lead time) | Sim | Custom | Custom |
| Drill-down interativo | Sim | Não nativo | Parcial |
| Heatmap de risco fornecedor | Sim (RiskHeatMap) | Não | Não |
| Sparklines, sqrt-scale charts | Sim | Não | Não |
| **Score** | **5** | **3** | **3** |

### D10 — UX, Mobile, PWA

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Dark theme premium, glassmorphism | Sim | Não | Não |
| PWA instalável + offline | Sim | Não | Não |
| Push notifications nativas | Sim | Não | Parcial |
| Acessibilidade WCAG AA | Sim | Parcial | Parcial |
| Atalhos de teclado, command palette | Sim | Não | Não |
| **Score** | **5** | **2** | **2** |

### D11 — IA & Automação

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Sugestão de fornecedor (LLM) | Sim (ai-supplier-suggestion) | Não | Não |
| Negociação assistida | Sim (NegociacaoIA) | Não | Não |
| Previsão de demanda | Sim (ai-demand-prediction) | TOTVS Carol (extra, complexo) | Não |
| Análise de risco fornecedor | Sim (ai-supplier-risk) | Não | Não |
| Auto-aprovação inteligente | Sim (<R$1k) | Regra simples | BPM regra |
| **Score** | **5** | **2** | **2** |

### D12 — TCO, Implantação, Time-to-Value

| Capacidade | Promo Supply | TOTVS SIGACOM | Senior Sapiens |
|---|---|---|---|
| Tempo médio de implantação | Semanas | 6-18 meses | 4-12 meses |
| Licenciamento | SaaS por uso | Por usuário + 22% manut. | SaaS ou perpétua |
| Customização | Código aberto na conta | ADVPL (consultoria cara) | LSP/Rules |
| Atualização contínua | Deploy diário | Pacotes trimestrais | Mensal/trimestral |
| Treinamento | Onboarding tour | Curso formal | Curso formal |
| **Score** | **5** | **2** | **3** |

---

## 5. Matriz Consolidada de Maturidade

| Dimensão | Promo Supply | TOTVS | Senior |
|---|:-:|:-:|:-:|
| D1 Solicitação | 4 | 4 | 4 |
| D2 Cotação/RFQ | 4 | 3 | 3 |
| D3 Portal Fornecedor | 3 | 4 | 4 |
| D4 Pedido/Aprovação | 5 | 4 | 4 |
| D5 Recebimento/3-way | 5 | 4 | 4 |
| D6 Contratos | 4 | 4 | 3 |
| D7 Pagamentos/Banco | 3 | 5 | 5 |
| D8 Fiscal BR | 1 | 5 | 5 |
| D9 BI/Analytics | 5 | 3 | 3 |
| D10 UX/Mobile | 5 | 2 | 2 |
| D11 IA/Automação | 5 | 2 | 2 |
| D12 TCO/Time-to-Value | 5 | 2 | 3 |
| **Média** | **4,08** | **3,50** | **3,50** |

Aplicando peso 2x para D7 e D8 (decisivos no BR mid-market):

| Plataforma | Score ponderado |
|---|:-:|
| Promo Supply | 3,57 |
| TOTVS | 3,71 |
| Senior | 3,71 |

Conclusão: sem cobertura fiscal nativa, Promo Supply perde a corrida em RFPs onde fiscal pesa. Com integração ao ERP fiscal (estratégia best-of-breed), Promo Supply lidera.

---

## 6. Onde o Promo Supply Vence (12 pontos)

1. UX dark premium com glassmorphism e animações Framer Motion (vs interfaces legadas).
2. PWA instalável com recebimento offline e sincronização (mobile-first real).
3. Push notifications nativas Web Push + service worker.
4. Command palette (Cmd+K), atalhos de teclado, navegação por voz parcial.
5. IA generativa integrada: sugestão de fornecedor, negociação, risco, previsão de demanda, todos via Lovable AI Gateway sem API key do cliente.
6. Dashboard executivo com drill-down, sparklines, heatmap de risco, sqrt-scale charts.
7. Three-way match nativo com tolerância configurável e bloqueio automático.
8. Workflow de aprovação multi-nível com escalação automática, delegação e auditoria imutável.
9. Penalidades de contrato automáticas (0,5%/dia, cap 20%) sem intervenção manual.
10. Sistema de créditos de fornecedor (RMA) integrado a devoluções e abatido em pagamentos.
11. Time-to-value: deploy contínuo, customização em código aberto na conta do cliente.
12. Segurança moderna: MFA, passkeys (WebAuthn), geo-restrição, IP whitelist, rate limit, sessões ativas.

---

## 7. Onde TOTVS Vence (gaps Promo Supply)

1. Motor fiscal brasileiro nativo: NF-e, CT-e, NFS-e, MDF-e, SPED, EFD-Reinf, Bloco K, ICMS-ST, DIFAL.
2. Atualizações legais contínuas via TOTVS Compliance (assinatura).
3. Multi-empresa fiscal (CNPJ múltiplo, filiais, regime tributário distinto).
4. Integração nativa com folha, contábil, fiscal, custos, MRP — visão única do ERP.
5. Base instalada e ecossistema TDN (parceiros, profissionais ADVPL, marketplace TOTVS Store).
6. CNAB 240/400 multi-banco nativo, conciliação bancária.
7. Maturidade em manufatura discreta e processo (apontamento de produção, OS, MRP-II).
8. Conectores prontos com Receita, SEFAZ, Suframa, eSocial.

---

## 8. Onde Senior Vence (gaps Promo Supply)

1. BPM no-code (workflow designer visual) — usuário-chave configura aprovação sem código.
2. Integração nativa com HCM (Senior Gestão de Pessoas): centro de custo herdado da folha, requisitante validado por hierarquia HR.
3. Orçamento por departamento amarrado a estrutura organizacional viva.
4. Suporte regional forte (Sul/Sudeste, Cooperativas, agroindústria).
5. SPED contribuições e EFD-Reinf nativos.
6. Sapiens Web — modernização incremental sem reinstalar cliente pesado.

---

## 9. Gaps Críticos do Promo Supply para Mid-Market Brasileiro

Top 8 gaps, ordenados por impacto em decisão de compra:

| # | Gap | Impacto | Esforço (sem) | Mitigação imediata |
|---|---|---|---|---|
| G1 | NF-e entrada nativa (XML parsing, validação SEFAZ, manifestação destinatário) | Alto | 6 | Conector com TOTVS/Senior; ou integração com NFe.io, Migrate, Focus NFe |
| G2 | SPED Fiscal/Contribuições + EFD-Reinf | Alto | 8 | Não competir; delegar ao ERP fiscal via integração |
| G3 | Multi-empresa fiscal (multi-CNPJ com regimes distintos) | Alto | 4 | Refactor multi-tenant + tabela `empresas` com `regime_tributario` |
| G4 | CNAB 240/400 nativo (Itaú, Bradesco, Inter, Santander, BB) | Alto | 4 | Edge function `gerar-cnab` + conector Banco Inter (já existe ref) |
| G5 | Bloco K (estoque produção) | Médio | 6 | Fora de escopo Procurement; encaminhar ERP |
| G6 | ICMS-ST, DIFAL, IPI no cálculo de PO | Médio | 3 | Tabela `regras_fiscais` + função `calcular_impostos_pedido` |
| G7 | Conector bidirecional TOTVS Protheus (PO/NF/Pagamento) | Crítico para venda | 5 | Edge function `protheus-bridge` (REST/SOAP via TOTVS Web Services) |
| G8 | Conector bidirecional Senior Sapiens (G7/Senior X) | Crítico para venda | 5 | Edge function `senior-bridge` (REST G7 + Senior X API) |

Total esforço: ~41 pessoas-semana para fechar gaps competitivos.

---

## 10. Estratégia de Posicionamento

**Tagline recomendada:** "Procurement Best-of-Breed que conversa com seu ERP."

Em vez de tentar substituir TOTVS/Senior (batalha perdida no fiscal), Promo Supply se posiciona como camada superior de Procurement (Source-to-Pay) que:

- Roda a operação de compras com UX premium, IA e mobile.
- Sincroniza PO aprovado para o ERP (cria SC7 no Protheus / OC no Sapiens).
- Recebe NF do ERP de volta para fechar o three-way match.
- Devolve pagamento agendado para o financeiro do ERP processar CNAB.

Vantagens:

- Cliente mantém investimento no ERP fiscal.
- TI reduz risco (fiscal continua no sistema homologado).
- Usuário de compras ganha UX 10x melhor.
- Ciclo de venda mais curto (não é rip-and-replace).

Mercados-alvo prioritários:

1. Empresas TOTVS Protheus insatisfeitas com SIGACOM (UX e mobilidade).
2. Empresas Senior Sapiens em modernização buscando complemento.
3. Mid-market industrial e varejo (R$ 100M-1B faturamento) com 50-500 compradores.

---

## 11. Roadmap Recomendado (90 dias)

**Sprint 1-2 (semanas 1-4) — Fundamento de integração**
- Edge function `protheus-bridge` (POST/GET PO, NF, status pagamento via TOTVS Web Services).
- Edge function `senior-bridge` (REST G7 + Senior X API).
- Tabela `erp_integration_log` (idempotência, retry, audit).
- Página `/integracoes` (status conectores, mapeamento de campos).

**Sprint 3-4 (semanas 5-8) — CNAB e Banco**
- Edge function `gerar-cnab` (240 Itaú, Bradesco, Inter, Santander, BB).
- Importação de retorno CNAB para conciliação.
- Expandir conector Banco Inter já existente (PIX out, boleto out).

**Sprint 5-6 (semanas 9-12) — Multi-empresa fiscal e impostos**
- Tabela `empresas` (CNPJ, regime, IE, endereço fiscal).
- Refactor RLS para `tenant_id + empresa_id`.
- Função `calcular_impostos_pedido` (ICMS, ICMS-ST, IPI, PIS/COFINS, DIFAL).
- Tabela `regras_fiscais` por NCM/CFOP/UF.

**Quick win paralelo:** Parceria com Focus NFe ou NFe.io para emissão/recepção NF-e em modo white-label, sem desenvolver motor fiscal próprio.

---

## 12. Apêndices

### Apêndice A — Tabela detalhada de funcionalidades (40 linhas)

| # | Funcionalidade | Promo | TOTVS | Senior |
|---|---|:-:|:-:|:-:|
| 1 | Solicitação multi-item | Sim | Sim | Sim |
| 2 | Wizard 3 passos | Sim | Não | Parcial |
| 3 | Anexo arquivo | Sim | Sim | Sim |
| 4 | Aprovação por valor | Sim | Sim | Sim |
| 5 | Aprovação por categoria | Sim | Sim | Sim |
| 6 | Delegação temporária | Sim | Sim | Sim |
| 7 | Escalação automática SLA | Sim | Parcial | Sim |
| 8 | Cotação multi-fornecedor | Sim | Sim | Sim |
| 9 | Comparador visual | Sim | Não | Parcial |
| 10 | Scoring multi-critério | Sim | Manual | Parcial |
| 11 | Reverse auction | Roadmap | Não | Não |
| 12 | Portal fornecedor | Parcial | Sim | Sim |
| 13 | Magic link | Roadmap | Não | Não |
| 14 | PO automática de cotação | Sim | Sim | Sim |
| 15 | Histórico imutável | Sim | Sim | Sim |
| 16 | Recebimento físico | Sim | Sim | Sim |
| 17 | Recebimento offline | Sim | Não | Não |
| 18 | Three-way match | Sim | Sim | Sim |
| 19 | Bloqueio pagamento divergente | Sim | Sim | Sim |
| 20 | Contratos CLM | Sim | Sim | Sim |
| 21 | Penalidade automática | Sim | Manual | Manual |
| 22 | Assinatura digital | Parcial | Externo | Externo |
| 23 | Pagamento agendado | Sim | Sim | Sim |
| 24 | CNAB nativo | Não | Sim | Sim |
| 25 | Conciliação bancária | Não | Sim | Sim |
| 26 | Crédito fornecedor RMA | Sim | Manual | Manual |
| 27 | NF-e entrada | Não | Sim | Sim |
| 28 | CT-e | Não | Sim | Sim |
| 29 | SPED Fiscal | Não | Sim | Sim |
| 30 | EFD-Reinf | Não | Sim | Sim |
| 31 | Bloco K | Não | Sim | Parcial |
| 32 | ICMS-ST/DIFAL | Não | Sim | Sim |
| 33 | Multi-empresa fiscal | Não | Sim | Sim |
| 34 | Dashboard executivo | Sim | Extra | Extra |
| 35 | Drill-down KPI | Sim | Não | Parcial |
| 36 | Heatmap risco | Sim | Não | Não |
| 37 | Sugestão IA fornecedor | Sim | Não | Não |
| 38 | Negociação IA | Sim | Não | Não |
| 39 | Previsão demanda IA | Sim | Extra | Não |
| 40 | PWA + push | Sim | Não | Parcial |

### Apêndice B — Glossário Fiscal Brasileiro

- **NF-e:** Nota Fiscal Eletrônica (mod. 55), padrão SEFAZ XML.
- **NFS-e:** Nota Fiscal de Serviços Eletrônica, padrão municipal.
- **CT-e:** Conhecimento de Transporte Eletrônico.
- **MDF-e:** Manifesto de Documentos Fiscais Eletrônico.
- **SPED Fiscal:** EFD ICMS/IPI mensal.
- **SPED Contribuições:** EFD PIS/COFINS mensal.
- **EFD-Reinf:** retenções federais e info previdenciárias.
- **Bloco K:** controle de produção e estoque mensal (SPED Fiscal).
- **ICMS-ST:** Substituição Tributária do ICMS.
- **DIFAL:** Diferencial de Alíquota interestadual.
- **CFOP:** Código Fiscal de Operações e Prestações.
- **NCM:** Nomenclatura Comum do Mercosul (classificação de mercadoria).
- **CNAB 240/400:** layouts FEBRABAN para troca bancária.
- **Manifestação do Destinatário:** ciência/confirmação/desconhecimento de NF-e recebida.

### Apêndice C — Fontes Consultadas

- TOTVS Developer Network (TDN) — documentação SIGACOM, SX5, SC1/SC7/SC8.
- TOTVS Compliance — descritivo de produto.
- Senior Cloud Help — Sapiens Suprimentos, BPM, Senior X.
- Portal SPED Receita Federal (sped.rfb.gov.br).
- FEBRABAN — Manuais CNAB 240/400.
- Comunidade GUTM (Grupo de Usuários TOTVS Manufatura).
- Análise direta do código deste repositório (Promo Supply v2026.04).

---

Fim do documento.
