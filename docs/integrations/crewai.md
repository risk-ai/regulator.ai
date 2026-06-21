# CrewAI + Vienna OS Integration Guide

CrewAI enables you to build multi-agent systems where specialized agents collaborate to complete complex tasks. Vienna OS adds governance, policy enforcement, and warrant-based approval to CrewAI crews — ensuring that every sensitive action taken by your agents is auditable and policy-compliant.

---

## Overview

CrewAI agents use **tools** to interact with the world. Vienna OS integrates at the tool level: before any sensitive tool executes, a governance proposal is submitted. The tool executes only if a warrant is issued.

```
CrewAI Crew
├── Researcher Agent    → uses search tools (ungoverned, read-only)
├── Writer Agent        → uses file write tool (governed, medium risk)
└── Executor Agent      → uses API call tools (governed, high risk)
                                │
                                ▼
                          Vienna OS
                          ├── Policy evaluation
                          ├── Warrant issuance
                          └── Audit logging
```

---

## Prerequisites

```bash
pip install vienna-os crewai crewai-tools
```

```bash
export VIENNA_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."
```

---

## Python Integration

### Governed Tool Base Class

Create a reusable base class for governed CrewAI tools:

```python
# tools/governed_base.py
import os
import time
from abc import abstractmethod
from crewai.tools import BaseTool
from vienna_os import ViennaOS
from vienna_os.client import ViennaOSError
from pydantic import BaseModel

_vienna_client: ViennaOS | None = None

def get_vienna_client() -> ViennaOS:
    global _vienna_client
    if _vienna_client is None:
        _vienna_client = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])
    return _vienna_client


class GovernedTool(BaseTool):
    """
    Base class for Vienna OS governed tools.
    Subclass and implement `_execute()` — governance is handled automatically.
    """

    crew_agent_id: str = "crewai-agent"
    vienna_action: str = ""
    vienna_risk_tier: int | None = None
    approval_timeout_seconds: int = 300  # 5 minutes

    @abstractmethod
    def _execute(self, **kwargs) -> str:
        """Implement the actual tool logic here."""
        ...

    def _build_payload(self, **kwargs) -> dict:
        """Override to customize what's sent to Vienna OS for policy evaluation."""
        return {k: str(v)[:500] for k, v in kwargs.items()}  # Safe truncation

    def _run(self, **kwargs) -> str:
        client = get_vienna_client()
        action = self.vienna_action or self.name.lower().replace(" ", "_")
        payload = self._build_payload(**kwargs)

        try:
            proposal = client.submit_proposal(
                agent_id=self.crew_agent_id,
                action=action,
                payload=payload,
                risk_tier=self.vienna_risk_tier,
            )
        except ViennaOSError as e:
            return f"[Vienna OS Error] {e}. Action blocked for safety."

        if proposal["state"] == "denied":
            reason = proposal.get("error", "policy violation")
            return f"[Blocked] Action '{action}' denied by governance policy: {reason}"

        if proposal["state"] == "pending":
            # Wait for human approval
            deadline = time.time() + self.approval_timeout_seconds
            while time.time() < deadline:
                time.sleep(15)
                try:
                    warrant = client.get_warrant(proposal["id"])
                    if warrant.get("id"):
                        break
                except ViennaOSError:
                    pass
            else:
                return f"[Timeout] Action '{action}' waiting for human approval (proposal: {proposal['id']})"

        # Approved — execute
        warrant_id = (proposal.get("warrant") or {}).get("id", "auto")
        result = self._execute(**kwargs)
        return f"[Approved: {warrant_id}] {result}"
```

### Concrete Governed Tools

