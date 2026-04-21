# Compliance Regulatório Brasileiro — Promo Supply

Análise vertical do Promo Supply contra obrigações regulatórias brasileiras: LGPD, NF-e/NFS-e/CT-e/MDF-e, SPED (Fiscal e Contribuições), EFD-Reinf e eSocial.

Documento de produto + engenharia. Não executa migrations nem altera código — apenas blueprint.

---

## 1. Sumário Executivo

O Promo Supply é uma plataforma cloud-native de Compras (Source-to-Pay) com forte base em segurança técnica (RBAC, MFA, audit_logs, geo-restrição, rate limiting) mas **cobertura regulatória brasileira ainda imatura** para operação em empresas que precisam emitir/receber documentos fiscais e cumprir obrigações acessórias da Receita Federal.

### Score consolidado de compliance

| Pilar | Cobertura | Risco | Score (0-100) |
|---|---:|---|---:|
| LGPD (Lei 13.709/2018)         | 30% | Alto    | 30 |
| NF-e / NFS-e / CT-e / MDF-e    |  5% | Alto    |  5 |
| SPED Fiscal / Contribuições    |  0% | Médio   |  0 |
| EFD-Reinf                      |  0% | Médio   |  0 |
| eSocial (escopo Compras)       | N/A | Baixo   | 50* |
| **Score consolidado ponderado**|     |         | **18 / 100** |

*eSocial é escopo de HCM; pontuamos 50 por considerarmos parcialmente "fora do produto".

### Top 5 riscos legais imediatos

1. **LGPD — ausência de portal do titular**: ANPD pode aplicar multa de até **2% do faturamento** (limitada a R$ 50M por infração) por descumprimento dos direitos do titular (Art. 18º).
2. **NF-e — sem manifestação do destinatário**: empresas com faturamento > R$ 100M são obrigadas a manifestar (Ajuste SINIEF 17/2020). Omissão gera **glosa de créditos de ICMS** e exposição a fraude (uso indevido do CNPJ).
3. **EFD-Reinf — pagamentos a PJ sem retenção declarada**: cada evento R-2010 omitido custa **R$ 200 a R$ 1.500** + juros sobre tributo não recolhido.
4. **Guarda de XML por 5 anos**: ausência de bucket dedicado com checksum/imutabilidade impede defesa em fiscalização.
5. **Notificação de incidente LGPD em 72h**: workflow inexistente. Atraso configura agravante (Art. 52º §1º, II).

### Recomendação de prioridade

```
P0 (0-90 dias):   LGPD + NF-e (manifestação destinatário)
P1 (90-180 dias): EFD-Reinf
P2 (180-365):     SPED via conector ERP
P3 (>365):        eSocial (escopo limitado)
```

---

## 2. Metodologia

### Pilares avaliados

| # | Pilar | Norma base | Órgão fiscalizador |
|---|---|---|---|
| 1 | LGPD | Lei 13.709/2018 | ANPD |
| 2 | NF-e/NFS-e/CT-e/MDF-e | Ajustes SINIEF, Convênios CONFAZ | SEFAZ estaduais / Receita Federal |
| 3 | SPED Fiscal / Contribuições | Decreto 6.022/2007, IN RFB 2.052/2021 | Receita Federal |
| 4 | EFD-Reinf | IN RFB 2.043/2021 | Receita Federal |
| 5 | eSocial | Decreto 8.373/2014 | Receita / MTE / INSS |

### Critérios de avaliação

- **Cobertura nativa (0-100%)**: percentual da obrigação suportado sem dependência externa.
- **Risco**: combinação de probabilidade de fiscalização × valor da multa × frequência da obrigação.
- **Esforço de adequação**: estimativa em semanas-engenheiro para fechar o gap.

### Fontes consultadas

- Receita Federal — Manual de Orientação do Contribuinte NF-e v7.00
- ANPD — Guias Orientativos (tratamento de dados, agentes de tratamento, segurança)
- Portal SPED — Layouts EFD ICMS/IPI, EFD Contribuições, EFD-Reinf
- CONFAZ — Ajuste SINIEF 17/2020 (manifestação do destinatário)
- Cartilha LGPD da CGU (Controladoria-Geral da União)

---

## 3. Pilar 1 — LGPD (Lei 13.709/2018)

### 3.1 Obrigações principais

| Art. | Obrigação | Aplicabilidade Promo Supply |
|---|---|---|
| 6º | Princípios (finalidade, adequação, necessidade) | Sim — coleta dados de compradores, fornecedores PJ/PF |
| 7º-11 | Bases legais para tratamento | Sim — consentimento, contrato, obrigação legal |
| 18º | Direitos do titular | Sim — acesso, retificação, exclusão, portabilidade, anonimização |
| 37º | Registro das operações | Sim — ROPA (Record of Processing Activities) |
| 38º | RIPD (Relatório de Impacto) | Sim para tratamento de alto risco |
| 41º | DPO (Encarregado) | Sim — designar pessoa/contato público |
| 46º-49º | Segurança e governança | Parcial — RBAC, MFA, audit existem |
| 48º | Notificação de incidente em prazo razoável (interpretado como 72h) | Não implementado |

