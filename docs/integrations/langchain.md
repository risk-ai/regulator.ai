# LangChain + Vienna OS Integration Guide

Add enterprise-grade AI governance to LangChain agents, chains, and tools. Vienna OS enforces policies, routes sensitive actions for human review, and provides an immutable audit trail — all without changing your application code architecture.

---

## Overview

LangChain agents call tools to take actions in the world. Vienna OS wraps those tool calls with governance:

```
LangChain Agent
    │
    ├── Tool: search_web       → ungoverned (read-only, low risk)
    ├── Tool: send_email       → governed (write, medium risk)
    └── Tool: execute_trade    → governed (financial, high risk)
                                    │
                                    ▼
                              Vienna OS
                                    │
                              ├── T0/T1: auto-approve
                              ├── T2: human review
                              └── Block: denied
```

---

## Prerequisites

```bash
pip install vienna-os langchain langchain-openai
```

Set environment variables:
```bash
export VIENNA_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."
```

---

## Python Integration

### Governed Tool Wrapper

The cleanest pattern is a decorator that wraps any LangChain tool with governance:

```python
import os
import time
from functools import wraps
from typing import Any, Callable
from langchain.tools import tool
from vienna_os import ViennaOS
from vienna_os.client import ViennaOSError

vienna = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])

def governed(agent_id: str, action: str, risk_tier: int | None = None):
    """
    Decorator: wrap a function with Vienna OS governance.
    
    Usage:
        @governed(agent_id="my-agent", action="send_email")
        def send_email(to: str, subject: str) -> str:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Build payload from function args
            payload = dict(zip(func.__code__.co_varnames, args))
            payload.update(kwargs)
            
            proposal = vienna.submit_proposal(
                agent_id=agent_id,
                action=action,
                payload=payload,
                risk_tier=risk_tier,
            )
            
            if proposal["state"] == "denied":
                return f"Action blocked by policy: {proposal.get('error', 'policy violation')}"
            
            if proposal["state"] == "pending":
                # Poll for approval (max 5 minutes)
                for _ in range(30):
                    time.sleep(10)
                    try:
                        warrant = vienna.get_warrant(proposal["id"])
                        if warrant.get("id"):
                            # Approved after review
                            break
                    except ViennaOSError:
                        pass
                else:
                    return "Action timed out waiting for approval"
            
            # Execute the actual function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


# --- Governed LangChain Tools ---

@tool
@governed(agent_id="langchain-agent", action="send_email")
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email to the specified recipient."""
    # Your actual email logic here
    return f"Email sent to {to}"

@tool
@governed(agent_id="langchain-agent", action="database_write", risk_tier=2)
def write_to_database(table: str, data: dict) -> str:
    """Write data to the specified database table."""
    # Your actual DB write logic here
    return f"Wrote {len(data)} fields to {table}"

@tool
@governed(agent_id="langchain-agent", action="file_delete", risk_tier=3)
def delete_file(path: str) -> str:
    """Delete a file at the given path."""
    import os
    os.remove(path)
    return f"Deleted {path}"
```

### Full Agent Example

