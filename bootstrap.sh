#!/usr/bin/env bash
#
# Toto one-shot bootstrap.
#
# Usage on a fresh Docker host:
#   git clone <repo> toto && cd toto
#   ./bootstrap.sh
#
# What it does:
#   1. Verifies Docker, docker compose, and ports 80/443 are usable.
#   2. Asks for domain, admin username, admin password.
#   3. Generates JWT_SECRET, ENCRYPTION_KEY (Fernet), POSTGRES_PASSWORD.
#   4. Writes .env from .env.example.
#   5. Builds containers (api image is needed to hash the admin password
#      with bcrypt — no extra tooling required on the host).
#   6. Computes ADMIN_PASSWORD_HASH inside the api container and saves it.
#   7. Starts the full stack (api + worker + beat + web + caddy + redis +
#      postgres).
#   8. Waits for the api to be healthy and runs alembic upgrade head.
#   9. Verifies the auth endpoint responds.
#  10. Prints the public URL.
#
# Re-running this script is safe: it will skip env regeneration when .env
# already exists, and idempotently restart services.

set -euo pipefail
cd "$(dirname "$0")"

# ---------------------------------------------------------------------------
# Compose-file selection
#
# Default (own edge):
#     docker-compose.yml + docker-compose.prod.yml  → toto runs its own caddy
#     on 80/443.
#
# Shared edge (SHARED_CADDY=1):
#     docker-compose.yml + docker-compose.shared-caddy.yml → toto does NOT
#     bind 80/443; an upstream caddy on the host proxies into todo-web.
#     The host must have a docker network named `web_proxy` with the
#     upstream caddy attached. See docker-compose.shared-caddy.yml header
#     for the one-time setup steps.
# ---------------------------------------------------------------------------
if [ "${SHARED_CADDY:-0}" = "1" ]; then
    COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.shared-caddy.yml)
    EDGE_MODE="shared"
else
    COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)
    EDGE_MODE="own"
fi
dc() { docker compose "${COMPOSE_FILES[@]}" "$@"; }

# ---------------------------------------------------------------------------
# Colors / logging
# ---------------------------------------------------------------------------
RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BLUE=$'\e[36m'; RESET=$'\e[0m'
step() { printf "\n${BLUE}==> %s${RESET}\n" "$*"; }
ok()   { printf "${GREEN}✓ %s${RESET}\n" "$*"; }
warn() { printf "${YELLOW}! %s${RESET}\n" "$*"; }
fail() { printf "${RED}✗ %s${RESET}\n" "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Pre-checks
# ---------------------------------------------------------------------------
step "Pre-flight checks"

command -v docker >/dev/null 2>&1 \
    || fail "Docker not installed. Try: curl -fsSL https://get.docker.com | sh"

docker compose version >/dev/null 2>&1 \
    || fail "docker compose plugin missing (need Docker 20.10+ with compose v2)."

if ! docker info >/dev/null 2>&1; then
    fail "Cannot talk to Docker daemon. Is the service running? Try: sudo systemctl start docker"
fi

if [ "$EDGE_MODE" = "own" ]; then
    # Own-edge mode: Caddy needs 80/443 free.
    for port in 80 443; do
        if ss -tlnH 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}$"; then
            # Allow if the listener already belongs to our compose stack
            if dc ps --services 2>/dev/null | grep -q '^caddy$' \
                && dc ps caddy 2>/dev/null | grep -q "Up"; then
                ok "Port $port already held by our caddy container — fine"
            else
                warn "Port $port is in use by another process. Caddy will fail to bind."
                warn "Tip: an upstream proxy on this host? Re-run with SHARED_CADDY=1 ./bootstrap.sh"
            fi
        fi
    done
else
    # Shared-edge mode: an upstream caddy owns 80/443; we just need the
    # web_proxy network to exist so our web container can join it.
    if ! docker network inspect web_proxy >/dev/null 2>&1; then
        fail "SHARED_CADDY=1 but docker network 'web_proxy' does not exist.\nCreate it and attach your upstream caddy first:\n  docker network create web_proxy\n  docker network connect web_proxy <upstream-caddy-container>"
    fi
    ok "Shared edge: web_proxy network present"
fi

ok "Docker $(docker version --format '{{.Server.Version}}' 2>/dev/null) ready (edge mode: $EDGE_MODE)"