```python
# tools/governed_tools.py
from pydantic import Field
from crewai.tools import BaseTool
from .governed_base import GovernedTool


class SendEmailTool(GovernedTool):
    name: str = "send_email"
    description: str = "Send an email to a recipient. Requires Vienna OS governance approval."
    crew_agent_id: str = "crewai-executor"
    vienna_action: str = "send_email"

    class _Args(BaseModel):
        to: str = Field(description="Recipient email address")
        subject: str = Field(description="Email subject")
        body: str = Field(description="Email body")

    args_schema: type = _Args

    def _build_payload(self, **kwargs) -> dict:
        return {
            "to": kwargs.get("to"),
            "subject": kwargs.get("subject"),
            "body_length": len(kwargs.get("body", "")),
            "body_preview": kwargs.get("body", "")[:200],
        }

    def _execute(self, **kwargs) -> str:
        # import resend; resend.Emails.send({...})
        return f"Email sent to {kwargs['to']} with subject: {kwargs['subject']}"


class DatabaseWriteTool(GovernedTool):
    name: str = "database_write"
    description: str = "Write records to the database. High-risk operations require human approval."
    crew_agent_id: str = "crewai-executor"
    vienna_action: str = "database_write"
    vienna_risk_tier: int = 2  # Always route to human review

    class _Args(BaseModel):
        table: str = Field(description="Database table name")
        record: dict = Field(description="Record data to write")

    args_schema: type = _Args

    def _execute(self, **kwargs) -> str:
        # db.insert(kwargs["table"], kwargs["record"])
        return f"Record inserted into {kwargs['table']}"


class FileDeleteTool(GovernedTool):
    name: str = "delete_file"
    description: str = "Delete a file. This action requires human approval."
    crew_agent_id: str = "crewai-executor"
    vienna_action: str = "file_delete"
    vienna_risk_tier: int = 3  # Maximum risk

    class _Args(BaseModel):
        path: str = Field(description="Path to the file to delete")
        reason: str = Field(description="Justification for deletion")

    args_schema: type = _Args

    def _build_payload(self, **kwargs) -> dict:
        return {"path": kwargs.get("path"), "reason": kwargs.get("reason")}

    def _execute(self, **kwargs) -> str:
        import os
        os.remove(kwargs["path"])
        return f"File deleted: {kwargs['path']}"


class APICallTool(GovernedTool):
    name: str = "external_api_call"
    description: str = "Make an external API call. Governed by Vienna OS policy."
    crew_agent_id: str = "crewai-executor"
    vienna_action: str = "external_api_call"

    class _Args(BaseModel):
        url: str = Field(description="API endpoint URL")
        method: str = Field(description="HTTP method", default="GET")
        payload: dict = Field(description="Request payload", default_factory=dict)

    args_schema: type = _Args

    def _execute(self, **kwargs) -> str:
        import requests
        resp = requests.request(
            method=kwargs["method"],
            url=kwargs["url"],
            json=kwargs.get("payload"),
            timeout=30,
        )
        return f"API call returned {resp.status_code}: {resp.text[:500]}"
```

### Full Crew Example

```python
# main.py
import os
from crewai import Agent, Task, Crew, Process
from tools.governed_tools import SendEmailTool, DatabaseWriteTool, APICallTool

# Initialize governed tools
send_email = SendEmailTool()
db_write = DatabaseWriteTool()
api_call = APICallTool()

# Define agents
researcher = Agent(
    role="Data Researcher",
    goal="Research and compile relevant information",
    backstory="Expert at finding and synthesizing data from multiple sources",
    tools=[api_call],  # API calls are governed
    verbose=True,
)

writer = Agent(
    role="Content Writer",
    goal="Create engaging reports and communications",
    backstory="Skilled at translating data into clear communications",
    tools=[send_email],  # Email sending is governed
    verbose=True,
)

data_manager = Agent(
    role="Data Manager",
    goal="Ensure data integrity and proper record keeping",
    backstory="Meticulous about data quality and compliance",
    tools=[db_write],  # DB writes are governed
    verbose=True,
)

# Define tasks
research_task = Task(
    description="Research the latest AI governance regulations for Q2 2026",
    agent=researcher,
    expected_output="A summary of current AI governance regulations with key requirements",
)

write_task = Task(
    description="Write an executive summary email based on the research findings and send to compliance@company.com",
    agent=writer,
    expected_output="Confirmation that email was sent",
)

log_task = Task(
    description="Log the compliance research results to the audit database",
    agent=data_manager,
    expected_output="Confirmation of database record creation",
)

# Run crew
crew = Crew(
    agents=[researcher, writer, data_manager],
    tasks=[research_task, write_task, log_task],
    process=Process.sequential,
    verbose=True,
)

result = crew.kickoff()
print("Crew result:", result)
```

---

## Node.js / TypeScript Integration

CrewAI is primarily Python, but if you're using a TypeScript orchestrator with agent calls:

```typescript
import { ViennaOS } from '@vienna-os/client';

const vienna = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });

// Governance middleware for any CrewAI API call your TypeScript app makes
async function governedCrewAction(
  agentId: string,
  action: string,
  payload: Record<string, unknown>,
  execute: () => Promise<string>
): Promise<string> {
  const proposal = await vienna.submitProposal({ agentId, action, payload });

  switch (proposal.state) {
    case 'denied':
      return `❌ Blocked: ${proposal.error ?? 'policy violation'}`;
    case 'pending':
      return `⏳ Awaiting human approval (proposal: ${proposal.id})`;
    case 'approved':
      return execute();
    default:
      return `Unknown state: ${proposal.state}`;
  }
}

// Example usage from a Node.js API route that calls a Python CrewAI service
app.post('/api/run-crew', async (req, res) => {
  const { task, agentId } = req.body;

  const result = await governedCrewAction(
    agentId,
    'run_crew_task',
    { task, estimated_risk: 'medium' },
    async () => {
      // Call your Python CrewAI service
      const response = await fetch('http://crewai-service:8000/run', {
        method: 'POST',
        body: JSON.stringify({ task }),
      });
      return response.json();
    }
  );

  res.json({ result });
});
```

