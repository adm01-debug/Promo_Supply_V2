#!/bin/sh
# gen-types.sh [--local] [output_path]
# Gera src/integrations/supabase/types.ts a partir do schema do banco.
#
# Modo padrao: introspecta o banco oficial via --db-url.
#   Requer: SUPABASE_DB_URL no ambiente (porta 5432 ou 6543 session-mode —
#           nao pooler em transaction mode, que o postgres-meta nao suporta).
#   Uso local: SUPABASE_DB_URL="postgresql://..." sh scripts/types-sync/gen-types.sh
#   Uso em CI: .github/workflows/types-sync.yml
#
# Modo --local: introspecta um Postgres LOCAL (supabase db start), que aplica
#   as migrations de supabase/migrations num volume novo. Reflete so o que esta
#   commitado; nao detecta drift aplicado direto no banco de producao.
#
# POSIX sh (sem bashisms) — compativel com dash e bash.
#
# Portado de Zapp_Web_V2/scripts/db-audit/gen-types.sh. Diferenca: le
# SUPABASE_DB_URL em vez de DESTINO_URL e chama
# scripts/types-sync/local-pg-proxy.mjs.
#
# NAO passa a credencial real no --db-url: a CLI entrega esse valor em texto
# puro a um container Docker (postgres-meta), onde ela ficaria visivel via
# /proc a processos irmaos do mesmo job. Por isso o proxy local — ver o bloco
# "Proxy local" abaixo e o cabecalho de local-pg-proxy.mjs.
#
# `--network-id host` torna explicita a rede do container em vez de depender da
# rede que a CLI gera a cada execucao. NAO e correcao de timeout de conexao.
set -e

MODE=db-url
if [ "${1:-}" = "--local" ]; then
  MODE=local
  shift
fi

OUTPUT="${1:-/tmp/types.generated.ts}"
TMP="$(mktemp /tmp/types.XXXXXX.ts)"
trap 'rm -f "$TMP" "${TMP}.normalized"' EXIT
# Sinal ENCERRA o script; a limpeza fica com o trap de EXIT. Com a limpeza direto no trap do
# sinal (sem `exit`), o shell limpava e continuava: Ctrl-C/SIGTERM no meio caia em "nova
# tentativa" e o script podia terminar em exit 0.
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

# Retry com backoff em volta do `supabase gen types`: rajadas transitorias de
# saturacao do banco (statement timeout, connection reset) fazem o handshake
# estourar o timeout do cliente postgres-meta com tudo saudavel. Um gate de
# conformidade nao pode ficar vermelho por isso.
retry_gen_types() {
  _tentativa=1
  _max=3
  while [ "$_tentativa" -le "$_max" ]; do
    if supabase gen types typescript "$@" > "$TMP"; then
      return 0
    fi
    if [ "$_tentativa" -eq "$_max" ]; then
      break
    fi
    _espera=$((_tentativa * ${GEN_TYPES_RETRY_DELAY_S:-10}))
    echo "Aviso: 'supabase gen types' falhou na tentativa ${_tentativa}/${_max}; nova tentativa em ${_espera}s (banco possivelmente saturado)." >&2
    sleep "$_espera"
    _tentativa=$((_tentativa + 1))
  done
  echo "Erro: 'supabase gen types' falhou em ${_max} tentativas." >&2
  return 1
}

if [ "$MODE" = local ]; then
  supabase gen types typescript \
    --local \
    --schema public \
    > "$TMP"
