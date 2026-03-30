# Vienna OS Python SDK

Official Python SDK for Vienna OS AI Agent Governance Platform.

## Installation

```bash
pip install vienna-os
```

## Quick Start

```python
from vienna_os import ViennaClient

# Initialize client
client = ViennaClient(
    email="user@example.com",
    password="your-password"
)

# Execute an action with governance
result = client.execute(
    action="send_email",
    agent_id="marketing-agent",
    context={"to": "customer@example.com"},
    tier="T0"
)

print(f"Execution ID: {result.execution_id}")
print(f"Warrant ID: {result.warrant_id}")
print(f"Status: {result.status}")
```

## Features

- ✅ **Execution Engine** - Execute actions with policy validation
- ✅ **Approval Workflow** - Approve/reject T1/T2/T3 actions
- ✅ **Warrant System** - Cryptographic authorization tokens
- ✅ **Policy Management** - Create and manage governance policies
- ✅ **Agent Registration** - Register and configure AI agents
- ✅ **Audit Trails** - Complete execution history and exports

## Usage

### Authentication

```python
# With email/password
client = ViennaClient(
    email="user@example.com",
    password="password"
)

# With API key
client = ViennaClient(
    api_key="vos_your_api_key_here"
)
```

### Execution

```python
# T0 - Auto-approved
result = client.execute(
    action="query_database",
    agent_id="analytics-agent",
    tier="T0"
)

# T1 - Requires approval
result = client.execute(
    action="delete_records",
    agent_id="admin-agent",
    tier="T1"
)

if result.requires_approval:
    print(f"Waiting for approval: {result.execution_id}")
```

### Approvals

```python
# Get pending approvals
approvals = client.get_approvals(status="pending", tier="T1")

for approval in approvals:
    print(f"{approval.approval_id}: {approval.action_summary}")
    
# Approve an action
client.approve(
    approval_id="approval_123",
    reviewer_id="max@law.ai",
    notes="Approved after security review"
)

# Reject an action
client.reject(
    approval_id="approval_456",
    reviewer_id="max@law.ai",
    reason="Insufficient justification"
)
```

### Policies

```python
# List policies
policies = client.get_policies(enabled=True)

# Create policy
policy = client.create_policy(
    name="Cost Control",
    tier="T1",
    description="Limit spending per action",
    rules={
        "max_cost": 100,
        "require_approval_above": 50
    },
    priority=100
)

# Update policy
client.update_policy(
    policy_id="policy_123",
    enabled=False
)
```

### Agents

```python
# Register agent
agent = client.register_agent(
    name="Marketing Agent",
    type="autonomous",
    description="Email marketing automation",
    default_tier="T0",
    capabilities=["email", "analytics"],
    config={"max_emails_per_day": 1000}
)

# List agents
agents = client.get_agents(status="active")
```

### Audit & Export

```python
# Get execution history
executions = client.get_executions(
    limit=50,
    status="completed",
    tier="T1"
)

# Get execution details
execution = client.get_execution("exec_123")
print(execution['audit_trail'])

# Export audit trail
audit_data = client.export_executions(
    format="json",
    from_date="2026-03-01",
    to_date="2026-03-31",
    tier="T1"
)
```

### Warrants

```python
# List warrants
warrants = client.get_warrants(limit=50)

# Verify warrant
verification = client.verify_warrant(
    warrant_id="warrant_123",
    signature="abc123..."
)

if verification['valid'] and not verification['expired']:
    print("Warrant is valid!")
```

## Advanced Usage

### Custom Base URL

```python
client = ViennaClient(
    base_url="https://your-domain.com/api/v1",
    api_key="your-key"
)
```

### Error Handling

```python
from vienna_os import ViennaError, AuthenticationError, ValidationError

try:
    result = client.execute(
        action="risky_operation",
        agent_id="agent-123"
    )
except AuthenticationError:
    print("Authentication failed")
except ValidationError as e:
    print(f"Validation error: {e}")
except ViennaError as e:
    print(f"API error: {e}")
```

### Health Check

```python
health = client.health()
print(f"Status: {health['status']}")
print(f"Database: {health['checks']['database']['status']}")
```

## API Reference

See complete API documentation at: https://docs.regulator.ai

## Support

- **Documentation:** https://docs.regulator.ai
- **GitHub:** https://github.com/risk-ai/regulator.ai
- **Email:** support@regulator.ai

## License

MIT License - see LICENSE file for details
