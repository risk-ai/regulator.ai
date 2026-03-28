# Vienna OS + CrewAI Integration

This example shows how to integrate Vienna OS governance with CrewAI agents and crews. It demonstrates how multi-agent crews can submit tasks to Vienna OS for policy evaluation and approval before execution.

## What This Does

- **Governs CrewAI tasks** through Vienna OS policies
- **Manages crew coordination** with risk-aware task distribution  
- **Handles multi-agent approvals** for complex workflows
- **Provides task audit trails** across entire crew executions
- **Demonstrates role-based permissions** for different agent types

## Prerequisites

- Python 3.8+
- Vienna OS API key (`vna_xxx`)
- CrewAI library

## Installation

```bash
# From the examples/crewai directory
pip install -r requirements.txt

# Set your Vienna OS API key
export VIENNA_API_KEY=vna_your_api_key_here
```

## Quick Start

```bash
# Run the example
python main.py

# Or run specific crew scenarios
python main.py --scenario research_crew
python main.py --scenario content_crew  
python main.py --scenario finance_crew
```

## How It Works

### 1. Task Intent Submission

Before executing any task, CrewAI agents submit intents to Vienna OS:

```python
from vienna_sdk import create_for_crewai

vienna = create_for_crewai(
    api_key=os.environ['VIENNA_API_KEY'],
    agent_id='crew-researcher'
)

# Submit a task intent
result = await vienna.submit_task_intent('market_research', {
    'topic': 'AI governance trends',
    'depth': 'comprehensive',
    'sources': ['academic', 'industry', 'regulatory']
})
```

### 2. Crew-Level Governance

Vienna OS evaluates tasks based on:
- **Agent role and capabilities**: Researchers vs. content creators vs. analysts
- **Task complexity and risk**: Simple searches vs. data processing vs. external APIs
- **Resource requirements**: Computation, API calls, data access
- **Coordination policies**: Which agents can work together

### 3. Multi-Agent Approval

For complex crews, Vienna OS can:
- Require approval for **lead agent** actions that affect the entire crew
- Auto-approve **individual agent** tasks within approved scope  
- Block **unauthorized collaboration** between restricted agents
- Enforce **data sharing policies** between crew members

## Example Crews

### Research Crew (T1 - Policy Approved)

```python
research_crew = Crew(
    agents=[researcher, analyst, fact_checker],
    tasks=[
        governed_task('web_research', {'query': 'AI governance 2024'}),
        governed_task('data_analysis', {'sources': ['web_research']}),
        governed_task('fact_verification', {'claims': ['data_analysis']})
    ]
)
```

**Outcome**: Research tasks are medium-risk (T1) and approved by policy automatically.

### Content Crew (T1 - Policy Approved)

```python
content_crew = Crew(
    agents=[writer, editor, reviewer],
    tasks=[
        governed_task('draft_article', {'topic': 'research_summary'}),
        governed_task('edit_content', {'draft': ['draft_article']}),
        governed_task('publish_review', {'content': ['edit_content']})
    ]
)
```

**Outcome**: Content creation is approved with content policy constraints.

### Finance Crew (T2 - Human Approval Required)

```python
finance_crew = Crew(
    agents=[analyst, trader, risk_manager],
    tasks=[
        governed_task('market_analysis', {'symbols': ['NVDA', 'MSFT']}),
        governed_task('trade_recommendation', {'analysis': ['market_analysis']}), 
        governed_task('execute_trade', {'recommendation': ['trade_recommendation']})
    ]
)
```

**Outcome**: Trading actions require human approval due to financial risk.

## Policy Configuration

Vienna OS evaluates CrewAI tasks using policies like:

```yaml
# Research tasks (T1 - Auto-approved)
- name: "CrewAI Research Policy"
  conditions:
    - field: "task_type" 
      operator: "in"
      value: ["web_research", "data_analysis", "fact_verification"]
    - field: "agent_role"
      operator: "equals"
      value: "researcher"
  actions: ["approve"]
  tier: "T1"

# Content creation (T1 - Policy approved)  
- name: "CrewAI Content Policy"
  conditions:
    - field: "task_type"
      operator: "in" 
      value: ["draft_article", "edit_content"]
    - field: "crew_context.domain"
      operator: "equals"
      value: "internal_docs"
  actions: ["approve"]
  tier: "T1"

# Financial operations (T2 - Human approval)
- name: "CrewAI Finance Policy"
  conditions:
    - field: "task_type"
      operator: "equals"
      value: "execute_trade"
    - field: "task_payload.amount"
      operator: "greater_than"
      value: 10000
  actions: ["require_approval"]
  tier: "T2"
```

