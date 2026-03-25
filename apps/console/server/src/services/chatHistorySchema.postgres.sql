-- Chat History Schema (Postgres)
-- Converted from SQLite for Vercel Postgres compatibility
-- Created: 2026-03-24

-- Threads table
CREATE TABLE IF NOT EXISTS threads (
  threadId TEXT PRIMARY KEY,
  createdAt TIMESTAMPTZ NOT NULL,
  updatedAt TIMESTAMPTZ NOT NULL,
  title TEXT,
  pageContext TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  messageCount INTEGER NOT NULL DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  messageId TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  classification TEXT,
  provider TEXT,
  providerMode TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  timestamp TIMESTAMPTZ NOT NULL,
  
  linkedObjectiveId TEXT,
  linkedEnvelopeId TEXT,
  linkedDecisionId TEXT,
  linkedServiceId TEXT,
  auditRef TEXT,
  
  actionTaken TEXT,
  
  selectedObjectiveId TEXT,
  selectedFileIds TEXT,
  selectedService TEXT,
  currentPage TEXT,
  
  FOREIGN KEY (threadId) REFERENCES threads(threadId)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_threadId 
ON messages(threadId);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
ON messages(timestamp);

CREATE INDEX IF NOT EXISTS idx_threads_status 
ON threads(status);

CREATE INDEX IF NOT EXISTS idx_threads_updatedAt 
ON threads(updatedAt);
