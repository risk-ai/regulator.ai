---
title: "Governing Your LangChain Agents in Production"
published: false
description: "LangChain makes building powerful AI agents easy. Vienna OS makes running them in production safe. Here's how to add 5-line governance to your LangChain tools."
tags: ["langchain", "ai", "python", "governance"]
cover_image: "https://regulator.ai/images/langchain-governance-cover.png"
canonical_url: "https://regulator.ai/blog/governing-langchain-agents"
---

# Governing Your LangChain Agents in Production

*TL;DR: LangChain agents can execute powerful tools directly — great for development, dangerous for production. Vienna OS adds governance in 5 lines: agents submit intents, get approval, then execute with cryptographic warrants.*

---

## The LangChain Production Problem

LangChain revolutionized AI agent development. You can build sophisticated agents in just a few lines:

```python
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI

# Define powerful tools
tools = [
    Tool(name="Database", func=execute_sql),
    Tool(name="Deploy", func=deploy_service),
    Tool(name="Scale", func=scale_infrastructure),
    Tool(name="Email", func=send_notification),
    Tool(name="Transfer", func=wire_money)
]

# Agent can use any tool
agent = initialize_agent(tools, OpenAI())
result = agent.run("Optimize our costs and performance")
```

**This agent can:**
- Execute SQL queries (including `DELETE` and `DROP`)
- Deploy code to production
- Scale infrastructure up/down
- Send emails to customers
- Transfer money between accounts

**The problem:** All these actions happen immediately with no governance, approval process, or audit trail.

**Perfect for development. Terrifying for production.**

## What Could Go Wrong?

Here are real scenarios we've seen (and prevented) with ungoverned LangChain agents:

### The $50K Optimization

```python
# Agent's reasoning: "High CPU usage, let me optimize"
agent.run("Our servers are running hot, please optimize")

# Behind the scenes:
# 1. Agent sees 85% CPU usage
# 2. Calls scale_infrastructure(instances=100)  # Was 10 instances
# 3. "Optimization complete!"
# 
# Result: $50K/month AWS bill
```

### The Data Deletion Disaster

```python
# Agent's reasoning: "Clean up unused data to save space" 
agent.run("Our database is getting full, clean it up")

# Behind the scenes:
# 1. Agent finds "unused" table: archive_2019
# 2. Calls execute_sql("DROP TABLE archive_2019")
# 3. "Cleanup complete!"
#
# Reality: That was compliance data required by law
# Result: Regulatory violation + expensive recovery
```

### The Customer Email Catastrophe  

```python
# Agent's reasoning: "Notify customers about the outage"
agent.run("We had a brief service interruption, inform users")

# Behind the scenes:
# 1. Agent drafts apology email
# 2. Calls send_notification(to="all_customers", ...)
# 3. "Communication sent!"
#
# Reality: The "outage" was a 30-second deployment
# Result: Customer panic + confused support tickets
```

## The Solution: Governed LangChain Tools

Vienna OS transforms LangChain tools from direct execution to governed execution:

### Before: Direct Execution
```
LangChain Agent → Tool → Direct Action → Immediate Consequences
```

### After: Governed Execution
```
LangChain Agent → Tool → Vienna OS → Risk Assessment → Approval → Warrant → Action
```

Here's how to implement governed tools in 5 lines:

