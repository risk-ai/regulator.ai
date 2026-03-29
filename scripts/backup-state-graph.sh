#!/bin/bash
# Automated State Graph Backup
# Runs hourly via cron

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/vienna}"
STATE_DB="${STATE_DB:-$HOME/.openclaw/workspace/vienna-core/state/state.db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/state-graph-$TIMESTAMP.db"

# Perform backup (SQLite VACUUM INTO for consistency)
echo "[$(date)] Starting State Graph backup..."
sqlite3 "$STATE_DB" "VACUUM INTO '$BACKUP_FILE'"

# Verify backup
if sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" | grep -q "ok"; then
  echo "[$(date)] Backup verified: $BACKUP_FILE"
else
  echo "[$(date)] ERROR: Backup verification failed!"
  exit 1
fi

# Compress backup
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Calculate checksum
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"

# Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ]; then
  echo "[$(date)] Uploading to S3: $S3_BUCKET"
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/vienna-backups/$(basename $BACKUP_FILE)"
  aws s3 cp "$BACKUP_FILE.sha256" "s3://$S3_BUCKET/vienna-backups/$(basename $BACKUP_FILE.sha256)"
fi

# Clean old backups
echo "[$(date)] Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "state-graph-*.db.gz" -mtime +$RETENTION_DAYS -delete

# Log backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Emit metrics (if Prometheus pushgateway configured)
if [ -n "$PUSHGATEWAY_URL" ]; then
  cat <<EOF | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/vienna_backup"
# TYPE vienna_backup_size_bytes gauge
vienna_backup_size_bytes $(stat -c%s "$BACKUP_FILE")
# TYPE vienna_backup_timestamp gauge
vienna_backup_timestamp $(date +%s)
EOF
fi
