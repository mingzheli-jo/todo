#!/bin/bash
set -e

echo "=== Toto Deploy ==="

if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.example and fill in values."
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

if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull
fi

echo "Building containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

echo "Starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "Waiting for API to be ready..."
for i in $(seq 1 60); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "API is healthy!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "ERROR: API failed to start within 60 seconds"
        docker compose -f docker-compose.yml -f docker-compose.prod.yml logs api
        exit 1
    fi
    sleep 1
done

echo "Running database migrations explicitly..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api alembic upgrade head

echo "Verifying auth endpoint..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"${ADMIN_USERNAME:-admin}\",\"password\":\"check\"}" 2>/dev/null || true)
# 401 means auth is wired (wrong password is expected); 422/200 also acceptable
if [[ "$HTTP_STATUS" == "000" || "$HTTP_STATUS" == "502" || "$HTTP_STATUS" == "503" ]]; then
    echo "WARNING: Auth endpoint returned $HTTP_STATUS — check API logs"
else
    echo "Auth endpoint responding (HTTP $HTTP_STATUS) ✓"
fi

echo ""
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo ""
echo "=== Deploy complete: https://$DOMAIN ==="
