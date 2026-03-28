#!/bin/bash
# ================================================================
# Vienna Database Backup Script
# ================================================================
set -e

BACKUP_DIR="${BACKUP_DIR:-$HOME/.openclaw/backups}"
DB_NAME="${DB_NAME:-vienna_prod}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "🔄 Starting backup of $DB_NAME..."
mkdir -p "$BACKUP_DIR"

# Backup database
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "✅ Backup complete: $BACKUP_FILE"
echo "📦 Size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Cleanup old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "📊 Current backups:"
ls -lh "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null | tail -5 || echo "No backups found"

echo "✓ Backup complete"
