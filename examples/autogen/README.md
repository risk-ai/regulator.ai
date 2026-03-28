# Vienna OS + AutoGen Integration

This example demonstrates how to integrate Vienna OS governance with Microsoft AutoGen agents. It shows how conversational AI agents can submit function calls to Vienna OS for policy evaluation and approval before execution.

## What This Does

- **Governs AutoGen function calls** through Vienna OS policies
- **Manages conversation-based workflows** with risk-aware execution
- **Handles multi-agent chat** with governance at each function call
- **Provides conversation audit trails** for compliance and debugging
- **Demonstrates role-based agent permissions** in group conversations

## Prerequisites

- Python 3.8+
- Vienna OS API key (`vna_xxx`)
- AutoGen library
- OpenAI API key (for LLM functionality)

## Installation

```bash
# From the examples/autogen directory
pip install -r requirements.txt

# Set your API keys
export VIENNA_API_KEY=vna_your_api_key_here
export OPENAI_API_KEY=sk_your_openai_key_here
```

## Quick Start

```bash
# Run the example
python main.py

# Or run specific conversation scenarios
python main.py --scenario simple_chat
python main.py --scenario function_calling
python main.py --scenario group_chat
```

## How It Works

### 1. Function Call Governance

AutoGen agents submit function call intents to Vienna OS before execution:

```python
from vienna_sdk import create_for_autogen

vienna = create_for_autogen(
    api_key=os.environ['VIENNA_API_KEY'],
    agent_id='autogen-assistant'
)

# Submit a function intent during conversation
result = await vienna.submit_conversation_intent('get_stock_price', {
    'symbol': 'NVDA',
    'exchange': 'NASDAQ'
}, conversation_context={'chat_id': 'conv_123'})
```

### 2. Conversation-Level Context

Vienna OS evaluates function calls with conversation context:
- **Agent roles**: Assistant, user proxy, function executor, group admin
- **Conversation history**: Previous messages and function calls
- **Trust levels**: Based on conversation patterns and agent behavior  
- **Group dynamics**: Multi-agent conversation coordination

### 3. Governed Function Execution

Functions only execute if Vienna OS approves:

```python
@governed_function
async def get_stock_price(symbol: str, exchange: str = "NYSE"):
    """Get current stock price - governed by Vienna OS"""
    
    # Vienna OS governance happens automatically via decorator
    # Function only executes if approved
    
    price_data = await fetch_stock_data(symbol, exchange)
    return {
        "symbol": symbol,
        "price": price_data["current_price"], 
        "change": price_data["daily_change"]
    }
```

## Example Conversations

### Simple Assistant Chat (T0/T1 - Auto-Approved)

```python
# Configuration
assistant = autogen.ConversableAgent(
    name="assistant",
    system_message="You are a helpful assistant.",
    llm_config={"config_list": config_list},
    function_map=governed_functions  # Vienna OS governed functions
)

# Conversation
user_proxy.initiate_chat(assistant, message="What's the weather like in New York?")
```

**Outcome**: Weather lookup is T0 (informational) and auto-approved.

### Financial Analysis Chat (T1/T2 - Policy/Human Approval)

```python
# Conversation with financial functions
user_proxy.initiate_chat(
    financial_agent, 
    message="Analyze NVDA stock and suggest if I should buy $50,000 worth"
)

# Flow:
# 1. get_stock_price("NVDA") → T1 (auto-approved)
# 2. analyze_financials(symbol="NVDA", amount=50000) → T2 (requires approval)
```

**Outcome**: Data queries approved, but investment advice requires human review.

### Group Chat with Admin Functions (T2/T3 - Human Approval)

```python
# Multi-agent conversation with admin capabilities
group_chat = autogen.GroupChat(
    agents=[user_proxy, assistant, admin_agent],
    messages=[],
    max_round=10
)

# Admin functions are high-risk and require approval
await admin_agent.send_message("Delete old log files from the server")
```

**Outcome**: Admin functions require multi-party approval due to high risk.

## Policy Configuration

Vienna OS evaluates AutoGen function calls using policies like:

```yaml
# Information retrieval (T0 - Auto-approved) 
- name: "AutoGen Info Lookup"
  conditions:
    - field: "function_name"
      operator: "in"
      value: ["get_weather", "get_stock_price", "search_web"]
    - field: "conversation_context.agent_role"
      operator: "equals"
      value: "assistant"
  actions: ["auto_approve"]
  tier: "T0"

# Data analysis (T1 - Policy approved)
- name: "AutoGen Analysis Functions" 
  conditions:
    - field: "function_name"
      operator: "starts_with"
      value: "analyze_"
    - field: "function_args.amount"
      operator: "less_than"
      value: 10000
  actions: ["approve"]
  tier: "T1"

# High-value operations (T2 - Human approval)
- name: "AutoGen Financial Operations"
  conditions:
    - field: "function_name"
      operator: "in"
      value: ["execute_trade", "transfer_funds"]
    - field: "function_args.amount"
      operator: "greater_than"
      value: 10000
  actions: ["require_approval"]
  tier: "T2"

# Admin functions (T3 - Multi-party approval)
- name: "AutoGen Admin Functions"
  conditions:
    - field: "function_name"
      operator: "starts_with" 
      value: "admin_"
  actions: ["require_multi_party_approval"]
  tier: "T3"
```

