#!/bin/bash
set -e

BACKUP_DIR="${1:-}"

echo "=== Toto Restore ==="

# Validate argument
if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: ./restore.sh <backup-directory>"
    echo "Example: ./restore.sh ./backups/2026-05-28"
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Directory not found: $BACKUP_DIR"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/toto.sql.gz" ]; then
    echo "ERROR: No toto.sql.gz found in $BACKUP_DIR"
    exit 1
fi

echo "Backup to restore: $BACKUP_DIR/toto.sql.gz"
echo "Size: $(du -sh "$BACKUP_DIR/toto.sql.gz" | cut -f1)"
echo ""
read -p "This will OVERWRITE the toto database. Continue? [y/N]: " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Stopping api, worker, beat..."
docker compose stop api worker beat

echo "Dropping and recreating toto database..."
docker compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS toto;"
docker compose exec -T postgres psql -U postgres -c "CREATE DATABASE toto;"

echo "Restoring from $BACKUP_DIR/toto.sql.gz..."
gunzip -c "$BACKUP_DIR/toto.sql.gz" | docker compose exec -T postgres psql -U postgres -d toto

echo "Restarting api, worker, beat..."
docker compose start api worker beat

echo ""
echo "=== Restore complete ==="
echo "Verify at: http://localhost:8000/health"
