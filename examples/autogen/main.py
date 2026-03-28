#!/usr/bin/env python3
"""
Vienna OS + AutoGen Integration Example

This example demonstrates how to integrate Vienna OS governance with Microsoft AutoGen agents.
It shows how conversational AI agents can submit function calls for governance before execution.

Usage:
    VIENNA_API_KEY=vna_xxx OPENAI_API_KEY=sk_xxx python main.py
    python main.py --scenario simple_chat
    python main.py --scenario function_calling
"""

import os
import asyncio
import json
import time
import argparse
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from functools import wraps

# Mock AutoGen classes for demonstration (replace with real imports)
class ConversableAgent:
    def __init__(self, name: str, system_message: str, llm_config: dict = None, function_map: dict = None):
        self.name = name
        self.system_message = system_message
        self.llm_config = llm_config or {}
        self.function_map = function_map or {}
        
    async def send_message(self, message: str, recipient=None):
        """Send a message (mock implementation)"""
        print(f"💬 {self.name}: {message}")
        
        # Simulate conversation and function calling
        if "stock" in message.lower() and "get_stock_price" in self.function_map:
            print(f"🤔 {self.name}: I'll look up that stock price for you.")
            result = await self.function_map["get_stock_price"]("NVDA")
            return f"The stock price for NVDA is ${result['price']}"
            
        elif "email" in message.lower() and "send_email" in self.function_map:
            print(f"🤔 {self.name}: I'll send that email for you.")
            result = await self.function_map["send_email"]("user@company.com", "Stock Update", "NVDA is up 2.5%")
            return f"Email sent successfully (ID: {result['message_id']})"
            
        elif "admin" in message.lower() and "restart_service" in self.function_map:
            print(f"🤔 {self.name}: I'll restart that service for you.")
            result = await self.function_map["restart_service"]("web-server")
            return f"Service restart: {result['status']}"
            
        return f"I understand. Let me help you with that."

class UserProxyAgent(ConversableAgent):
    def __init__(self, name: str, **kwargs):
        super().__init__(name, "You represent the human user.", **kwargs)

class GroupChat:
    def __init__(self, agents: List[ConversableAgent], messages: List[str] = None, max_round: int = 10):
        self.agents = agents
        self.messages = messages or []
        self.max_round = max_round

class GroupChatManager(ConversableAgent):
    def __init__(self, groupchat: GroupChat, **kwargs):
        super().__init__("Manager", "You manage the group chat.", **kwargs)
        self.groupchat = groupchat

# Vienna OS SDK Mock (replace with actual vienna_sdk import)
@dataclass
class IntentResult:
    status: str
    risk_tier: Optional[str] = None
    execution_id: Optional[str] = None
    warrant_id: Optional[str] = None
    reason: Optional[str] = None
    poll_url: Optional[str] = None

