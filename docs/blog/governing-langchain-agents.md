# Governing LangChain Agents in Production with Vienna OS

*Published: March 2026 | Reading Time: 11 minutes*

---

## The LangChain Paradox: Powerful but Ungoverned

LangChain has revolutionized how we build AI agents, making it remarkably easy to create sophisticated systems that can reason about complex problems and use tools to solve them. With just a few lines of code, you can build an agent that researches topics online, analyzes data, sends emails, manages infrastructure, or even makes financial transactions.

But here's the paradox: **the same simplicity that makes LangChain agents so powerful also makes them potentially dangerous in production.**

Consider this typical LangChain agent:

```python
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI

# Define tools the agent can use
tools = [
    Tool(name="Database Query", func=query_database),
    Tool(name="Send Email", func=send_email), 
    Tool(name="Scale Infrastructure", func=scale_servers),
    Tool(name="Transfer Funds", func=transfer_money),
    Tool(name="Delete Files", func=delete_files)
]

# Initialize agent with tools
agent = initialize_agent(
    tools=tools,
    llm=OpenAI(temperature=0),
    agent="zero-shot-react-description",
    verbose=True
)

# Agent can now do anything...
result = agent.run("Optimize our system performance and reduce costs")
```

This agent has access to powerful tools, but there's no governance layer. It could scale infrastructure to handle a temporary traffic spike, costing thousands of dollars. It could delete critical files while "optimizing storage." It could send emails to customers without approval.

At ai.ventures, after deploying dozens of LangChain agents and experiencing several expensive "learning opportunities," we've learned that **production LangChain agents need governance, not just intelligence.**

Today, we'll show you exactly how to add Vienna OS governance to your LangChain agents in just five lines of code, creating a production-ready system with complete accountability, risk-based approvals, and cryptographic audit trails.

## The Problem: LangChain's Tool Execution Model

LangChain's strength is its simplicity. Agents can call tools directly:

```python
# LangChain's default tool execution
class DatabaseTool(BaseTool):
    name = "database_tool"
    description = "Query and modify database"
    
    def _run(self, query: str) -> str:
        # Direct execution - no governance!
        return database.execute(query)

# Agent calls tool directly
agent = initialize_agent([DatabaseTool()], llm)
result = agent.run("Delete all test data")  # Uh oh...
```

This direct execution model creates several problems in production:

### 1. No Approval Workflows
High-risk actions happen without human oversight:

```python
# Agent decides to scale infrastructure
result = agent.run("Handle this traffic spike")

# Behind the scenes, ungoverned:
scale_servers(from_2_to_100_instances=True)  # $50K/month mistake
```

### 2. No Risk Assessment
All actions are treated equally, regardless of impact:

```python
# These actions have vastly different risk profiles...
check_server_status()     # T0: Minimal risk
deploy_new_code()         # T1: Moderate risk  
transfer_large_amount()   # T2: High risk
delete_production_data()  # T3: Critical risk

# But LangChain treats them the same way
```

### 3. Limited Audit Trails
Tool execution logs are basic and non-cryptographic:

```python
# Basic logging
print(f"Agent used {tool.name} with input {input}")

# No proof of authorization
# No tamper-evident records
# No compliance-ready audit trails
```

### 4. Credential Over-Privilege
Agents run with full permissions to execute any tool:

```python
# Agent has access to everything
tools = [
    read_only_tool,      # Should always be allowed
    deployment_tool,     # Should require approval
    financial_tool,      # Should require multiple approvals
    admin_tool          # Should require executive approval
]

# No way to enforce different permission levels
```

## The Solution: Vienna OS + LangChain Integration

Vienna OS solves these problems by adding a governance layer between LangChain agents and tool execution. Instead of tools executing directly, they submit execution intents to Vienna OS, which evaluates risk, enforces policy, and issues cryptographic warrants for approved actions.

Here's the transformation:

### Before (Direct Execution):
```
LangChain Agent → Tool → Direct Execution
```

### After (Governed Execution):
```
LangChain Agent → Tool → Vienna OS → Risk Assessment → Approval → Warrant → Execution
```

## Implementation: Adding Governance in 5 Lines

Let's transform an ungoverned LangChain agent into a production-ready governed system. Here's the complete implementation:

### Step 1: Install Vienna SDK

```bash
pip install vienna-sdk
```

### Step 2: Create Governed Tools

