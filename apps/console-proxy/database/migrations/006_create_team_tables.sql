-- Migration 006: Create team_members and team_invitations tables
-- Required by: apps/console-proxy/api/v1/team.js

CREATE TABLE IF NOT EXISTS regulator.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES regulator.tenants(id),
  user_id UUID REFERENCES regulator.users(id),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regulator.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES regulator.tenants(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  token VARCHAR(255),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed from existing users
INSERT INTO regulator.team_members (tenant_id, user_id, role, status, invited_at)
SELECT tenant_id, id, COALESCE(role, 'viewer'), 'active', created_at
FROM regulator.users
WHERE tenant_id IS NOT NULL
ON CONFLICT DO NOTHING;
