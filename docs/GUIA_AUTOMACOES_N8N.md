# 🤖 Guia de Automações
## Sistema de Compras - Implementação com n8n e Supabase

> **Versão:** 1.0  
> **Data:** Janeiro/2026  
> **Ferramentas:** n8n, Supabase, WhatsApp API

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura de Automações](#2-arquitetura-de-automações)
3. [Automações Implementadas](#3-automações-implementadas)
4. [Workflows n8n](#4-workflows-n8n)
5. [Configuração de Webhooks](#5-configuração-de-webhooks)
6. [Templates de Notificação](#6-templates-de-notificação)
7. [Monitoramento](#7-monitoramento)

---

## 1. Visão Geral

### 1.1 Objetivo
Automatizar processos repetitivos e críticos do Sistema de Compras, eliminando dependência de ações manuais e garantindo que alertas importantes sejam entregues no momento certo.

### 1.2 Ferramentas Utilizadas

| Ferramenta | Função |
|------------|--------|
| **n8n** | Orquestrador de automações |
| **Supabase** | Banco de dados + API |
| **WhatsApp Business API** | Notificações via mensagem |
| **SMTP** | Notificações por e-mail |
| **Cron** | Agendamento de tarefas |

### 1.3 Mapa de Automações

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMAÇÕES DO SISTEMA                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  CRON JOBS  │    │  WEBHOOKS   │    │  TRIGGERS   │        │
│  │  (Diários)  │    │ (Real-time) │    │  (Eventos)  │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                  │                │
│         ▼                  ▼                  ▼                │
│  ┌─────────────────────────────────────────────────────┐      │
│  │                      n8n                             │      │
│  │  - Processamento de regras                          │      │
│  │  - Transformação de dados                           │      │
│  │  - Roteamento de notificações                       │      │
│  └──────────────────────┬──────────────────────────────┘      │
│                         │                                      │
│         ┌───────────────┼───────────────┐                     │
│         ▼               ▼               ▼                     │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐               │
│  │  E-MAIL   │   │ WHATSAPP  │   │  SISTEMA  │               │
│  │           │   │           │   │  (Update) │               │
│  └───────────┘   └───────────┘   └───────────┘               │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura de Automações

### 2.1 Tipos de Gatilhos

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **Cron** | Execução agendada | Verificar cotações expirando às 08:00 |
| **Webhook** | Chamada HTTP externa | Quando pedido é criado no ERP |
| **Database Trigger** | Mudança no banco | Quando status do pedido muda |
| **Manual** | Acionado pelo usuário | Reprocessar notificações pendentes |

### 2.2 Fluxo de Dados

```
[Evento] → [n8n Workflow] → [Processamento] → [Ação]
                                  │
                                  ├── Validar regras
                                  ├── Buscar dados complementares
                                  ├── Formatar mensagem
                                  └── Escolher canal de notificação
```

---

## 3. Automações Implementadas

### 3.1 Lista de Automações

| ID | Nome | Gatilho | Ação | Status |
|----|------|---------|------|:------:|
| AUTO-001 | Aprovação Automática | Solicitação < R$ 1.000 | Aprovar + notificar | ⏳ |
| AUTO-002 | Alerta Cotação D-3 | Cron 08:00 | WhatsApp/E-mail | ⏳ |
| AUTO-003 | Cotação Expirada | Cron 00:01 | Update status | ⏳ |
| AUTO-004 | Pagamento D-3 | Cron 08:00 | WhatsApp/E-mail | ⏳ |
| AUTO-005 | Pagamento Atrasado | Cron 00:01 | Update + alerta | ⏳ |
| AUTO-006 | Pedido Entregue | DB Trigger | Criar pagamento | ⏳ |
| AUTO-007 | Escalonamento SLA | Cron cada 1h | Notificar superior | ⏳ |
| AUTO-008 | Relatório Semanal | Cron Seg 08:00 | E-mail gestores | ⏳ |
| AUTO-009 | Score Fornecedor | Pedido entregue | Recalcular score | ⏳ |
| AUTO-010 | Follow-up Cotação | 48h sem resposta | E-mail fornecedor | ⏳ |

---

## 4. Workflows n8n

### 4.1 AUTO-002: Alerta de Cotação Expirando (D-3)

**Gatilho:** Cron - Diariamente às 08:00

```json
{
  "name": "Alerta Cotacao Expirando",
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{ "hour": 8, "minute": 0 }]
        }
      }
    },
    {
      "name": "Buscar Cotacoes",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "tableId": "cotacoes",
        "filters": {
          "conditions": [
            { "column": "status", "operator": "eq", "value": "pendente" },
            { "column": "validade_proposta", "operator": "lte", "value": "{{ $today.plus(3, 'days').toISO() }}" },
            { "column": "validade_proposta", "operator": "gt", "value": "{{ $today.toISO() }}" }
          ]
        }
      }
    },
    {
      "name": "Buscar Dados Solicitacao",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "get",
        "tableId": "solicitacoes",
        "lookupColumn": "id",
        "lookupValue": "={{ $json.solicitacao_id }}"
      }
    },
    {
      "name": "Buscar Comprador",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "get",
        "tableId": "profiles",
        "lookupColumn": "id",
        "lookupValue": "={{ $json.comprador_id }}"
      }
    },
    {
      "name": "Calcular Dias Restantes",
      "type": "n8n-nodes-base.set",
      "parameters": {
        "values": {
          "string": [
            {
              "name": "dias_restantes",
              "value": "={{ Math.ceil(($json.validade_proposta - Date.now()) / (1000 * 60 * 60 * 24)) }}"
            }
          ]
        }
      }
    },
    {
      "name": "Enviar WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://api.whatsapp.com/v1/messages",
        "body": {
          "to": "={{ $json.comprador_telefone }}",
          "template": "cotacao_expirando",
          "parameters": [
            "={{ $json.cotacao_numero }}",
            "={{ $json.fornecedor_nome }}",
            "={{ $json.dias_restantes }}"
          ]
        }
      }
    },
    {
      "name": "Enviar Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "={{ $json.comprador_email }}",
        "subject": "⚠️ Cotação {{ $json.cotacao_numero }} expira em {{ $json.dias_restantes }} dias",
        "text": "Ver template abaixo"
      }
    },
    {
      "name": "Registrar Notificacao",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "tableId": "notifications",
        "data": {
          "user_id": "={{ $json.comprador_id }}",
          "title": "Cotação expirando",
          "message": "A cotação {{ $json.cotacao_numero }} expira em {{ $json.dias_restantes }} dias",
          "type": "warning"
        }
      }
    }
  ]
}
```

---

### 4.2 AUTO-003: Marcar Cotação como Expirada

**Gatilho:** Cron - Diariamente às 00:01

```json
{
  "name": "Marcar Cotacoes Expiradas",
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{ "hour": 0, "minute": 1 }]
        }
      }
    },
    {
      "name": "Atualizar Status",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "tableId": "cotacoes",
        "filters": {
          "conditions": [
            { "column": "status", "operator": "eq", "value": "pendente" },
            { "column": "validade_proposta", "operator": "lt", "value": "{{ $today.toISO() }}" }
          ]
        },
        "data": {
          "status": "expirada"
        }
      }
    },
    {
      "name": "Registrar Log",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "tableId": "audit_logs",
        "data": {
          "action": "auto_expire",
          "entity_type": "cotacao",
          "details": "Cotações expiradas automaticamente"
        }
      }
    }
  ]
}
```

---

### 4.3 AUTO-004: Alerta de Pagamento Vencendo (D-3)

**Gatilho:** Cron - Diariamente às 08:00

```json
{
  "name": "Alerta Pagamento Vencendo",
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{ "hour": 8, "minute": 0 }]
        }
      }
    },
    {
      "name": "Buscar Pagamentos",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "tableId": "pagamentos",
        "filters": {
          "conditions": [
            { "column": "status", "operator": "in", "value": ["pendente", "aprovado", "agendado"] },
            { "column": "data_vencimento", "operator": "lte", "value": "{{ $today.plus(3, 'days').format('yyyy-MM-dd') }}" },
            { "column": "data_vencimento", "operator": "gte", "value": "{{ $today.format('yyyy-MM-dd') }}" }
          ]
        }
      }
    },
    {
      "name": "Agrupar por Urgencia",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "code": "const items = $input.all();\nconst today = new Date();\n\nreturn items.map(item => {\n  const venc = new Date(item.json.data_vencimento);\n  const diff = Math.ceil((venc - today) / (1000 * 60 * 60 * 24));\n  \n  let urgencia = 'normal';\n  if (diff <= 1) urgencia = 'critico';\n  else if (diff <= 3) urgencia = 'alerta';\n  \n  return { json: { ...item.json, dias_restantes: diff, urgencia } };\n});"
      }
    },
    {
      "name": "Buscar Usuarios Financeiro",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "tableId": "user_roles",
        "filters": {
          "conditions": [
            { "column": "role", "operator": "eq", "value": "finance" }
          ]
        }
      }
    },
    {
      "name": "Enviar Notificacoes",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "={{ $json.email }}",
        "subject": "💰 {{ $json.urgencia === 'critico' ? '🔴 URGENTE: ' : '' }}Pagamentos próximos do vencimento",
        "html": "Ver template"
      }
    }
  ]
}
```

---

### 4.4 AUTO-005: Marcar Pagamentos Atrasados

**Gatilho:** Cron - Diariamente às 00:01

```json
{
  "name": "Marcar Pagamentos Atrasados",
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{ "hour": 0, "minute": 1 }]
        }
      }
    },
    {
      "name": "Buscar Pagamentos Vencidos",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "tableId": "pagamentos",
        "filters": {
          "conditions": [
            { "column": "status", "operator": "in", "value": ["pendente", "aprovado", "agendado"] },
            { "column": "data_vencimento", "operator": "lt", "value": "{{ $today.format('yyyy-MM-dd') }}" }
          ]
        }
      }
    },
    {
      "name": "Atualizar para Atrasado",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "tableId": "pagamentos",
        "filters": {
          "conditions": [
            { "column": "id", "operator": "in", "value": "={{ $json.map(p => p.id) }}" }
          ]
        },
        "data": {
          "status": "atrasado"
        }
      }
    },
    {
      "name": "Notificar Gestores",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "gestao@empresa.com",
        "subject": "🔴 ALERTA: {{ $json.length }} pagamento(s) atrasado(s)",
        "html": "Lista de pagamentos atrasados..."
      }
    },
    {
      "name": "Registrar Audit Log",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "insert",
        "tableId": "audit_logs",
        "data": {
          "action": "auto_overdue",
          "entity_type": "pagamento",
          "details": "{{ $json.length }} pagamentos marcados como atrasados"
        }
      }
    }
  ]
}
```

---

### 4.5 AUTO-007: Escalonamento por SLA

**Gatilho:** Cron - A cada 1 hora

```json
{
  "name": "Escalonamento SLA",
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{ "mode": "everyHour" }]
        }
      }
    },
    {
      "name": "Buscar Solicitacoes Pendentes",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "getAll",
        "tableId": "solicitacoes",
        "filters": {
          "conditions": [
            { "column": "status", "operator": "eq", "value": "pendente" },
            { "column": "created_at", "operator": "lt", "value": "{{ $today.minus(24, 'hours').toISO() }}" }
          ]
        }
      }
    },
    {
      "name": "Verificar Prioridade",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "rules": [
          { "output": 0, "conditions": [{ "value1": "={{ $json.prioridade }}", "value2": "urgente" }] },
          { "output": 1, "conditions": [{ "value1": "={{ $json.prioridade }}", "value2": "alta" }] },
          { "output": 2 }
        ]
      }
    },
    {
      "name": "Notificar Diretoria",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "diretoria@empresa.com",
        "subject": "🚨 ESCALONAMENTO: Solicitação urgente aguardando há mais de 24h"
      }
    },
    {
      "name": "Notificar Coordenador",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "coordenador@empresa.com",
        "subject": "⚠️ ESCALONAMENTO: Solicitação de alta prioridade aguardando aprovação"
      }
    }
  ]
}
```

---

### 4.6 AUTO-008: Relatório Semanal Automático

**Gatilho:** Cron - Segunda-feira às 08:00

```json
{
  "name": "Relatorio Semanal",
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{ "hour": 8, "minute": 0, "weekday": 1 }]
        }
      }
    },
    {
      "name": "Buscar Metricas Semana",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "custom",
        "query": "SELECT\n  COUNT(*) as total_solicitacoes,\n  COUNT(*) FILTER (WHERE status = 'concluida') as concluidas,\n  SUM(valor_estimado) as valor_total,\n  AVG(EXTRACT(DAY FROM (updated_at - created_at))) as lead_time_medio\nFROM solicitacoes\nWHERE created_at >= NOW() - INTERVAL '7 days'"
      }
    },
    {
      "name": "Buscar KPIs Fornecedores",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "custom",
        "query": "SELECT\n  f.razao_social,\n  COUNT(p.id) as pedidos,\n  SUM(p.valor_total) as valor_total,\n  AVG(CASE WHEN p.data_entrega <= p.data_previsao THEN 1 ELSE 0 END) * 100 as taxa_pontualidade\nFROM fornecedores f\nJOIN pedidos p ON p.fornecedor_id = f.id\nWHERE p.created_at >= NOW() - INTERVAL '7 days'\nGROUP BY f.id\nORDER BY valor_total DESC\nLIMIT 10"
      }
    },
    {
      "name": "Gerar HTML Report",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "code": "// Gerar HTML do relatório com os dados coletados\nconst metricas = $input.first().json;\n// ... código para gerar HTML"
      }
    },
    {
      "name": "Enviar para Gestores",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "gestao@empresa.com,diretoria@empresa.com",
        "subject": "📊 Relatório Semanal de Compras - {{ $today.minus(7, 'days').format('dd/MM') }} a {{ $today.format('dd/MM') }}",
        "html": "={{ $json.html_report }}"
      }
    }
  ]
}
```

---

## 5. Configuração de Webhooks

### 5.1 Webhook: Pedido Entregue → Criar Pagamento

**Endpoint:** `POST /webhooks/pedido-entregue`

```javascript
// Supabase Edge Function
Deno.serve(async (req) => {
  const { pedido_id, data_entrega } = await req.json();
  
  // Buscar dados do pedido
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('*, fornecedor:fornecedores(*)')
    .eq('id', pedido_id)
    .single();
  
  // Criar pagamento automaticamente
  const { data: pagamento } = await supabase
    .from('pagamentos')
    .insert({
      pedido_id: pedido.id,
      fornecedor_id: pedido.fornecedor_id,
      valor: pedido.valor_total,
      data_vencimento: calcularVencimento(pedido.condicao_pagamento),
      status: 'pendente'
    })
    .select()
    .single();
  
  // Notificar financeiro
  await notifyFinance(pagamento);
  
  return new Response(JSON.stringify({ success: true, pagamento_id: pagamento.id }));
});
```

### 5.2 Database Trigger: Status do Pedido

```sql
-- Trigger para notificar n8n quando pedido muda de status
CREATE OR REPLACE FUNCTION notify_pedido_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM net.http_post(
      url := 'https://n8n.seudominio.com/webhook/pedido-status',
      body := json_build_object(
        'pedido_id', NEW.id,
        'status_anterior', OLD.status,
        'status_novo', NEW.status,
        'updated_at', NEW.updated_at
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedido_status_change
AFTER UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION notify_pedido_status_change();
```

---

## 6. Templates de Notificação

### 6.1 E-mail: Cotação Expirando

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
    .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .btn { background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
    .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Cotação Expirando</h1>
    </div>
    <div class="content">
      <p>Olá, <strong>{{comprador_nome}}</strong></p>
      
      <div class="alert">
        <strong>A cotação abaixo expira em {{dias_restantes}} dia(s)!</strong>
      </div>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Cotação:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{cotacao_numero}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Fornecedor:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{fornecedor_nome}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Valor:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">R$ {{valor_total}}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Validade:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">{{validade_proposta}}</td>
        </tr>
      </table>
      
      <p style="margin-top: 20px;">
        <a href="{{sistema_url}}/cotacao?id={{cotacao_id}}" class="btn">
          Ver Cotação no Sistema
        </a>
      </p>
    </div>
    <div class="footer">
      Sistema de Compras - Notificação Automática
    </div>
  </div>
</body>
</html>
```

### 6.2 WhatsApp: Template Cotação Expirando

```
Nome do Template: cotacao_expirando
Categoria: UTILITY

Mensagem:
⚠️ *Cotação Expirando*

A cotação *{{1}}* do fornecedor *{{2}}* expira em *{{3}} dia(s)*.

Acesse o sistema para tomar uma ação.

[Ver no Sistema]
```

### 6.3 WhatsApp: Template Pagamento Vencendo

```
Nome do Template: pagamento_vencendo
Categoria: UTILITY

Mensagem:
💰 *Pagamento Próximo do Vencimento*

O pagamento *{{1}}* para *{{2}}* no valor de *R$ {{3}}* vence em *{{4}} dia(s)* ({{5}}).

[Ver Pagamentos]
```

---

## 7. Monitoramento

### 7.1 Dashboard de Automações

| Métrica | Descrição | Alerta |
|---------|-----------|--------|
| Execuções/dia | Total de workflows executados | < 10 = verificar |
| Taxa de sucesso | % de execuções sem erro | < 95% = investigar |
| Tempo médio | Tempo de execução dos workflows | > 30s = otimizar |
| Notificações enviadas | E-mails + WhatsApp | Comparar com período anterior |
| Erros | Lista de falhas | > 5/dia = ação imediata |

### 7.2 Logs e Auditoria

Todas as automações devem registrar:
- Data/hora de execução
- Quantidade de registros processados
- Notificações enviadas
- Erros encontrados

```sql
-- Tabela de log de automações
CREATE TABLE automation_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workflow_name VARCHAR(100) NOT NULL,
  execution_time TIMESTAMP DEFAULT NOW(),
  records_processed INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  execution_duration_ms INTEGER
);
```

### 7.3 Alertas de Falha

Configurar no n8n:
- Notificar equipe de TI se workflow falhar 3x consecutivas
- E-mail de resumo diário com status das automações
- Webhook para sistema de monitoramento (Datadog, etc.)

---

## 📝 Checklist de Implementação

- [ ] Configurar n8n (self-hosted ou cloud)
- [ ] Criar conexão com Supabase
- [ ] Configurar SMTP para e-mails
- [ ] Configurar WhatsApp Business API
- [ ] Importar workflows do template
- [ ] Testar cada automação individualmente
- [ ] Configurar monitoramento
- [ ] Documentar credenciais (seguro)
- [ ] Treinar equipe de manutenção

---

> **Próxima revisão:** Após implementação dos workflows