## Code Structure

```python
import os
from crewai import Agent, Task, Crew
from vienna_sdk import create_for_crewai

# Initialize Vienna adapter
vienna = create_for_crewai(
    api_key=os.environ['VIENNA_API_KEY'],
    agent_id='crewai-demo'
)

async def governed_task(task_type: str, payload: dict) -> Task:
    """Creates a CrewAI task wrapped with Vienna governance."""
    
    async def execute_task():
        # Submit intent to Vienna OS
        result = await vienna.submit_task_intent(task_type, payload)
        
        if result.status in ['approved', 'auto-approved']:
            # Execute original task logic
            task_result = await original_task_execution(task_type, payload)
            
            # Report execution
            await vienna.report_execution(result.execution_id, 'success', {
                'result': task_result
            })
            
            return task_result
        else:
            raise Exception(f"Task requires approval: {result.poll_url}")
    
    return Task(description=f"Governed {task_type}", execution_function=execute_task)
```

## Deployment

### Environment Setup

```bash
# Production Vienna OS
export VIENNA_API_KEY=vna_prod_key_here
export VIENNA_API_URL=https://api.vienna-os.dev

# Agent identification  
export CREW_ID=production-research-crew
export CREW_ENVIRONMENT=production
```

### Crew Registration

```python
# Register the entire crew with Vienna OS
await vienna.register({
    'crew_id': 'research-crew-v1',
    'agents': ['researcher', 'analyst', 'fact-checker'], 
    'capabilities': 'web_research,data_analysis,fact_verification',
    'framework': 'crewai',
    'version': '1.0.0'
})
```

## Advanced Features

### Role-Based Task Distribution

```python
# Different agents have different permissions
researcher_vienna = create_for_crewai(api_key=key, agent_id='crew-researcher')
analyst_vienna = create_for_crewai(api_key=key, agent_id='crew-analyst')
writer_vienna = create_for_crewai(api_key=key, agent_id='crew-writer')

# Researcher: Can access external APIs
await researcher_vienna.submit_task_intent('web_research', {...})

# Analyst: Can process data but not access external sources  
await analyst_vienna.submit_task_intent('data_analysis', {...})

# Writer: Can create content but not access raw data
await writer_vienna.submit_task_intent('content_generation', {...})
```

### Crew Coordination Policies

```python
# Crew-level intent for coordinated actions
await vienna.submit_task_intent('crew_coordination', {
    'lead_agent': 'researcher',
    'participating_agents': ['analyst', 'fact_checker'],
    'coordination_type': 'sequential',
    'data_sharing': True
})
```

## Monitoring & Debugging

```python
# Get crew execution status
crew_status = await vienna.get_crew_status('research-crew-v1')

# Monitor individual agent activities
agent_metrics = await vienna.get_agent_metrics('crew-researcher') 

# Review task audit trails
audit_trail = await vienna.get_audit_trail(
    crew_id='research-crew-v1',
    time_range='24h'
)
```

## Next Steps

1. **Configure crew policies** in the Vienna console
2. **Set up approval workflows** for high-risk crew activities  
3. **Monitor crew performance** with Vienna's fleet management
4. **Scale to production** with proper error handling and retries
5. **Integrate with CI/CD** for automated crew deployments

## Learn More

- [Vienna OS Documentation](https://regulator.ai/docs)
- [CrewAI Documentation](https://crewai.com/docs)
- [Multi-Agent Governance Guide](https://regulator.ai/docs/multi-agent)
- [Policy Templates for CrewAI](https://regulator.ai/docs/templates/crewai)

## Support

- Issues: [GitHub Issues](https://github.com/risk-ai/regulator.ai/issues)
- Community: [Discord](https://discord.gg/vienna-os)  
- Email: support@regulator.ai