```python
from langchain.tools import BaseTool
from vienna_sdk import ViennaClient
import asyncio
from typing import Type

# Initialize Vienna OS client
vienna = ViennaClient(
    api_key=os.environ["VIENNA_API_KEY"],
    endpoint="https://api.regulator.ai"
)

class GovernedTool(BaseTool):
    """Base class for Vienna OS governed tools"""
    
    def __init__(self, intent_type: str, risk_tier: str = "T1"):
        super().__init__()
        self.intent_type = intent_type
        self.risk_tier = risk_tier
    
    def _run(self, query: str) -> str:
        """Governed execution with Vienna OS"""
        return asyncio.run(self._arun(query))
    
    async def _arun(self, query: str) -> str:
        # Step 1: Submit intent to Vienna OS (Line 1 of governance)
        intent = await vienna.submit_intent({
            "type": self.intent_type,
            "payload": self._parse_input(query),
            "justification": f"LangChain agent request: {query}",
            "risk_tier": self.risk_tier,
            "agent_id": "langchain-agent-v1"
        })
        
        # Step 2: Wait for warrant approval (Line 2 of governance)  
        warrant = await vienna.wait_for_warrant(intent.id, timeout=300)
        
        if warrant.status == "approved":
            try:
                # Step 3: Execute with warrant authorization (Line 3 of governance)
                result = await self._execute_with_warrant(warrant)
                
                # Step 4: Confirm execution success (Line 4 of governance)
                await vienna.confirm_execution(warrant.id, {
                    "status": "completed",
                    "result_summary": result[:100] if result else "No output"
                })
                
                return result
            except Exception as e:
                # Step 5: Report execution failure (Line 5 of governance)
                await vienna.confirm_execution(warrant.id, {
                    "status": "failed", 
                    "error": str(e)
                })
                raise e
        else:
            raise Exception(f"Action not authorized: {warrant.denial_reason}")
    
    def _parse_input(self, query: str) -> dict:
        """Override in subclasses to parse tool-specific input"""
        return {"query": query}
    
    async def _execute_with_warrant(self, warrant) -> str:
        """Override in subclasses to implement actual execution"""
        raise NotImplementedError
```

### Step 3: Implement Specific Governed Tools

