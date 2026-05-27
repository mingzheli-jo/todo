#!/bin/bash
set -e

BACKUP_DIR="./backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

echo "=== Toto Backup ==="

echo "Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump -U postgres toto | gzip > "$BACKUP_DIR/toto.sql.gz"

echo "Backing up .env..."
cp .env "$BACKUP_DIR/env.bak"

echo "Pruning backups older than 30 days..."
find ./backups -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

echo "=== Backup complete: $BACKUP_DIR ==="
ls -la "$BACKUP_DIR"