### 3.2 Estado atual no produto

Implementado:
- `usePermissions` + tabela `user_roles` com `has_role()` (RBAC estrito)
- `audit_logs` com 10 tipos de ação e 8 tipos de entidade (`src/services/auditService.ts`)
- MFA TOTP + Passkey/WebAuthn
- Geo-restrição (`useGeoRestriction`, painéis em `src/components/security/`)
- Rate limiting (5 tentativas em 15 min, bloqueio em `account_lockouts`)
- HTTPS obrigatório (Lovable Cloud)

Faltante:
- Portal público do titular para exercer direitos do Art. 18º
- Registro granular de consentimento por finalidade
- Política de retenção/anonimização automatizada
- ROPA estruturado (apenas docs avulsos)
- Workflow de incidente com notificação à ANPD
- Identificação clara da base legal por categoria de dado

### 3.3 Gaps identificados

| Gap | Severidade | Esforço | Multa potencial |
|---|---|---|---|
| Portal do titular `/lgpd/meus-dados`                  | Alta  | 2 sem  | 2% faturamento (até R$ 50M) |
| Registro de bases legais por tipo de dado             | Alta  | 1 sem  | Bloqueio de tratamento (Art. 52, IV) |
| RIPD para módulos de alto risco (qualificação, score) | Média | 1 sem  | Sanção administrativa (Art. 52, V) |
| Retenção/anonimização automatizada                    | Alta  | 1 sem  | Multa simples (Art. 52, II) |
| Trilha de consentimento granular                      | Alta  | 1 sem  | Idem |
| Workflow de incidente → ANPD em 72h                   | Crítica | 1 sem | Agravante (Art. 52 §1º, II) |

### 3.4 DDL sugerida

```sql
-- Categorização de dados pessoais tratados
CREATE TABLE public.data_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,                  -- 'identificacao', 'contato', 'financeiro'
  sensitivity text NOT NULL CHECK (sensitivity IN ('comum','sensivel')),
  legal_basis text NOT NULL,                    -- 'consentimento','contrato','obrigacao_legal','legitimo_interesse'
  retention_days integer NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Titulares cadastrados (vincula a auth.users e fornecedores PF)
CREATE TABLE public.data_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  external_email text,                          -- titular não autenticado
  external_cpf text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Registro de consentimento granular
CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject_id uuid NOT NULL REFERENCES public.data_subjects(id) ON DELETE CASCADE,
  purpose text NOT NULL,                        -- 'marketing','cotacao','comunicacao_pedido'
  legal_basis text NOT NULL,
  granted boolean NOT NULL,
  granted_at timestamptz,
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  evidence_hash text,                           -- SHA-256 do payload do consentimento
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Política de retenção por categoria
CREATE TABLE public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.data_categories(id),
  table_name text NOT NULL,                     -- 'cotacoes','pagamentos'
  column_name text NOT NULL,                    -- 'observacoes'
  action text NOT NULL CHECK (action IN ('delete','anonymize')),
  retention_days integer NOT NULL,
  active boolean NOT NULL DEFAULT true
);

-- Solicitações dos titulares (Art. 18)
CREATE TABLE public.dpo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_subject_id uuid REFERENCES public.data_subjects(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN (
    'acesso','retificacao','exclusao','portabilidade',
    'anonimizacao','revogacao_consentimento','informacao_compartilhamento'
  )),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_analise','atendido','rejeitado')),
  description text,
  response text,
  attachments jsonb,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Incidentes de segurança (Art. 48)
CREATE TABLE public.data_breach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at timestamptz NOT NULL,
  reported_to_anpd_at timestamptz,
  severity text NOT NULL CHECK (severity IN ('baixa','media','alta','critica')),
  affected_subjects_count integer,
  data_categories_affected jsonb,
  description text NOT NULL,
  containment_actions text,
  notification_sent boolean DEFAULT false,
  anpd_protocol text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpo_requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_breach_log          ENABLE ROW LEVEL SECURITY;

-- Políticas exemplo (sempre via has_role)
CREATE POLICY "DPO/Admin gerenciam categorias" ON public.data_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dpo'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dpo'));

CREATE POLICY "Titular vê próprios consentimentos" ON public.consent_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.data_subjects ds
            WHERE ds.id = data_subject_id AND ds.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'dpo')
  );

CREATE POLICY "Titular cria solicitação" ON public.dpo_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.data_subjects ds
            WHERE ds.id = data_subject_id AND ds.user_id = auth.uid())
  );
```

### 3.5 Multas potenciais (Art. 52)

- Advertência
- Multa simples — até **2% do faturamento**, limitada a **R$ 50M por infração**
- Multa diária — limite total R$ 50M
- Publicização da infração
- Bloqueio dos dados
- Eliminação dos dados
- Suspensão parcial do banco de dados (até 6 meses)
- Suspensão da atividade de tratamento
- Proibição parcial ou total da atividade

