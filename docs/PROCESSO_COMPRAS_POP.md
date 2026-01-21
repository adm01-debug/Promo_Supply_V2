# 📦 Procedimento Operacional Padrão (POP)
## Sistema de Compras - Fluxo Completo

> **Versão:** 1.0  
> **Data:** Janeiro/2026  
> **Elaborado por:** Agente de Processos IA  
> **Aprovado por:** [Aguardando aprovação]

---

## 📋 Sumário

1. [Objetivo](#1-objetivo)
2. [Escopo](#2-escopo)
3. [Definições](#3-definições)
4. [Responsabilidades](#4-responsabilidades)
5. [Visão Geral do Processo](#5-visão-geral-do-processo)
6. [Fluxo Detalhado](#6-fluxo-detalhado)
7. [Regras de Negócio](#7-regras-de-negócio)
8. [POPs por Etapa](#8-pops-por-etapa)
9. [SLAs e KPIs](#9-slas-e-kpis)
10. [Pontos de Atenção e Riscos](#10-pontos-de-atenção-e-riscos)
11. [Oportunidades de Automação](#11-oportunidades-de-automação)
12. [Anexos](#12-anexos)

---

## 1. Objetivo

Estabelecer o procedimento padrão para execução do processo de compras da empresa, garantindo:
- Padronização das etapas
- Rastreabilidade das operações
- Controle de custos e prazos
- Conformidade com políticas internas
- Auditabilidade de todas as transações

---

## 2. Escopo

Este procedimento aplica-se a todas as aquisições de:
- **Materiais** (insumos, matéria-prima, material de escritório)
- **Serviços** (terceirizados, consultorias, manutenção)
- **Equipamentos** (máquinas, tecnologia, mobiliário)
- **Compras Urgentes** (demandas emergenciais)
- **Contratos** (acordos de longo prazo com fornecedores)

---

## 3. Definições

| Termo | Definição |
|-------|-----------|
| **Solicitação** | Requisição formal de compra gerada por um departamento |
| **Cotação** | Proposta comercial recebida de um fornecedor |
| **Pedido (OC)** | Ordem de Compra emitida após aprovação da cotação |
| **Pagamento** | Liquidação financeira do pedido entregue |
| **SLA** | Service Level Agreement - Acordo de Nível de Serviço |
| **Lead Time** | Tempo total do processo (da solicitação à entrega) |

---

## 4. Responsabilidades

### 4.1 Matriz RACI

| Atividade | Admin | Coordenador | Comprador | Financeiro |
|-----------|:-----:|:-----------:|:---------:|:----------:|
| Criar Solicitação | C | C | R | I |
| Aprovar Solicitação | A | R | I | I |
| Solicitar Cotações | I | C | R | - |
| Analisar Cotações | I | A | R | - |
| Aprovar Cotação | A | R | I | I |
| Emitir Pedido | I | A | R | I |
| Acompanhar Entrega | I | C | R | - |
| Confirmar Recebimento | I | C | R | - |
| Aprovar Pagamento | A | - | I | R |
| Efetuar Pagamento | I | - | - | R |

> **R** = Responsável | **A** = Aprovador | **C** = Consultado | **I** = Informado

### 4.2 Perfis do Sistema

| Perfil | Descrição | Acessos |
|--------|-----------|---------|
| **Admin** | Administrador do sistema | Acesso total + configurações |
| **Coordinator** | Coordenador de compras | Aprovações + gestão de equipe |
| **Buyer** | Comprador | Execução operacional |
| **Finance** | Financeiro | Pagamentos + relatórios financeiros |

---

## 5. Visão Geral do Processo

### 5.1 Macrofluxo (BPMN Textual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROCESSO DE COMPRAS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │SOLICITAÇÃO│───▶│ COTAÇÃO  │───▶│  PEDIDO  │───▶│PAGAMENTO │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│       │               │               │               │                     │
│       ▼               ▼               ▼               ▼                     │
│  [pendente]      [pendente]      [pendente]     [pendente]                 │
│  [em_cotacao]    [analisando]    [aprovado]     [aprovado]                 │
│  [aprovada]      [aprovada]      [enviado]      [agendado]                 │
│  [rejeitada]     [rejeitada]     [em_transito]  [pago]                     │
│  [em_andamento]  [expirada]      [entregue]     [atrasado]                 │
│  [concluida]                     [parcial]      [parcial]                  │
│  [cancelada]                     [cancelado]    [cancelado]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Tempo Médio do Processo (Target)

| Etapa | SLA Normal | SLA Urgente |
|-------|:----------:|:-----------:|
| Solicitação → Aprovação | 24h | 4h |
| Aprovação → Cotações | 48h | 8h |
| Análise de Cotações | 24h | 4h |
| Emissão do Pedido | 4h | 1h |
| Pedido → Entrega | Conforme fornecedor | Express |
| Entrega → Pagamento | Conforme condição | Conforme condição |

**Lead Time Total (médio):** 7-15 dias úteis

---

## 6. Fluxo Detalhado

### 6.1 Etapa 1: SOLICITAÇÃO

```
┌─────────────────────────────────────────────────────────────────┐
│ INÍCIO: Necessidade de compra identificada                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 1: Solicitante cria requisição no sistema                │
│ • Preencher: título, descrição, tipo, quantidade                │
│ • Informar: data necessidade, valor estimado, justificativa     │
│ • Anexar: especificações técnicas (se aplicável)                │
│ Sistema: Gera número sequencial (SOL-XXXX)                      │
│ Status: PENDENTE                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GATEWAY: Valor estimado > R$ 5.000?                             │
├──────────────────────┬──────────────────────────────────────────┤
│ SIM                  │ NÃO                                      │
│ → Aprovação Coord.   │ → Aprovação automática                   │
└──────────────────────┴──────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 2: Coordenador/Sistema aprova solicitação                │
│ Status: APROVADA ou REJEITADA                                   │
│ • Se aprovada: Status muda para EM_COTACAO                      │
│ • Se rejeitada: Notificar solicitante + motivo                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [Segue para COTAÇÃO]
```

**Entradas:**
- Demanda/necessidade identificada
- Especificações do item/serviço
- Orçamento disponível

**Saídas:**
- Solicitação registrada (SOL-XXXX)
- Notificação para Compras

**Documentos:**
- Formulário de Solicitação (sistema)
- Anexos técnicos (se aplicável)

---

### 6.2 Etapa 2: COTAÇÃO

```
┌─────────────────────────────────────────────────────────────────┐
│ INÍCIO: Solicitação aprovada (status: EM_COTACAO)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 1: Comprador identifica fornecedores                     │
│ • Consultar cadastro de fornecedores ativos                     │
│ • Utilizar IA para sugestões (ai-supplier-suggestion)           │
│ • Mínimo: 3 cotações para valores > R$ 1.000                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 2: Solicitar cotações aos fornecedores                   │
│ • Enviar especificações                                         │
│ • Definir prazo para resposta                                   │
│ • Registrar contato no sistema                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 3: Registrar cotações recebidas                          │
│ • Cadastrar: valor unitário, quantidade, frete, desconto        │
│ • Informar: prazo entrega, validade, condição pagamento         │
│ Sistema: Gera número (COT-XXXX) + calcula score automático      │
│ Status: PENDENTE → ANALISANDO                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 4: Analisar e comparar cotações                          │
│ • Utilizar comparador de preços                                 │
│ • Verificar scores (preço, prazo, qualidade)                    │
│ • Considerar histórico do fornecedor                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GATEWAY: Melhor cotação identificada?                           │
├──────────────────────┬──────────────────────────────────────────┤
│ SIM                  │ NÃO                                      │
│ → Selecionar         │ → Solicitar novas cotações               │
└──────────────────────┴──────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 5: Selecionar cotação vencedora                          │
│ • Marcar cotação como SELECIONADA                               │
│ • Status cotação: APROVADA                                      │
│ • Demais cotações: REJEITADA                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [Segue para PEDIDO]
```

**Entradas:**
- Solicitação aprovada
- Cadastro de fornecedores
- Especificações técnicas

**Saídas:**
- Cotações registradas (COT-XXXX)
- Cotação vencedora selecionada
- Quadro comparativo

**Documentos:**
- Propostas comerciais dos fornecedores
- Planilha comparativa
- Justificativa de escolha

---

### 6.3 Etapa 3: PEDIDO

```
┌─────────────────────────────────────────────────────────────────┐
│ INÍCIO: Cotação selecionada/aprovada                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 1: Emitir Ordem de Compra                                │
│ • Vincular: solicitação + cotação + fornecedor                  │
│ • Confirmar: valores, quantidades, prazos                       │
│ • Definir: endereço entrega, condição pagamento                 │
│ Sistema: Gera número (PED-XXXX)                                 │
│ Status: PENDENTE                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GATEWAY: Valor do pedido > R$ 10.000?                           │
├──────────────────────┬──────────────────────────────────────────┤
│ SIM                  │ NÃO                                      │
│ → Aprovação Coord.   │ → Aprovação automática                   │
└──────────────────────┴──────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 2: Aprovar e enviar pedido ao fornecedor                 │
│ Status: PENDENTE → APROVADO → ENVIADO                           │
│ • Enviar OC por e-mail/sistema                                  │
│ • Solicitar confirmação de recebimento                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 3: Acompanhar status da entrega                          │
│ • Registrar código de rastreamento (se houver)                  │
│ • Atualizar status: EM_TRANSITO                                 │
│ • Monitorar prazo de entrega                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 4: Confirmar recebimento                                 │
│ • Verificar: quantidade, qualidade, conformidade                │
│ • Registrar: data entrega real                                  │
│ Status: ENTREGUE ou PARCIAL                                     │
│ • Atualizar solicitação: CONCLUIDA                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [Segue para PAGAMENTO]
```

**Entradas:**
- Cotação aprovada
- Dados do fornecedor
- Endereço de entrega

**Saídas:**
- Ordem de Compra (PED-XXXX)
- Confirmação de entrega
- Atualização de estoque (se aplicável)

**Documentos:**
- Ordem de Compra (PDF)
- Comprovante de entrega
- Nota fiscal do fornecedor

---

### 6.4 Etapa 4: PAGAMENTO

```
┌─────────────────────────────────────────────────────────────────┐
│ INÍCIO: Pedido entregue e confirmado                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 1: Registrar pagamento                                   │
│ • Vincular: pedido + fornecedor                                 │
│ • Informar: valor, vencimento, forma pagamento                  │
│ • Anexar: nota fiscal (número + chave)                          │
│ Sistema: Gera número (PAG-XXXX)                                 │
│ Status: PENDENTE                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ GATEWAY: Valor > R$ 5.000?                                      │
├──────────────────────┬──────────────────────────────────────────┤
│ SIM                  │ NÃO                                      │
│ → Aprovação Gerente  │ → Aprovação Financeiro                   │
└──────────────────────┴──────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 2: Aprovar pagamento                                     │
│ • Verificar: NF confere com pedido                              │
│ • Confirmar: entrega realizada                                  │
│ Status: PENDENTE → APROVADO                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 3: Agendar/Efetuar pagamento                             │
│ • Verificar data de vencimento                                  │
│ • Processar pagamento conforme forma escolhida                  │
│ Status: APROVADO → AGENDADO → PAGO                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TAREFA 4: Registrar comprovante                                 │
│ • Anexar comprovante de pagamento                               │
│ • Registrar data efetiva do pagamento                           │
│ • Atualizar status para PAGO                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FIM: Processo de compra concluído                               │
│ • Registrar em auditoria                                        │
│ • Atualizar métricas/KPIs                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Entradas:**
- Pedido entregue
- Nota fiscal do fornecedor
- Aprovação de recebimento

**Saídas:**
- Pagamento registrado (PAG-XXXX)
- Comprovante de pagamento
- Registro de auditoria

**Documentos:**
- Nota Fiscal
- Comprovante de pagamento
- Relatório de conciliação

---

## 7. Regras de Negócio

### 7.1 Regras de Aprovação

| Faixa de Valor | Aprovador Solicitação | Aprovador Pedido | Aprovador Pagamento |
|----------------|:---------------------:|:----------------:|:-------------------:|
| Até R$ 1.000 | Automático | Automático | Financeiro |
| R$ 1.001 - R$ 5.000 | Automático | Comprador Sênior | Financeiro |
| R$ 5.001 - R$ 10.000 | Coordenador | Coordenador | Coordenador |
| R$ 10.001 - R$ 50.000 | Coordenador | Gerente | Gerente |
| Acima de R$ 50.000 | Diretoria | Diretoria | Diretoria |

### 7.2 Regras de Cotação

- **Obrigatório 3 cotações** para compras acima de R$ 1.000
- **Obrigatório 5 cotações** para compras acima de R$ 10.000
- Cotação com menor preço **NÃO** é automaticamente a vencedora (considerar score total)
- Validade mínima da cotação: 15 dias
- Fornecedores inativos não podem participar de cotações

### 7.3 Regras de Pagamento

- Pagamento somente após confirmação de entrega
- Antecipação de pagamento requer aprovação de Diretoria
- Pagamentos atrasados geram alerta automático ao Financeiro
- Notas fiscais devem ser validadas antes do pagamento

### 7.4 Regras de Urgência

| Prioridade | Descrição | SLA Reduzido |
|------------|-----------|:------------:|
| **Baixa** | Planejável, sem impacto imediato | Padrão |
| **Média** | Importante, prazo definido | -20% |
| **Alta** | Urgente, impacta operação | -50% |
| **Urgente** | Crítico, parada de produção | -80% |

---

## 8. POPs por Etapa

### 8.1 POP-001: Criar Nova Solicitação

**Objetivo:** Registrar corretamente uma requisição de compra

**Passos:**

1. Acessar o sistema → Menu "Solicitações"
2. Clicar em "+ Nova Solicitação"
3. Preencher campos obrigatórios:
   - [ ] Título (descritivo e objetivo)
   - [ ] Tipo (material/serviço/equipamento/urgente/contrato)
   - [ ] Quantidade e unidade
   - [ ] Data de necessidade
   - [ ] Valor estimado
   - [ ] Justificativa
4. Preencher campos opcionais (quando aplicável):
   - [ ] Categoria
   - [ ] Centro de custo
   - [ ] Departamento
   - [ ] Observações
   - [ ] Anexos técnicos
5. Revisar informações
6. Clicar em "Salvar"
7. Verificar número gerado (SOL-XXXX)

**Tempo estimado:** 5-10 minutos

---

### 8.2 POP-002: Registrar Cotação

**Objetivo:** Cadastrar proposta comercial recebida de fornecedor

**Passos:**

1. Localizar a solicitação (em status "Em Cotação")
2. Clicar em "Adicionar Cotação"
3. Selecionar o fornecedor (ou cadastrar novo)
4. Preencher dados da proposta:
   - [ ] Valor unitário
   - [ ] Quantidade
   - [ ] Valor do frete
   - [ ] Desconto (se houver)
   - [ ] Prazo de entrega (dias)
   - [ ] Validade da proposta
   - [ ] Condição de pagamento
5. Anexar proposta comercial (PDF)
6. Adicionar observações relevantes
7. Clicar em "Salvar Cotação"
8. Sistema calcula score automaticamente

**Tempo estimado:** 5-8 minutos por cotação

---

### 8.3 POP-003: Analisar e Selecionar Cotação

**Objetivo:** Escolher a melhor proposta com critérios objetivos

**Passos:**

1. Acessar "Comparador de Cotações"
2. Verificar ranking automático (score total)
3. Analisar critérios individuais:
   - [ ] Score Preço (peso: 40%)
   - [ ] Score Prazo (peso: 30%)
   - [ ] Score Qualidade/Histórico (peso: 30%)
4. Verificar histórico do fornecedor:
   - [ ] Entregas no prazo
   - [ ] Qualidade anterior
   - [ ] Ocorrências registradas
5. Consultar IA de risco (se disponível)
6. Documentar justificativa da escolha
7. Clicar em "Selecionar Fornecedor"
8. Confirmar seleção

**Tempo estimado:** 15-30 minutos

---

### 8.4 POP-004: Emitir Ordem de Compra

**Objetivo:** Formalizar a compra junto ao fornecedor

**Passos:**

1. A partir da cotação aprovada, clicar "Gerar Pedido"
2. Confirmar dados pré-preenchidos:
   - [ ] Fornecedor
   - [ ] Valores
   - [ ] Quantidades
3. Complementar informações:
   - [ ] Endereço de entrega
   - [ ] Condição de pagamento
   - [ ] Observações para o fornecedor
4. Adicionar itens detalhados (se necessário)
5. Revisar todas as informações
6. Clicar em "Emitir Pedido"
7. Aguardar aprovação (se necessário)
8. Enviar OC ao fornecedor
9. Registrar confirmação de recebimento

**Tempo estimado:** 10-15 minutos

---

### 8.5 POP-005: Confirmar Recebimento

**Objetivo:** Registrar a entrega do pedido

**Passos:**

1. Localizar o pedido (status "Em Trânsito" ou "Enviado")
2. Na chegada do material:
   - [ ] Conferir quantidade recebida
   - [ ] Verificar qualidade/integridade
   - [ ] Comparar com especificações do pedido
   - [ ] Verificar nota fiscal
3. Se conforme:
   - Atualizar status para "Entregue"
   - Registrar data de entrega real
4. Se parcial:
   - Atualizar status para "Parcial"
   - Registrar quantidade recebida
   - Abrir ocorrência para saldo
5. Se com problema:
   - Registrar não conformidade
   - Notificar Comprador responsável
   - Abrir tratativa com fornecedor

**Tempo estimado:** 10-20 minutos

---

### 8.6 POP-006: Processar Pagamento

**Objetivo:** Efetuar o pagamento ao fornecedor

**Passos:**

1. Verificar pedido com status "Entregue"
2. Criar novo pagamento vinculado ao pedido
3. Preencher dados:
   - [ ] Valor da nota fiscal
   - [ ] Data de vencimento
   - [ ] Forma de pagamento
   - [ ] Número da NF
   - [ ] Chave da NF (se eletrônica)
4. Anexar nota fiscal digitalizada
5. Solicitar aprovação (conforme alçada)
6. Após aprovação:
   - [ ] Verificar saldo disponível
   - [ ] Processar pagamento
   - [ ] Anexar comprovante
7. Atualizar status para "Pago"
8. Arquivar documentação

**Tempo estimado:** 10-15 minutos

---

## 9. SLAs e KPIs

### 9.1 SLAs por Etapa

| Etapa | SLA Warning | SLA Crítico | Meta |
|-------|:-----------:|:-----------:|:----:|
| Solicitação pendente | 8h | 24h | < 4h |
| Solicitação → Cotação | 24h | 48h | < 12h |
| Tempo para coletar cotações | 48h | 72h | < 24h |
| Análise de cotações | 12h | 24h | < 8h |
| Emissão do pedido | 4h | 8h | < 2h |
| Pagamento após entrega | 48h | 72h | < 24h |

### 9.2 KPIs do Processo

| KPI | Fórmula | Meta | Frequência |
|-----|---------|:----:|:----------:|
| **Lead Time Médio** | Média(Data Entrega - Data Solicitação) | < 10 dias | Mensal |
| **% Entregas no Prazo** | (Entregas no prazo / Total entregas) × 100 | > 95% | Mensal |
| **% Cotações Vencidas** | (Cotações expiradas / Total cotações) × 100 | < 5% | Mensal |
| **Saving Rate** | ((Valor estimado - Valor aprovado) / Valor estimado) × 100 | > 10% | Mensal |
| **Fornecedores Ativos** | Contagem de fornecedores com pedidos no período | - | Mensal |
| **Ticket Médio** | Soma valores / Quantidade de pedidos | - | Mensal |
| **% Pagamentos em Dia** | (Pagamentos até vencimento / Total) × 100 | > 98% | Mensal |
| **Tempo Médio Cotação** | Média de dias para obter 3 cotações | < 3 dias | Mensal |

### 9.3 Indicadores de Qualidade

| Indicador | Descrição | Meta |
|-----------|-----------|:----:|
| **NPS Fornecedores** | Satisfação dos fornecedores com o processo | > 8 |
| **% Não Conformidades** | Entregas com problemas / Total entregas | < 3% |
| **% Retrabalho** | Solicitações devolvidas / Total solicitações | < 5% |
| **Aderência ao SLA** | Etapas dentro do SLA / Total etapas | > 90% |

---

## 10. Pontos de Atenção e Riscos

### 10.1 Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|:-------------:|:-------:|-----------|
| Cotação expira antes da aprovação | Média | Alto | Alerta automático 3 dias antes |
| Fornecedor atrasa entrega | Alta | Alto | Monitoramento de SLA + penalidades contratuais |
| Pagamento em atraso | Média | Médio | Alerta D-3 para financeiro |
| Solicitação sem aprovação travada | Média | Médio | Escalonamento automático após SLA |
| Erro no valor/quantidade do pedido | Baixa | Alto | Validação dupla antes de enviar |
| Fornecedor único (dependência) | Média | Alto | Política de múltiplos fornecedores |

### 10.2 Pontos de Gargalo Comuns

1. **Aprovação de Solicitação**
   - Causa: Aprovadores sobrecarregados
   - Solução: Escalonamento automático + delegação

2. **Coleta de Cotações**
   - Causa: Fornecedores demoram para responder
   - Solução: SLA para fornecedores + follow-up automático

3. **Análise de Cotações**
   - Causa: Falta de critérios objetivos
   - Solução: Score automático + comparador visual

4. **Confirmação de Recebimento**
   - Causa: Responsável não registra no sistema
   - Solução: Notificação push + cobrança automática

5. **Aprovação de Pagamento**
   - Causa: Documentação incompleta
   - Solução: Checklist obrigatório antes de submeter

---

## 11. Oportunidades de Automação

### 11.1 Automações Recomendadas

| # | Automação | Gatilho | Ação | Prioridade |
|---|-----------|---------|------|:----------:|
| 1 | Aprovação automática | Solicitação < R$ 1.000 | Aprovar + notificar | Alta |
| 2 | Alerta de cotação expirando | D-3 do vencimento | E-mail/push para comprador | Alta |
| 3 | Escalonamento de aprovação | SLA excedido | Notificar superior | Alta |
| 4 | Alerta de pagamento | D-3 do vencimento | E-mail para financeiro | Alta |
| 5 | Follow-up de cotação | 48h sem resposta | E-mail para fornecedor | Média |
| 6 | Atualização de status | Rastreio atualizado | Mudar para "Em Trânsito" | Média |
| 7 | Relatório diário | 08:00 todo dia | Dashboard executivo | Média |
| 8 | Previsão de demanda | Mensal | Sugestão IA de reposição | Baixa |

### 11.2 Integrações Sugeridas

| Sistema | Integração | Benefício |
|---------|------------|-----------|
| **ERP** | Sincronização de estoque | Atualização automática após recebimento |
| **WhatsApp** | Notificações | Alertas em tempo real |
| **E-mail** | Envio de OC/cotações | Comunicação automatizada |
| **Bancos** | Pagamentos | Conciliação automática |
| **Correios/Transportadoras** | Rastreamento | Status de entrega em tempo real |

---

## 12. Anexos

### 12.1 Checklist de Solicitação

- [ ] Título claro e objetivo
- [ ] Tipo correto selecionado
- [ ] Quantidade e unidade informados
- [ ] Data de necessidade realista
- [ ] Valor estimado baseado em referências
- [ ] Justificativa adequada
- [ ] Anexos técnicos (quando necessário)

### 12.2 Checklist de Cotação

- [ ] Fornecedor ativo no cadastro
- [ ] Valor unitário correto
- [ ] Frete incluído ou discriminado
- [ ] Prazo de entrega em dias úteis
- [ ] Validade mínima de 15 dias
- [ ] Condição de pagamento clara
- [ ] Proposta comercial anexada

### 12.3 Checklist de Pedido

- [ ] Dados do fornecedor conferidos
- [ ] Valores batem com cotação
- [ ] Endereço de entrega correto
- [ ] Condição de pagamento confirmada
- [ ] Itens detalhados e corretos
- [ ] Observações necessárias incluídas

### 12.4 Checklist de Recebimento

- [ ] Quantidade confere com pedido
- [ ] Qualidade/integridade OK
- [ ] Embalagem adequada
- [ ] Nota fiscal presente e correta
- [ ] Prazo de entrega respeitado
- [ ] Documentação completa

### 12.5 Checklist de Pagamento

- [ ] Pedido com status "Entregue"
- [ ] Nota fiscal conferida
- [ ] Valores corretos
- [ ] Vencimento verificado
- [ ] Aprovações necessárias obtidas
- [ ] Comprovante anexado após pagamento

---

## Controle de Versões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | Jan/2026 | Agente IA | Versão inicial |

---

> **Próxima revisão programada:** Julho/2026