## Code Structure

### Governed Function Decorator

```python
from functools import wraps
from vienna_sdk import create_for_autogen

vienna = create_for_autogen(
    api_key=os.environ['VIENNA_API_KEY'],
    agent_id='autogen-demo'
)

def governed_function(func):
    """Decorator to add Vienna OS governance to AutoGen functions."""
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract conversation context
        conversation_context = getattr(wrapper, '_conversation_context', {})
        
        # Submit intent to Vienna OS
        result = await vienna.submit_conversation_intent(
            func.__name__,
            {**kwargs, 'args': args},
            conversation_context
        )
        
        if result.status in ['approved', 'auto-approved']:
            # Execute original function
            function_result = await func(*args, **kwargs)
            
            # Report execution
            await vienna.report_execution(result.execution_id, 'success', {
                'result': function_result
            })
            
            return function_result
        else:
            raise Exception(f"Function requires approval: {result.poll_url}")
    
    return wrapper
```

### AutoGen Agent with Governance

```python
import autogen
from vienna_sdk import create_for_autogen

# Initialize Vienna adapter
vienna = create_for_autogen(
    api_key=os.environ['VIENNA_API_KEY'],
    agent_id='autogen-assistant'
)

# Define governed functions
@governed_function
async def get_stock_price(symbol: str) -> dict:
    """Get current stock price"""
    # Mock implementation
    return {"symbol": symbol, "price": 150.25, "change": 2.5}

@governed_function 
async def send_email(to: str, subject: str, body: str) -> dict:
    """Send an email"""
    # Mock implementation
    return {"sent": True, "message_id": "msg_123"}

# Create AutoGen agent with governed functions
assistant = autogen.ConversableAgent(
    name="assistant",
    system_message="You are a helpful financial assistant.",
    llm_config={"config_list": [{"model": "gpt-4", "api_key": os.environ["OPENAI_API_KEY"]}]},
    function_map={
        "get_stock_price": get_stock_price,
        "send_email": send_email
    }
)

# Register with Vienna OS
await vienna.register({
    'agent_name': 'AutoGen Financial Assistant',
    'capabilities': 'stock_lookup,email_sending,financial_analysis',
    'framework': 'autogen',
    'version': '1.0.0'
})
```

### Group Chat with Governance

```python
# Create multiple agents with different governance profiles
user_proxy = autogen.UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=0,
    code_execution_config=False,
)

assistant = autogen.ConversableAgent(
    name="assistant", 
    system_message="You are a helpful assistant.",
    llm_config={"config_list": config_list},
    function_map=basic_functions  # T0/T1 functions
)

admin_agent = autogen.ConversableAgent(
    name="admin_agent",
    system_message="You are a system administrator.",
    llm_config={"config_list": config_list},
    function_map=admin_functions  # T2/T3 functions requiring approval
)

# Create governed group chat
group_chat = autogen.GroupChat(
    agents=[user_proxy, assistant, admin_agent],
    messages=[],
    max_round=10
)

manager = autogen.GroupChatManager(
    groupchat=group_chat,
    llm_config={"config_list": config_list}
)

# Start conversation with governance
user_proxy.initiate_chat(
    manager,
    message="I need to check server status and maybe restart some services if needed"
)
```

## Advanced Features

### Conversation Context Tracking

```python
class ConversationTracker:
    def __init__(self, vienna_adapter):
        self.vienna = vienna_adapter
        self.conversations = {}
    
    def track_message(self, chat_id: str, message: dict):
        """Track conversation messages for context"""
        if chat_id not in self.conversations:
            self.conversations[chat_id] = []
        
        self.conversations[chat_id].append(message)
        
        # Update context for next function calls
        context = {
            'chat_id': chat_id,
            'message_count': len(self.conversations[chat_id]),
            'participants': self.get_participants(chat_id),
            'recent_functions': self.get_recent_functions(chat_id)
        }
        
        # Set context for governed functions
        for func in governed_functions:
            func._conversation_context = context
```

### Risk-Based Function Routing