---

## 4. Pilar 2 — NF-e / NFS-e / CT-e / MDF-e

### 4.1 Obrigações principais

| Modelo | Uso | Obrigação |
|---|---|---|
| NF-e (modelo 55)   | Mercadoria — operação interestadual e dentro do estado | Emissão obrigatória para contribuintes do ICMS |
| NFC-e (modelo 65)  | Consumidor final presencial | Não aplicável (compras B2B) |
| NFS-e              | Serviços tomados de PJ | Recebimento e armazenamento |
| CT-e (modelo 57)   | Conhecimento de transporte | Receber dos transportadores |
| MDF-e (modelo 58)  | Manifesto eletrônico de documentos fiscais | Receber em recebimentos consolidados |

Manifestação do destinatário (Ajuste SINIEF 17/2020):
- **Ciência da emissão** — obrigatório > 30 dias após autorização
- **Confirmação da operação** — quando há entrada efetiva
- **Operação não realizada** — quando entrada foi recusada
- **Desconhecimento da operação** — defesa contra fraude

Guarda dos XML por **5 anos** (Art. 195 do CTN + Cláusula décima do Ajuste SINIEF 07/2005).

### 4.2 Estado atual no produto

A página `src/pages/DocumentosFiscais.tsx` (260 linhas) faz upload manual de XML, parse via `DOMParser` e extrai apenas: `nNF`, `serie`, `chNFe`, `dhEmi`, `vNF`, `vProd`, `vFrete`, `vDesc`. A tabela `fiscal_documents` armazena os campos básicos e há um botão "Conciliar" que faz match por valor total contra `pedidos`.

Não há:
- Validação do XML contra schema XSD da SEFAZ
- Verificação da chave de acesso (44 dígitos + DV)
- Consulta de status na SEFAZ
- Manifestação do destinatário (nenhum dos 4 eventos)
- Armazenamento do XML autenticado em bucket
- Suporte a NFS-e, CT-e ou MDF-e
- Contingência (SVC-AN, SVC-RS, EPEC, FS-DA)

### 4.3 Gaps identificados

| Gap | Severidade | Esforço | Penalidade |
|---|---|---|---|
| Validação XSD contra schema SEFAZ           | Alta    | 1 sem  | XML inválido aceito → glosa |
| Consulta de status (cStat) na SEFAZ         | Alta    | 1 sem  | Aceitar NF cancelada |
| Manifestação automática do destinatário     | Crítica | 2 sem  | Suspensão indireta + fraude |
| Bucket `fiscal-xmls` com retenção 5 anos    | Crítica | 1 sem  | Multa por não guarda |
| Recepção de NFS-e (multi-prefeitura)        | Média   | 3 sem  | Glosa ISS |
| Recepção CT-e e MDF-e                       | Média   | 2 sem  | Inconsistência fiscal |
| Painel de contingência                      | Baixa   | 1 sem  | Operação interrompida |

### 4.4 Solução recomendada — Gateway, não motor próprio

Construir motor próprio de NF-e exige homologação por estado, manutenção de schemas XSD que mudam várias vezes por ano e infraestrutura de assinatura digital A1/A3. Recomendação: **integrar gateway certificado**.

| Gateway | Pricing aprox | Vantagens |
|---|---|---|
| Focus NFe          | R$ 0,15-0,40/doc  | API REST limpa, sandbox grátis, suporte BR |
| NFe.io             | R$ 0,10-0,30/doc  | Webhooks robustos, multi-prefeitura NFS-e |
| Migrate / TecnoSpeed | Pacote R$ 500+/mês | Componentes white-label, SDK robusto |
| eNotas             | R$ 0,12/doc       | Foco NFS-e, 5000+ municípios |

Arquitetura proposta:

```
[Produto Promo Supply] → [edge: nfe-gateway] → [Focus NFe] → [SEFAZ]
                                                      ↘ webhook ↗
[bucket fiscal-xmls (5 anos)] ← [edge: fiscal-webhook]
```

### 4.5 DDL sugerida (incremento sobre `fiscal_documents`)

