# 🔍 Análise de Gaps e Melhorias
## Sistema de Compras - Diagnóstico Técnico e Funcional

> **Data da Análise:** Janeiro/2026  
> **Versão:** 1.0  
> **Analista:** Agente de Processos IA

---

## 📋 Sumário Executivo

Após análise detalhada do código-fonte e documentação do Sistema de Compras, foram identificadas:

| Categoria | Quantidade |
|-----------|:----------:|
| Gaps Funcionais | 8 |
| Melhorias de UX | 6 |
| Melhorias de Performance | 4 |
| Oportunidades de Automação | 10 |
| Novas Funcionalidades | 7 |

**Status do Sistema:** ✅ Bem estruturado, com boas práticas implementadas

---

## 1. 🔴 Gaps Funcionais Identificados

### GAP-001: Falta de Transição Automática de Status entre Etapas

**Descrição:**  
Atualmente, quando uma Cotação é aprovada, a Solicitação não muda automaticamente para "Em Andamento". Da mesma forma, quando um Pedido é entregue, a Solicitação não é marcada como "Concluída" automaticamente.

**Impacto:** Médio  
**Esforço:** Baixo  

**Solução Proposta:**
```typescript
// Trigger no banco de dados ou no hook
// Quando cotacao.status = 'aprovada' → solicitacao.status = 'em_andamento'
// Quando pedido.status = 'entregue' → solicitacao.status = 'concluida'
```

---

### GAP-002: Ausência de Vinculação Automática Cotação → Pedido → Pagamento

**Descrição:**  
Não há criação automática de Pagamento quando um Pedido é confirmado como entregue. O usuário precisa criar manualmente.

**Impacto:** Alto  
**Esforço:** Médio  

**Solução Proposta:**
- Ao confirmar recebimento do pedido, perguntar se deseja criar pagamento automaticamente
- Pré-preencher dados do pagamento com base no pedido e cotação

---

### GAP-003: Falta de Validação de Estoque/Budget antes da Aprovação

**Descrição:**  
O sistema não verifica se há orçamento disponível no centro de custo antes de aprovar uma solicitação.

**Impacto:** Alto  
**Esforço:** Alto  

**Solução Proposta:**
- Criar tabela de orçamentos por centro de custo
- Validar saldo disponível antes de permitir aprovação
- Bloquear aprovação se ultrapassar limite

---

### GAP-004: Ausência de Alerta de Cotação Expirando

**Descrição:**  
O campo `validade_proposta` existe na cotação, mas não há alerta automático quando uma cotação está próxima de expirar.

**Impacto:** Alto  
**Esforço:** Baixo  

**Solução Proposta:**
```typescript
// Cron job ou verificação periódica
// Se validade_proposta < hoje + 3 dias → notificar comprador
// Se validade_proposta < hoje → marcar como 'expirada' automaticamente
```

---

### GAP-005: Falta de Histórico de Preços por Produto/Fornecedor

**Descrição:**  
Não há um painel consolidado para visualizar histórico de preços de um produto ao longo do tempo, dificultando análise de variação de preços.

**Impacto:** Médio  
**Esforço:** Médio  

**Solução Proposta:**
- Criar view ou query que agrupe cotações por produto
- Gráfico de evolução de preços
- Comparativo entre fornecedores

---

### GAP-006: Ausência de Recebimento Parcial no Pedido

**Descrição:**  
O status "parcial" existe, mas não há campo para registrar quantidade efetivamente recebida por item.

**Impacto:** Médio  
**Esforço:** Médio  

**Atual:**
```typescript
interface PedidoItem {
  quantidade_recebida: number; // Campo existe mas não tem UI para editar
}
```

**Solução Proposta:**
- Criar modal de confirmação de recebimento com campos por item
- Permitir registrar quantidade recebida vs. quantidade pedida
- Gerar automaticamente novo pedido para saldo pendente

---

### GAP-007: Falta de Relatório de Saving (Economia)

**Descrição:**  
O sistema não calcula automaticamente a economia obtida (diferença entre valor estimado e valor aprovado).

**Impacto:** Alto  
**Esforço:** Baixo  

