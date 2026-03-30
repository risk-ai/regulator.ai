-- Agent Templates
-- Phase 31, Feature 5

CREATE TABLE IF NOT EXISTS agent_templates (
  id TEXT PRIMARY KEY DEFAULT ('atpl_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  framework TEXT NOT NULL, -- 'langchain', 'autogpt', 'crewai', 'custom'
  icon TEXT, -- emoji or icon name
  enabled BOOLEAN DEFAULT true,
  config JSONB NOT NULL, -- Agent configuration
  policies JSONB NOT NULL, -- Recommended policies
  integration_code TEXT, -- Sample code
  quick_start_guide TEXT, -- Markdown guide
  tags TEXT[], -- For filtering/search
  use_count INTEGER DEFAULT 0, -- Track popularity
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_templates_framework ON agent_templates(framework);
CREATE INDEX idx_agent_templates_enabled ON agent_templates(enabled);
CREATE INDEX idx_agent_templates_use_count ON agent_templates(use_count DESC);

-- Insert default templates
INSERT INTO agent_templates (name, description, framework, icon, config, policies, integration_code, quick_start_guide, tags) VALUES

-- 1. LangChain Agent
(
  'LangChain Agent',
  'Governance for LangChain agents with tool use monitoring and approval workflows.',
  'langchain',
  '🦜',
  '{
    "capabilities": ["tool_use", "memory", "reasoning"],
    "recommended_policies": ["tool_approval", "rate_limiting"]
  }'::jsonb,
  '[
    {"template_id": "high_risk_action_review", "customizations": {"condition": "tool_use"}},
    {"template_id": "rate_limiting_protection", "customizations": {"limit": 100}}
  ]'::jsonb,
  'from langchain.agents import AgentExecutor
from vienna_sdk import ViennaGovernance

# Initialize Vienna governance
vienna = ViennaGovernance(api_key="your_api_key")

# Wrap agent with governance
governed_agent = vienna.wrap_agent(agent_executor)

# All tool calls now require approval per policy
result = governed_agent.run("Process customer refund")',
  '# LangChain + Vienna OS Integration

## Quick Start

1. Install Vienna SDK: `pip install vienna-sdk`
2. Register agent in Vienna OS console
3. Configure policies (use "Tool Use Approval" template)
4. Wrap your LangChain agent with Vienna governance
5. All tool calls will be monitored and governed

## Example Policies

- **Tool Use Approval**: Require approval before executing tools
- **Rate Limiting**: Prevent runaway agents (max 100 actions/hour)
- **Cost Control**: Set daily budget limits',
  ARRAY['langchain', 'python', 'tool-use', 'llm']
),

-- 2. AutoGPT Agent
(
  'AutoGPT Agent',
  'Governance for autonomous AutoGPT agents with multi-step approval and safety limits.',
  'autogpt',
  '🤖',
  '{
    "capabilities": ["autonomous", "multi_step", "goal_oriented"],
    "recommended_policies": ["multi_step_approval", "resource_limits"]
  }'::jsonb,
  '[
    {"template_id": "high_risk_action_review", "customizations": {"multi_step": true}},
    {"template_id": "cost_control_budget", "customizations": {"daily_limit": 50}}
  ]'::jsonb,
  'from autogpt import AutoGPT
from vienna_sdk import ViennaGovernance

vienna = ViennaGovernance(api_key="your_api_key")

# Wrap AutoGPT with governance
agent = AutoGPT(...)
governed_agent = vienna.wrap_agent(agent, mode="autonomous")

# Multi-step plans require approval
governed_agent.start(goal="Analyze market trends")',
  '# AutoGPT + Vienna OS Integration

## Quick Start

1. Install: `pip install vienna-sdk autogpt`
2. Register autonomous agent in Vienna console
3. Apply "Multi-Step Approval" policy
4. Set resource limits (time, cost, actions)
5. AutoGPT will pause at each step for approval

## Safety Features

- **Multi-step visibility**: See full plan before execution
- **Resource limits**: Prevent infinite loops
- **Cost controls**: Set daily/weekly budgets',
  ARRAY['autogpt', 'autonomous', 'multi-step', 'goal-oriented']
),

