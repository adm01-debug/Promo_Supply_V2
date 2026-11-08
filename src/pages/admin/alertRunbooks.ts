// Runbooks operacionais por alert_type.
// Cada entrada descreve: sintoma, impacto e passos sugeridos de remediação.
// Mantido como código para versionamento e revisão em PRs.

export type Runbook = {
  title: string;
  symptom: string;
  impact: string;
  steps: string[];
  references?: { label: string; url: string }[];
};

const RUNBOOKS: Record<string, Runbook> = {
  xid_wraparound_warning: {
    title: "Aviso de XID Wraparound",
    symptom: "Idade de transação (datfrozenxid) aproximando-se do limite de 2 bilhões.",
    impact: "Se não tratado, o PostgreSQL entra em shutdown para prevenir corrupção.",
    steps: [
      "Rodar VACUUM (FREEZE, VERBOSE) nas maiores tabelas quentes.",
      "Verificar autovacuum_freeze_max_age e reduzir se necessário.",
      "Checar transações preparadas antigas (SELECT * FROM pg_prepared_xacts).",
      "Encerrar sessões idle-in-transaction antigas via pg_terminate_backend.",
    ],
  },
  replication_lag_critical: {
    title: "Lag de replicação crítico",
    symptom: "Réplica com mais de 60s de atraso em relação ao primary.",
    impact: "Leituras stale, failover arriscado e RPO comprometido.",
    steps: [
      "Verificar largura de banda entre primary e réplica.",
      "Checar consultas long-running na réplica (max_standby_streaming_delay).",
      "Confirmar wal_keep_size e slot de replicação ativo.",
      "Se persistir >5min, escalar para SRE de plantão.",
    ],
  },
  deadlock_detected: {
    title: "Deadlock detectado",
    symptom: "Uma ou mais transações abortadas por conflito de locks.",
    impact: "Falhas intermitentes de escrita e retries no cliente.",
    steps: [
      "Inspecionar deadlock_snapshots para ver as queries envolvidas.",
      "Ordenar acessos a tabelas sempre na mesma sequência no código.",
      "Reduzir escopo de transações (BEGIN/COMMIT curtos).",
      "Considerar SELECT ... FOR UPDATE SKIP LOCKED em filas.",
    ],
  },
  sequence_overflow_warning: {
    title: "Sequence próxima do overflow",
    symptom: "Sequência com >80% do valor máximo consumido.",
    impact: "Falhas de INSERT quando o teto for atingido (int4 → 2.1bi).",
    steps: [
      "Migrar coluna para BIGINT via ALTER TABLE ... ALTER COLUMN ... TYPE BIGINT.",
      "Ajustar a sequence com ALTER SEQUENCE ... AS bigint MAXVALUE ...",
      "Validar impacto em índices e FKs dependentes.",
    ],
  },
  unused_indexes_detected: {
    title: "Índices sem uso",
    symptom: "Índices com idx_scan = 0 há mais de 30 dias.",
    impact: "Escritas mais lentas e desperdício de espaço em disco.",
    steps: [
      "Confirmar via pg_stat_user_indexes que idx_scan continua 0.",
      "Verificar se o índice não é usado por constraint UNIQUE ou FK.",
      "DROP INDEX CONCURRENTLY em janela de baixo tráfego.",
    ],
  },
  fk_without_index: {
    title: "FK sem índice de suporte",
    symptom: "Chave estrangeira sem índice na coluna filha.",
    impact: "DELETE/UPDATE no pai varre a tabela filha inteira (seq scan).",
    steps: [
      "CREATE INDEX CONCURRENTLY em (coluna_fk) na tabela filha.",
      "Reexecutar scan_missing_fk_indexes para confirmar remediação.",
    ],
  },
  long_running_transaction: {
    title: "Transação de longa duração",
    symptom: "Backend com transação aberta há mais de 5 minutos.",
    impact: "Bloqueia autovacuum, causa bloat e amplifica risco de wraparound.",
    steps: [
      "Identificar pid via pg_stat_activity (state, xact_start, query).",
      "Contatar o dono da sessão antes de encerrar, se possível.",
      "pg_terminate_backend(pid) em último caso.",
    ],
  },
  slack_webhook_down: {
    title: "Watchdog Slack falhando",
    symptom: "Envios para o webhook do Slack retornando erro consecutivo.",
    impact: "Alertas críticos podem não chegar ao time on-call.",
    steps: [
      "Validar URL do webhook em Secrets (SLACK_WEBHOOK_URL).",
      "Testar manualmente com curl -X POST -H 'Content-Type: application/json'.",
      "Se rotacionado, atualizar a secret e reprocessar fila de alertas.",
    ],
  },
};

const GENERIC_RUNBOOK: Runbook = {
  title: "Runbook genérico",
  symptom: "Alerta sem runbook dedicado ainda.",
  impact: "Investigação manual necessária.",
  steps: [
    "Verificar metadata do alerta para pistas do scanner que disparou.",
    "Consultar health_scan_runs para ver a execução correspondente.",
    "Cruzar com logs de audit_logs e telemetry_logs no mesmo horário.",
    "Registrar aprendizado em DOCS/CODEBASE_ATLAS após resolução.",
  ],
};

export function getRunbook(alertType: string | null | undefined): Runbook {
  if (!alertType) return GENERIC_RUNBOOK;
  return RUNBOOKS[alertType] ?? GENERIC_RUNBOOK;
}