```python
from vienna_sdk import ViennaClient
from langchain.tools import BaseTool
import asyncio

# Base class for governed tools
class GovernedTool(BaseTool):
    def __init__(self, intent_type: str, risk_tier: str = "T1"):
        super().__init__()
        self.vienna = ViennaClient(api_key=os.environ["VIENNA_API_KEY"])
        self.intent_type = intent_type
        self.risk_tier = risk_tier
    
    def _run(self, query: str) -> str:
        return asyncio.run(self._governed_run(query))
    
    async def _governed_run(self, query: str) -> str:
        # Line 1: Submit intent to Vienna OS
        intent = await self.vienna.submit_intent({
            "type": self.intent_type,
            "payload": self._parse_input(query),
            "risk_tier": self.risk_tier,
            "justification": f"LangChain agent request: {query}"
        })
        
        # Line 2: Wait for approval
        warrant = await self.vienna.wait_for_warrant(intent.id)
        
        if warrant.status == "approved":
            # Line 3: Execute with warrant
            result = await self._execute_with_warrant(warrant)
            
            # Line 4: Confirm execution 
            await self.vienna.confirm_execution(warrant.id, {"status": "completed"})
            
            return result
        else:
            # Line 5: Handle denial
            return f"Action denied: {warrant.denial_reason}"
    
    def _parse_input(self, query: str) -> dict:
        # Override in subclasses
        return {"query": query}
    
    async def _execute_with_warrant(self, warrant) -> str:
        # Override in subclasses
        raise NotImplementedError
```

## Real-World Governed Tool Examples

Let's implement governed versions of common LangChain tools:

### 1. Governed Database Tool

```python
class GovernedDatabaseTool(GovernedTool):
    name = "database_query"
    description = "Execute database queries with governance oversight"
    
    def __init__(self):
        super().__init__(intent_type="database_operation", risk_tier="T1")
    
    def _parse_input(self, query: str) -> dict:
        # Analyze the SQL query for risk assessment
        query_lower = query.lower().strip()
        
        # Detect operation type
        if any(op in query_lower for op in ['select', 'show', 'describe']):
            operation_type = "read"
            risk_tier = "T0"  # Auto-approve reads
        elif any(op in query_lower for op in ['insert', 'update']):
            operation_type = "write"  
            risk_tier = "T1"  # Single approval
        elif any(op in query_lower for op in ['delete', 'drop', 'truncate']):
            operation_type = "destructive"
            risk_tier = "T2"  # Multi-party approval
        else:
            operation_type = "unknown"
            risk_tier = "T2"  # Conservative default
        
        return {
            "query": query,
            "operation_type": operation_type,
            "risk_tier": risk_tier,
            "tables_affected": self._extract_tables(query),
            "estimated_impact": self._estimate_impact(query)
        }
    
    async def _execute_with_warrant(self, warrant) -> str:
        payload = warrant.execution.payload
        
        # Additional verification for high-risk operations
        if payload["operation_type"] == "destructive":
            if not await self.vienna.verify_warrant(warrant):
                raise Exception("Warrant verification failed")
        
        # Execute the query
        try:
            result = database.execute(payload["query"])
            return f"Query executed successfully. {len(result)} rows affected."
        except Exception as e:
            raise Exception(f"Database execution failed: {str(e)}")
    
    def _extract_tables(self, query: str) -> list:
        # Simple table extraction (enhance with SQL parser in production)
        import re
        tables = re.findall(r'(?:from|join|update|into|table)\s+([a-zA-Z_][a-zA-Z0-9_]*)', 
                           query, re.IGNORECASE)
        return list(set(tables))
    
    def _estimate_impact(self, query: str) -> dict:
        # Estimate query impact for risk assessment
        if 'where' not in query.lower():
            return {"scope": "full_table", "risk": "high"}
        elif any(word in query.lower() for word in ['limit', 'top']):
            return {"scope": "limited", "risk": "low"}
        else:
            return {"scope": "filtered", "risk": "medium"}
```

### 2. Governed Infrastructure Tool