```sql
-- Eventos fiscais (manifestação, cancelamento, carta de correção)
CREATE TABLE public.fiscal_events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_document_id uuid NOT NULL REFERENCES public.fiscal_documents(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'ciencia','confirmacao','desconhecimento','nao_realizada',
    'cancelamento','carta_correcao','manifestacao_recusa'
  )),
  event_status text NOT NULL,                   -- 'pendente','enviado','autorizado','rejeitado'
  protocol_number text,
  response_xml_url text,
  rejection_code text,
  rejection_reason text,
  sent_at timestamptz,
  authorized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Status de contingência por CNPJ emissor
CREATE TABLE public.fiscal_contingency_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj_emissor text NOT NULL,
  uf text NOT NULL,
  contingency_mode text CHECK (contingency_mode IN ('normal','svc_an','svc_rs','epec','fs_da')),
  activated_at timestamptz,
  deactivated_at timestamptz,
  reason text,
  active boolean NOT NULL DEFAULT false,
  UNIQUE (cnpj_emissor, uf)
);

-- Colunas adicionais sugeridas em fiscal_documents
ALTER TABLE public.fiscal_documents
  ADD COLUMN IF NOT EXISTS modelo text DEFAULT '55',         -- 55, 65, 57, 58, NFSE
  ADD COLUMN IF NOT EXISTS cnpj_emissor text,
  ADD COLUMN IF NOT EXISTS uf_emissor text,
  ADD COLUMN IF NOT EXISTS protocolo_autorizacao text,
  ADD COLUMN IF NOT EXISTS data_autorizacao timestamptz,
  ADD COLUMN IF NOT EXISTS situacao_sefaz text,              -- cStat (100, 101, 110...)
  ADD COLUMN IF NOT EXISTS xml_assinado_url text,
  ADD COLUMN IF NOT EXISTS xml_checksum_sha256 text,
  ADD COLUMN IF NOT EXISTS retention_until date GENERATED ALWAYS AS (
    (data_emissao + INTERVAL '5 years 1 month')::date
  ) STORED;

-- Bucket recomendado: 'fiscal-xmls' privado, RLS por CNPJ
-- Política de retenção mínima: 5 anos. Imutabilidade via versionamento.
```

### 4.6 Multas

- Falta de manifestação obrigatória (entes > R$ 100M de receita): glosa de créditos ICMS sobre a operação
- Não guarda do XML por 5 anos: R$ 50 a R$ 500 por documento + presunção de inidoneidade
- Aceitar NF cancelada: tributo cheio + multa de 75% (Art. 44, Lei 9.430/96) + juros Selic

---

## 5. Pilar 3 — SPED (Fiscal e Contribuições)

### 5.1 Obrigações

| Obrigação | Periodicidade | Conteúdo |
|---|---|---|
| EFD ICMS/IPI                  | Mensal | Notas, apuração, inventário, Bloco K |
| EFD Contribuições             | Mensal | PIS/COFINS, créditos, ajustes |
| ECD (Contábil)                | Anual  | Razão, balancete, balanço |
| ECF (Fiscal)                  | Anual  | Apuração IRPJ/CSLL |
| EFD-Reinf (item 6 abaixo)     | Mensal | Retenções federais |

Bloco K (estoque/produção) — obrigatório para indústrias e atacadistas a partir de Receita Bruta acima de limites por porte; exige rastreabilidade de:
- Saldo de estoque por item
- Consumo específico por OP (Ordem de Produção)
- Perdas no processo
- Industrialização por terceiros

### 5.2 Estado atual

Promo Supply é Source-to-Pay puro. **Não tem dicionário fiscal** (NCM, CFOP, CST, alíquotas), **não calcula impostos** (ICMS, ICMS-ST, IPI, PIS/COFINS, DIFAL) e **não gera arquivos no layout SPED**.

### 5.3 Estratégia recomendada — delegar ao ERP fiscal

Construir SPED nativo é projeto de 12+ meses e exige equipe fiscal especializada. A recomendação estratégica é:

1. **Não duplicar SPED** — TOTVS/Senior/Sankhya já fazem isso de forma consolidada
2. **Exportar pedidos e recebimentos** via conector bidirecional (já desenhado em `COMPARATIVO_ERP_BRASILEIROS.md`)
3. **Manter dicionário NCM/CFOP** apenas para enriquecer o pedido antes de enviar ao ERP

Mapeamento mínimo no `produtos` (já existente):

```sql
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS ncm text,                          -- 8 dígitos
  ADD COLUMN IF NOT EXISTS cest text,                         -- 7 dígitos (ICMS-ST)
  ADD COLUMN IF NOT EXISTS cfop_compra_dentro_estado text,    -- '1102'
  ADD COLUMN IF NOT EXISTS cfop_compra_fora_estado text,      -- '2102'
  ADD COLUMN IF NOT EXISTS cst_icms text,                     -- '00','10','60'
  ADD COLUMN IF NOT EXISTS origem_mercadoria text;            -- '0'-'8'
```

### 5.4 Multas SPED

- Atraso na entrega: R$ 500/mês (Lucro Presumido) ou R$ 1.500/mês (Lucro Real), por arquivo
- Apresentação com inexatidões: 0,2% sobre faturamento (Art. 8º, Lei 12.766/2012)
- Glosa de créditos PIS/COFINS quando incompatível com EFD Contribuições

---

## 6. Pilar 4 — EFD-Reinf

### 6.1 Obrigações

EFD-Reinf substituiu a DIRF (extinta a partir de 2024) e centraliza retenções federais. Eventos relevantes para Compras:

| Evento | Conteúdo | Frequência |
|---|---|---|
| R-1000 | Cadastro do contribuinte | Inicial / mudanças |
| R-1070 | Cadastro de processos administrativos/judiciais | Quando aplicável |
| R-2010 | Retenção de contribuição previdenciária — cessão de mão-de-obra | Mensal por NF de serviço |
| R-2020 | Retenção previdenciária — empresas obrigadas (cooperativas etc.) | Mensal |
| R-4010 | Retenções IR — beneficiário PF | Mensal |
| R-4020 | Retenções IR/CSLL/PIS/COFINS — beneficiário PJ | Mensal |
| R-4040 | Pagamentos a beneficiários não identificados | Quando aplicável |
| R-4099 | Fechamento do período | Mensal |
| R-9000 | Exclusão de eventos | Quando necessário |

Prazo de envio: até o dia 15 do mês subsequente.

### 6.2 Estado atual

`pagamentos` (tabela existente) registra valores brutos sem segregar:
- Valor da retenção CSRF (4,65% — PIS/COFINS/CSLL)
- Valor da retenção IR (1,5% serviço genérico, varia por código)
- Valor da retenção INSS (11% sobre cessão de mão-de-obra)

Não há tabela de retenções nem geração de eventos R-2010/R-4020.

### 6.3 Gaps identificados

| Gap | Severidade | Esforço |
|---|---|---|
| Cálculo automático de retenções no pagamento     | Crítica | 2 sem |
| Tabela de códigos de receita por tipo de serviço | Alta    | 1 sem |
| Geração de XML R-2010 / R-4020                   | Crítica | 2 sem |
| Edge function `reinf-submit` (e-CAC + certificado A1) | Crítica | 2 sem |
| Painel de eventos (status, retorno, retransmissão)| Alta   | 1 sem |
| Fechamento mensal R-4099 + R-2099                | Alta    | 1 sem |

### 6.4 DDL sugerida

```sql
-- Tabela de códigos de receita Reinf
CREATE TABLE public.reinf_revenue_codes (
  code text PRIMARY KEY,                        -- '1708','5952','5979'
  description text NOT NULL,
  retention_type text NOT NULL CHECK (retention_type IN ('IRRF','CSRF','INSS','CSLL','PIS','COFINS')),
  default_rate numeric(5,4),                    -- 0.0150 = 1,5%
  active boolean NOT NULL DEFAULT true
);

-- Cálculo de retenções por pagamento
CREATE TABLE public.retentions_calculated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id uuid NOT NULL REFERENCES public.pagamentos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedores(id),
  fiscal_document_id uuid REFERENCES public.fiscal_documents(id),
  revenue_code text NOT NULL REFERENCES public.reinf_revenue_codes(code),
  base_value numeric(14,2) NOT NULL,
  rate numeric(5,4) NOT NULL,
  retention_value numeric(14,2) NOT NULL,
  competence_month date NOT NULL,               -- '2026-04-01'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Eventos Reinf gerados
CREATE TABLE public.reinf_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN (
    'R-1000','R-1070','R-2010','R-2020','R-2099',
    'R-4010','R-4020','R-4040','R-4099','R-9000'
  )),
  competence_month date NOT NULL,
  cnpj_declarante text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente','enviado','processado','rejeitado','retificado'
  )),
  xml_payload text,
  receipt_number text,                          -- número do recibo Reinf
  response_xml text,
  rejection_code text,
  rejection_reason text,
  sent_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON public.retentions_calculated (competence_month, fornecedor_id);
CREATE INDEX ON public.reinf_events (competence_month, status);

ALTER TABLE public.reinf_revenue_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retentions_calculated    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reinf_events             ENABLE ROW LEVEL SECURITY;
```

### 6.5 Multas

- Atraso na entrega: R$ 200/mês (PJ optante Simples) ou R$ 500/mês (demais)
- Omissão de evento: R$ 200 a R$ 1.500 por evento + tributo retido devido + juros Selic + multa de mora 0,33%/dia (até 20%)
- Inexatidão: 3% sobre o valor omitido/incorreto, mínimo R$ 100

---

## 7. Pilar 5 — eSocial (escopo Compras)

### 7.1 Aplicabilidade limitada

eSocial é escopo de RH/Folha. Promo Supply só toca tangencialmente quando:

- Fornecedor é PJ de cessão de mão-de-obra (vigia, limpeza, manutenção contínua)
- Há relação de tomador/prestador que exige evento S-1005 (lotação tributária)
- Contratos com SST (Saúde e Segurança do Trabalho) mencionam eventos S-2210 (CAT) e S-2240 (condições de trabalho)

### 7.2 Recomendação

**Não implementar eSocial no Promo Supply.** Em vez disso:

1. Marcar fornecedor com `tipo_servico = 'cessao_mao_obra'`
2. Expor via API/conector os contratos relevantes para o módulo HCM (Senior, TOTVS RH, Metadados)
3. Garantir que pagamentos com retenção INSS de 11% acionem evento R-2010 do Reinf (item 6)

### 7.3 Gap único relevante