```python
import os
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
from vienna_os import ViennaOS
from vienna_os.client import ViennaOSError

vienna = ViennaOS(api_key=os.environ["VIENNA_API_KEY"])
AGENT_ID = "langchain-production-agent-001"


def submit_with_governance(action: str, payload: dict) -> tuple[bool, str]:
    """Submit to Vienna OS; return (approved, message)."""
    try:
        proposal = vienna.submit_proposal(
            agent_id=AGENT_ID,
            action=action,
            payload=payload,
        )
        
        if proposal["state"] == "denied":
            return False, f"Blocked: {proposal.get('error', 'policy violation')}"
        
        if proposal["state"] == "pending":
            return False, f"Awaiting approval (ID: {proposal['id']})"
        
        # approved
        warrant_id = proposal.get("warrant", {}).get("id", "unknown")
        return True, f"Approved (warrant: {warrant_id})"
    
    except ViennaOSError as e:
        return False, f"Governance error: {e}"


@tool
def send_customer_email(customer_id: str, subject: str, message: str) -> str:
    """Send an email to a customer. Requires Vienna OS approval."""
    approved, result_msg = submit_with_governance(
        "send_customer_email",
        {"customer_id": customer_id, "subject": subject, "preview": message[:100]},
    )
    if not approved:
        return f"❌ Email not sent. {result_msg}"
    
    # Execute actual send
    # send_via_resend(customer_id, subject, message)
    return f"✅ Email sent to customer {customer_id}. {result_msg}"


@tool
def update_customer_record(customer_id: str, fields: dict) -> str:
    """Update a customer record. Requires Vienna OS approval for PII fields."""
    approved, result_msg = submit_with_governance(
        "update_customer_record",
        {"customer_id": customer_id, "fields": list(fields.keys())},
    )
    if not approved:
        return f"❌ Update blocked. {result_msg}"
    
    # db.update("customers", customer_id, fields)
    return f"✅ Customer {customer_id} updated. {result_msg}"


@tool  
def issue_refund(order_id: str, amount: float, reason: str) -> str:
    """Issue a refund for an order. High-value refunds require human approval."""
    # Vienna OS policy will route $100+ refunds for human review
    approved, result_msg = submit_with_governance(
        "issue_refund",
        {"order_id": order_id, "amount": amount, "reason": reason},
    )
    if not approved:
        return f"❌ Refund blocked. {result_msg}"
    
    # payment_provider.refund(order_id, amount)
    return f"✅ Refund of ${amount:.2f} issued for order {order_id}. {result_msg}"


# Build the agent
llm = ChatOpenAI(model="gpt-4o", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a customer service AI assistant. All sensitive actions require Vienna OS governance approval."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

tools = [send_customer_email, update_customer_record, issue_refund]
agent = create_openai_tools_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Run
result = agent_executor.invoke({
    "input": "Send a welcome email to customer 12345",
    "chat_history": [],
})
print(result["output"])
```

---

## Node.js / TypeScript Integration

### Governed Tool Factory

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ViennaOS, ViennaOSError } from '@vienna-os/client';

const vienna = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });
const AGENT_ID = 'langchain-ts-agent-001';

// Generic governance wrapper
async function withGovernance<T>(
  action: string,
  payload: Record<string, unknown>,
  execute: () => Promise<T>
): Promise<T | string> {
  const proposal = await vienna.submitProposal({
    agentId: AGENT_ID,
    action,
    payload,
  });

  if (proposal.state === 'denied') {
    return `❌ Blocked: ${proposal.error ?? 'policy violation'}`;
  }

  if (proposal.state === 'pending') {
    return `⏳ Queued for human review (proposal: ${proposal.id})`;
  }

  // approved — execute
  return execute();
}