```python
async def route_function_call(function_name: str, args: dict, context: dict):
    """Route function calls based on risk assessment"""
    
    # Pre-assess risk before submission
    risk_indicators = {
        'high_value': any(
            isinstance(v, (int, float)) and v > 50000 
            for v in args.values()
        ),
        'admin_function': function_name.startswith('admin_'),
        'external_api': function_name in ['send_email', 'post_social'],
        'data_modification': function_name in ['delete_', 'update_', 'modify_']
    }
    
    if sum(risk_indicators.values()) >= 2:
        # High risk - add additional context
        context['risk_factors'] = risk_indicators
        context['requires_justification'] = True
    
    return await vienna.submit_conversation_intent(function_name, args, context)
```

## Monitoring & Debugging

### Conversation Audit Trails

```python
# Review conversation governance history
async def get_conversation_audit(chat_id: str):
    """Get governance audit trail for a conversation"""
    
    audit_trail = await vienna.get_audit_trail(
        filters={'conversation_context.chat_id': chat_id},
        time_range='24h'
    )
    
    return {
        'total_function_calls': len(audit_trail),
        'approved': len([a for a in audit_trail if a['outcome'] == 'approved']),
        'denied': len([a for a in audit_trail if a['outcome'] == 'denied']),
        'pending': len([a for a in audit_trail if a['outcome'] == 'pending']),
        'timeline': audit_trail
    }
```

### Agent Performance Metrics

```python
# Monitor agent governance performance
async def get_agent_metrics(agent_id: str):
    """Get governance metrics for an AutoGen agent"""
    
    metrics = await vienna.get_agent_metrics(agent_id)
    
    return {
        'approval_rate': metrics['approved'] / metrics['total_requests'],
        'average_response_time': metrics['avg_response_time_ms'],
        'policy_violations': metrics['denied_count'],
        'risk_distribution': metrics['risk_tier_breakdown']
    }
```

## Best Practices

### 1. Function Design

```python
# Good: Clear function signature with type hints
@governed_function
async def transfer_funds(
    from_account: str,
    to_account: str, 
    amount: float,
    currency: str = "USD"
) -> dict:
    """Transfer funds between accounts (requires T2 approval for >$10k)"""
    pass

# Avoid: Vague functions that are hard to govern
@governed_function  
async def do_something(data: dict) -> any:
    """Does something with data"""
    pass
```

### 2. Error Handling

```python
@governed_function
async def risky_operation(params: dict):
    """Example of proper error handling in governed functions"""
    try:
        # Your function logic here
        result = await execute_operation(params)
        return result
    except Exception as e:
        # Governance system automatically logs failures
        logger.error(f"Operation failed: {e}")
        raise  # Re-raise to maintain AutoGen conversation flow
```

### 3. Testing

```python
import pytest
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_governed_function():
    """Test that functions work with governance"""
    
    # Mock Vienna OS to return approval
    vienna.submit_conversation_intent = AsyncMock(return_value=IntentResult(
        status='approved',
        execution_id='test_123'
    ))
    
    # Test function execution
    result = await get_stock_price('AAPL')
    assert result['symbol'] == 'AAPL'
    
    # Verify governance was called
    vienna.submit_conversation_intent.assert_called_once()
```

## Deployment

### Production Configuration

```python
# Production Vienna OS configuration
vienna = create_for_autogen(
    api_key=os.environ['VIENNA_API_KEY'],
    base_url=os.environ.get('VIENNA_API_URL', 'https://api.vienna-os.dev'),
    agent_id=f'autogen-{os.environ.get("DEPLOYMENT_ID", "prod")}'
)

# Error handling for production
async def safe_governed_function(func):
    """Wrapper for production error handling"""
    try:
        return await func()
    except Exception as e:
        # Log to monitoring system
        logger.error(f"Governed function failed: {e}")
        
        # Fallback behavior
        if "approval" in str(e).lower():
            return {"error": "Function requires approval", "contact": "admin@company.com"}
        else:
            raise
```

## Next Steps

1. **Configure function policies** in the Vienna console
2. **Set up approval workflows** for high-risk functions
3. **Monitor conversation patterns** for policy optimization
4. **Implement custom risk assessment** for domain-specific functions
5. **Scale to production** with proper monitoring and alerts

## Learn More

- [Vienna OS Documentation](https://regulator.ai/docs)
- [AutoGen Documentation](https://autogen.readthedocs.io/)
- [Function Governance Guide](https://regulator.ai/docs/function-governance)
- [Conversation AI Policies](https://regulator.ai/docs/policies/conversational-ai)

## Support

- Issues: [GitHub Issues](https://github.com/risk-ai/regulator.ai/issues)
- Community: [Discord](https://discord.gg/vienna-os)
- Email: support@regulator.ai