class ViennaAutoGenAdapter:
    def __init__(self, api_key: str, agent_id: str = "autogen-agent"):
        self.api_key = api_key
        self.agent_id = agent_id
        print(f"🔧 Vienna AutoGen adapter initialized for {agent_id}")
        
    async def submit_conversation_intent(
        self,
        function_name: str,
        function_args: Dict[str, Any],
        conversation_context: Optional[Dict[str, Any]] = None
    ) -> IntentResult:
        """Submit an AutoGen function call intent to Vienna OS governance"""
        
        # Simulate Vienna OS governance evaluation
        await asyncio.sleep(0.1)  # Simulate API call
        
        # Mock risk assessment based on function name and args
        risk_tiers = {
            # T0 - Informational, auto-approved
            'get_stock_price': 'T0',
            'get_weather': 'T0',
            'search_web': 'T0',
            
            # T1 - Low risk, policy approved
            'send_notification': 'T1',
            'log_message': 'T1',
            'get_user_profile': 'T1',
            
            # T2 - Medium risk, human approval for high values
            'send_email': 'T1',  # Default T1, but T2 if external
            'analyze_data': 'T1',
            'generate_report': 'T1',
            
            # T3 - High risk, admin functions
            'restart_service': 'T3',
            'delete_files': 'T3',
            'modify_permissions': 'T3',
        }
        
        # Check for risk escalation conditions
        base_tier = risk_tiers.get(function_name, 'T1')
        
        # Escalate based on function arguments
        if function_name == 'send_email':
            to_address = function_args.get('to', '')
            if not to_address.endswith('@company.com'):
                base_tier = 'T2'  # External emails require approval
                
        if any(isinstance(v, (int, float)) and v > 50000 for v in function_args.values()):
            base_tier = 'T2'  # High-value operations require approval
            
        # Check for denied operations
        if function_name.startswith('delete_') and conversation_context:
            agent_role = conversation_context.get('agent_role', 'assistant')
            if agent_role != 'admin':
                return IntentResult(
                    status='denied',
                    reason=f'Function "{function_name}" requires admin role, current role: {agent_role}'
                )
        
        # Generate result based on tier
        if base_tier == 'T0':
            return IntentResult(
                status='auto-approved',
                risk_tier=base_tier,
                execution_id=f'exec_{int(time.time())}',
                warrant_id=f'warrant_{int(time.time())}'
            )
        elif base_tier == 'T1':
            return IntentResult(
                status='approved',
                risk_tier=base_tier,
                execution_id=f'exec_{int(time.time())}',
                warrant_id=f'warrant_{int(time.time())}'
            )
        else:  # T2, T3
            return IntentResult(
                status='pending_approval',
                risk_tier=base_tier,
                execution_id=f'exec_{int(time.time())}',
                poll_url=f'https://console.regulator.ai/approvals/exec_{int(time.time())}'
            )
    
    async def report_execution(
        self,
        execution_id: str,
        result: str,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Report function execution results back to Vienna"""
        print(f"📒 Execution {execution_id}: {result}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    async def register(self, metadata: Optional[Dict[str, str]] = None) -> None:
        """Register this AutoGen agent with Vienna OS fleet"""
        print(f"✅ Registered {self.agent_id} with Vienna OS")
        if metadata:
            print(f"   Metadata: {metadata}")

def create_for_autogen(api_key: str, agent_id: str = "autogen-agent") -> ViennaAutoGenAdapter:
    """Factory function to create AutoGen-optimized Vienna adapter"""
    return ViennaAutoGenAdapter(api_key, agent_id)

# Global Vienna instance for function decoration
_vienna_adapter: Optional[ViennaAutoGenAdapter] = None

def set_vienna_adapter(adapter: ViennaAutoGenAdapter):
    """Set the global Vienna adapter for governed functions"""
    global _vienna_adapter
    _vienna_adapter = adapter

# ─── Governed Function Decorator ───────────────────────────────────────────

def governed_function(func: Callable) -> Callable:
    """
    Decorator to add Vienna OS governance to AutoGen functions.
    
    Functions decorated with this will submit intents to Vienna OS
    before execution and report results after completion.
    """
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        if not _vienna_adapter:
            raise Exception("Vienna adapter not set. Call set_vienna_adapter() first.")
        
        print(f"\n━━━ Function: {func.__name__} ━━━")
        print(f"  Args: {args}")
        print(f"  Kwargs: {kwargs}")
        
        try:
            # Get conversation context if available
            conversation_context = getattr(wrapper, '_conversation_context', {})
            
            # Submit intent to Vienna OS
            print(f"  📨 Submitting intent to Vienna OS...")
            intent = await _vienna_adapter.submit_conversation_intent(
                func.__name__,
                {**kwargs, 'args': list(args)},
                conversation_context
            )
            
            print(f"  ⚖️  Risk Tier: {intent.risk_tier or 'unknown'}")
            print(f"  📋 Status: {intent.status}")
            
            if intent.status in ['approved', 'auto-approved']:
                print(f"  ✅ {intent.status.replace('_', ' ').title()} — Warrant: {intent.warrant_id or 'N/A'}")
                
                try:
                    # Execute the original function
                    print(f"  ⚡ Executing function: {func.__name__}...")
                    result = await func(*args, **kwargs)
                    
                    # Report successful execution
                    await _vienna_adapter.report_execution(
                        intent.execution_id or 'unknown',
                        'success',
                        {'result': result}
                    )
                    
                    print(f"  📒 Execution reported to audit trail")
                    return result
                    
                except Exception as error:
                    # Report failed execution
                    await _vienna_adapter.report_execution(
                        intent.execution_id or 'unknown',
                        'failure',
                        {'error': str(error)}
                    )
                    raise error
                    
            elif intent.status in ['pending_approval', 'pending']:
                message = f"⏳ Function requires human approval. View at: {intent.poll_url or 'console.regulator.ai'}"
                print(f"  {message}")
                raise Exception(message)
                
            else:
                # Denied
                reason = intent.reason or 'Policy violation'
                print(f"  🚫 DENIED: {reason}")
                raise Exception(f"Function denied: {reason}")
                
        except Exception as error:
            print(f"  ❌ Governance error: {error}")
            raise error
    
    return wrapper

# ─── Mock Function Implementations ─────────────────────────────────────────

async def simulate_delay(ms: int) -> None:
    """Simulate function execution time"""
    await asyncio.sleep(ms / 1000)

@governed_function
async def get_stock_price(symbol: str, exchange: str = "NYSE") -> Dict[str, Any]:
    """Get current stock price (T0 - Auto-approved)"""
    print(f"    📈 Fetching stock price for {symbol} on {exchange}")
    await simulate_delay(200)
    
    # Mock stock data
    prices = {
        "NVDA": 875.32,
        "MSFT": 420.18,
        "AAPL": 175.64,
        "GOOGL": 145.89
    }
    
    return {
        "symbol": symbol,
        "price": prices.get(symbol, 100.00),
        "change": 2.5,
        "change_percent": 0.29,
        "exchange": exchange,
        "timestamp": time.time()
    }

@governed_function 
async def send_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """Send an email (T1 internal, T2 external)"""
    print(f"    📧 Sending email to {to}: {subject}")
    await simulate_delay(300)
    
    return {
        "sent": True,
        "to": to,
        "subject": subject,
        "message_id": f"msg_{int(time.time())}",
        "timestamp": time.time()
    }

@governed_function
async def send_notification(channel: str, message: str) -> Dict[str, Any]:
    """Send a notification to internal channel (T1 - Policy approved)"""
    print(f"    🔔 Sending notification to {channel}: {message}")
    await simulate_delay(150)
    
    return {
        "sent": True,
        "channel": channel,
        "message": message,
        "notification_id": f"notif_{int(time.time())}"
    }

@governed_function
async def restart_service(service_name: str) -> Dict[str, Any]:
    """Restart a system service (T3 - Admin approval required)"""
    print(f"    🔄 Restarting service: {service_name}")
    await simulate_delay(500)
    
    return {
        "service": service_name,
        "status": "restarted",
        "restart_time": time.time(),
        "previous_uptime": "5d 12h 34m"
    }

@governed_function
async def analyze_data(dataset: str, metrics: List[str]) -> Dict[str, Any]:
    """Analyze a dataset (T1 - Policy approved)"""
    print(f"    📊 Analyzing {dataset} for metrics: {', '.join(metrics)}")
    await simulate_delay(800)
    
    return {
        "dataset": dataset,
        "metrics": metrics,
        "sample_size": 10000,
        "insights": [
            "User engagement increased 15% over last month",
            "Peak usage occurs between 2-4 PM",
            "Mobile traffic represents 60% of total"
        ],
        "confidence": 0.95
    }

# ─── Agent Creation Helpers ────────────────────────────────────────────────

def create_assistant_agent() -> ConversableAgent:
    """Create a general assistant agent with basic functions"""
    return ConversableAgent(
        name="assistant",
        system_message="You are a helpful AI assistant with access to various functions.",
        function_map={
            "get_stock_price": get_stock_price,
            "send_notification": send_notification,
            "analyze_data": analyze_data,
        }
    )

def create_email_agent() -> ConversableAgent:
    """Create an agent specialized in email communication"""
    return ConversableAgent(
        name="email_agent",
        system_message="You are an email assistant that helps with communication.",
        function_map={
            "send_email": send_email,
            "send_notification": send_notification,
        }
    )

def create_admin_agent() -> ConversableAgent:
    """Create an admin agent with system functions"""
    return ConversableAgent(
        name="admin_agent",
        system_message="You are a system administrator with service management capabilities.",
        function_map={
            "restart_service": restart_service,
            "analyze_data": analyze_data,
            "send_notification": send_notification,
        }
    )

def create_user_proxy() -> UserProxyAgent:
    """Create a user proxy agent"""
    return UserProxyAgent(
        name="user_proxy",
        human_input_mode="NEVER",
        max_consecutive_auto_reply=0,
        code_execution_config=False,
    )

# ─── Conversation Scenarios ────────────────────────────────────────────────

async def simple_chat_scenario():
    """Scenario 1: Simple assistant chat with basic functions"""
    print(f"""
Scenario: Simple Assistant Chat
Description: Basic conversation with function calls for information lookup
Expected: T0/T1 functions auto-approved by policy
""")
    
    user_proxy = create_user_proxy()
    assistant = create_assistant_agent()
    
    # Simulate conversation
    print(f"👤 User: What's the current NVDA stock price?")
    response = await assistant.send_message("What's the current NVDA stock price?")
    print(f"🤖 Assistant: {response}")
    
    print(f"\n👤 User: Can you analyze our user engagement data?")
    await assistant.function_map["analyze_data"]("user_engagement", ["sessions", "bounce_rate", "conversion"])
    print(f"🤖 Assistant: I've analyzed the user engagement data and found some interesting trends.")

async def function_calling_scenario():
    """Scenario 2: Function calling with different risk tiers"""
    print(f"""
Scenario: Function Calling with Mixed Risk Tiers  
Description: Demonstrates T0, T1, and T2 functions in sequence
Expected: Info lookups approved, emails may require approval if external
""")
    
    email_agent = create_email_agent()
    
    # T0 function - auto approved
    print(f"👤 User: Send a notification to the team about the stock update")
    await email_agent.function_map["send_notification"]("#general", "NVDA stock is up 2.5% today!")
    
    # T1 function - policy approved (internal email)
    print(f"\n👤 User: Send an email to the team lead") 
    await email_agent.function_map["send_email"]("lead@company.com", "Stock Update", "NVDA performance today")
    
    # T2 function - requires approval (external email)
    print(f"\n👤 User: Send an email to our external partner")
    try:
        await email_agent.function_map["send_email"]("partner@external.com", "Partnership Update", "Quarterly results")
    except Exception as e:
        print(f"🤖 Email Agent: {e}")

async def admin_scenario():
    """Scenario 3: Admin functions requiring high-level approval"""
    print(f"""
Scenario: Admin Operations
Description: System administration functions requiring T3 approval
Expected: Admin functions require multi-party human approval
""")
    
    admin_agent = create_admin_agent()
    
    print(f"👤 User: The web server seems slow, can you restart it?")
    try:
        await admin_agent.function_map["restart_service"]("web-server")
    except Exception as e:
        print(f"🤖 Admin Agent: {e}")
    
    print(f"\n👤 User: Can you analyze the server performance data?")
    await admin_agent.function_map["analyze_data"]("server_metrics", ["cpu_usage", "memory", "response_time"])
    print(f"🤖 Admin Agent: I've analyzed the server performance data. The analysis shows some bottlenecks.")

async def group_chat_scenario():
    """Scenario 4: Group chat with multiple agents"""
    print(f"""
Scenario: Group Chat with Multiple Agents
Description: Multi-agent conversation with coordinated function calls
Expected: Different agents have different function permissions and risk profiles
""")
    
    user_proxy = create_user_proxy()
    assistant = create_assistant_agent()
    email_agent = create_email_agent() 
    admin_agent = create_admin_agent()
    
    # Simulate group conversation
    agents = [assistant, email_agent, admin_agent]
    
    print(f"👤 User: I need to check NVDA stock, email the results to the team, and restart the notification service if needed")
    
    # Assistant gets stock price
    await assistant.function_map["get_stock_price"]("NVDA")
    print(f"🤖 Assistant: NVDA is currently at $875.32, up 2.5% today")
    
    # Email agent sends internal notification
    await email_agent.function_map["send_notification"]("#trading", "NVDA update: $875.32 (+2.5%)")
    print(f"📧 Email Agent: I've sent the update to the trading channel")
    
    # Admin agent attempts service restart (requires approval)
    print(f"⚙️ Admin Agent: I'll restart the notification service for you")
    try:
        await admin_agent.function_map["restart_service"]("notification-service")
    except Exception as e:
        print(f"⚙️ Admin Agent: {e}")

# ─── Demo Runner ───────────────────────────────────────────────────────────

async def run_autogen_demo(scenario: str = "all"):
    """Run the AutoGen + Vienna OS integration demo"""
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║           Vienna OS + AutoGen Integration                ║
║      Conversational AI Governance with Function Control  ║
╚══════════════════════════════════════════════════════════╝
""")

    # Initialize Vienna OS adapter
    vienna = create_for_autogen(
        api_key=os.getenv('VIENNA_API_KEY', 'vna_demo_key'),
        agent_id='autogen-demo-coordinator'
    )
    
    # Set global adapter for governed functions
    set_vienna_adapter(vienna)

    # Register with Vienna OS fleet
    try:
        await vienna.register({
            'agent_type': 'autogen_conversational',
            'capabilities': 'function_calling,conversation_management,multi_agent_coordination',
            'framework': 'autogen',
            'version': '1.0.0'
        })
    except Exception:
        print("⚠️  Agent registration skipped (demo mode)")

    scenarios_to_run = []
    
    if scenario == "all":
        scenarios_to_run = [
            ("simple_chat", simple_chat_scenario),
            ("function_calling", function_calling_scenario), 
            ("admin_ops", admin_scenario),
            ("group_chat", group_chat_scenario)
        ]
    else:
        scenario_map = {
            "simple_chat": simple_chat_scenario,
            "function_calling": function_calling_scenario,
            "admin_ops": admin_scenario,
            "group_chat": group_chat_scenario
        }
        if scenario in scenario_map:
            scenarios_to_run = [(scenario, scenario_map[scenario])]
        else:
            print(f"Unknown scenario: {scenario}")
            return

    for i, (name, scenario_func) in enumerate(scenarios_to_run):
        print(f"\n{'='*60}")
        await scenario_func()
        print(f"{'='*60}")
        
        if i < len(scenarios_to_run) - 1:
            print(f"\n⏸️  Pausing 3 seconds before next scenario...")
            await asyncio.sleep(3)

    print(f"""
{'='*60}

✅ AutoGen + Vienna OS integration demo complete!

Key takeaways:
• Function calls in conversations are governed before execution
• Risk tiers (T0/T1/T2/T3) determine approval requirements
• Multi-agent conversations maintain individual governance
• Full conversation audit trail for compliance
• Works with existing AutoGen conversation patterns

Governance in action:
• Information lookups (T0): Auto-approved, immediate execution
• Internal communications (T1): Policy-approved, fast execution  
• External communications (T2): Human approval for risk management
• Admin functions (T3): Multi-party approval for system safety
• All interactions: Logged to immutable audit trail

Next steps:
• Configure function-specific policies in Vienna console
• Set up approval workflows for high-risk operations
• Monitor conversation patterns for policy optimization
• Implement custom risk assessment for domain functions
• Scale to production with proper error handling

Documentation: https://regulator.ai/docs/integrations/autogen
""")

# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Vienna OS + AutoGen Integration Demo')
    parser.add_argument(
        '--scenario',
        choices=['simple_chat', 'function_calling', 'admin_ops', 'group_chat', 'all'],
        default='all',
        help='Which conversation scenario to run (default: all)'
    )
    
    args = parser.parse_args()
    
    try:
        asyncio.run(run_autogen_demo(args.scenario))
    except KeyboardInterrupt:
        print("\n\n👋 Demo interrupted by user")
    except Exception as error:
        print(f"\n❌ Demo failed: {error}")
        exit(1)

if __name__ == "__main__":
    main()