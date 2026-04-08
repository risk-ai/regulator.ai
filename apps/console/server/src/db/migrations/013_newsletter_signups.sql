-- Migration 013: Newsletter Signups Table
-- Purpose: Store newsletter signups from marketing site (replaces /tmp file storage)
-- Author: Vienna
-- Date: 2026-04-08

CREATE TABLE IF NOT EXISTS regulator.newsletter_signups (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip VARCHAR(45), -- IPv4 (15) or IPv6 (45) max length
  user_agent TEXT,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_newsletter_signups_email ON regulator.newsletter_signups(email);

-- Index for analytics queries (signups over time)
CREATE INDEX IF NOT EXISTS idx_newsletter_signups_timestamp ON regulator.newsletter_signups(timestamp DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION regulator.update_newsletter_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_signups_updated_at
  BEFORE UPDATE ON regulator.newsletter_signups
  FOR EACH ROW
  EXECUTE FUNCTION regulator.update_newsletter_signups_updated_at();