**Solução Proposta:**
```typescript
// KPI: Saving = Σ(valor_estimado - valor_aprovado) / Σ(valor_estimado) * 100
// Adicionar no dashboard executivo
```

---

### GAP-008: Ausência de Controle de Limite de Crédito do Fornecedor

**Descrição:**  
Não há controle de quanto já está comprometido com cada fornecedor, podendo ultrapassar limites de crédito ou concentração de fornecedor.

**Impacto:** Médio  
**Esforço:** Alto  

**Solução Proposta:**
- Adicionar campo `limite_credito` no cadastro de fornecedor
- Somar pedidos em aberto + pagamentos pendentes
- Alertar quando próximo do limite

---

## 2. 🟡 Melhorias de UX Identificadas

### UX-001: Wizard de Criação de Solicitação

**Situação Atual:** Formulário único com muitos campos  
**Melhoria:** Dividir em steps guiados (1. Dados básicos → 2. Especificações → 3. Valores → 4. Revisão)

---

### UX-002: Preview do Pedido antes de Enviar

**Situação Atual:** Pedido é gerado sem visualização prévia  
**Melhoria:** Mostrar preview em PDF antes de confirmar envio ao fornecedor

---

### UX-003: Atalho para Duplicar Solicitação

**Situação Atual:** Precisa criar do zero  
**Melhoria:** Botão "Duplicar" para criar nova solicitação baseada em uma existente

---

### UX-004: Filtro Salvo como Favorito

**Situação Atual:** Hook `usePersistentFilters` existe mas não há UI para gerenciar favoritos  
**Melhoria:** Permitir salvar combinações de filtros com nome para acesso rápido

---

### UX-005: Status Visual com Timeline

**Situação Atual:** Status mostrado como badge estático  
**Melhoria:** Timeline visual mostrando progresso da solicitação (similar ao tracking de entregas)

---

### UX-006: Modo Offline para Conferência de Recebimento

**Situação Atual:** Hooks `useOfflineFirst` e `useOfflineSync` existem  
**Melhoria:** Implementar tela específica para conferência offline com sincronização posterior

---

## 3. ⚡ Melhorias de Performance

### PERF-001: Implementar Paginação Server-Side

**Situação Atual:** Todos os hooks carregam lista completa  
**Impacto:** Alto em bases com muitos registros  

**Solução:**
```typescript
// Adicionar parâmetros de paginação
const fetchSolicitacoes = async (page: number, pageSize: number) => {
  const { data, count } = await supabase
    .from('solicitacoes')
    .select('*', { count: 'exact' })
    .range((page - 1) * pageSize, page * pageSize - 1);
};
```

---

### PERF-002: Implementar Cache com React Query

**Situação Atual:** Alguns hooks usam React Query, outros não  
**Melhoria:** Padronizar todos os hooks com `@tanstack/react-query` para cache automático

---

### PERF-003: Lazy Loading de Componentes Pesados

**Situação Atual:** Todos os componentes carregados juntos  
**Melhoria:** Usar `React.lazy()` para componentes como gráficos e relatórios

---

### PERF-004: Otimizar Queries com Select Específico

**Situação Atual:** Algumas queries usam `select('*')`  
**Melhoria:** Selecionar apenas campos necessários para cada contexto

---

## 4. 🤖 Oportunidades de Automação

### AUTO-001: Aprovação Automática por Valor
**Gatilho:** Solicitação criada com valor < R$ 1.000  
**Ação:** Aprovar automaticamente + notificar solicitante  
**Status:** ⚠️ Parcialmente implementado no workflow

---

### AUTO-002: Alerta de Cotação Expirando (D-3)
**Gatilho:** Data atual = validade_proposta - 3 dias  
**Ação:** E-mail/Push para comprador responsável  
**Status:** ❌ Não implementado

---

### AUTO-003: Escalonamento de Aprovação por SLA
**Gatilho:** Aprovação pendente > 24h  
**Ação:** Notificar superior + registrar no histórico  
**Status:** ✅ Implementado no `useApprovalWorkflow`

---