```python
class GovernedDatabaseTool(GovernedTool):
    name = "database_query"
    description = "Query or modify database with governance"
    
    def __init__(self):
        super().__init__(
            intent_type="database_operation",
            risk_tier="T1"  # Moderate risk
        )
    
    def _parse_input(self, query: str) -> dict:
        # Parse SQL or natural language query
        is_read_only = any(keyword in query.lower() for keyword in ["select", "show", "describe"])
        operation_type = "read" if is_read_only else "write"
        
        return {
            "query": query,
            "operation_type": operation_type,
            "tables_affected": self._extract_tables(query),
            "estimated_rows": self._estimate_impact(query)
        }
    
    async def _execute_with_warrant(self, warrant) -> str:
        # Execute database operation with warrant validation
        payload = warrant.execution.payload
        
        if payload["operation_type"] == "write":
            # High-risk operations require explicit warrant verification
            if not await vienna.verify_warrant(warrant):
                raise Exception("Warrant signature invalid")
        
        # Execute the actual database operation
        result = database.execute(payload["query"])
        return f"Database operation completed: {len(result)} rows affected"
    
    def _extract_tables(self, query: str) -> list:
        # Simple table extraction (implement more sophisticated parsing)
        words = query.lower().split()
        tables = []
        for i, word in enumerate(words):
            if word in ["from", "update", "into"] and i + 1 < len(words):
                tables.append(words[i + 1])
        return tables
    
    def _estimate_impact(self, query: str) -> int:
        # Estimate number of rows affected (implement query analysis)
        if "where" not in query.lower():
            return 1000000  # Full table scan - high impact
        return 100  # Estimated smaller impact

class GovernedInfrastructureTool(GovernedTool):
    name = "infrastructure_management" 
    description = "Scale servers and manage infrastructure with governance"
    
    def __init__(self):
        super().__init__(
            intent_type="infrastructure_scaling",
            risk_tier="T2"  # High risk due to cost impact
        )
    
    def _parse_input(self, query: str) -> dict:
        # Parse scaling request
        scale_up = "scale up" in query.lower() or "increase" in query.lower()
        scale_down = "scale down" in query.lower() or "decrease" in query.lower()
        
        # Extract numbers (simplified)
        import re
        numbers = re.findall(r'\d+', query)
        target_instances = int(numbers[0]) if numbers else None
        
        return {
            "action": "scale_up" if scale_up else "scale_down",
            "target_instances": target_instances,
            "service": "api-server",  # Could extract from query
            "estimated_cost_impact": self._calculate_cost_impact(target_instances)
        }
    
    async def _execute_with_warrant(self, warrant) -> str:
        payload = warrant.execution.payload
        
        # High-cost operations require multi-party approval verification
        if payload["estimated_cost_impact"] > 1000:
            approvers = warrant.authorization.approved_by
            if len(approvers) < 2:
                raise Exception("High-cost scaling requires multiple approvals")
        
        # Execute infrastructure scaling
        result = await infrastructure_api.scale_service(
            service=payload["service"],
            target_instances=payload["target_instances"]
        )
        
        return f"Scaled {payload['service']} to {payload['target_instances']} instances"
    
    def _calculate_cost_impact(self, instances: int) -> float:
        # Calculate monthly cost impact
        current_instances = 5  # Get from monitoring
        cost_per_instance = 200  # $/month
        return abs(instances - current_instances) * cost_per_instance

class GovernedEmailTool(GovernedTool):
    name = "email_sender"
    description = "Send emails with governance and approval"
    
    def __init__(self):
        super().__init__(
            intent_type="send_email",
            risk_tier="T1"  # Moderate risk - brand impact
        )
    
    def _parse_input(self, query: str) -> dict:
        # Parse email details from natural language
        # In production, use more sophisticated NLP
        return {
            "subject": "AI Agent Communication",
            "content": query,
            "recipient_type": self._classify_recipient(query),
            "email_type": self._classify_email_type(query)
        }
    
    async def _execute_with_warrant(self, warrant) -> str:
        payload = warrant.execution.payload
        
        # Send email with warrant reference for audit trail
        email_id = await email_service.send({
            "subject": payload["subject"],
            "content": payload["content"], 
            "audit_reference": warrant.id
        })
        
        return f"Email sent successfully (ID: {email_id})"
    
    def _classify_recipient(self, content: str) -> str:
        if "customer" in content.lower():
            return "external_customer"
        return "internal_team"
    
    def _classify_email_type(self, content: str) -> str:
        if any(word in content.lower() for word in ["sorry", "apologize", "incident"]):
            return "incident_communication"
        return "standard_communication"
```

### Step 4: Initialize Governed LangChain Agent

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
    max_iterations=5,  # Prevent infinite loops
    early_stopping_method="generate"
)

# Test the governed agent
print("Governed LangChain Agent initialized!")
print("All tool executions now require appropriate approvals.")
```

### Step 5: Configure Vienna OS Policies

```yaml
# Vienna OS policy configuration
policies:
  - name: "Database Operations"
    intent_type: "database_operation"
    rules:
      - condition: "payload.operation_type == 'read'"
        risk_tier: "T0"  # Auto-approve reads
        
      - condition: "payload.estimated_rows < 1000" 
        risk_tier: "T1"  # Single approval for small changes
        required_approvals: 1
        
      - condition: "payload.estimated_rows >= 1000"
        risk_tier: "T2"  # Multi-party approval for large changes
        required_approvals: 2
        
  - name: "Infrastructure Scaling"
    intent_type: "infrastructure_scaling"
    rules:
      - condition: "payload.estimated_cost_impact < 500"
        risk_tier: "T1"
        required_approvals: 1
        
      - condition: "payload.estimated_cost_impact >= 500"
        risk_tier: "T2" 
        required_approvals: 2
        approval_timeout: "30m"
        
  - name: "Email Communication"
    intent_type: "send_email"
    rules:
      - condition: "payload.recipient_type == 'internal_team'"
        risk_tier: "T0"  # Auto-approve internal emails
        
      - condition: "payload.recipient_type == 'external_customer'"
        risk_tier: "T1"  # Approve external emails
        required_approvals: 1
```

## Complete Usage Example

Now let's see the governed LangChain agent in action:

```python
async def main():
    # Agent receives a complex request
    user_request = """
    Our API response times are really slow today. Please investigate 
    the issue and take appropriate action to fix it. If needed, 
    notify the team about what you find.
    """
    
    print(f"User Request: {user_request}")
    print("\n" + "="*50)
    print("GOVERNED AGENT EXECUTION TRACE")
    print("="*50)
    
    # Agent will:
    # 1. Query database to investigate performance (T0 - auto-approved)
    # 2. Scale infrastructure if needed (T2 - requires 2 approvals) 
    # 3. Send notification email (T1 - requires 1 approval)
    
    result = agent.run(user_request)
    print(f"\nFinal Result: {result}")

