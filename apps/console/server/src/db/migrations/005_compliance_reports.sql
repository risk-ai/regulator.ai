-- Migration 005: Compliance Reports
-- Vienna OS — Governance compliance reporting and scheduled generation

-- Generated compliance reports
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Report type: 'weekly', 'monthly', 'quarterly', 'annual', 'custom', 'incident'
  report_type VARCHAR(50) NOT NULL,
  -- Report title
  title VARCHAR(500) NOT NULL,
  -- Time range
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  -- Report data (full JSON, used to render report)
  report_data JSONB NOT NULL,
  -- Status: generating, ready, failed
  status VARCHAR(50) NOT NULL DEFAULT 'generating',
  -- Who requested it
  generated_by VARCHAR(255) NOT NULL DEFAULT 'system',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional: scheduled generation
  schedule_cron VARCHAR(100),
  -- Recipient list for auto-email
  recipients JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at ON compliance_reports(generated_at DESC);

-- Report templates (customizable sections)
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Sections to include (ordered array)
  sections JSONB NOT NULL DEFAULT '[]',
  -- Default for which report type
  report_type VARCHAR(50),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default template
INSERT INTO report_templates (name, description, report_type, is_default, sections) VALUES
('Standard Governance Report', 'Comprehensive AI governance report suitable for board presentation', 'quarterly', true, '[
  "executive_summary",
  "governance_overview",
  "action_volume",
  "policy_compliance",
  "agent_performance",
  "risk_analysis",
  "approval_metrics",
  "violations_incidents",
  "integration_health",
  "recommendations"
]')
ON CONFLICT DO NOTHING;
