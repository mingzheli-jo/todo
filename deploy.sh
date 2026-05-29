#!/bin/bash
set -e

echo "=== Toto Deploy ==="

# Edge mode: own (default) or shared (upstream caddy on host).
# Toggle with SHARED_CADDY=1 ./deploy.sh
if [ "${SHARED_CADDY:-0}" = "1" ]; then
    COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.shared-caddy.yml)
    EDGE_MODE="shared"
else
    COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)
    EDGE_MODE="own"
fi
echo "Edge mode: $EDGE_MODE"
dc() { docker compose "${COMPOSE_FILES[@]}" "$@"; }

if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Run ./bootstrap.sh for first-time setup."
    exit 1
fi

source .env

# Verify required env vars
for var in POSTGRES_PASSWORD JWT_SECRET DOMAIN ADMIN_PASSWORD_HASH ENCRYPTION_KEY; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set in .env"
        exit 1
    fi
done

# Verify ENCRYPTION_KEY is exactly 44 characters (base64 Fernet key)
if [ ${#ENCRYPTION_KEY} -ne 44 ]; then
    echo "ERROR: ENCRYPTION_KEY must be exactly 44 characters (Fernet base64 key)."
    echo "       Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    exit 1
fi

# Shared-edge prerequisite: web_proxy network must exist.
if [ "$EDGE_MODE" = "shared" ]; then
    if ! docker network inspect web_proxy >/dev/null 2>&1; then
        echo "ERROR: SHARED_CADDY=1 but docker network 'web_proxy' does not exist."
        echo "       Run: docker network create web_proxy && docker network connect web_proxy <upstream-caddy>"
        exit 1
    fi
fi

if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull
fi

echo "Building containers..."
dc build

echo "Starting services..."
dc up -d --remove-orphans

echo "Waiting for API to be ready..."
for i in $(seq 1 60); do
    if dc exec -T api curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "API is healthy!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "ERROR: API failed to start within 60 seconds"
        dc logs api
        exit 1
    fi
    sleep 1
done

echo "Running database migrations explicitly..."
dc exec -T api alembic upgrade head

echo "Verifying auth endpoint..."
HTTP_STATUS=$(dc exec -T api curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_USERNAME:-admin}\",\"password\":\"check\"}" 2>/dev/null || true)
# 401 means auth is wired (wrong password is expected); 422/200 also acceptable
if [[ "$HTTP_STATUS" == "000" || "$HTTP_STATUS" == "502" || "$HTTP_STATUS" == "503" ]]; then
    echo "WARNING: Auth endpoint returned $HTTP_STATUS — check API logs"
else
    echo "Auth endpoint responding (HTTP $HTTP_STATUS) ✓"
fi

echo ""
dc ps
echo ""
echo "=== Deploy complete (edge=$EDGE_MODE): https://$DOMAIN ==="