```python
class GovernedInfrastructureTool(GovernedTool):
    name = "infrastructure_management"
    description = "Scale and manage infrastructure with cost controls"
    
    def __init__(self):
        super().__init__(intent_type="infrastructure_scaling", risk_tier="T2")
    
    def _parse_input(self, query: str) -> dict:
        # Parse scaling request from natural language
        import re
        
        # Extract action type
        if any(word in query.lower() for word in ['scale up', 'increase', 'add']):
            action = "scale_up"
        elif any(word in query.lower() for word in ['scale down', 'decrease', 'remove']):
            action = "scale_down"
        elif 'restart' in query.lower():
            action = "restart"
        else:
            action = "unknown"
        
        # Extract numbers (target instances, percentages, etc.)
        numbers = re.findall(r'\d+', query)
        target_instances = int(numbers[0]) if numbers else None
        
        # Estimate cost impact
        current_instances = self._get_current_instances()
        cost_per_instance = 200  # USD/month
        cost_delta = abs((target_instances or current_instances) - current_instances) * cost_per_instance
        
        return {
            "action": action,
            "current_instances": current_instances,
            "target_instances": target_instances,
            "cost_delta": cost_delta,
            "service": self._extract_service_name(query) or "api-server"
        }
    
    async def _execute_with_warrant(self, warrant) -> str:
        payload = warrant.execution.payload
        
        # Verify cost approval for expensive operations
        if payload["cost_delta"] > 1000:
            approvers = warrant.authorization.approved_by
            if len(approvers) < 2:
                raise Exception("High-cost scaling requires multiple approvals")
        
        # Execute infrastructure scaling
        if payload["action"] == "scale_up":
            result = await self._scale_service(
                payload["service"], 
                payload["target_instances"]
            )
        elif payload["action"] == "scale_down":
            result = await self._scale_service(
                payload["service"], 
                payload["target_instances"]
            )
        elif payload["action"] == "restart":
            result = await self._restart_service(payload["service"])
        else:
            raise Exception(f"Unsupported action: {payload['action']}")
        
        return f"Infrastructure operation completed: {result}"
    
    def _get_current_instances(self) -> int:
        # Get current infrastructure state
        return 10  # Example
    
    def _extract_service_name(self, query: str) -> str:
        # Extract service name from natural language
        services = ['api-server', 'web-server', 'database', 'cache']
        for service in services:
            if service in query.lower():
                return service
        return None
    
    async def _scale_service(self, service: str, instances: int) -> dict:
        # Mock implementation - replace with actual infrastructure API
        return {
            "service": service,
            "previous_instances": self._get_current_instances(),
            "new_instances": instances,
            "estimated_cost": instances * 200
        }
```

### 3. Governed Email Tool

```python
class GovernedEmailTool(GovernedTool):
    name = "email_communication"
    description = "Send emails with approval workflow"
    
    def __init__(self):
        super().__init__(intent_type="send_email", risk_tier="T1")
    
    def _parse_input(self, query: str) -> dict:
        # Parse email content and determine recipients
        content = query.strip()
        
        # Determine recipient type from content analysis
        if any(word in content.lower() for word in ['customer', 'user', 'client']):
            recipient_type = "external"
            risk_tier = "T2"  # External communication requires approval
        else:
            recipient_type = "internal"
            risk_tier = "T1"  # Internal communication is lower risk
            
        # Classify email type
        if any(word in content.lower() for word in ['sorry', 'apologize', 'incident']):
            email_type = "incident_communication"
            risk_tier = "T2"  # Incident comms need approval
        elif any(word in content.lower() for word in ['outage', 'down', 'problem']):
            email_type = "service_alert"
            risk_tier = "T2"
        else:
            email_type = "general"
        
        return {
            "content": content[:500],  # Limit content length
            "recipient_type": recipient_type,
            "email_type": email_type,
            "risk_tier": risk_tier,
            "estimated_recipients": self._estimate_recipients(recipient_type)
        }
    
    async def _execute_with_warrant(self, warrant) -> str:
        payload = warrant.execution.payload
        
        # Verify approval for external communications
        if payload["recipient_type"] == "external":
            # External emails need marketing/comms team approval
            approvers = warrant.authorization.approved_by
            if not any("@marketing" in email or "@comms" in email for email in approvers):
                raise Exception("External communication requires marketing approval")
        
        # Send email with audit trail
        email_result = await self._send_email(
            content=payload["content"],
            recipient_type=payload["recipient_type"],
            audit_reference=warrant.id
        )
        
        return f"Email sent successfully to {payload['estimated_recipients']} recipients. ID: {email_result['id']}"
    
    def _estimate_recipients(self, recipient_type: str) -> int:
        # Estimate email blast size
        if recipient_type == "external":
            return 10000  # Customer base
        else:
            return 50     # Internal team
    
    async def _send_email(self, content: str, recipient_type: str, audit_reference: str) -> dict:
        # Mock email service - replace with actual implementation
        return {
            "id": f"email_{audit_reference}",
            "status": "sent",
            "recipients": self._estimate_recipients(recipient_type)
        }
```