# Run the governed agent
if __name__ == "__main__":
    asyncio.run(main())
```

### Execution Flow with Vienna OS

When the agent runs, here's what happens:

```
1. Agent thinks: "I need to check database performance"
   → Uses GovernedDatabaseTool
   → Vienna OS: T0 risk, auto-approved
   → Query executes immediately
   → Result: "High query volume detected"

2. Agent thinks: "I should scale up the servers"  
   → Uses GovernedInfrastructureTool
   → Vienna OS: T2 risk, requires 2 approvals
   → Slack notification sent to DevOps team
   → Agent waits for approval...
   → Approved by Alice and Bob
   → Scaling executes with warrant
   → Result: "Scaled api-server to 15 instances"

3. Agent thinks: "I should notify the team"
   → Uses GovernedEmailTool  
   → Vienna OS: T1 risk, requires 1 approval
   → Approval received from team lead
   → Email sent with audit trail
   → Result: "Team notified of performance issue and resolution"
```

## Risk Tiering for LangChain Tools

Vienna OS classifies LangChain tool operations into four risk tiers:

### T0 (Minimal Risk) - Auto-Approve
Perfect for read-only operations and status checks:

```python
class ReadOnlyTools:
    - Database SELECT queries
    - Health check endpoints
    - Log file reading
    - Status monitoring
    - Performance metrics
```

**Policy Example:**
```yaml
- condition: "intent_type == 'database_query' AND payload.operation_type == 'read'"
  risk_tier: "T0"
```

### T1 (Moderate Risk) - Single Approval
For routine operations with reversible impact:

```python
class ModerateRiskTools:
    - Small-scale deployments
    - Configuration changes
    - Internal communications
    - Non-financial API calls
    - Temporary scaling adjustments
```

**Policy Example:**
```yaml
- condition: "intent_type == 'deployment' AND payload.environment == 'staging'"
  risk_tier: "T1"
  required_approvals: 1
  approval_timeout: "15m"
```

### T2 (High Risk) - Multi-Party Approval
For operations with significant business impact:

```python
class HighRiskTools:
    - Production deployments
    - Large infrastructure changes
    - External communications
    - Data modifications affecting >1000 records
    - Financial transactions <$10K
```

**Policy Example:**
```yaml
- condition: "intent_type == 'infrastructure_scaling' AND payload.cost_impact >= 1000"
  risk_tier: "T2"
  required_approvals: 2
  required_roles: ["devops", "engineering_lead"]
  approval_timeout: "30m"
```

### T3 (Critical Risk) - Executive Approval
For actions that could impact business continuity:

```python
class CriticalRiskTools:
    - Production database changes
    - Security policy modifications
    - Large financial transactions >$10K
    - Customer data deletion
    - System-wide configuration changes
```

**Policy Example:**
```yaml
- condition: "intent_type == 'financial_transaction' AND payload.amount >= 10000"
  risk_tier: "T3"
  required_approvals: ["CTO", "CFO"]
  approval_timeout: "2h"
  requires_mfa: true
```

## Production Best Practices

### 1. Implement Comprehensive Error Handling

```python
class RobustGovernedTool(GovernedTool):
    async def _arun(self, query: str) -> str:
        try:
            intent = await vienna.submit_intent({...})
            warrant = await vienna.wait_for_warrant(
                intent.id, 
                timeout=300,  # 5 minute timeout
                polling_interval=5
            )
            
            if warrant.status == "approved":
                result = await self._execute_with_warrant(warrant)
                await vienna.confirm_execution(warrant.id, {"status": "completed"})
                return result
            elif warrant.status == "denied":
                return f"Action denied: {warrant.denial_reason}"
            else:
                return f"Approval timeout: Action requires manual review"
                
        except TimeoutError:
            return "Approval timeout exceeded"
        except Exception as e:
            await vienna.confirm_execution(warrant.id, {
                "status": "failed",
                "error": str(e)
            })
            return f"Execution failed: {str(e)}"