---

## Crew-Level Policy Strategies

### Risk-Based Crew Policies

```python
from vienna_os import ViennaOS

client = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])

# Policy: researcher agents (read-only) → auto-approve
# executor agents (write/delete) → human review
client.create_policy(
    name="CrewAI Executor Review",
    description="Route executor agent actions for human review",
    conditions={
        "executor_action": {
            "type": "action_matches_any",
            "patterns": ["database_write", "file_delete", "send_email", "external_api_call"],
        }
    },
    actions={
        "executor_action": {
            "action": "require_approval",
            "require_justification": False,
        }
    },
    tags=["crewai", "executor"],
)

# Policy: block agents from accessing competitor APIs
client.create_policy(
    name="Block Competitor API Access",
    conditions={
        "competitor_url": {
            "type": "payload_field_contains",
            "field": "url",
            "values": ["competitor1.com", "competitor2.io"],
        }
    },
    actions={"competitor_url": "deny"},
    priority=50,
)
```

### Per-Agent Policies

Register agents in the Vienna OS console (Agents → Register) and assign policies per agent:

```python
# T0 policy for researcher (auto-approve everything)
researcher_policy = client.create_policy(
    name="Researcher — Read Only",
    conditions={"all": {"type": "always"}},
    actions={"all": "auto_approve"},
    tags=["crewai", "researcher"],
)

# T2 policy for executor (human review required)
executor_policy = client.create_policy(
    name="Executor — Human Review",
    conditions={"all": {"type": "always"}},
    actions={"all": {"action": "require_approval", "require_justification": True}},
    tags=["crewai", "executor"],
)
```

---

## Common Pitfalls

### 1. Using one `agent_id` for all CrewAI agents

Each agent in your crew should have a distinct `agent_id`. This lets you apply different policies per role.

```python
# ❌ Bad: all agents share one ID
AGENT_ID = "crewai-agent"

# ✅ Right: distinct IDs per role
RESEARCHER_ID = "crewai-researcher-v1"
WRITER_ID = "crewai-writer-v1"
EXECUTOR_ID = "crewai-executor-v1"
```

### 2. Blocking the crew on `pending` proposals

Long approval waits will stall your crew. Design your polling with a timeout and return a meaningful message:

```python
if proposal["state"] == "pending":
    # Don't block indefinitely — return a status message
    return f"Task queued for approval. Crew can proceed with other tasks. Proposal: {proposal['id']}"
```

### 3. Not including justification for high-risk tools

Operators reviewing T2+ proposals need context. Include justification in the payload:

```python
payload = {
    "file_path": path,
    "reason": "Cleaning up temporary build artifacts older than 30 days",
    "initiator": "cleanup_crew",
}
```

### 4. Retrying on ViennaOSError without backoff

Vienna OS has rate limits. Wrap retries:

```python
import time

def submit_with_retry(client, **kwargs):
    for attempt in range(3):
        try:
            return client.submit_proposal(**kwargs)
        except ViennaOSError as e:
            if e.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            raise
```

### 5. Running crews in simulation without governance

Use `simulation=True` during development to test without real side effects — but still exercise the governance path:

```python
# In development
SIMULATION = os.environ.get("CREWAI_ENV", "prod") == "dev"

proposal = client.submit_proposal(
    ...,
    simulation=SIMULATION,  # Dry-run mode for dev
)
```

---

## Monitoring Crew Executions

View all crew activity in the Vienna OS console:

- **Proposals tab** — see every action proposal with state and timestamps
- **Audit Log** — immutable log of approvals, denials, and warrant issuance
- **Webhooks** — receive real-time notifications (warrant.approve, warrant.deny)

Register a webhook for crew monitoring:

```python
import requests

requests.post(
    "https://console.regulator.ai/api/v1/webhooks",
    json={
        "url": "https://your-ops-server.com/crew-events",
        "events": ["warrant.approve", "warrant.deny"],
        "secret": "your-webhook-secret",
    },
    headers={"Authorization": f"Bearer {os.environ['VIENNA_API_KEY']}"},
)
```

---

## Resources

- [Vienna OS Console](https://console.regulator.ai)
- [Python SDK README](../../../sdks/python/README.md)
- [CrewAI Documentation](https://docs.crewai.com)
- [API Reference](https://regulator.ai/docs/api)
- [Support](mailto:support@regulator.ai)
