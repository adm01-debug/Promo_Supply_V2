# 📊 KPIs, SLAs e Métricas Gerenciais
## Sistema de Compras - Indicadores de Desempenho

> **Versão:** 1.0  
> **Data:** Janeiro/2026  
> **Objetivo:** Padronizar métricas e metas do processo de compras

---

## 📋 Índice

1. [Visão Geral dos KPIs](#1-visão-geral-dos-kpis)
2. [KPIs Operacionais](#2-kpis-operacionais)
3. [KPIs Financeiros](#3-kpis-financeiros)
4. [KPIs de Fornecedores](#4-kpis-de-fornecedores)
5. [KPIs de Equipe](#5-kpis-de-equipe)
6. [SLAs por Processo](#6-slas-por-processo)
7. [Dashboard Gerencial](#7-dashboard-gerencial)
8. [Queries SQL](#8-queries-sql)

---

## 1. Visão Geral dos KPIs

### 1.1 Matriz de KPIs

| Perspectiva | KPIs | Responsável |
|-------------|------|-------------|
| **Operacional** | Lead Time, Volume, SLA | Coordenador |
| **Financeira** | Saving, Custo, ROI | Financeiro |
| **Fornecedores** | Pontualidade, Qualidade, Preço | Comprador |
| **Equipe** | Produtividade, Carga | Coordenador |

### 1.2 Frequência de Medição

| Frequência | KPIs |
|------------|------|
| **Diário** | Solicitações pendentes, Pagamentos vencendo |
| **Semanal** | Lead time, Volume processado, Alertas SLA |
| **Mensal** | Saving, Custo total, Performance fornecedores |
| **Trimestral** | ROI, Tendências, Comparativo anual |

---

## 2. KPIs Operacionais

### 2.1 Lead Time Médio do Processo

**Definição:** Tempo médio desde a criação da solicitação até a conclusão (entrega)

**Fórmula:**
```
Lead Time = Média(data_conclusao - data_criacao)

Onde:
- data_conclusao = data em que pedido foi marcado como "entregue"
- data_criacao = data de criação da solicitação
```

**Meta:** ≤ 10 dias úteis

**Segmentações:**
| Tipo | Meta |
|------|:----:|
| Material padrão | 7 dias |
| Serviço | 15 dias |
| Equipamento | 30 dias |
| Urgente | 3 dias |

---

### 2.2 Volume de Solicitações

**Definição:** Quantidade de solicitações processadas no período

**Métricas:**
| Métrica | Fórmula |
|---------|---------|
| Total criadas | COUNT(solicitacoes) WHERE created_at no período |
| Total concluídas | COUNT(solicitacoes) WHERE status = 'concluida' |
| Taxa conclusão | (Concluídas / Criadas) × 100 |
| Em backlog | COUNT WHERE status IN ('pendente', 'em_cotacao', 'em_andamento') |

**Meta:** Taxa de conclusão ≥ 85% no mês

---

### 2.3 Taxa de Aderência ao SLA

**Definição:** Percentual de etapas concluídas dentro do prazo acordado

**Fórmula:**
```
Aderência SLA = (Etapas no prazo / Total de etapas) × 100
```

**Meta:** ≥ 90%

**Detalhamento por etapa:**
| Etapa | SLA | Medição |
|-------|-----|---------|
| Aprovação solicitação | 24h | tempo_aprovacao - tempo_criacao |
| Coleta cotações | 48h | primeira_cotacao - aprovacao |
| Análise cotações | 24h | selecao - primeira_cotacao |
| Emissão pedido | 4h | pedido_criado - cotacao_aprovada |
| Aprovação pagamento | 24h | aprovacao_pag - pedido_entregue |

---

### 2.4 Taxa de Retrabalho

**Definição:** Percentual de solicitações que voltaram de status (ex: aprovada → pendente)

**Fórmula:**
```
Retrabalho = (Solicitações com regressão / Total) × 100
```

**Meta:** ≤ 5%

**Causas comuns a monitorar:**
- Especificação incompleta
- Cotação rejeitada após análise
- Pedido devolvido
- Problema na entrega

---

### 2.5 Taxa de Cancelamento

**Definição:** Percentual de solicitações canceladas

**Fórmula:**
```
Cancelamento = (Solicitações canceladas / Total criadas) × 100
```

**Meta:** ≤ 3%

---

## 3. KPIs Financeiros

### 3.1 Saving Rate (Taxa de Economia) 🌟

**Definição:** Economia obtida pela negociação de compras

**Fórmula:**
```
Saving Rate = ((Valor Estimado - Valor Aprovado) / Valor Estimado) × 100

Saving Absoluto = Σ(valor_estimado - valor_aprovado)
```

**Meta:** ≥ 10%

**Exemplo:**
| Solicitação | Valor Estimado | Valor Aprovado | Saving |
|-------------|:--------------:|:--------------:|:------:|
| SOL-001 | R$ 10.000 | R$ 8.500 | 15% |
| SOL-002 | R$ 5.000 | R$ 4.800 | 4% |
| SOL-003 | R$ 15.000 | R$ 12.000 | 20% |
| **Total** | **R$ 30.000** | **R$ 25.300** | **15.7%** |

---

### 3.2 Cost Avoidance (Custos Evitados)

**Definição:** Valor economizado por evitar compras desnecessárias ou encontrar alternativas

**Exemplos:**
- Consolidação de pedidos
- Renegociação de contratos
- Substituição por produto equivalente mais barato
- Cancelamento de compras desnecessárias

**Fórmula:**
```
Cost Avoidance = Σ(valor_original - valor_final) em casos de renegociação/substituição
```

---

### 3.3 Custo Total de Aquisição (TCO)

**Definição:** Custo completo de uma compra, incluindo indiretos

**Fórmula:**
```
TCO = Preço do Produto 
    + Frete 
    + Impostos 
    + Custos de Armazenagem 
    + Custos Administrativos do Processo
```

**Custo administrativo estimado por pedido:** R$ 50-150 (dependendo da complexidade)

---

### 3.4 Custo Médio por Pedido

**Fórmula:**
```
Ticket Médio = Σ(valor_total_pedidos) / COUNT(pedidos)
```

**Segmentação recomendada:**
- Por categoria
- Por fornecedor
- Por departamento solicitante

---

### 3.5 Concentração de Fornecedores

**Definição:** Percentual do volume de compras concentrado nos maiores fornecedores

**Fórmula:**
```
Concentração Top 5 = (Valor Top 5 fornecedores / Valor Total) × 100
```

**Meta ideal:** 40-60% (evitar dependência excessiva)

**Risco:**
- > 70%: Alta concentração (risco de dependência)
- < 30%: Pulverização excessiva (dificulta negociação)

---

### 3.6 Aging de Pagamentos

**Definição:** Distribuição dos pagamentos por tempo de vencimento

| Faixa | Status | Ação |
|-------|--------|------|
| A vencer (> 7 dias) | 🟢 Normal | Monitorar |
| Vence em 3-7 dias | 🟡 Atenção | Preparar pagamento |
| Vence em 1-3 dias | 🟠 Urgente | Aprovar e agendar |
| Vence hoje | 🔴 Crítico | Pagar imediatamente |
| Vencido | ⚫ Atrasado | Justificar e regularizar |

---

## 4. KPIs de Fornecedores

### 4.1 Score de Fornecedor (Composto)

**Fórmula:**
```
Score Total = (Score Preço × 0.4) + (Score Prazo × 0.3) + (Score Qualidade × 0.3)
```

| Componente | Cálculo | Peso |
|------------|---------|:----:|
| Score Preço | Menor preço / Preço fornecedor × 100 | 40% |
| Score Prazo | Entregas no prazo / Total entregas × 100 | 30% |
| Score Qualidade | Entregas sem defeito / Total × 100 | 30% |

**Classificação:**
| Score | Classificação | Ação |
|:-----:|---------------|------|
| 90-100 | ⭐ Excelente | Fornecedor preferencial |
| 70-89 | ✅ Bom | Manter |
| 50-69 | ⚠️ Regular | Desenvolver/Monitorar |
| < 50 | ❌ Ruim | Descontinuar |

---

### 4.2 OTIF - On Time In Full

**Definição:** Entregas no prazo E completas

**Fórmula:**
```
OTIF = (Pedidos entregues no prazo E quantidade correta / Total pedidos) × 100
```

**Meta:** ≥ 95%

---

### 4.3 Taxa de Defeitos/Devoluções

**Fórmula:**
```
Taxa Defeitos = (Pedidos com não conformidade / Total pedidos) × 100
```

**Meta:** ≤ 2%

---

### 4.4 Tempo Médio de Resposta a Cotações

**Fórmula:**
```
Tempo Resposta = Média(data_cotacao_recebida - data_solicitacao_cotacao)
```

**Meta:** ≤ 48h

---

### 4.5 Variação de Preço

**Fórmula:**
```
Variação = ((Preço atual - Preço anterior) / Preço anterior) × 100
```

**Alerta:** Variação > 10% requer justificativa

---

## 5. KPIs de Equipe

### 5.1 Produtividade do Comprador

**Fórmula:**
```
Produtividade = Pedidos emitidos / Comprador / Mês
```

**Benchmark:**
| Complexidade | Meta/mês |
|--------------|:--------:|
| Alta (equipamentos, serviços complexos) | 15-20 |
| Média (materiais técnicos) | 30-40 |
| Baixa (materiais padrão) | 50-70 |

---

### 5.2 Carga de Trabalho

**Métricas:**
```
Solicitações em andamento por comprador
Valor em negociação por comprador
Pedidos pendentes de acompanhamento
```

**Alerta:** > 30 solicitações ativas = sobrecarga

---

### 5.3 Tempo de Resposta

**Fórmula:**
```
Tempo Resposta = Média(primeira_acao_comprador - criacao_solicitacao)
```

**Meta:** ≤ 4h úteis

---

### 5.4 Taxa de Aprovação de Cotações

**Fórmula:**
```
Taxa Aprovação = (Cotações aprovadas / Total cotações analisadas) × 100
```

**Benchmark:** 70-85%
- Muito baixo (< 60%): Critérios muito rígidos ou fornecedores inadequados
- Muito alto (> 90%): Pouca análise crítica

---

## 6. SLAs por Processo

### 6.1 Matriz de SLAs

| Processo | SLA Normal | SLA Urgente | Warning | Crítico |
|----------|:----------:|:-----------:|:-------:|:-------:|
| Aprovação Solicitação | 24h | 4h | 8h | 24h |
| Coleta de Cotações | 72h | 24h | 48h | 72h |
| Análise de Cotações | 24h | 8h | 16h | 24h |
| Aprovação de Cotação | 24h | 4h | 8h | 24h |
| Emissão de Pedido | 8h | 2h | 4h | 8h |
| Aprovação de Pagamento | 48h | 24h | 24h | 48h |
| Processamento Pagamento | 24h | 8h | 12h | 24h |

### 6.2 Escalonamento Automático

```
┌────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE ESCALONAMENTO                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [0-50% SLA] ─── Normal ─── Responsável direto                │
│                                                                │
│  [50-75% SLA] ── Warning ── Notifica responsável              │
│                                                                │
│  [75-100% SLA] ─ Alerta ─── Notifica + Coordenador            │
│                                                                │
│  [> 100% SLA] ── Crítico ── Notifica + Gerente/Diretoria      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Dashboard Gerencial

### 7.1 Visão Executiva (C-Level)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD EXECUTIVO                          │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│   SAVING    │  LEAD TIME  │    OTIF     │    COMPLIANCE       │
│   12.5%     │   8.3 dias  │    94%      │      92%            │
│   ▲ 2.1%    │   ▼ 0.5 dia │   ▲ 1%     │      ▼ 1%           │
├─────────────┴─────────────┴─────────────┴─────────────────────┤
│                                                                 │
│  [Gráfico: Saving mensal - últimos 12 meses]                   │
│                                                                 │
│  [Gráfico: Volume de compras por categoria]                    │
│                                                                 │
│  [Tabela: Top 10 fornecedores por valor]                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Visão Operacional (Coordenador)

```
┌─────────────────────────────────────────────────────────────────┐
│                   DASHBOARD OPERACIONAL                         │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│  PENDENTES  │  EM COTAÇÃO │  EM PEDIDO  │   PAGAMENTOS        │
│     23      │     15      │     8       │      12             │
│   🔴 5 SLA  │   🟡 3 SLA  │   ✅ OK     │   🔴 2 atrasados    │
├─────────────┴─────────────┴─────────────┴─────────────────────┤
│                                                                 │
│  [Lista: Itens urgentes (prioridade alta/urgente)]             │
│                                                                 │
│  [Lista: SLA em risco (> 75% do tempo)]                        │
│                                                                 │
│  [Gráfico: Distribuição por status]                            │
│                                                                 │
│  [Tabela: Performance por comprador]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Visão Financeira

```
┌─────────────────────────────────────────────────────────────────┐
│                   DASHBOARD FINANCEIRO                          │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│ A PAGAR     │  PAGO MÊS   │  ATRASADO   │   SAVING            │
│ R$ 125.000  │  R$ 450.000 │  R$ 8.500   │   R$ 52.000         │
│  18 títulos │  45 títulos │  3 títulos  │   11.5%             │
├─────────────┴─────────────┴─────────────┴─────────────────────┤
│                                                                 │
│  [Gráfico: Aging de pagamentos]                                │
│                                                                 │
│  [Gráfico: Fluxo de caixa projetado (próximos 30 dias)]        │
│                                                                 │
│  [Tabela: Pagamentos vencendo esta semana]                     │
│                                                                 │
│  [Gráfico: Evolução mensal de gastos]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Queries SQL

### 8.1 KPI: Lead Time Médio

```sql
SELECT 
  AVG(
    EXTRACT(DAY FROM (
      COALESCE(p.data_entrega, NOW()) - s.created_at
    ))
  ) as lead_time_medio_dias,
  
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(DAY FROM (p.data_entrega - s.created_at))
  ) as mediana_lead_time

FROM solicitacoes s
LEFT JOIN pedidos p ON p.solicitacao_id = s.id
WHERE s.status = 'concluida'
  AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE);
```

### 8.2 KPI: Saving Rate

```sql
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  SUM(valor_estimado) as total_estimado,
  SUM(valor_aprovado) as total_aprovado,
  SUM(valor_estimado) - SUM(valor_aprovado) as saving_absoluto,
  ROUND(
    ((SUM(valor_estimado) - SUM(valor_aprovado)) / NULLIF(SUM(valor_estimado), 0)) * 100, 
    2
  ) as saving_percentual

FROM solicitacoes
WHERE valor_estimado > 0 
  AND valor_aprovado > 0
  AND status = 'concluida'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;
```

### 8.3 KPI: OTIF por Fornecedor

```sql
SELECT 
  f.razao_social,
  COUNT(p.id) as total_pedidos,
  
  COUNT(CASE WHEN p.data_entrega <= p.data_previsao THEN 1 END) as entregas_prazo,
  ROUND(
    COUNT(CASE WHEN p.data_entrega <= p.data_previsao THEN 1 END)::numeric / 
    NULLIF(COUNT(p.id), 0) * 100, 
    2
  ) as taxa_pontualidade,
  
  COUNT(CASE WHEN p.status = 'entregue' THEN 1 END) as entregas_completas,
  
  ROUND(
    COUNT(CASE WHEN p.data_entrega <= p.data_previsao AND p.status = 'entregue' THEN 1 END)::numeric / 
    NULLIF(COUNT(p.id), 0) * 100, 
    2
  ) as otif

FROM fornecedores f
LEFT JOIN pedidos p ON p.fornecedor_id = f.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY f.id, f.razao_social
HAVING COUNT(p.id) >= 3
ORDER BY otif DESC;
```

### 8.4 KPI: Produtividade por Comprador

```sql
SELECT 
  pr.full_name as comprador,
  COUNT(p.id) as pedidos_emitidos,
  SUM(p.valor_total) as valor_total,
  AVG(p.valor_total) as ticket_medio,
  
  COUNT(CASE WHEN s.prioridade = 'urgente' THEN 1 END) as pedidos_urgentes,
  
  AVG(
    EXTRACT(HOUR FROM (p.created_at - c.updated_at))
  ) as tempo_medio_emissao_horas

FROM pedidos p
JOIN profiles pr ON pr.id = p.comprador_id
JOIN cotacoes c ON c.id = p.cotacao_id
JOIN solicitacoes s ON s.id = p.solicitacao_id
WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY pr.id, pr.full_name
ORDER BY pedidos_emitidos DESC;
```

### 8.5 KPI: Aging de Pagamentos

```sql
SELECT 
  CASE 
    WHEN data_vencimento > CURRENT_DATE + INTERVAL '7 days' THEN 'A vencer (> 7 dias)'
    WHEN data_vencimento > CURRENT_DATE + INTERVAL '3 days' THEN 'Vence em 3-7 dias'
    WHEN data_vencimento > CURRENT_DATE THEN 'Vence em 1-3 dias'
    WHEN data_vencimento = CURRENT_DATE THEN 'Vence hoje'
    ELSE 'Vencido'
  END as faixa,
  
  COUNT(*) as quantidade,
  SUM(valor - COALESCE(valor_pago, 0)) as valor_pendente

FROM pagamentos
WHERE status NOT IN ('pago', 'cancelado')
GROUP BY 
  CASE 
    WHEN data_vencimento > CURRENT_DATE + INTERVAL '7 days' THEN 'A vencer (> 7 dias)'
    WHEN data_vencimento > CURRENT_DATE + INTERVAL '3 days' THEN 'Vence em 3-7 dias'
    WHEN data_vencimento > CURRENT_DATE THEN 'Vence em 1-3 dias'
    WHEN data_vencimento = CURRENT_DATE THEN 'Vence hoje'
    ELSE 'Vencido'
  END
ORDER BY 
  CASE 
    WHEN data_vencimento > CURRENT_DATE + INTERVAL '7 days' THEN 5
    WHEN data_vencimento > CURRENT_DATE + INTERVAL '3 days' THEN 4
    WHEN data_vencimento > CURRENT_DATE THEN 3
    WHEN data_vencimento = CURRENT_DATE THEN 2
    ELSE 1
  END;
```

### 8.6 KPI: Concentração de Fornecedores

```sql
WITH totais AS (
  SELECT SUM(valor_total) as valor_geral
  FROM pedidos
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
),
por_fornecedor AS (
  SELECT 
    f.razao_social,
    SUM(p.valor_total) as valor_fornecedor,
    ROW_NUMBER() OVER (ORDER BY SUM(p.valor_total) DESC) as ranking
  FROM pedidos p
  JOIN fornecedores f ON f.id = p.fornecedor_id
  WHERE p.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '3 months'
  GROUP BY f.id, f.razao_social
)
SELECT 
  pf.razao_social,
  pf.valor_fornecedor,
  ROUND((pf.valor_fornecedor / t.valor_geral) * 100, 2) as percentual,
  SUM(pf2.valor_fornecedor) / t.valor_geral * 100 as percentual_acumulado
FROM por_fornecedor pf
CROSS JOIN totais t
JOIN por_fornecedor pf2 ON pf2.ranking <= pf.ranking
WHERE pf.ranking <= 10
GROUP BY pf.razao_social, pf.valor_fornecedor, pf.ranking, t.valor_geral
ORDER BY pf.ranking;
```

---

## 📝 Checklist de Implementação

- [ ] Criar views/functions no banco para cada KPI
- [ ] Implementar cards de KPI no dashboard
- [ ] Configurar metas por período
- [ ] Criar alertas automáticos para desvios
- [ ] Gerar relatórios semanais/mensais automáticos
- [ ] Treinar equipe na interpretação dos indicadores

---

> **Revisão:** Trimestral (ajustar metas conforme evolução)
