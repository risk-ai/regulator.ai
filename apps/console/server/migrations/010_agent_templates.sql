-- Migration: Agent Templates
-- Description: Framework-specific governance templates with ready-to-use integration code
-- Date: 2026-04-10

CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  framework TEXT NOT NULL,  -- 'langchain', 'autogen', 'crewai', 'openai', 'anthropic', 'custom'
  icon TEXT DEFAULT '🤖',
  config JSONB DEFAULT '{}',
  code_snippet TEXT,
  tags TEXT[] DEFAULT '{}',
  use_count INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_templates_framework ON agent_templates(framework);
CREATE INDEX IF NOT EXISTS idx_agent_templates_enabled ON agent_templates(enabled);
CREATE INDEX IF NOT EXISTS idx_agent_templates_use_count ON agent_templates(use_count DESC);

-- Seed starter templates
INSERT INTO agent_templates (name, description, framework, icon, tags, code_snippet, config) VALUES
('LangChain Agent', 'Pre-configured LangChain agent with Vienna governance wrapper', 'langchain', '🦜', ARRAY['python', 'langchain', 'starter'], 
'from vienna import ViennaClient\nfrom langchain.agents import initialize_agent\n\nvienna = ViennaClient(api_key="your-key")\nagent = initialize_agent(tools, llm)\n\n# Wrap with Vienna governance\nresult = vienna.govern(agent.run, input="...")', '{"risk_tier": "T1"}'),

('OpenAI Function Agent', 'OpenAI function-calling agent with automatic warrant management', 'openai', '🧠', ARRAY['openai', 'functions', 'starter'],
'import { ViennaClient } from "vienna-os";\nimport OpenAI from "openai";\n\nconst vienna = new ViennaClient({ apiKey: "your-key" });\nconst openai = new OpenAI();\n\nconst result = await vienna.govern(async () => {\n  return openai.chat.completions.create({ ... });\n});', '{"risk_tier": "T0"}'),

('CrewAI Team', 'Multi-agent CrewAI team with Vienna policy enforcement', 'crewai', '👥', ARRAY['python', 'crewai', 'multi-agent'],
'from vienna import ViennaClient\nfrom crewai import Crew, Agent, Task\n\nvienna = ViennaClient(api_key="your-key")\ncrew = Crew(agents=[...], tasks=[...])\n\n# Vienna governs the entire crew execution\nresult = vienna.govern(crew.kickoff)', '{"risk_tier": "T2"}'),

('AutoGen Conversation', 'Microsoft AutoGen multi-agent conversation with governance', 'autogen', '💬', ARRAY['python', 'autogen', 'conversation'],
'from vienna import ViennaClient\nimport autogen\n\nvienna = ViennaClient(api_key="your-key")\nassistant = autogen.AssistantAgent("assistant", llm_config=config)\nuser = autogen.UserProxyAgent("user")\n\nvienna.govern(user.initiate_chat, assistant, message="...")', '{"risk_tier": "T1"}'),

('Anthropic Claude Agent', 'Claude-based agent with tool use and Vienna oversight', 'anthropic', '🎭', ARRAY['anthropic', 'claude', 'tools'],
'import { ViennaClient } from "vienna-os";\nimport Anthropic from "@anthropic-ai/sdk";\n\nconst vienna = new ViennaClient({ apiKey: "your-key" });\nconst claude = new Anthropic();\n\nconst result = await vienna.govern(async () => {\n  return claude.messages.create({ model: "claude-3-opus", ... });\n});', '{"risk_tier": "T0"}'),

('Custom Webhook Agent', 'Any agent framework via webhook integration', 'custom', '🔗', ARRAY['webhook', 'any-framework', 'flexible'],
'# Point your agent''s webhook to Vienna:\n# POST https://console.regulator.ai/api/v1/webhooks/execution-callback\n#\n# Headers:\n#   Authorization: Bearer <your-api-key>\n#   Content-Type: application/json\n#\n# Body: { "agent_id": "...", "action": "...", "payload": {...} }', '{"risk_tier": "T1"}')

ON CONFLICT DO NOTHING;

-- Helper function for incrementing use count
CREATE OR REPLACE FUNCTION increment_agent_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE agent_templates SET use_count = use_count + 1, updated_at = NOW() WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Also create increment_template_use_count for policy_templates if it doesn't exist
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE policy_templates SET use_count = use_count + 1, updated_at = NOW() WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE agent_templates IS 'Framework-specific governance templates with ready-to-use integration code';
