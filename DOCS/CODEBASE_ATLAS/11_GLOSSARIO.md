# 11. Glossário

## Domínio de procurement

| Termo | Definição |
|---|---|
| **Solicitação** (`solicitacoes`) | Pedido interno de compra criado por um requisitante, antes de virar pedido formal. Passa por workflow de aprovação. |
| **Cotação** (`cotacoes`) | Proposta de preço enviada por um fornecedor para uma solicitação. Várias cotações competem; uma é marcada como vencedora. |
| **Pedido de Compra / PO** (`pedidos`) | Documento formal enviado ao fornecedor vencedor. Tem máquina de estados (rascunho → enviado → confirmado → entregue → cancelado). |
| **Recebimento** (`receiving_checklists`) | Checklist do que chegou fisicamente vs. o que foi pedido. |
| **Three-Way Match** | Validação PO × Nota Fiscal × Recebimento antes de liberar pagamento. Bloqueia divergências. |
| **Pagamento** (`pagamentos`) | Liquidação financeira do pedido; gera lançamentos em `payment_history` e realiza o gasto no orçamento. |
| **Devolução / RMA** (`devolucoes`) | Retorno de mercadoria; gera crédito em `creditos_fornecedor` para abater em pagamentos futuros. |
| **Sourcing** | Processo estratégico de seleção de fornecedores para uma categoria (RFP/RFQ/leilão reverso). |
| **RFP / RFQ / RFx** | Request for Proposal / Quotation / Information. Evento em `sourcing_events`. |
| **Leilão Reverso** | Fornecedores competem baixando preços em tempo real (`auction_bids`, `licitacao_lances`). |
| **Licitação** (`licitacoes`) | Processo formal com propostas seladas. |
| **Categoria** (`categorias`) | Agrupamento de produtos/serviços; ligado a UNSPSC. |
| **UNSPSC** (`unspsc_codes`) | United Nations Standard Products and Services Code — taxonomia global de categorização. |
| **Punchout** | Padrão e-procurement (cXML): comprador entra no site do fornecedor, monta carrinho, retorna com dados estruturados. |
| **Spot (Compra Spot)** | Compra fora do fluxo padrão, tipicamente urgente. Módulo integra com portal SpotGifts. |
| **Contrato Guarda-chuva** (`contracts`) | Contrato macro que rege vários pedidos ao longo do tempo. |
| **Penalidade Contratual** (`contract_penalties`) | Multa por descumprimento (padrão: 0,5%/dia de atraso, cap 20%). |
| **Bonificação** (`supplier_bonifications`) | Desconto/crédito concedido pelo fornecedor conforme performance. |
| **Qualificação de Fornecedor** (`supplier_qualification_scores`) | Score 1-5 baseado em documentos, entregas, qualidade. |
| **Score do Fornecedor** | Métrica calculada por triggers (`auto_update_supplier_score_on_delivery`). |
| **Maverick Spend** | Gasto fora do processo oficial (sem PO). KPI de conformidade. |
| **ROI Procurement** | Retorno do investimento na função de compras (savings vs. custo operacional). |
| **Savings** | Economia gerada: `Math.max(0, valor_estimado - valor_aprovado)`. |
| **Ordem Fracionada** | Divisão de pedido com buffer +2% por perda de produção. |
| **Recompra Inteligente** (`repurchase_suggestions`) | Sugestão automática baseada em histórico e giro. |

## Financeiro / Orçamento

| Termo | Definição |
|---|---|
| **Centro de Custo** (`cost_centers`) | Unidade organizacional que consome orçamento. |
| **Orçamento Departamental** (`department_budgets`) | Verba disponível por centro de custo/período. |
| **Realização Orçamentária** | Gasto efetivo (triggers `handle_pedido_budget_realization`, `sync_budget_on_payment`). |
| **Reserva de Orçamento** | Comprometimento no momento do pedido, antes do pagamento. |
| **Aliquota Tributária** (`aliquotas_tributarias`) | Impostos por regime / produto / UF. |

## Aprovações