```

### 2. Add Tool-Specific Validation

```python
class ValidatedDatabaseTool(GovernedDatabaseTool):
    def _parse_input(self, query: str) -> dict:
        # Validate SQL before submission
        if self._contains_dangerous_operations(query):
            raise Exception("Dangerous operation detected")
            
        return super()._parse_input(query)
    
    def _contains_dangerous_operations(self, query: str) -> bool:
        dangerous = ["drop table", "truncate", "delete from users"]
        return any(op in query.lower() for op in dangerous)
```

### 3. Implement Circuit Breakers

```python
class CircuitBreakerTool(GovernedTool):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.failure_count = 0
        self.circuit_open = False
        self.last_failure_time = None
    
    async def _arun(self, query: str) -> str:
        if self.circuit_open:
            if time.time() - self.last_failure_time > 300:  # 5 minute cooldown
                self.circuit_open = False
                self.failure_count = 0
            else:
                return "Tool temporarily disabled due to repeated failures"
        
        try:
            result = await super()._arun(query)
            self.failure_count = 0  # Reset on success
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= 3:
                self.circuit_open = True
                
            raise e
```

### 4. Add Comprehensive Monitoring

```python
import logging
from datetime import datetime

class MonitoredGovernedTool(GovernedTool):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logger = logging.getLogger(f"governed_tool.{self.name}")
    
    async def _arun(self, query: str) -> str:
        start_time = datetime.now()
        self.logger.info(f"Tool execution started: {query[:100]}")
        
        try:
            result = await super()._arun(query)
            duration = (datetime.now() - start_time).total_seconds()
            
            self.logger.info(f"Tool execution completed in {duration}s")
            
            # Send metrics to monitoring system
            await self._send_metrics({
                "tool_name": self.name,
                "duration": duration,
                "status": "success",
                "query_length": len(query)
            })
            
            return result
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            self.logger.error(f"Tool execution failed after {duration}s: {str(e)}")
            
            await self._send_metrics({
                "tool_name": self.name,
                "duration": duration, 
                "status": "error",
                "error_type": type(e).__name__
            })
            
            raise e
```

## Benefits: Why Govern Your LangChain Agents?

### 1. Complete Audit Trail
Every action has cryptographic proof of authorization:

```json
{
  "warrant_id": "warrant_2026_03_28_15_b8c9d2e4",
  "agent_id": "langchain-agent-v1",
  "tool": "GovernedInfrastructureTool",
  "action": "scale_infrastructure", 
  "approved_by": ["alice@company.com", "bob@company.com"],
  "execution_time": "2026-03-28T15:45:20Z",
  "result": "Scaled api-server from 10 to 25 instances",
  "cost_impact": "$3000/month",
  "compliance_frameworks": ["SOC2", "ISO27001"]
}
```

### 2. Risk-Based Approval Workflows
Different tools require different approval levels:

```python
# Auto-approved: Read database status
agent.run("Check if the database is healthy")

# Single approval: Send internal email
agent.run("Email the team about the maintenance window")  

# Multi-party approval: Scale production infrastructure
agent.run("Handle this traffic spike by scaling our servers")

# Executive approval: Large financial transaction
agent.run("Process this $50K refund to the customer")
```

### 3. Compliance Readiness
Meet regulatory requirements for AI system control:

- **SOC 2:** Complete audit trails with cryptographic signatures
- **ISO 27001:** Access control and authorization evidence
- **GDPR:** Documented consent and approval for data operations
- **Financial regulations:** Multi-party approval for monetary transactions

### 4. Operational Safety
Prevent costly mistakes before they happen:

```python
# Before Vienna OS: Agent could do this immediately
result = agent.run("Optimize our cloud costs")
# Behind the scenes: Deletes 50GB of "unused" data
# Actually: Deletes critical backup files
# Cost: $500K in lost data recovery

# After Vienna OS: Action requires approval
result = agent.run("Optimize our cloud costs") 
# Vienna OS: Classifies as T2 risk, requires 2 approvals
# Team reviews: "Wait, those are backup files!"
# Result: Action denied, disaster prevented
```

### 5. Rollback Capability
Governed actions can be reversed when needed:

```python
# All warrants include rollback procedures
warrant = {
  "execution": {
    "action": "scale_infrastructure",
    "target_instances": 25
  },
  "rollback": {
    "action": "scale_infrastructure", 
    "target_instances": 10,
    "conditions": ["error_rate > 5%", "manual_trigger"]
  }
}

