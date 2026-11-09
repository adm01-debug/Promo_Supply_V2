#!/bin/bash
# =============================================================================
# DEPLOY EDGE FUNCTIONS — PROMO SUPPLY V2
# Projeto Supabase: lmypcdfsrgfftzhxawao
#
# Uso:
#   bash deploy_edge_functions_promo_supply.sh [--dry-run] [--only fn1,fn2] [--help]
#
#   --dry-run       mostra o que seria publicado; não chama o Supabase nem a rede
#   --only a,b      publica só as funções citadas (precisam estar na lista abaixo)
#
# Exit: 0 = tudo publicado e verificado · 1 = alguma função falhou no deploy ou
#       na verificação · 2 = uso/pré-requisito.
#
# A chave usada na verificação pós-deploy é a chave PÚBLICA (anon). Ela vem de
# SUPABASE_ANON_KEY ou, na falta, de VITE_SUPABASE_PUBLISHABLE_KEY no .env — não
# fica mais copiada aqui dentro (cópia fixa sai de sincronia quando a chave gira).
# =============================================================================

set -euo pipefail

PROJECT_REF="lmypcdfsrgfftzhxawao"
DRY_RUN=false
ONLY=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --only)
      if [ $# -lt 2 ] || [ -z "$2" ]; then
        echo "❌ --only exige a lista de funções (ex.: --only workflow-engine,telemetry)" >&2
        exit 2
      fi
      ONLY="$2"; shift 2 ;;
    --help|-h)
      awk 'NR == 1 { next } !/^#/ { exit } { sub(/^# ?/, ""); print }' "$0"; exit 0 ;;
    *)
      echo "❌ Argumento desconhecido: $1" >&2; exit 2 ;;
  esac
done

# Roda a partir da raiz do repo, de onde quer que seja chamado.
cd "$(dirname "${BASH_SOURCE[0]}")"

echo ""
echo "========================================================"
echo "  DEPLOY EDGE FUNCTIONS — PROMO SUPPLY V2"
echo "  Projeto: $PROJECT_REF"
[ "$DRY_RUN" = true ] && echo "  MODO: dry-run (nada será publicado)"
echo "========================================================"
echo ""

if [ ! -d "supabase/functions" ]; then
  echo "❌ Diretório supabase/functions não encontrado em $(pwd)."
  exit 2
fi

if [ "$DRY_RUN" = false ] && ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI não encontrado. Instale com: npm install -g supabase"
  exit 2
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

# Nunca publicar, nem por --only. `migrate-helper` devolve a service_role e a URL
# do banco para quem tiver uma chave que está fixa no código-fonte da função; foi
# removida no commit 58f4fc8 e voltou em 97b6efc ("Visual edit in Lovable").
BLOCKED_FUNCTIONS=("migrate-helper")

NO_JWT_FUNCTIONS=("punchout-receive" "webauthn-authenticate" "run-audit" "system-simulation" "dependency-health" "telemetry")

CRITICAL_FNS=(
  "workflow-engine"
  "telemetry"
  "spot-proxy"
  "process-outbox"
  "ai-supplier-suggestion"
  "erp-sync"
)

contem() {
  local alvo="$1"; shift
  local item
  for item in "$@"; do
    [ "$item" = "$alvo" ] && return 0
  done
  return 1
}