# ---------------------------------------------------------------------------
# 2. .env: generate if missing
# ---------------------------------------------------------------------------
NEEDS_HASH=false

if [ -f .env ]; then
    step "Existing .env detected — skipping generation"
    set +u
    source ./.env
    set -u
    : "${DOMAIN:=}"
    : "${ADMIN_USERNAME:=admin}"
    : "${ADMIN_PASSWORD_HASH:=}"
    if [ -z "$DOMAIN" ] || [ -z "$ADMIN_PASSWORD_HASH" ]; then
        fail ".env exists but is missing DOMAIN or ADMIN_PASSWORD_HASH. Delete it and re-run."
    fi
    ok "DOMAIN=$DOMAIN, ADMIN_USERNAME=$ADMIN_USERNAME"
else
    [ -f .env.example ] || fail ".env.example missing — are you in the toto repo?"
    step "Collecting secrets"

    DEFAULT_DOMAIN="todo.azhefuye.online"
    read -rp "Public domain [$DEFAULT_DOMAIN]: " DOMAIN
    DOMAIN=${DOMAIN:-$DEFAULT_DOMAIN}

    read -rp "Admin username [admin]: " ADMIN_USERNAME
    ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

    while true; do
        read -rsp "Admin password (min 8 chars): " ADMIN_PASSWORD; echo
        if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
            warn "Too short — try again."
            continue
        fi
        read -rsp "Confirm password: " ADMIN_PASSWORD_CONFIRM; echo
        if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
            warn "Mismatch — try again."
            continue
        fi
        break
    done

    JWT_SECRET=$(openssl rand -hex 32)
    # Fernet keys are 32 random bytes encoded with URL-safe base64.
    ENCRYPTION_KEY=$(openssl rand 32 | base64 | tr '+/' '-_' | tr -d '\n')
    POSTGRES_PASSWORD=$(openssl rand -hex 16)

    step "Writing .env"
    cat > .env <<EOF
# Generated by bootstrap.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ)

# Database
DATABASE_URL=postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@postgres:5432/toto
POSTGRES_DB=toto
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis
REDIS_URL=redis://redis:6379/0

# Auth
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD_HASH=__PENDING__
JWT_SECRET=${JWT_SECRET}

# Encryption (for AI API keys at rest)
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# AI defaults (can be managed in web UI)
DEFAULT_AI_PROVIDER=deepseek
DEFAULT_AI_BASE_URL=https://api.deepseek.com/v1
DEFAULT_AI_API_KEY=
DEFAULT_AI_MODEL=deepseek-chat

# Celery
CELERY_WORKER_CONCURRENCY=2

# Deploy
DOMAIN=${DOMAIN}
EOF
    chmod 600 .env
    ok "Wrote .env (mode 600)"
    NEEDS_HASH=true
fi

# ---------------------------------------------------------------------------
# 3. DNS pre-check (warning only)
# ---------------------------------------------------------------------------
step "DNS sanity check for $DOMAIN"
HOST_IP=""
for url in https://api.ipify.org https://ifconfig.me https://ipinfo.io/ip; do
    HOST_IP=$(curl -fsS --max-time 5 "$url" 2>/dev/null || true)
    [ -n "$HOST_IP" ] && break
done
DOMAIN_IP=""
if command -v dig >/dev/null 2>&1; then
    DOMAIN_IP=$(dig +short "$DOMAIN" A | tail -n1)
elif command -v getent >/dev/null 2>&1; then
    DOMAIN_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -n1)
fi
if [ -n "$HOST_IP" ] && [ -n "$DOMAIN_IP" ]; then
    if [ "$HOST_IP" = "$DOMAIN_IP" ]; then
        ok "$DOMAIN → $DOMAIN_IP matches this host"
    else
        warn "$DOMAIN → $DOMAIN_IP but this host appears to be $HOST_IP"
        warn "Caddy will not get a certificate until DNS points here."
    fi
else
    warn "Could not verify DNS automatically (HOST_IP=$HOST_IP, DOMAIN_IP=$DOMAIN_IP)"
fi

# ---------------------------------------------------------------------------
# 4. Build images
# ---------------------------------------------------------------------------
step "Building images (this is the slow step on a fresh host)"
dc build