```sql
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS tipo_servico text CHECK (tipo_servico IN (
    'mercadoria','servico_geral','cessao_mao_obra','cooperativa','transporte'
  )),
  ADD COLUMN IF NOT EXISTS lotacao_tributaria text;          -- código eSocial quando aplicável
```

---

## 8. Matriz Consolidada de Compliance

| Pilar | Cobertura atual | Risco | Esforço (sem) | Prioridade | Score (0-100) |
|---|---:|---|---:|---|---:|
| LGPD                  | 30% | Alto    | 6 | P0 | 30 |
| NF-e/NFS-e/CT-e/MDF-e |  5% | Alto    | 8 | P0 |  5 |
| SPED Fiscal           |  0% | Médio   | 0 (delegado) | P2 |  0 |
| EFD-Reinf             |  0% | Médio   | 4 | P1 |  0 |
| eSocial               | 50% | Baixo   | 1 | P3 | 50 |

Ponderação (LGPD 30%, NF-e 30%, SPED 15%, Reinf 15%, eSocial 10%):

```
Score = 0,30·30 + 0,30·5 + 0,15·0 + 0,15·0 + 0,10·50 = 18 / 100
```

---

## 9. Roadmap de Adequação (180 dias)

### Fase 1 (semanas 1-6) — LGPD obrigatório [P0]

Entregáveis:
- Migration: `data_categories`, `data_subjects`, `consent_records`, `data_retention_policies`, `dpo_requests`, `data_breach_log` + RLS
- Página pública `/lgpd/meus-dados` (acesso, retificação, exclusão, portabilidade JSON/CSV) — sem login obrigatório (validação por email + token de 1 uso)
- Componente `<ConsentBanner>` global com 4 finalidades configuráveis
- Edge function `purge-expired-data` (cron diário) — anonimiza/deleta conforme `data_retention_policies`
- Workflow de incidente: `data_breach_log` + edge function `notify-anpd` → email para DPO em < 1h
- Painel administrativo `/admin/lgpd` com SLA de 15 dias para `dpo_requests`
- Política pública de privacidade publicada em `/privacidade`

Critério de aceite:
- Titular consegue baixar JSON com todos os seus dados em < 24h
- Solicitação de exclusão é processada em < 15 dias (SLA legal)
- Incidente registrado dispara notificação interna em < 1h

### Fase 2 (semanas 7-14) — NF-e via gateway [P0]

Entregáveis:
- Conexão com Focus NFe (sandbox primeiro)
- Edge function `nfe-gateway` (POST-only, auth manual) — proxy para emitir/consultar/manifestar
- Webhook `fiscal-webhook` para receber autorizações SEFAZ assíncronas
- Bucket privado `fiscal-xmls` com RLS por CNPJ + retenção 5 anos automática
- Migration: `fiscal_events_log`, `fiscal_contingency_status` + colunas adicionais em `fiscal_documents`
- Job `auto-manifest-nfe` (diário) — emite ciência para NF-e com > 25 dias sem manifestação
- Painel `/fiscal/contingencia` (admin) com toggle de modo
- Suporte mínimo a NFS-e via NFe.io (2 prefeituras piloto: SP e RJ)

Critério de aceite:
- Emissão de NF-e modelo 55 em < 5 segundos no sandbox
- Manifestação automática de 100% das NF-e recebidas com > 25 dias
- XML autenticado armazenado em bucket com checksum SHA-256

### Fase 3 (semanas 15-22) — EFD-Reinf [P1]

Entregáveis:
- Migration: `reinf_revenue_codes`, `retentions_calculated`, `reinf_events`
- Seed dos 30+ códigos de receita mais comuns (1708 IRRF serviços, 5952 CSRF, 5987 CSLL etc.)
- Trigger no `pagamentos`: ao confirmar pagamento de fornecedor PJ com NF de serviço, popular `retentions_calculated`
- Edge function `reinf-build-xml` — monta payload R-2010/R-4020 conforme schema XSD
- Edge function `reinf-submit` — autenticação WS-Security com certificado A1, envio para e-CAC sandbox
- Job mensal `reinf-close-period` — gera R-4099 e R-2099 automaticamente até dia 14
- Painel `/fiscal/reinf` com retransmissão e drill-down de rejeições

Critério de aceite:
- Cálculo automático correto para 95% dos pagamentos a PJ
- Envio mensal completo até dia 14 sem intervenção manual
- Reprocessamento de evento rejeitado em < 2 cliques

### Fase 4 (semanas 23-26) — Integração ERP fiscal [P2]

Entregáveis:
- Conectores `protheus-bridge` e `senior-bridge` (ver `COMPARATIVO_ERP_BRASILEIROS.md`)
- Mapeamento NCM/CFOP/CST por produto (UI assistida + import CSV)
- Sync diário: pedidos aprovados + recebimentos consolidados → ERP fiscal
- Reconciliação reversa: NF-e processada no ERP atualiza `fiscal_documents` no Promo Supply