## Setting Up Governance Policies

Configure Vienna OS policies to match your risk tolerance:

```yaml
# Vienna OS policy configuration
policies:
  # Database operations
  - name: "Auto-approve database reads"
    intent_type: "database_operation"
    condition: "payload.operation_type == 'read'"
    risk_tier: "T0"  # Auto-approve
    
  - name: "Approve database writes"
    intent_type: "database_operation" 
    condition: "payload.operation_type == 'write'"
    risk_tier: "T1"
    required_approvals: 1
    required_roles: ["database_admin"]
    
  - name: "Strict control for destructive operations"
    intent_type: "database_operation"
    condition: "payload.operation_type == 'destructive'"
    risk_tier: "T2"
    required_approvals: 2
    required_roles: ["database_admin", "engineering_lead"]
    requires_mfa: true
    
  # Infrastructure scaling
  - name: "Auto-approve small scaling"
    intent_type: "infrastructure_scaling"
    condition: "payload.cost_delta < 500"
    risk_tier: "T1"
    required_approvals: 1
    
  - name: "Control expensive scaling"
    intent_type: "infrastructure_scaling"
    condition: "payload.cost_delta >= 500"
    risk_tier: "T2"
    required_approvals: 2
    required_roles: ["devops", "engineering_manager"]
    approval_timeout: "30m"
    
  # Email communications
  - name: "Auto-approve internal emails"
    intent_type: "send_email"
    condition: "payload.recipient_type == 'internal'"
    risk_tier: "T0"
    
  - name: "Approve external communications"
    intent_type: "send_email"
    condition: "payload.recipient_type == 'external'"
    risk_tier: "T1"
    required_approvals: 1
    required_roles: ["marketing", "comms"]
```

## Complete LangChain Integration

Here's how to use governed tools in a LangChain agent:

```python
from langchain.agents import initialize_agent
from langchain.llms import OpenAI

# Create governed tools
governed_tools = [
    GovernedDatabaseTool(),
    GovernedInfrastructureTool(),
    GovernedEmailTool()
]

# Initialize agent with governed tools
agent = initialize_agent(
    tools=governed_tools,
    llm=OpenAI(temperature=0, model_name="gpt-4"),
    agent="zero-shot-react-description",
    verbose=True,
    max_iterations=3
)

# Test the governed agent
if __name__ == "__main__":
    # This request will trigger governance workflows
    result = agent.run("""
    Our API response times are really slow today. Please:
    1. Check the database performance 
    2. Scale our infrastructure if needed
    3. Notify the team about any changes
    """)
    
    print("Agent result:", result)
```

## Execution Flow with Governance

When the governed agent runs, here's what happens:

```
1. Agent Analysis:
   "I need to check database performance"
   → Uses GovernedDatabaseTool
   → Query: "SELECT * FROM performance_metrics WHERE date = today()"

2. Vienna OS Evaluation:
   → Intent: database_operation
   → Operation type: read
   → Risk tier: T0 (auto-approve)
   → Warrant issued immediately

3. Execution:
   → Database query executes
   → Result: "High query volume detected"

4. Agent Analysis:
   "I should scale up the infrastructure"
   → Uses GovernedInfrastructureTool  
   → Request: "Scale api-server from 10 to 20 instances"

5. Vienna OS Evaluation:
   → Intent: infrastructure_scaling
   → Cost delta: $2000/month
   → Risk tier: T2 (requires 2 approvals)
   → Slack notification sent to DevOps team

6. Approval Process:
   → DevOps Lead: "Approved - justified by metrics"
   → Engineering Manager: "Approved - but monitor closely"
   → Warrant issued with 2 approvals

7. Execution:
   → Infrastructure scaling executes
   → Result: "Scaled to 20 instances successfully"

8. Agent Analysis:
   "I should notify the team"
   → Uses GovernedEmailTool
   → Content: "Scaled infrastructure due to performance issues"

9. Vienna OS Evaluation:
   → Intent: send_email
   → Recipient type: internal
   → Risk tier: T0 (auto-approve)
   → Email sent immediately

10. Final Result:
    "Database performance issue resolved by scaling infrastructure. 
     Team has been notified."
```