### AUTO-004: Criação Automática de Pagamento
**Gatilho:** Pedido com status = 'entregue'  
**Ação:** Criar registro de pagamento com dados pré-preenchidos  
**Status:** ❌ Não implementado

---

### AUTO-005: Atualização de Score do Fornecedor
**Gatilho:** Pedido entregue (prazo e qualidade)  
**Ação:** Recalcular score do fornecedor automaticamente  
**Status:** ⚠️ Score existe mas não é atualizado automaticamente

---

### AUTO-006: Notificação de Pagamento Próximo do Vencimento
**Gatilho:** Data atual = data_vencimento - 3 dias  
**Ação:** E-mail/Push para financeiro  
**Status:** ❌ Não implementado

---

### AUTO-007: Marcação de Pagamento como Atrasado
**Gatilho:** Data atual > data_vencimento AND status != 'pago'  
**Ação:** Mudar status para 'atrasado' + notificar  
**Status:** ❌ Não implementado

---

### AUTO-008: Relatório Automático Semanal
**Gatilho:** Segunda-feira 08:00  
**Ação:** Enviar resumo da semana anterior para gestores  
**Status:** ❌ Não implementado

---

### AUTO-009: Previsão de Recompra com IA
**Gatilho:** Mensal ou sob demanda  
**Ação:** IA analisa histórico e sugere itens para recompra  
**Status:** ✅ Edge Function `ai-demand-prediction` existe

---

### AUTO-010: Follow-up Automático de Cotação
**Gatilho:** 48h sem resposta do fornecedor  
**Ação:** Enviar e-mail de lembrete  
**Status:** ❌ Não implementado

---

## 5. 🚀 Novas Funcionalidades Sugeridas

### FEAT-001: Portal do Fornecedor

**Descrição:** Área externa onde fornecedores podem:
- Visualizar pedidos recebidos
- Atualizar status de entrega
- Enviar notas fiscais
- Responder cotações online

**Benefícios:**
- Reduz comunicação manual
- Agiliza processo de cotação
- Melhora rastreabilidade

**Esforço:** Alto

---

### FEAT-002: Integração com WhatsApp Business

**Descrição:** Notificações e alertas via WhatsApp
- Aprovações pendentes
- Alertas de vencimento
- Confirmação de recebimento

**Benefícios:**
- Maior taxa de leitura
- Resposta mais rápida
- Acessibilidade mobile

**Esforço:** Médio

---

### FEAT-003: Módulo de Licitações

**Descrição:** Gestão de processos licitatórios
- Editais
- Propostas
- Cronograma
- Habilitação

**Benefícios:**
- Atende empresas públicas/mistas
- Compliance com legislação

**Esforço:** Alto

---

### FEAT-004: Catálogo de Produtos com Preço de Referência

**Descrição:** Base de produtos pré-cadastrados com:
- Especificações padronizadas
- Preço médio de mercado
- Fornecedores homologados

**Benefícios:**
- Agiliza criação de solicitações
- Padroniza especificações
- Referência para negociação

**Esforço:** Médio

---

### FEAT-005: Módulo de Contratos Recorrentes

**Descrição:** Gestão de contratos com renovação automática
- Alertas de vencimento
- Reajustes automáticos (IGPM, IPCA)
- Histórico de aditivos

**Benefícios:**
- Evita lapsos contratuais
- Controle de reajustes
- Gestão proativa

**Esforço:** Médio

---

### FEAT-006: Dashboard de Sustentabilidade

**Descrição:** Métricas ESG relacionadas a compras
- Fornecedores locais vs. distantes
- Certificações ambientais
- Diversidade de fornecedores

**Benefícios:**
- Compliance ESG
- Relatórios de sustentabilidade
- Diferencial competitivo

**Esforço:** Médio

---

### FEAT-007: Módulo de Qualificação de Fornecedores

**Descrição:** Processo estruturado de homologação
- Checklist de documentos
- Visitas técnicas
- Avaliação periódica
- Certificações necessárias

**Benefícios:**
- Reduz riscos
- Padroniza critérios
- Histórico de qualificação

**Esforço:** Alto

---