# ── Seleção (--only) ─────────────────────────────────────────────────────────
SELECTED=()
if [ -n "$ONLY" ]; then
  IFS=',' read -r -a PEDIDAS <<< "$ONLY"
  for fn in "${PEDIDAS[@]}"; do
    fn="${fn//[[:space:]]/}"
    [ -z "$fn" ] && continue
    if contem "$fn" "${BLOCKED_FUNCTIONS[@]}"; then
      echo "❌ [$fn] está bloqueada para deploy (expõe credenciais). Nada foi publicado." >&2
      exit 2
    fi
    if ! contem "$fn" "${FUNCTIONS[@]}"; then
      echo "❌ [$fn] não está na lista de deploy deste script. Nada foi publicado." >&2
      exit 2
    fi
    contem "$fn" ${SELECTED[@]+"${SELECTED[@]}"} || SELECTED+=("$fn")
  done
  if [ ${#SELECTED[@]} -eq 0 ]; then
    echo "❌ --only não trouxe nenhuma função." >&2
    exit 2
  fi
else
  SELECTED=("${FUNCTIONS[@]}")
fi

# ── Funções em disco que este script não publica (só aviso) ──────────────────
FORA_DA_LISTA=()
for dir in supabase/functions/*/; do
  [ -d "$dir" ] || continue
  nome="$(basename "$dir")"
  case "$nome" in _*|tests) continue ;; esac
  [ -f "$dir/index.ts" ] || continue
  contem "$nome" "${FUNCTIONS[@]}" && continue
  if contem "$nome" "${BLOCKED_FUNCTIONS[@]}"; then
    echo "🚫 [$nome] existe em disco e está BLOQUEADA — não será publicada."
  else
    FORA_DA_LISTA+=("$nome")
  fi
done
if [ ${#FORA_DA_LISTA[@]} -gt 0 ]; then
  echo "ℹ️  Em disco e fora da lista de deploy (não serão publicadas): ${FORA_DA_LISTA[*]}"
fi
echo ""

if [ "$DRY_RUN" = false ]; then
  echo "🔗 Verificando link com projeto Supabase..."
  # </dev/null: o link pede senha do banco quando não está logado; nunca travar esperando teclado.
  if ! supabase link --project-ref "$PROJECT_REF" < /dev/null > /dev/null 2>&1; then
    echo "⚠️  Link não confirmado — seguindo com --project-ref explícito em cada deploy."
  fi
fi

TOTAL=${#SELECTED[@]}
SUCCESS=0
FAILED=0
FAILED_LIST=()
DEPLOYED=()

echo "📋 Total de funções a deployar: $TOTAL"
echo ""

for fn in "${SELECTED[@]}"; do
  fn_dir="supabase/functions/$fn"

  if [ ! -d "$fn_dir" ]; then
    echo "  ⚠️  [$fn] — diretório não encontrado, pulando"
    FAILED=$((FAILED + 1))
    FAILED_LIST+=("$fn (diretório ausente)")
    continue
  fi

  VERIFY_FLAG=""
  if contem "$fn" "${NO_JWT_FUNCTIONS[@]}"; then
    VERIFY_FLAG="--no-verify-jwt"
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "  🧪 [$fn] seria publicada${VERIFY_FLAG:+ ($VERIFY_FLAG)}"
    SUCCESS=$((SUCCESS + 1))
    continue
  fi

  echo -n "  🚀 Deployando [$fn]..."

  # shellcheck disable=SC2086 # VERIFY_FLAG vazio precisa sumir da linha de comando
  if supabase functions deploy "$fn" --project-ref "$PROJECT_REF" $VERIFY_FLAG 2>&1 | tail -3; then
    echo "    ✅"
    SUCCESS=$((SUCCESS + 1))
    DEPLOYED+=("$fn")
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

if [ "$DRY_RUN" = true ]; then
  echo "Dry-run concluído — nada foi publicado nem verificado."
  [ "$FAILED" -gt 0 ] && exit 1
  exit 0
fi

# VERIFICAÇÃO PÓS-DEPLOY
VERIFY_FAILED=0
VERIFICAR=()
for fn in "${CRITICAL_FNS[@]}"; do
  contem "$fn" ${DEPLOYED[@]+"${DEPLOYED[@]}"} && VERIFICAR+=("$fn")
done

ANON_KEY="${SUPABASE_ANON_KEY:-}"
if [ -z "$ANON_KEY" ] && [ -f .env ]; then
  ANON_KEY="$(sed -n 's/^VITE_SUPABASE_PUBLISHABLE_KEY=//p' .env | head -1 | tr -d '"'"'"'\r')"
fi

if [ ${#VERIFICAR[@]} -eq 0 ]; then
  echo "ℹ️  Nenhuma função crítica foi publicada nesta execução — nada a verificar."
elif [ -z "$ANON_KEY" ]; then
  echo "⚠️  NÃO VERIFICADO: sem SUPABASE_ANON_KEY e sem VITE_SUPABASE_PUBLISHABLE_KEY no .env."
  VERIFY_FAILED=$((VERIFY_FAILED + 1))
else
  echo "🔍 Verificando disponibilidade das funções críticas..."
  echo ""

  SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

  for fn in "${VERIFICAR[@]}"; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${SUPABASE_URL}/functions/v1/${fn}" \
      -H "Authorization: Bearer ${ANON_KEY}" \
      -H "Content-Type: application/json" \
      -d '{}' \
      --max-time 15 2>/dev/null || true)
    HTTP_STATUS="${HTTP_STATUS:-000}"

    case "$HTTP_STATUS" in
      200|400|401|403)
        echo "  ✅ $fn → HTTP $HTTP_STATUS (função existe e responde)" ;;
      404)
        echo "  ❌ $fn → HTTP 404 (função NÃO deployada)"
        VERIFY_FAILED=$((VERIFY_FAILED + 1)) ;;
      000)
        echo "  ❌ $fn → sem resposta (rede/timeout)"
        VERIFY_FAILED=$((VERIFY_FAILED + 1)) ;;
      503)
        echo "  ❌ $fn → HTTP 503 (função publicada mas não inicializa)"
        VERIFY_FAILED=$((VERIFY_FAILED + 1)) ;;
      *)
        echo "  ⚠️  $fn → HTTP $HTTP_STATUS" ;;
    esac
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

if [ "$FAILED" -gt 0 ] || [ "$VERIFY_FAILED" -gt 0 ]; then
  echo "❌ Deploy com pendência: $FAILED falha(s) de deploy, $VERIFY_FAILED de verificação." >&2
  exit 1
fi