## Advanced Patterns

### 1. Conditional Risk Tiers

```python
class SmartGovernedTool(GovernedTool):
    def _determine_risk_tier(self, query: str, context: dict) -> str:
        # Dynamic risk assessment based on context
        if context.get("after_hours", False):
            return "T2"  # Higher risk during off-hours
        elif context.get("system_load", 0) > 0.8:
            return "T1"  # Elevated risk during high load
        else:
            return "T0"  # Normal risk
    
    async def _governed_run(self, query: str) -> str:
        context = await self._get_system_context()
        dynamic_risk_tier = self._determine_risk_tier(query, context)
        
        intent = await self.vienna.submit_intent({
            "type": self.intent_type,
            "risk_tier": dynamic_risk_tier,
            "context": context,
            # ... rest of intent
        })
```

### 2. Rollback Integration

```python
class RollbackCapabletool(GovernedTool):
    async def _execute_with_warrant(self, warrant) -> str:
        # Store pre-execution state
        pre_state = await self._capture_state()
        
        try:
            result = await self._perform_action(warrant.execution.payload)
            
            # Set up automatic rollback monitoring
            await self._setup_rollback_monitoring(warrant, pre_state)
            
            return result
        except Exception as e:
            # Immediate rollback on failure
            await self._rollback(pre_state)
            raise e
    
    async def _setup_rollback_monitoring(self, warrant, pre_state):
        # Monitor for issues and rollback if needed
        rollback_conditions = warrant.execution.get("rollback_conditions", [])
        
        for condition in rollback_conditions:
            if condition["type"] == "error_rate":
                await self._monitor_error_rate(warrant, pre_state, condition["threshold"])
```

### 3. Agent Learning from Denials

```python
class LearningGovernedTool(GovernedTool):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.denial_patterns = []
    
    async def _governed_run(self, query: str) -> str:
        # Check if similar request was recently denied
        if self._is_similar_to_denied_request(query):
            return "Similar request was recently denied. Skipping to avoid repetition."
        
        result = await super()._governed_run(query)
        
        if "denied" in result.lower():
            # Learn from denial
            self.denial_patterns.append({
                "query": query,
                "timestamp": time.time(),
                "reason": result
            })
        
        return result
    
    def _is_similar_to_denied_request(self, query: str) -> bool:
        # Simple similarity check - enhance with semantic comparison
        recent_denials = [p for p in self.denial_patterns 
                         if time.time() - p["timestamp"] < 3600]  # Last hour
        
        for denial in recent_denials:
            similarity = self._calculate_similarity(query, denial["query"])
            if similarity > 0.8:
                return True
        return False
```

## Benefits of Governed LangChain Agents

### 1. Complete Audit Trails

Every action has cryptographic proof of authorization:

```python
# Query the audit trail
audit_trail = await vienna.get_audit_trail(
    agent_id="langchain-agent-v1",
    start_date="2024-03-01",
    end_date="2024-03-31"
)

for event in audit_trail:
    print(f"{event.timestamp}: {event.action} by {event.agent_id}")
    print(f"  Approved by: {', '.join(event.approvers)}")
    print(f"  Warrant: {event.warrant_id}")
    print(f"  Result: {event.result_summary}")
```

### 2. Risk-Based Approval Workflows

Different actions require different approval levels:

