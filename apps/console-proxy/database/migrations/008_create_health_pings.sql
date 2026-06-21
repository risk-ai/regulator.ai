-- Migration 008: Create health_pings table for status page uptime tracking
-- Run this migration to enable the /status uptime calculation
-- Created: 2026-06-21

SET search_path TO regulator, public;

CREATE TABLE IF NOT EXISTS regulator.health_pings (
  id              SERIAL PRIMARY KEY,
  service         TEXT NOT NULL,                    -- 'api' | 'console' | 'marketing'
  status          TEXT NOT NULL,                    -- 'healthy' | 'degraded' | 'down'
  latency_ms      INTEGER,                          -- response time in ms
  status_code     INTEGER,                          -- HTTP status code
  error           TEXT,                             -- error message if failed
  pinged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient uptime queries
CREATE INDEX IF NOT EXISTS idx_health_pings_service_pinged_at
  ON regulator.health_pings (service, pinged_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_pings_pinged_at
  ON regulator.health_pings (pinged_at DESC);

-- Auto-cleanup: only keep 30 days of ping history
-- (Run as a periodic cleanup job or via pg_cron)
-- DELETE FROM regulator.health_pings WHERE pinged_at < NOW() - INTERVAL '30 days';

COMMENT ON TABLE regulator.health_pings IS 'Health ping history for status page uptime calculation';
