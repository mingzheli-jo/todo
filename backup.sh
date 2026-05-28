#!/bin/bash
set -e

BACKUP_DIR="./backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

echo "=== Toto Backup ==="

# Pre-flight: verify postgres is running
if ! docker compose ps postgres 2>/dev/null | grep -q "running\|Up"; then
    echo "ERROR: postgres container is not running. Start with: docker compose up -d postgres"
    exit 1
fi

echo "Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump -U postgres toto | gzip > "$BACKUP_DIR/toto.sql.gz"

echo "Backing up .env..."
cp .env "$BACKUP_DIR/env.bak"

# Optional: flush Redis RDB to disk
echo "Flushing Redis RDB to disk (BGSAVE)..."
docker compose exec -T redis redis-cli BGSAVE > /dev/null 2>&1 || echo "  (Redis BGSAVE skipped — Redis may not be running)"

echo "Pruning backups older than 30 days..."
find ./backups -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "=== Backup complete: $BACKUP_DIR ==="
ls -la "$BACKUP_DIR"

echo ""
echo "Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""
echo "To restore:"
echo "  ./restore.sh $BACKUP_DIR"
echo "  -- or manually:"
echo "  gunzip -c $BACKUP_DIR/toto.sql.gz | docker compose exec -T postgres psql -U postgres -d toto"
