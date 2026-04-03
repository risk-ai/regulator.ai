-- Migration 012: Truth Snapshots
-- State snapshot caching for warrant verification

CREATE TABLE IF NOT EXISTS regulator.truth_snapshots (
  -- Identity
  snapshot_id TEXT PRIMARY KEY,
  snapshot_hash TEXT NOT NULL,
  
  -- Snapshot Data
  snapshot_data JSONB NOT NULL,
  
  -- Metadata
  captured_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Optional: Link to warrant if captured during issuance
  warrant_id TEXT,
  
  -- Expiration (snapshots can be purged after warrants expire)
  expires_at TIMESTAMP
);

-- Index for warrant lookups
CREATE INDEX IF NOT EXISTS idx_truth_snapshots_warrant_id 
ON regulator.truth_snapshots (warrant_id) 
WHERE warrant_id IS NOT NULL;

-- Index for cleanup (expired snapshots)
CREATE INDEX IF NOT EXISTS idx_truth_snapshots_expires_at 
ON regulator.truth_snapshots (expires_at) 
WHERE expires_at IS NOT NULL;

-- Index for hash verification
CREATE INDEX IF NOT EXISTS idx_truth_snapshots_hash 
ON regulator.truth_snapshots (snapshot_hash);

COMMENT ON TABLE regulator.truth_snapshots IS 'State snapshots captured at warrant issuance time for verification and audit trail';
COMMENT ON COLUMN regulator.truth_snapshots.snapshot_hash IS 'SHA256 hash of snapshot_data for tamper detection';
COMMENT ON COLUMN regulator.truth_snapshots.snapshot_data IS 'System state (agent registry, policies, config) at snapshot time';