else
  if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "Erro: SUPABASE_DB_URL nao definida no ambiente." >&2
    exit 1
  fi

  # Proxy local: se pgbouncer estiver disponivel, sobe um proxy so-loopback
  # (127.0.0.1) cuja config (com a credencial real) fica num arquivo 0600
  # dentro de um diretorio 0700; o --db-url passado ao supabase CLI usa
  # credencial descartavel que nao aponta pra producao.
  # server_tls_sslmode=verify-full com a CA Supabase pinada no trecho
  # pgbouncer->producao preserva a postura de TLS. Sem pgbouncer (uso manual
  # local), cai no comportamento direto.
  if command -v pgbouncer >/dev/null 2>&1; then
    # Sem pg_isready a espera abaixo estoura sempre e acusava o pgbouncer ("nao subiu a tempo").
    if ! command -v pg_isready >/dev/null 2>&1; then
      echo "Erro: pg_isready ausente (pacote postgresql-client); sem ele nao da para saber se o proxy local subiu." >&2
      exit 1
    fi
    PROXY_DIR="$(mktemp -d /tmp/pg-proxy.XXXXXX)"
    chmod 700 "$PROXY_DIR"
    trap 'rm -f "$TMP" "${TMP}.normalized"; kill "${PROXY_PID:-}" 2>/dev/null || true; rm -rf "$PROXY_DIR"' EXIT

    PROXY_PORT="$(node scripts/types-sync/local-pg-proxy.mjs "$PROXY_DIR")"

    # Saida redirecionada para dentro do PROXY_DIR (removido pela trap): sem
    # isso o pgbouncer roda em foreground e duplica cada LOG no stdout herdado
    # do job, que o GitHub Actions captura PERMANENTEMENTE no log do run —
    # incluindo usuario real (postgres.<project-ref>) e IP do banco, que o
    # ::add-mask:: do workflow nao cobre por serem fragmentos da URL secreta.
    pgbouncer "$PROXY_DIR/pgbouncer.ini" >"$PROXY_DIR/pgbouncer.stdout.log" 2>&1 &
    PROXY_PID=$!

    # sslmode=disable explicito: o passo "Exigir credencial do banco oficial"
    # grava PGSSLMODE=verify-full no $GITHUB_ENV, que persiste para todos os
    # steps seguintes. Essa variavel e para a perna producao; o lado que o
    # pgbouncer escuta em 127.0.0.1 (auth_type=trust) nao fala TLS. Sem
    # sslmode=disable aqui, pg_isready e o CLI herdam verify-full e falham
    # sempre contra o loopback.
    # A perna cliente do proxy usa auth_type=trust: a senha NAO e validada
    # (userlist.txt registra "unused"). O valor aqui e descartavel e vem do
    # ambiente para nao deixar credencial literal no codigo.
    PROXY_USER=proxy
    PROXY_PASSWORD="${PG_PROXY_PASSWORD:-$PROXY_USER}"
    PROXY_URL="postgresql://${PROXY_USER}:${PROXY_PASSWORD}@127.0.0.1:${PROXY_PORT}/proxydb?sslmode=disable"

    i=0
    while [ "$i" -lt 50 ]; do
      if pg_isready -d "$PROXY_URL" >/dev/null 2>&1; then
        break
      fi
      i=$((i + 1))
      sleep 0.2
    done
    if [ "$i" -ge 50 ]; then
      echo "Erro: proxy local (pgbouncer) nao subiu a tempo." >&2
      exit 1
    fi

    retry_gen_types \
      --db-url "$PROXY_URL" \
      --network-id host \
      --schema public
  else
    if [ "${CI:-}" = "true" ]; then
      echo "Erro: pgbouncer ausente em ambiente CI; a credencial SUPABASE_DB_URL nao pode ir direto no --db-url. Instale pgbouncer." >&2
      exit 1
    fi
    echo "Aviso: pgbouncer ausente; SUPABASE_DB_URL vai direto no --db-url (visivel via ps/proc a processos deste job). Instale pgbouncer para blindar a credencial." >&2
    retry_gen_types \
      --db-url "$SUPABASE_DB_URL" \
      --schema public
  fi
fi

# `supabase gen types` saindo 0 com saida vazia ou com texto de erro nao pode virar "types
# gerado": sem a declaracao do Database isto nao e um types.ts e o OUTPUT fica como estava.
if ! grep -q '^export type Database = {' "$TMP"; then
  echo "Erro: a saida do 'supabase gen types' nao tem 'export type Database = {' (vazia ou nao e um types.ts); nada foi gravado em ${OUTPUT}." >&2
  exit 1
fi

# A CLI pode emitir mais de uma quebra de linha no EOF. Normaliza apenas as
# linhas vazias finais para que o artefato seja deterministico e passe em
# `git diff --check`, preservando linhas vazias internas.
awk '
  NF {
    while (blank_lines > 0) {
      print ""
      blank_lines--
    }
    print
    next
  }
  { blank_lines++ }
' "$TMP" > "${TMP}.normalized"

mv "${TMP}.normalized" "$OUTPUT"
BYTES="$(wc -c < "$OUTPUT")"
echo "types gerado: ${OUTPUT} (${BYTES} bytes)"