| Termo | Definição |
|---|---|
| **Workflow** (`approval_workflows`) | Instância de aprovação para uma solicitação. |
| **Regra de Aprovação** (`approval_rules`) | Define quando um workflow é aplicado (categoria, valor, cost center). |
| **Etapa** (`approval_steps`) | Nó de aprovação em um workflow. |
| **SoD (Segregation of Duties)** | Regra que impede um usuário de aprovar sua própria ação. RPC `check_workflow_sod`. |
| **Delegação** (`approval_delegations`) | Transferência temporária de autoridade. Constraint `EXCLUDE` impede sobreposições. |
| **Escalonamento** | Passagem automática ao próximo nível quando SLA vence. |

## Segurança / Auth

| Termo | Definição |
|---|---|
| **RLS (Row Level Security)** | Filtragem de linhas no Postgres baseada em políticas SQL. |
| **`has_role`** | Helper `SECURITY DEFINER` que consulta `user_roles`. |
| **`tenant_in_my_group`** | Helper que valida se um `tenant_id` está no grupo do usuário. |
| **JWT** | Token de sessão Supabase (contém `sub`, `role`, metadata). |
| **MFA** | Autenticação multifator (TOTP). |
| **WebAuthn / Passkey** | Autenticação por biometria/hardware. |
| **SSO** | Single Sign-On corporativo. |
| **SCIM 2.0** | Padrão de provisionamento de usuários por IdP. |
| **HIBP** | Have I Been Pwned — proteção contra senhas vazadas. |
| **Circuit Breaker** | Padrão de resiliência: após N falhas, para de chamar por X segundos. |
| **Idempotência** | Garantia de que reprocessar o mesmo evento não causa efeito duplicado. |
| **Outbox Pattern** | Escrever eventos numa tabela local e ter um worker que os entrega, garantindo consistência. |

## Observabilidade

| Termo | Definição |
|---|---|
| **Telemetria** (`telemetry_logs`) | Logs estruturados de execução. |
| **Query Telemetry** (`query_telemetry`) | Métricas de queries; thresholds 3s (lenta) / 8s (muito lenta). |
| **System Alert** (`system_alerts`) | Alerta gerado por scanner/watchdog; severity LOW→CRITICAL. |
| **Scanner** | Função `scan_*` que audita saúde do banco. |
| **Watchdog** | Função de vigilância contínua (cron/watchdog). |
| **BRIN Index** | Block Range INdex — eficiente para colunas temporais em tabelas grandes. |
| **Autovacuum** | Processo Postgres que remove tuplas mortas. |
| **Bloat** | Excesso de tuplas mortas / espaço não recuperado. |

## Multi-tenant

| Termo | Definição |
|---|---|
| **Organização** (`organizations`) | Grupo econômico (raiz da hierarquia). |
| **Tenant / Empresa** (`tenants`) | Empresa/CNPJ dentro da organização. |
| **Grupo Empresarial** | Sinônimo de organização — conjunto de empresas com CNPJs distintos. |
| **Visão Consolidada** | `selectedEmpresaId === null`: dashboards agregam todas as empresas do grupo. |
| **Isolamento por Tenant** | RLS via `tenant_in_my_group(tenant_id)`. |

## Integrações

| Termo | Definição |
|---|---|
| **ERP** | Enterprise Resource Planning — sistema externo (SAP, TOTVS…). Integração via `erp-sync`. |
| **Bitrix24** | CRM externo integrado. |
| **Banco Inter** | Integração bancária para pagamentos. |
| **cXML** | Commerce XML — padrão de mensagens em PunchOut. |
| **Resend** | Provedor de email transacional. |
| **Slack Webhook** | Canal de despacho de alertas (`SLACK_WEBHOOK_URL`). |
| **Web Push / VAPID** | Notificações push nativas de navegador. |

## Front-end / UX

| Termo | Definição |
|---|---|
| **PWA** | Progressive Web App (offline, instalável). |
| **Semantic Token** | Variável CSS (`--primary`, `--foreground`) que se adapta a light/dark. |
| **Motion Preset** | Preset de transição de página (`fade`, `slide-*`, `zoom-*`, `blur-scale`…). |
| **Prefetch** | Carregar chunks/dados antes do usuário clicar. |
| **Skeleton** | Placeholder animado durante loading. |
| **Toast** | Notificação transitória (biblioteca `sonner`). |
| **Undo/Redo** | Sistema global de reversão com atalhos `Ctrl/Cmd+Z`. |
| **Bulk Ops** | Ações em lote sobre múltiplos itens selecionados. |