Critério de aceite:
- 100% dos pedidos finalizados aparecem no ERP fiscal em < 24h
- Conciliação automática 3-way match (PO + recebimento + NF-e) com taxa > 90%

---

## 10. Apêndices

### A. Checklist LGPD (50 itens)

**Princípios e bases legais (Art. 6º, 7º-11)**
1. [ ] Dicionário público de finalidades de tratamento
2. [ ] Base legal documentada para cada finalidade
3. [ ] Política de minimização (não coletar campos não usados)
4. [ ] Revisão anual de finalidades
5. [ ] Mapeamento de dados sensíveis (saúde, biometria, financeiro)

**Direitos do titular (Art. 18)**
6. [ ] Portal `/lgpd/meus-dados` operacional
7. [ ] Confirmação de existência de tratamento (acesso simplificado)
8. [ ] Acesso aos dados em formato legível
9. [ ] Correção de dados incompletos/inexatos
10. [ ] Anonimização ou eliminação
11. [ ] Portabilidade em formato estruturado (JSON/CSV)
12. [ ] Eliminação após término do tratamento
13. [ ] Informação sobre compartilhamento
14. [ ] Revogação de consentimento
15. [ ] Resposta em até 15 dias

**Consentimento (Art. 8º)**
16. [ ] Banner granular por finalidade
17. [ ] Registro de evidência (IP, user-agent, hash)
18. [ ] Mecanismo de revogação igual de fácil
19. [ ] Consentimento de menores via responsável (Art. 14)

**ROPA — Registro de operações (Art. 37)**
20. [ ] Inventário de tratamentos por departamento
21. [ ] Categoria de dados, finalidade, base legal por tratamento
22. [ ] Operadores e suboperadores listados
23. [ ] Transferências internacionais documentadas
24. [ ] Tempo de retenção por tratamento

**RIPD (Art. 38)**
25. [ ] RIPD para tratamento de score de fornecedor
26. [ ] RIPD para qualificação automatizada
27. [ ] RIPD para uso de IA em sugestão de fornecedor
28. [ ] Revisão a cada 12 meses ou em mudança relevante

**Segurança (Art. 46-49)**
29. [ ] Criptografia em trânsito (TLS 1.2+)
30. [ ] Criptografia em repouso (sensíveis)
31. [ ] Controle de acesso baseado em papéis (RBAC)
32. [ ] MFA obrigatório para admin/DPO
33. [ ] Audit trail imutável (audit_logs)
34. [ ] Backup com retenção e teste de restauração
35. [ ] Rotação de credenciais e secrets
36. [ ] Pen-test anual

**Incidentes (Art. 48)**
37. [ ] Procedimento de resposta documentado
38. [ ] SLA interno < 1h para detecção→registro
39. [ ] Notificação à ANPD em até 72h
40. [ ] Comunicação ao titular quando risco relevante
41. [ ] Pós-mortem documentado

**DPO (Art. 41)**
42. [ ] DPO designado e identificado em documento público
43. [ ] Contato do DPO publicado em `/privacidade`
44. [ ] DPO com autonomia e acesso direto à diretoria
45. [ ] Treinamento anual

**Operadores (Art. 39)**
46. [ ] Cláusula contratual com Lovable Cloud (operador)
47. [ ] Cláusulas com Focus NFe / NFe.io
48. [ ] Cláusulas com gateways de pagamento
49. [ ] Mapa de transferências internacionais (servidores fora do Brasil)
50. [ ] DPA (Data Processing Agreement) assinado com cada operador

### B. Layout EFD-Reinf — eventos chave (estrutura resumida)

**R-2010 — Retenção previdenciária (cessão de mão-de-obra)**

```xml
<Reinf xmlns="http://www.reinf.esocial.gov.br/schemas/evtServTom/v2_01_02">
  <evtServTom Id="ID...">
    <ideEvento>
      <indRetif>1</indRetif>             <!-- 1=original, 2=retificação -->
      <perApur>2026-04</perApur>
      <tpAmb>2</tpAmb>                    <!-- 1=produção, 2=homologação -->
      <procEmi>1</procEmi>
      <verProc>promo-supply-1.0</verProc>
    </ideEvento>
    <ideContri>
      <tpInsc>1</tpInsc>                  <!-- 1=CNPJ -->
      <nrInsc>12345678000190</nrInsc>
    </ideContri>
    <ideEstabObra>
      <tpInscEstab>1</tpInscEstab>
      <nrInscEstab>12345678000190</nrInscEstab>
      <ideprestServ>
        <cnpjPrestador>98765432000110</cnpjPrestador>
        <vlrTotalBruto>10000.00</vlrTotalBruto>
        <vlrTotalBaseRet>10000.00</vlrTotalBaseRet>
        <vlrTotalRetPrinc>1100.00</vlrTotalRetPrinc>  <!-- 11% -->
      </ideprestServ>
    </ideEstabObra>
  </evtServTom>
</Reinf>
```

**R-4020 — Retenções IR/CSLL/PIS/COFINS PJ**

