#!/bin/bash
# =============================================================================
# DEPLOY EDGE FUNCTIONS — PROMO SUPPLY V2
# Projeto Supabase: lmypcdfsrgfftzhxawao
# =============================================================================

set -euo pipefail

PROJECT_REF="lmypcdfsrgfftzhxawao"
# Segredo lido do ambiente — nunca hardcode no repo.
ANON_KEY="${SUPABASE_ANON_KEY:-}"

if [ -z "$ANON_KEY" ]; then
  echo "❌ SUPABASE_ANON_KEY não definida. Exporte antes de rodar:"
  echo "   export SUPABASE_ANON_KEY=..."
  exit 1
fi

echo ""
echo "========================================================"
echo "  DEPLOY EDGE FUNCTIONS — PROMO SUPPLY V2"
echo "  Projeto: $PROJECT_REF"
echo "========================================================"
echo ""

if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI não encontrado. Instale com: npm install -g supabase"
  exit 1
fi

if [ ! -d "supabase/functions" ]; then
  echo "❌ Diretório supabase/functions não encontrado."
  echo "   Execute este script na raiz do projeto."
  exit 1
fi

echo "🔗 Verificando link com projeto Supabase..."
if ! supabase link --project-ref "$PROJECT_REF" 2>/dev/null; then
  echo "⚠️  Não foi possível linkar o projeto. Continuando com --project-ref explícito."
fi

FUNCTIONS=(
  # IA / AI Gateway
  "ai-demand-prediction"
  "ai-negotiation"
  "ai-supplier-risk"
  "ai-supplier-suggestion"

  # Workflow / Fiscal / ERP / Punchout
  "workflow-engine"
  "fiscal-orchestrator"
  "erp-sync"
  "punchout-setup"
  "punchout-receive"
  "process-invoice-idp"
  "generate-contract-pdf"
  "guided-buying-ai"

  # Cron / Alertas (service role, sem JWT de usuário)
  "alert-dispatcher"
  "check-approval-escalations"
  "check-cotacao-followup"
  "check-expiry-alerts"
  "check-sla-alerts"
  "process-outbox"
  "weekly-report"
  "weekly-summary-report"

  # Segurança / Infra
  "webauthn-register"
  "webauthn-authenticate"
  "scim-v2"
  "send-push-notification"
  "telemetry"
  "dependency-health"
  "run-audit"
  "system-simulation"
  "migrate-storage-paths"
  "external-db-bridge"
  "spot-proxy"
)

TOTAL=${#FUNCTIONS[@]}
SUCCESS=0
FAILED=0
FAILED_LIST=()

echo "📋 Total de funções a deployar: $TOTAL"
echo ""

for fn in "${FUNCTIONS[@]}"; do
  fn_dir="supabase/functions/$fn"

  if [ ! -d "$fn_dir" ]; then
    echo "  ⚠️  [$fn] — diretório não encontrado, pulando"
    FAILED=$((FAILED + 1))
    FAILED_LIST+=("$fn (diretório ausente)")
    continue
  fi

  echo -n "  🚀 Deployando [$fn]..."

  NO_JWT_FUNCTIONS=("punchout-receive" "webauthn-authenticate" "run-audit" "system-simulation" "dependency-health" "telemetry")
  VERIFY_FLAG=""
  for no_jwt_fn in "${NO_JWT_FUNCTIONS[@]}"; do
    if [ "$fn" = "$no_jwt_fn" ]; then
      VERIFY_FLAG="--no-verify-jwt"
      break
    fi
  done

  if supabase functions deploy "$fn" --project-ref "$PROJECT_REF" $VERIFY_FLAG 2>&1 | tail -3; then
    echo "    ✅"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "    ❌"
    FAILED=$((FAILED + 1))
    FAILED_LIST+=("$fn")
  fi
done

echo ""
echo "========================================================"
echo "  RESULTADO DO DEPLOY"
echo "========================================================"
echo "  ✅ Sucesso:  $SUCCESS / $TOTAL"
echo "  ❌ Falhas:   $FAILED / $TOTAL"
echo ""

if [ ${#FAILED_LIST[@]} -gt 0 ]; then
  echo "  Funções com falha:"
  for f in "${FAILED_LIST[@]}"; do
    echo "    - $f"
  done
  echo ""
fi

# VERIFICAÇÃO PÓS-DEPLOY
if [ "$FAILED" -eq 0 ]; then
  echo "🔍 Verificando disponibilidade das funções críticas..."
  echo ""

  SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

  CRITICAL_FNS=(
    "workflow-engine"
    "telemetry"
    "spot-proxy"
    "process-outbox"
    "ai-supplier-suggestion"
    "erp-sync"
  )

  for fn in "${CRITICAL_FNS[@]}"; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${SUPABASE_URL}/functions/v1/${fn}" \
      -H "Authorization: Bearer $ANON_KEY" \
      -H "Content-Type: application/json" \
      -d '{}' \
      --max-time 5 2>/dev/null || echo "000")

    if [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "400" ] || [ "$HTTP_STATUS" = "200" ]; then
      echo "  ✅ $fn → HTTP $HTTP_STATUS (função existe e responde)"
    elif [ "$HTTP_STATUS" = "404" ]; then
      echo "  ❌ $fn → HTTP 404 (função NÃO deployada)"
    else
      echo "  ⚠️  $fn → HTTP $HTTP_STATUS"
    fi
  done
fi

echo ""
echo "========================================================"
echo "  PRÓXIMOS PASSOS"
echo "========================================================"
echo ""
echo "  1. Verifique as variáveis de ambiente das Edge Functions:"
echo "     supabase secrets list --project-ref $PROJECT_REF"
echo ""
echo "  2. Ative os cron jobs via Supabase Dashboard:"
echo "     → Database → Extensions → pg_cron"
echo "     Funções de cron: alert-dispatcher, check-sla-alerts,"
echo "       check-expiry-alerts, check-cotacao-followup,"
echo "       check-approval-escalations, process-outbox,"
echo "       weekly-report, weekly-summary-report"
echo ""
echo "  3. Teste o fluxo principal:"
echo "     Criar solicitação → Aprovar → Gerar pedido → Pagamento"
echo ""
echo "========================================================"

# Falha explícita se houver funções não deployadas (CI detecta).
if [ "$FAILED" -gt 0 ]; then
  echo "❌ $FAILED função(ões) falharam no deploy." >&2
  exit 1
fi

exit 0