```python
# T0: Auto-approved (reads, status checks)
agent.run("What's the current system status?")
# → Executes immediately

# T1: Single approval (config changes, small deployments)
agent.run("Deploy the hotfix to staging")
# → Requires DevOps approval

# T2: Multi-party approval (production changes, high-cost operations)
agent.run("Scale production database to handle Black Friday traffic")
# → Requires Engineering Manager + DBA approval

# T3: Executive approval (major changes, high-value transactions)
agent.run("Migrate our entire infrastructure to a new cloud provider")
# → Requires CTO + CFO approval
```

### 3. Cost Control

Agents cannot accidentally create expensive resources:

```python
# Before governance: Agent could scale to 1000 instances
# After governance: Scaling >50 instances requires CFO approval

agent.run("Handle this traffic spike by scaling up significantly")
# Vienna OS: "Cost impact $50K/month requires executive approval"
# Result: Request routes to CFO, who approves scaling to 25 instances instead
```

### 4. Compliance Readiness

Built-in compliance for regulated industries:

```python
# Generate SOC 2 compliance report
compliance_report = await vienna.generate_compliance_report(
    framework="SOC2",
    period="Q1-2024"
)

# All AI agent actions have:
# - Cryptographic signatures proving authorization
# - Timestamped audit trails  
# - Approval workflows with human oversight
# - Risk assessments and justifications
```

## Getting Started Checklist

Ready to govern your LangChain agents?

### 1. ✅ Setup Vienna OS
```bash
# Install SDK
pip install vienna-sdk

# Set up environment  
export VIENNA_API_KEY="your-api-key"
export VIENNA_ENDPOINT="https://api.regulator.ai"
```

### 2. ✅ Identify High-Risk Tools
```python
# Audit your current LangChain tools
risky_tools = [
    "database_operations",    # T1-T2 depending on query
    "infrastructure_scaling", # T2 (cost impact)
    "email_sending",          # T1-T2 depending on recipients
    "file_operations",        # T1-T2 depending on scope
    "api_calls"              # T0-T2 depending on endpoint
]

# Convert highest-risk tools first
```

### 3. ✅ Implement Governed Tools
```python
# Start with the GovernedTool base class
# Implement _parse_input() for your specific use case
# Implement _execute_with_warrant() with actual logic
# Test in development environment
```

### 4. ✅ Configure Policies
```yaml
# Define approval workflows for each risk tier
# Set up notification channels (Slack, email, Teams)
# Configure timeout and escalation rules
```

### 5. ✅ Deploy and Monitor
```python
# Deploy to staging environment first
# Monitor approval patterns and response times
# Adjust policies based on operational feedback
# Roll out to production gradually
```

## The Bottom Line

LangChain makes building AI agents incredibly easy. Vienna OS makes running them incredibly safe.

**The 5-line integration gives you:**
- ✅ **Risk-based approval workflows** tailored to your organization
- ✅ **Complete accountability** for every AI action
- ✅ **Cryptographic audit trails** for compliance and debugging
- ✅ **Cost control** preventing expensive accidents
- ✅ **Operational safety** with built-in rollback capabilities

**Most importantly:** You can add governance without changing your LangChain agent logic. Your agents work the same way — they're just safer.

---

## Try Governed LangChain Agents

Ready to secure your LangChain agents in production?

🔗 **Interactive Demo:** [regulator.ai/demo/langchain](https://regulator.ai/demo/langchain) — Test governed tools in browser  
📖 **LangChain Integration Guide:** [docs.regulator.ai/langchain](https://docs.regulator.ai/langchain) — Complete setup instructions  
💻 **Code Examples:** [github.com/risk-ai/langchain-examples](https://github.com/risk-ai/langchain-examples) — Production-ready implementations  
💬 **Developer Support:** [discord.gg/vienna-os](https://discord.gg/vienna-os) — Get help from our team

**Vienna OS is open source (BSL 1.1) and built by ai.ventures.** We've deployed 30+ LangChain agents in production and learned the hard way what governance looks like.

---

*What LangChain tools do you need to govern? What approval workflows would work in your organization? Share your use cases in the comments.*

**Tags:** #langchain #ai #python #governance #devops #automation #security #compliance