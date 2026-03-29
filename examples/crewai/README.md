# CrewAI + Vienna OS Integration

**Govern multi-agent crews with Vienna OS coordination**

This example shows how to wrap CrewAI agents and tasks with Vienna OS governance, ensuring coordinated multi-agent workflows follow policy constraints and approval workflows.

---

## Architecture

```
┌───────────────┐
│  CrewAI Crew  │  (Orchestrator + multiple agents)
└───────┬───────┘
        │
        ├─ Agent 1 (Researcher) → Vienna governance
        ├─ Agent 2 (Writer) → Vienna governance
        └─ Agent 3 (Editor) → Vienna governance
             │
             ▼
     ┌──────────────┐
     │  Vienna OS   │  (Policy + approval + coordination)
     └──────────────┘
```

**Key features:**
- Each agent's tasks governed independently
- Cross-agent coordination tracked in State Graph
- Approval gates can pause multi-agent workflows
- Full audit trail of agent interactions

---

## Quick Start

```bash
cd ~/regulator.ai/examples/crewai
pip install -r requirements.txt
python crewai_vienna.py
```

---

## Code Example

```python
# crewai_vienna.py
from crewai import Agent, Task, Crew
from vienna_sdk import ViennaGovernor

# Initialize Vienna governance
governor = ViennaGovernor(
    tenant='crewai-demo',
    api_key=os.getenv('VIENNA_API_KEY')
)

# Define governed task wrapper
def governed_task(agent, description, expected_output, risk_tier='T0'):
    \"\"\"Wrap CrewAI task with Vienna governance\"\"\"
    
    def execute_task(context):
        # Submit intent to Vienna
        intent = governor.submit_intent({
            'action': f'{agent.role}_task',
            'parameters': {
                'description': description,
                'context': context
            },
            'risk_tier': risk_tier
        })
        
        # Wait for approval (if T1/T2)
        result = governor.wait_for_execution(intent['execution_id'])
        
        if not result['success']:
            raise Exception(f\"Vienna denied: {result['reason']}\")
        
        # Execute actual task
        return agent.execute_task(description, context)
    
    return Task(
        description=description,
        expected_output=expected_output,
        agent=agent,
        callback=execute_task
    )

# Define agents
researcher = Agent(
    role='Researcher',
    goal='Find accurate information',
    backstory='Expert at web research',
    verbose=True
)

writer = Agent(
    role='Writer',
    goal='Write compelling content',
    backstory='Professional content writer',
    verbose=True
)

# Define governed tasks
research_task = governed_task(
    agent=researcher,
    description='Research AI governance best practices',
    expected_output='Summary of governance approaches',
    risk_tier='T0'  # Read-only research
)

writing_task = governed_task(
    agent=writer,
    description='Write blog post about AI governance',
    expected_output='1000-word blog post',
    risk_tier='T1'  # Requires approval (content creation)
)

# Create crew with Vienna governance
crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    verbose=2
)

# Execute crew (all tasks governed)
result = crew.kickoff()
print(result)
```

---

## Multi-Agent Coordination

Vienna OS tracks dependencies between agents:

```python
# Sequential workflow with governance
tasks = [
    governed_task(researcher, 'Research topic', 'Research summary', 'T0'),
    governed_task(analyst, 'Analyze findings', 'Analysis report', 'T0'),
    governed_task(writer, 'Write article', 'Article draft', 'T1'),
    governed_task(editor, 'Edit article', 'Final article', 'T2')  # Publishing = T2
]

crew = Crew(agents=[researcher, analyst, writer, editor], tasks=tasks)

# Vienna ensures:
# - Each task policy-checked before execution
# - T1 writing task requires approval
# - T2 publishing task requires approval + justification
# - Full causal chain tracked (research → analysis → writing → editing)
```

---

## Approval Workflow Example

```python
# High-risk task requiring approval
publish_task = governed_task(
    agent=publisher,
    description='Publish article to production blog',
    expected_output='Published URL',
    risk_tier='T2'  # Requires operator approval
)

# Vienna OS will:
# 1. Evaluate policy (check if publishing allowed)
# 2. Create approval request
# 3. Wait for operator decision
# 4. Execute if approved, deny if rejected
# 5. Attest execution result
```

**Operator approves via console:**
```bash
curl -X POST http://localhost:3100/api/v1/approvals/{approval_id}/approve \
  -H "Authorization: Bearer $VIENNA_API_KEY" \
  -d '{"operator": "max", "reason": "Article reviewed and approved"}'
```

---

## Testing

```python
# test_crewai_vienna.py
import pytest
from crewai_vienna import governed_task, governor

def test_t0_task_auto_approved():
    \"\"\"T0 tasks should execute without approval\"\"\"
    task = governed_task(
        agent=test_agent,
        description='Read-only research',
        expected_output='Data',
        risk_tier='T0'
    )
    
    result = task.execute({})
    assert result['approved'] == True
    assert 'attestation_id' in result

def test_t2_task_requires_approval():
    \"\"\"T2 tasks should wait for approval\"\"\"
    task = governed_task(
        agent=test_agent,
        description='Publish to production',
        expected_output='URL',
        risk_tier='T2'
    )
    
    # Should raise pending approval exception
    with pytest.raises(ApprovalPendingError):
        task.execute({})
```

---

## Production Deployment

```python
# production_crew.py
import os
from crewai import Agent, Task, Crew
from vienna_sdk import ViennaGovernor

# Production configuration
governor = ViennaGovernor(
    tenant=os.getenv('VIENNA_TENANT'),
    api_key=os.getenv('VIENNA_API_KEY'),
    api_url='https://console.regulator.ai'
)

# Set up approval notifications
governor.on('approval_required', lambda intent: 
    notify_slack(f\"Approval needed: {intent['action']}\")
)

# Define production crew
crew = Crew(
    agents=[...],
    tasks=[...],
    verbose=True
)

# Run with full governance
result = crew.kickoff()
```

---

## Comparison: CrewAI Native vs Vienna-Governed

| Feature | CrewAI Native | Vienna-Governed |
|---------|---------------|-----------------|
| Multi-agent coordination | Built-in | Enhanced with governance |
| Policy enforcement | None | Automatic per task |
| Approval workflow | None | T1/T2 require approval |
| Audit trail | Task logs | Immutable attestations |
| Cross-agent visibility | Limited | Full causal chain |
| Rollback | Manual | Automatic (if supported) |

---

## References

- Vienna SDK (Python): `pip install vienna-sdk`
- CrewAI: https://crewai.com/
- Governance Docs: `../../CANONICAL_EXECUTION_PATH.md`