Campos principais:
- `cnpjBenef` — CNPJ do fornecedor
- `vlrBaseIR`, `vlrIR` (1,5% serviços genéricos)
- `vlrBaseCSLL`, `vlrCSLL` (1%)
- `vlrBasePIS`, `vlrPIS` (0,65%)
- `vlrBaseCOFINS`, `vlrCOFINS` (3%)
- `codRec` — código de receita (5952 = CSRF agregado, 1708 = IRRF serviços)

**R-4099 — Fechamento de período**

Disparado após todos os R-40xx do mês. Sem fechamento, nenhum R-40xx é processado em produção.

### C. Tabela de multas e bases legais

| Norma | Infração | Multa |
|---|---|---|
| LGPD Art. 52, II        | Multa simples                        | até 2% faturamento, R$ 50M/infração |
| LGPD Art. 52, III       | Multa diária                          | até R$ 50M total |
| LGPD Art. 52 §1º, II    | Atraso > 72h notificação ANPD         | Agravante |
| Lei 9.430/96 Art. 44    | Tributo não retido (NF-e cancelada)   | 75% sobre valor + Selic |
| Decreto 6.022/07 + Lei 12.766/12 Art. 8º | SPED em atraso     | R$ 500-1.500/mês por arquivo |
| Lei 12.766/12 Art. 8º §3º | SPED com inexatidão                | 0,2% do faturamento |
| IN RFB 2.043/21 Art. 7º | Reinf em atraso                       | R$ 200-500/mês |
| IN RFB 2.043/21 Art. 7º | Reinf com omissão                     | R$ 200-1.500 por evento |
| Ajuste SINIEF 07/05     | Não guarda XML 5 anos                 | R$ 50-500/doc + presunção |
| CTN Art. 195            | Não guarda escrituração               | Lançamento de ofício |

### D. Glossário regulatório

- **ANPD** — Autoridade Nacional de Proteção de Dados; órgão fiscalizador da LGPD.
- **Bloco K** — bloco do EFD ICMS/IPI que registra movimentação de estoque e produção.
- **CFOP** — Código Fiscal de Operações e Prestações; identifica natureza da operação.
- **CST** — Código de Situação Tributária; tributação aplicável na NF-e.
- **CSRF** — Contribuição Social Retida na Fonte (PIS+COFINS+CSLL = 4,65%).
- **DIFAL** — Diferencial de Alíquota do ICMS em operação interestadual.
- **DPA** — Data Processing Agreement (acordo entre controlador e operador).
- **DPO** — Data Protection Officer; "Encarregado" na LGPD (Art. 41).
- **e-CAC** — Centro Virtual de Atendimento ao Contribuinte (Receita Federal).
- **EFD** — Escrituração Fiscal Digital (parte do SPED).
- **EPEC** — Evento Prévio de Emissão em Contingência (NF-e).
- **FS-DA** — Formulário de Segurança para Documento Auxiliar (contingência impressa).
- **ICMS-ST** — ICMS Substituição Tributária (recolhido antecipadamente).
- **IRRF** — Imposto de Renda Retido na Fonte.
- **MDF-e** — Manifesto Eletrônico de Documentos Fiscais (modelo 58).
- **NCM** — Nomenclatura Comum do Mercosul (8 dígitos).
- **NF-e** — Nota Fiscal Eletrônica (modelo 55).
- **NFS-e** — Nota Fiscal de Serviços Eletrônica (municipal).
- **RIPD** — Relatório de Impacto à Proteção de Dados Pessoais (Art. 38 LGPD).
- **ROPA** — Records of Processing Activities (Art. 37 LGPD).
- **SEFAZ** — Secretaria da Fazenda Estadual.
- **SPED** — Sistema Público de Escrituração Digital.
- **SVC-AN / SVC-RS** — SEFAZ Virtual de Contingência (Ambiente Nacional / Rio Grande do Sul).

### E. Fluxograma — Incidente LGPD → Notificação ANPD

```
[Detecção (sistema/usuário/parceiro)]
            │
            ▼
[Registro em data_breach_log] ◄── < 1h
            │
            ▼
[Triagem pelo DPO + classificação de severidade]
            │
            ├─ Baixa → Documentar, sem notificação externa
            │
            └─ Média/Alta/Crítica
                        │
                        ▼
            [Contenção técnica] ◄── < 4h
                        │
                        ▼
            [Avaliação de risco aos titulares]
                        │
                        ├─ Sem risco relevante → Documentar
                        │
                        └─ Risco relevante
                                    │
                                    ▼
                        [Notificação ANPD] ◄── < 72h
                        [Comunicação aos titulares afetados]
                                    │
                                    ▼
                        [Pós-mortem + plano de ação]
                                    │
                                    ▼
                        [Atualização de RIPD se aplicável]
```

---

**Documento gerado em 2026-04-21.** Próxima revisão recomendada após cada nova IN da Receita Federal ou nova Resolução da ANPD que afete os pilares acima.