## 6. 📊 Matriz de Priorização

### Critérios:
- **Impacto:** Benefício para o negócio (1-5)
- **Esforço:** Complexidade de implementação (1-5, onde 1 = fácil)
- **Score:** Impacto × (6 - Esforço)

| ID | Descrição | Impacto | Esforço | Score | Prioridade |
|----|-----------|:-------:|:-------:|:-----:|:----------:|
| GAP-004 | Alerta de Cotação Expirando | 5 | 1 | 25 | 🔴 Alta |
| GAP-007 | Relatório de Saving | 5 | 1 | 25 | 🔴 Alta |
| AUTO-002 | Alerta Cotação D-3 | 5 | 1 | 25 | 🔴 Alta |
| AUTO-006 | Alerta Pagamento D-3 | 5 | 1 | 25 | 🔴 Alta |
| AUTO-007 | Marcação Atrasado Auto | 4 | 1 | 20 | 🔴 Alta |
| GAP-001 | Transição Status Auto | 4 | 2 | 16 | 🟡 Média |
| GAP-002 | Vinculação Auto Pag. | 5 | 3 | 15 | 🟡 Média |
| PERF-001 | Paginação Server-Side | 4 | 2 | 16 | 🟡 Média |
| UX-003 | Duplicar Solicitação | 3 | 1 | 15 | 🟡 Média |
| FEAT-002 | WhatsApp Integration | 5 | 3 | 15 | 🟡 Média |
| GAP-005 | Histórico de Preços | 4 | 3 | 12 | 🟢 Baixa |
| FEAT-004 | Catálogo Produtos | 4 | 3 | 12 | 🟢 Baixa |
| GAP-003 | Validação Budget | 5 | 5 | 5 | 🟢 Baixa |
| FEAT-001 | Portal Fornecedor | 5 | 5 | 5 | 🟢 Baixa |

---

## 7. 🎯 Roadmap Sugerido

### Sprint 1-2 (Curto Prazo - Quick Wins)
- [ ] GAP-004: Implementar alerta de cotação expirando
- [ ] GAP-007: Criar KPI de Saving no dashboard
- [ ] AUTO-002: Cron para verificar cotações próximas do vencimento
- [ ] AUTO-006: Cron para alertas de pagamento
- [ ] AUTO-007: Cron para marcar pagamentos atrasados

### Sprint 3-4 (Médio Prazo)
- [ ] GAP-001: Transições automáticas de status
- [ ] GAP-002: Criação automática de pagamento
- [ ] PERF-001: Paginação server-side
- [ ] UX-003: Botão de duplicar solicitação
- [ ] UX-005: Timeline visual de status

### Sprint 5-8 (Longo Prazo)
- [ ] FEAT-002: Integração WhatsApp
- [ ] FEAT-004: Catálogo de produtos
- [ ] GAP-005: Histórico de preços
- [ ] GAP-006: Recebimento parcial por item
- [ ] FEAT-005: Contratos recorrentes

### Backlog (Futuro)
- [ ] FEAT-001: Portal do Fornecedor
- [ ] FEAT-003: Módulo de Licitações
- [ ] FEAT-007: Qualificação de Fornecedores
- [ ] GAP-003: Validação de Budget/Orçamento

---

## 8. 📝 Conclusão

O Sistema de Compras está bem estruturado e já implementa diversas funcionalidades importantes como:

✅ **Pontos Fortes:**
- Workflow de aprovação robusto com delegação e escalonamento
- Sistema de roles bem definido
- Realtime com Supabase
- PWA habilitado
- Funcionalidades de IA integradas
- Auditoria implementada
- Dashboard executivo completo

⚠️ **Pontos de Atenção:**
- Falta de automações básicas (alertas de vencimento)
- Transições de status manuais
- Ausência de métricas de economia (saving)
- Performance pode ser afetada em grande volume

🎯 **Recomendação Principal:**
Priorizar as automações de alertas (cotação expirando, pagamento vencendo) pois são quick wins com alto impacto na operação e baixo esforço de implementação.

---

> **Próxima Revisão:** Após implementação do Sprint 1-2