# Automatic rollback on issues
await vienna.trigger_rollback(warrant.id, reason="High error rate detected")
```

## Real-World Use Cases

### Use Case 1: DevOps Automation Agent
```python
# Agent that manages infrastructure based on monitoring alerts
devops_agent = initialize_agent([
    GovernedDatabaseTool(),           # T0-T2 based on operation
    GovernedInfrastructureTool(),     # T2 (cost impact)
    GovernedDeploymentTool(),         # T1-T2 based on environment  
    GovernedAlertingTool()            # T0 (notifications only)
], llm)

# Handles alerts automatically with appropriate approvals
result = devops_agent.run("CPU usage is at 90% for 10 minutes")
```

### Use Case 2: Customer Service Agent
```python
# Agent that can handle customer requests and take actions
customer_agent = initialize_agent([
    GovernedCRMTool(),               # T0 for reads, T1 for updates
    GovernedRefundTool(),            # T2 for >$1K, T3 for >$10K
    GovernedEmailTool(),             # T1 for external communication
    GovernedKnowledgeBaseTool()      # T0 (read-only)
], llm)

# Processes customer requests with appropriate oversight
result = customer_agent.run("Customer wants refund for $5000 order")
```

### Use Case 3: Financial Analysis Agent
```python
# Agent that can analyze data and execute trades
trading_agent = initialize_agent([
    GovernedMarketDataTool(),        # T0 (read-only)
    GovernedPortfolioTool(),         # T1 for reads, T2 for rebalancing
    GovernedTradingTool(),           # T2 for <$50K, T3 for >$50K
    GovernedRiskAnalysisTool()       # T0 (analysis only)
], llm)

# Executes trading strategies with risk management
result = trading_agent.run("Rebalance portfolio based on market conditions")
```

## Getting Started Checklist

Ready to govern your LangChain agents? Follow this checklist:

### 1. ✅ Set Up Vienna OS
- [ ] Sign up at [regulator.ai/signup](https://regulator.ai/signup)
- [ ] Get API key from console
- [ ] Install vienna-sdk: `pip install vienna-sdk`

### 2. ✅ Audit Current Tools
- [ ] List all tools your LangChain agents can use
- [ ] Classify risk level for each tool (T0-T3)
- [ ] Identify high-risk tools that need immediate governance

### 3. ✅ Implement Governed Tools
- [ ] Create GovernedTool base class
- [ ] Convert highest-risk tools first
- [ ] Add comprehensive error handling
- [ ] Test tool execution in development

### 4. ✅ Configure Policies
- [ ] Define approval workflows for each risk tier
- [ ] Set up notification channels (Slack, email)
- [ ] Configure timeout and escalation rules
- [ ] Test approval processes

### 5. ✅ Deploy and Monitor
- [ ] Deploy governed agents to staging environment
- [ ] Monitor approval patterns and response times
- [ ] Adjust policies based on operational feedback
- [ ] Roll out to production with gradual tool migration

## The Bottom Line

LangChain makes it incredibly easy to build powerful AI agents. Vienna OS makes it safe to run them in production.

The five-line integration gives you:
- ✅ **Complete accountability** for every AI action
- ✅ **Risk-based approval workflows** tailored to your organization
- ✅ **Cryptographic audit trails** for compliance and debugging
- ✅ **Operational safety** preventing costly mistakes
- ✅ **Rollback capability** for when things go wrong

Most importantly, you can add governance without changing your existing LangChain code structure. Your agents work the same way—they're just safer.

---

**Ready to govern your LangChain agents?**

🔗 **Try Vienna OS:** [regulator.ai/try](https://regulator.ai/try) — Test the integration in our interactive playground  
📖 **LangChain Integration Guide:** [regulator.ai/docs/langchain](https://regulator.ai/docs/langchain) — Complete setup instructions  
💻 **GitHub Examples:** [github.com/risk-ai/vienna-langchain](https://github.com/risk-ai/vienna-langchain) — Production-ready code samples  
💬 **Get Support:** [regulator.ai/signup](https://regulator.ai/signup) — Deploy governed agents in under 10 minutes

**About Vienna OS**

Vienna OS is an open-source AI governance platform that provides execution control and cryptographic audit trails for autonomous AI systems. Built by the team at ai.ventures and battle-tested across 30+ production AI deployments, Vienna OS integrates seamlessly with LangChain, CrewAI, AutoGen, and custom AI frameworks. Licensed under BSL 1.1.

---

**Keywords:** LangChain governance, AI agent control, LangChain security, AI tool governance, autonomous AI safety, LangChain production deployment, AI compliance, execution warrants, AI audit trails, machine learning operations