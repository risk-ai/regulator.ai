"""
Vienna OS Python SDK - Basic Usage Example
"""

from vienna_os import ViennaClient

# Initialize client
client = ViennaClient(
    email="demo@regulator.ai",
    password="vienna2024"
)

print("✅ Authenticated successfully\n")

# Example 1: Execute T0 action (auto-approved)
print("Example 1: Execute T0 action")
result = client.execute(
    action="send_email",
    agent_id="marketing-agent",
    context={"to": "customer@example.com", "subject": "Hello"},
    tier="T0"
)
print(f"  Execution ID: {result.execution_id}")
print(f"  Warrant ID: {result.warrant_id}")
print(f"  Status: {result.status}")
print(f"  Requires Approval: {result.requires_approval}\n")

# Example 2: Execute T1 action (requires approval)
print("Example 2: Execute T1 action")
result = client.execute(
    action="delete_user_data",
    agent_id="admin-agent",
    context={"user_id": "12345"},
    tier="T1"
)
print(f"  Execution ID: {result.execution_id}")
print(f"  Status: {result.status}")
print(f"  Requires Approval: {result.requires_approval}\n")

# Example 3: Get pending approvals
print("Example 3: Get pending approvals")
approvals = client.get_approvals(status="pending")
print(f"  Found {len(approvals)} pending approvals")
if approvals:
    approval = approvals[0]
    print(f"  Latest: {approval.action_summary}")
    print(f"  Tier: {approval.required_tier}")
    print(f"  Requested: {approval.requested_at}\n")

# Example 4: List policies
print("Example 4: List policies")
policies = client.get_policies(enabled=True)
print(f"  Found {len(policies)} active policies")
for policy in policies[:3]:
    print(f"  - {policy.name} (Tier {policy.tier})")
print()

# Example 5: Get execution statistics
print("Example 5: Execution statistics")
stats = client.get_execution_stats()
print(f"  Total executions: {stats.get('total_executions', 0)}")
print(f"  With warrant: {stats.get('with_warrant', 0)}")
print(f"  Pending approval: {stats.get('pending_approval', 0)}")
print()

# Example 6: Health check
print("Example 6: Health check")
health = client.health()
print(f"  Status: {health['status']}")
print(f"  Database: {health['checks']['database']['status']}")
print(f"  Latency: {health['checks']['database']['latency_ms']}ms")