// Governed tools
const sendEmailTool = tool(
  async ({ to, subject, body }) => {
    return withGovernance(
      'send_email',
      { to, subject, preview: body.slice(0, 100) },
      async () => {
        // await emailClient.send({ to, subject, body });
        return `✅ Email sent to ${to}`;
      }
    );
  },
  {
    name: 'send_email',
    description: 'Send an email to a recipient. Governed by Vienna OS.',
    schema: z.object({
      to: z.string().email().describe('Recipient email address'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body text'),
    }),
  }
);

const issueRefundTool = tool(
  async ({ orderId, amount, reason }) => {
    return withGovernance(
      'issue_refund',
      { orderId, amount, reason },
      async () => {
        // await paymentClient.refund(orderId, amount);
        return `✅ Refund of $${amount.toFixed(2)} issued`;
      }
    );
  },
  {
    name: 'issue_refund',
    description: 'Issue a refund. High-value refunds require human approval.',
    schema: z.object({
      orderId: z.string(),
      amount: z.number().positive(),
      reason: z.string(),
    }),
  }
);
```

### With LangGraph (Checkpointed Workflows)

```typescript
import { StateGraph, Annotation } from '@langchain/langgraph';
import { ViennaOS } from '@vienna-os/client';

const vienna = new ViennaOS({ apiKey: process.env.VIENNA_API_KEY! });

const AgentState = Annotation.Root({
  action: Annotation<string>(),
  payload: Annotation<Record<string, unknown>>(),
  proposal_id: Annotation<string | undefined>(),
  approved: Annotation<boolean>({ default: () => false }),
});

const graph = new StateGraph(AgentState)
  .addNode('submit_to_vienna', async (state) => {
    const proposal = await vienna.submitProposal({
      agentId: 'langgraph-agent',
      action: state.action,
      payload: state.payload,
    });

    return {
      proposal_id: proposal.id,
      approved: proposal.state === 'approved',
    };
  })
  .addNode('execute_action', async (state) => {
    // Execute with warrant proof
    console.log(`Executing ${state.action} under warrant`);
    return {};
  })
  .addEdge('__start__', 'submit_to_vienna')
  .addConditionalEdges('submit_to_vienna', (state) =>
    state.approved ? 'execute_action' : '__end__'
  )
  .addEdge('execute_action', '__end__');

const workflow = graph.compile();
```

---

## Policy Examples for LangChain Agents

```python
# Tier-based policy: auto-approve T0/T1, require review T2+
client.create_policy(
    name="LangChain Agent Tiers",
    description="Risk-tiered governance for LangChain agents",
    conditions={
        "high_risk_action": {
            "type": "risk_tier_gte",
            "value": 2,
        }
    },
    actions={
        "high_risk_action": {
            "action": "require_approval",
            "require_justification": True,
        }
    },
    tags=["langchain", "agent"],
)

# Block specific dangerous actions entirely
client.create_policy(
    name="Block Destructive Actions",
    conditions={
        "destructive": {
            "type": "action_matches_any",
            "patterns": ["delete_*", "drop_*", "wipe_*", "truncate_*"],
        }
    },
    actions={
        "destructive": "deny",
    },
    priority=100,  # High priority = evaluated first
    tags=["safety"],
)
```

---

## Common Pitfalls

### 1. Forgetting to handle `pending` state

LangChain tools return strings. If you don't handle `pending`, the agent may falsely report success.

```python
# ❌ Wrong: ignores pending
if proposal["state"] == "approved":
    return do_action()
return "Done"  # Misleadingly returns for pending too

# ✅ Right: explicit states
if proposal["state"] == "denied":
    return f"Blocked: {proposal.get('error')}"
if proposal["state"] == "pending":
    return f"Awaiting approval: {proposal['id']}"
# state == "approved"
return do_action()
```

### 2. Submitting from inside a tight loop

Agent loops can call tools multiple times. Each call creates a proposal. Use simulation mode in dev/test to avoid creating hundreds of proposals:

```python
simulation = os.environ.get("VIENNA_SIMULATION", "false") == "true"
proposal = client.submit_proposal(..., simulation=simulation)
```

### 3. Not passing meaningful payload

Vienna OS policies can inspect the payload. Vague payloads reduce policy effectiveness.

```python
# ❌ Bad
payload = {"query": user_input}  # Opaque

# ✅ Better
payload = {
    "recipient_email": to_email,
    "action_type": "password_reset",
    "user_id": user_id,
    "estimated_pii_fields": ["email"],
}
```

### 4. Creating an agent per user vs per deployment

Use stable, team-scoped `agent_id` values (e.g., `"langchain-customer-support-v2"`), not per-user IDs. Agent IDs map to policy assignments in the console.

### 5. Ignoring warrant expiry in long-running workflows

Warrants expire (default: 5 minutes). For long workflows, re-submit proposals at each sensitive step rather than reusing one warrant.

---

## Resources

- [Vienna OS Console](https://console.regulator.ai)
- [Python SDK README](../../../sdks/python/README.md)
- [Node SDK README](../../../sdks/node/README.md)
- [LangChain Docs](https://python.langchain.com)
- [API Reference](https://regulator.ai/docs/api)
