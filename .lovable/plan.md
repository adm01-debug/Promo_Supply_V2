
## Plano: Análise Focada em Compliance Regulatório Brasileiro

### Objetivo
Criar `docs/COMPLIANCE_REGULATORIO_BRASIL.md` — análise vertical do Promo Supply contra obrigações regulatórias brasileiras, identificando gaps, riscos legais e roadmap de adequação. Foco exclusivo em LGPD, SPED (Fiscal/Contribuições), NF-e/NFS-e/CT-e/MDF-e, eSocial e EFD-Reinf.

### Estrutura do Documento (~700-900 linhas)

#### 1. Sumário Executivo
- Score consolidado de compliance (0-100) por pilar
- Top 5 riscos legais imediatos (multas, sanções, bloqueios)
- Recomendação de prioridade (LGPD > NF-e > SPED > Reinf > eSocial)

#### 2. Metodologia
- 5 pilares regulatórios avaliados
- Critérios: cobertura nativa, risco de multa, esforço de adequação
- Fontes oficiais (Receita Federal, ANPD, SEFAZ, Caixa)

#### 3. Pilar 1 — LGPD (Lei 13.709/2018)
- **Obrigações:** base legal, consentimento, direitos do titular, DPO, RIPD, incidentes
- **Estado atual Promo Supply:** RBAC, audit_logs, MFA, geo-restrição (parcial)
- **Gaps identificados:**
  - Ausência de portal do titular (acesso, retificação, exclusão, portabilidade)
  - Falta de registro de bases legais por tipo de dado
  - Sem RIPD (Relatório de Impacto)
  - Retenção/anonimização não automatizada
  - Sem trilha de consentimento granular
  - Notificação de incidente à ANPD não estruturada
- **DDL sugerida:** `data_subjects`, `consent_records`, `data_retention_policies`, `dpo_requests`, `data_breach_log`
- **Multas potenciais:** até 2% faturamento, R$ 50M por infração

#### 4. Pilar 2 — NF-e / NFS-e / CT-e / MDF-e
- **Obrigações:** emissão, recepção, manifestação destinatário, guarda 5 anos, contingência
- **Estado atual:** módulo `DocumentosFiscais` apenas visualização básica
- **Gaps:**
  - Não emite NF-e (modelo 55) nem NFS-e
  - Não faz manifestação do destinatário (4 tipos: ciência, confirmação, desconhecimento, não realizada)
  - Não valida XML contra schema XSD da SEFAZ
  - Não armazena XML autenticado por 5 anos
  - Sem contingência (SVC-AN, SVC-RS, EPEC, FS-DA)
- **Solução recomendada:** integração via gateway (Focus NFe, NFe.io, Migrate) ao invés de motor próprio
- **DDL sugerida:** `fiscal_documents`, `fiscal_xml_storage` (bucket), `fiscal_events_log`, `fiscal_contingency_status`
- **Multas:** R$ 50-500 por documento + suspensão IE

#### 5. Pilar 3 — SPED (Fiscal e Contribuições)
- **Obrigações:** EFD ICMS/IPI mensal, EFD Contribuições mensal, ECD/ECF anual
- **Bloco K (estoque produção):** consumo, produção, perdas
- **Estado atual:** ausente
- **Gaps:**
  - Não gera arquivos .txt no layout SPED
  - Não tem dicionário de NCM/CFOP/CST
  - Não calcula ICMS, ICMS-ST, IPI, PIS/COFINS, DIFAL
  - Bloco K (movimentos de estoque) sem rastreabilidade
- **Estratégia:** delegar ao ERP fiscal (TOTVS/Senior) via conector + envio de PO/recebimento
- **Multas:** R$ 500-1.500 por arquivo atrasado, glosa de créditos

#### 6. Pilar 4 — EFD-Reinf
- **Obrigações:** retenções federais (IR, CSLL, PIS, COFINS, INSS), prestadores PJ/PF, eventos R-1000 a R-9000
- **Estado atual:** ausente
- **Gaps:**
  - Pagamentos a fornecedores PJ não geram evento R-2010 (retenção CSRF)
  - Notas de serviço sem cálculo de retenções
  - Sem integração com e-CAC para envio de eventos
- **DDL sugerida:** `reinf_events`, `retentions_calculated`, `service_invoices_taxes`
- **Multas:** R$ 200-1.500 por evento omitido

#### 7. Pilar 5 — eSocial (relevância parcial p/ Compras)
- **Escopo aplicável:** terceirizados (S-1000, S-1200), saúde/segurança (S-2210, S-2240) quando fornecedor é PJ de mão-de-obra
- **Estado atual:** fora do escopo (Promo Supply é Compras, não folha)
- **Gap relevante:** registro de fornecedor terceirizado com vínculo a tomador (lotação tributária)
- **Recomendação:** delegar ao HCM (Senior, TOTVS RH); apenas expor dados de contrato relevantes

#### 8. Matriz Consolidada de Compliance

| Pilar | Cobertura atual | Risco | Esforço (sem) | Prioridade |
|---|---|---|---|---|
| LGPD | 30% | Alto (R$ 50M) | 6 | P0 |
| NF-e/CT-e | 5% | Alto (suspensão IE) | 8 (via gateway) | P0 |
| SPED Fiscal | 0% | Médio (glosa) | 0 (delegado ao ERP) | P2 |
| EFD-Reinf | 0% | Médio (R$ 1,5k/evento) | 4 | P1 |
| eSocial | N/A | Baixo (escopo HCM) | 1 (mapeamento) | P3 |

#### 9. Roadmap de Adequação (180 dias)

**Fase 1 (semanas 1-6) — LGPD obrigatório**
- Portal do titular `/lgpd/meus-dados` (acesso, retificação, exclusão, portabilidade JSON/CSV)
- Tabela `consent_records` + UI de gestão de consentimento
- Política de retenção automatizada (job `purge-expired-data`)
- Workflow de incidente → notificação ANPD em 72h

**Fase 2 (semanas 7-14) — NF-e via gateway**
- Conector Focus NFe (edge function `nfe-gateway`)
- Manifestação automática de NF-e recebida (R-200)
- Bucket `fiscal-xmls` com retenção 5 anos + checksum
- Painel de contingência

**Fase 3 (semanas 15-22) — EFD-Reinf**
- Cálculo automático de retenções (IRRF, CSRF, INSS) no pagamento
- Geração de eventos R-2010 e R-2020
- Edge function `reinf-submit` para envio à Receita

**Fase 4 (semanas 23-26) — Integração ERP fiscal**
- Conector TOTVS/Senior para SPED (read-only de PO/recebimento)
- Mapeamento NCM/CFOP/CST por produto

#### 10. Apêndices
- A. Checklist LGPD (50 itens — Art. 6º, 9º, 18º, 48º)
- B. Layout EFD-Reinf eventos R-2010, R-2020, R-4010 (estrutura)
- C. Tabela de multas e bases legais
- D. Glossário regulatório (ANPD, e-CAC, SEFAZ, EFD, Bloco K, CSRF, DIFAL)
- E. Fluxograma incidente LGPD → notificação ANPD

### Entrega
- Criar `docs/COMPLIANCE_REGULATORIO_BRASIL.md` (denso, sem emojis, ~800 linhas, tabelas markdown, SQL inline para DDL sugerida)
- Não alterar código nem banco — apenas documentação
- Resumo curto no chat com top 3 ações P0 imediatas e link do arquivo