-- 3. CrewAI Multi-Agent
(
  'CrewAI Multi-Agent System',
  'Governance for CrewAI multi-agent systems with coordination and conflict prevention.',
  'crewai',
  '🧑‍🤝‍🧑',
  '{
    "capabilities": ["multi_agent", "coordination", "task_delegation"],
    "recommended_policies": ["multi_agent_coordination", "resource_sharing"]
  }'::jsonb,
  '[
    {"template_id": "multi_agent_coordination", "customizations": {"max_concurrent": 5}},
    {"template_id": "rate_limiting_protection", "customizations": {"per_agent": true}}
  ]'::jsonb,
  'from crewai import Crew, Agent
from vienna_sdk import ViennaGovernance

vienna = ViennaGovernance(api_key="your_api_key")

# Create crew with governance
crew = Crew(
  agents=[researcher, writer, editor],
  tasks=[research_task, write_task, edit_task]
)

governed_crew = vienna.wrap_crew(crew)
governed_crew.kickoff()',
  '# CrewAI + Vienna OS Integration

## Quick Start

1. Install: `pip install vienna-sdk crewai`
2. Register each agent in crew
3. Apply "Multi-Agent Coordination" policy
4. CrewAI crew will coordinate through Vienna

## Coordination Features

- **Conflict detection**: Prevent agents from conflicting actions
- **Resource sharing**: Coordinate access to shared resources
- **Task visibility**: See which agent is doing what',
  ARRAY['crewai', 'multi-agent', 'coordination', 'crew']
),

-- 4. Custom API Agent
(
  'Custom API Agent',
  'Generic governance template for any agent that makes HTTP/API calls.',
  'custom',
  '🔌',
  '{
    "capabilities": ["api_calls", "webhooks", "integrations"],
    "recommended_policies": ["external_api_safety", "rate_limiting"]
  }'::jsonb,
  '[
    {"template_id": "external_api_safety", "customizations": {"review_all": true}},
    {"template_id": "rate_limiting_protection", "customizations": {"limit": 50}}
  ]'::jsonb,
  'import requests
from vienna_sdk import ViennaGovernance

vienna = ViennaGovernance(api_key="your_api_key", agent_id="my-agent")

# Register action with governance
@vienna.governed_action("api_call")
def call_external_api(url, data):
    # Vienna will check policies before executing
    response = requests.post(url, json=data)
    return response.json()

# Use governed action
result = call_external_api("https://api.example.com/action", {...})',
  '# Custom Agent + Vienna OS Integration

## Quick Start

1. Install: `pip install vienna-sdk`
2. Register your agent
3. Wrap API calls with `@governed_action` decorator
4. Vienna will enforce policies on every call

## Use Cases

- **Webhooks**: Govern outbound webhooks
- **Third-party APIs**: Require approval for external calls
- **Integrations**: Monitor all integration activity',
  ARRAY['custom', 'api', 'http', 'webhooks', 'generic']
),

-- 5. Local LLM Agent
(
  'Local LLM Agent (Ollama/LM Studio)',
  'Governance for locally-hosted LLM agents with resource monitoring.',
  'custom',
  '💻',
  '{
    "capabilities": ["local_llm", "privacy", "cost_free"],
    "recommended_policies": ["resource_monitoring", "data_privacy"]
  }'::jsonb,
  '[
    {"template_id": "data_privacy_protection", "customizations": {"block_pii": true}},
    {"template_id": "rate_limiting_protection", "customizations": {"limit": 200}}
  ]'::jsonb,
  'from ollama import Client
from vienna_sdk import ViennaGovernance

vienna = ViennaGovernance(api_key="your_api_key", agent_id="local-llm")
ollama = Client()

@vienna.governed_action("llm_inference")
def generate(prompt):
    response = ollama.generate(model="llama2", prompt=prompt)
    return response["response"]

# Vienna monitors all inferences
result = generate("Summarize this document...")',
  '# Local LLM + Vienna OS Integration

## Quick Start

1. Install: `pip install vienna-sdk ollama`
2. Register local LLM agent
3. Apply "Data Privacy Protection" policy
4. All inferences are monitored (but stay local)

## Benefits

- **Privacy**: Data never leaves your infrastructure
- **Cost**: No API costs
- **Compliance**: Full control over data
- **Monitoring**: Still get governance visibility',
  ARRAY['ollama', 'lm-studio', 'local', 'privacy', 'self-hosted']
);

-- Function to increment template use count
CREATE OR REPLACE FUNCTION increment_agent_template_use_count(template_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_templates
  SET use_count = use_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;
