#!/bin/bash
set -e

echo "=== Toto Deploy ==="

if [ ! -f .env ]; then
    echo "ERROR: .env file not found. Copy .env.example and fill in values."
    exit 1
fi

source .env

for var in POSTGRES_PASSWORD JWT_SECRET DOMAIN; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set in .env"
        exit 1
    fi
done

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
        docker compose logs api
        exit 1
    fi
    sleep 1
done

echo ""
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo ""
echo "=== Deploy complete: https://$DOMAIN ==="