# ---------------------------------------------------------------------------
# 5. Hash admin password if needed (use api image's bcrypt)
# ---------------------------------------------------------------------------
if [ "$NEEDS_HASH" = true ]; then
    step "Hashing admin password with bcrypt (inside api container)"
    HASH=$(printf '%s' "$ADMIN_PASSWORD" \
        | dc run --rm -T api \
              python -c 'import sys, bcrypt; sys.stdout.write(bcrypt.hashpw(sys.stdin.read().encode(), bcrypt.gensalt(rounds=12)).decode())' \
        | tr -d '\r')
    if [ -z "$HASH" ] || [[ "$HASH" != \$2* ]]; then
        fail "bcrypt hash looks wrong: '${HASH:0:8}...'"
    fi
    # Escape '$' and '/' for safe sed insertion
    ESC=$(printf '%s' "$HASH" | sed 's/[\/&]/\\&/g')
    sed -i.bak "s/^ADMIN_PASSWORD_HASH=.*/ADMIN_PASSWORD_HASH=${ESC}/" .env
    rm -f .env.bak
    unset ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM
    ok "ADMIN_PASSWORD_HASH written"
fi

# ---------------------------------------------------------------------------
# 6. Start stack
# ---------------------------------------------------------------------------
step "Starting stack"
dc up -d --remove-orphans

# ---------------------------------------------------------------------------
# 7. Wait for api health
# ---------------------------------------------------------------------------
step "Waiting for api to become healthy"
for i in $(seq 1 60); do
    if dc exec -T api \
            curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
        ok "api healthy after ${i}s"
        break
    fi
    if [ "$i" -eq 60 ]; then
        warn "api still not healthy after 60s. Showing last 50 lines:"
        dc logs --tail=50 api
        fail "Bootstrap aborted — investigate the api container."
    fi
    sleep 1
done

# ---------------------------------------------------------------------------
# 8. Migrations
# ---------------------------------------------------------------------------
step "Running database migrations (alembic upgrade head)"
dc exec -T api alembic upgrade head

# ---------------------------------------------------------------------------
# 9. Smoke test
# ---------------------------------------------------------------------------
step "Smoke-testing the auth endpoint"
HTTP=$(dc exec -T api \
    curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/auth/login \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"__wrong__\"}" \
    || true)
case "$HTTP" in
    401|422) ok "Auth endpoint responsive (HTTP $HTTP — wrong password rejected as expected)";;
    200)     warn "Auth endpoint returned 200 with __wrong__ — that's suspicious";;
    "")      warn "Could not reach auth endpoint";;
    *)       warn "Auth endpoint returned HTTP $HTTP";;
esac

# ---------------------------------------------------------------------------
# 10. Wait for Caddy / cert (own-edge mode only)
# ---------------------------------------------------------------------------
if [ "$EDGE_MODE" = "own" ]; then
    step "Waiting up to 60s for Caddy to obtain a certificate"
    CERT_OK=false
    for i in $(seq 1 30); do
        if curl -fsS --max-time 5 "https://${DOMAIN}/health" >/dev/null 2>&1; then
            CERT_OK=true
            ok "HTTPS endpoint live at https://${DOMAIN}"
            break
        fi
        sleep 2
    done
    if [ "$CERT_OK" = false ]; then
        warn "https://${DOMAIN}/health did not respond in 60s. Possible causes:"
        warn "  • DNS not pointing here yet (Let's Encrypt will retry)"
        warn "  • Port 80/443 blocked by firewall"
        warn "  • Caddy still issuing — tail logs: docker compose logs -f caddy"
    fi
else
    step "Shared-edge mode: skipping local Caddy probe"
    ok "Configure the upstream caddy to reverse_proxy https://${DOMAIN} to todo-web-1:80"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo
dc ps
echo
ok "Bootstrap complete."
echo
echo "  URL:      https://${DOMAIN}"
echo "  Admin:    ${ADMIN_USERNAME}"
echo "  Edge:     $EDGE_MODE"
echo
echo "Next steps:"
if [ "$EDGE_MODE" = "shared" ]; then
    echo "  • Add an upstream vhost reverse-proxying https://${DOMAIN} to"
    echo "    todo-web-1:80, then reload the upstream caddy."
fi
echo "  • Log in and configure an AI provider (Settings → AI 配置)."
echo "  • Set up backups: see backup.sh and DEPLOYMENT.md."
echo "  • For updates: ./deploy.sh   (set SHARED_CADDY=1 if applicable)"
