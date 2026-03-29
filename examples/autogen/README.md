# AutoGen + Vienna OS Integration

**Govern autonomous agent conversations with Vienna approval gates**

This example demonstrates how to integrate Vienna OS governance into AutoGen multi-agent conversations, ensuring risky actions are policy-checked and approved before execution.

---

## Architecture

```
┌────────────────┐
│ AutoGen Group  │  (Multi-agent conversation)
│ Chat           │
└────────┬───────┘
         │
         ├─ UserProxyAgent → Vienna governance
         ├─ AssistantAgent → Vienna governance
         └─ ExecutorAgent → Vienna governance
              │
              ▼
      ┌──────────────┐
      │  Vienna OS   │  (Policy + approval + execution)
      └──────────────┘
```

**Integration points:**
- Function calls intercepted before execution
- Vienna evaluates policy + risk tier
- Approval workflow pauses conversation if needed
- Execution result returned to AutoGen conversation

---

## Quick Start

```bash
cd ~/regulator.ai/examples/autogen
pip install -r requirements.txt
python autogen_vienna.py
```

---

## Code Example

```python
# autogen_vienna.py
import autogen
from vienna_sdk import ViennaGovernor

# Initialize Vienna governance
governor = ViennaGovernor(
    tenant='autogen-demo',
    api_key=os.getenv('VIENNA_API_KEY')
)

# Define governed function wrapper
def governed_function(func, risk_tier='T0'):
    \"\"\"Wrap AutoGen function with Vienna governance\"\"\"
    
    def wrapper(*args, **kwargs):
        # Submit intent to Vienna
        intent = governor.submit_intent({
            'action': func.__name__,
            'parameters': {'args': args, 'kwargs': kwargs},
            'risk_tier': risk_tier
        })
        
        # Wait for approval (if T1/T2)
        result = governor.wait_for_execution(intent['execution_id'])
        
        if not result['success']:
            return {'error': f\"Vienna denied: {result['reason']}\"}
        
        # Execute actual function
        return func(*args, **kwargs)
    
    return wrapper

# Example: Governed web search
@governed_function
def search_web(query: str) -> str:
    \"\"\"Search the web (governed by Vienna)\"\"\"
    # Actual search logic
    return f\"Results for: {query}\"

# Example: Governed file write (T2)
@governed_function(risk_tier='T2')
def write_file(path: str, content: str) -> str:
    \"\"\"Write file (T2 - requires approval)\"\"\"
    with open(path, 'w') as f:
        f.write(content)
    return f\"File written: {path}\"

# Define AutoGen agents with governed functions
config_list = [{
    'model': 'gpt-4',
    'api_key': os.getenv('OPENAI_API_KEY')
}]

user_proxy = autogen.UserProxyAgent(
    name='User',
    human_input_mode='NEVER',
    function_map={
        'search_web': search_web,
        'write_file': write_file
    }
)

assistant = autogen.AssistantAgent(
    name='Assistant',
    llm_config={'config_list': config_list},
    system_message=\"\"\"You are a helpful assistant.
    You can search the web and write files.
    All actions are governed by Vienna OS.\"\"\"
)

# Start conversation (all function calls governed)
user_proxy.initiate_chat(
    assistant,
    message=\"\"\"Search for 'Vienna OS governance' and 
    write the results to output.txt\"\"\"
)
```

---

## Approval Workflow in Conversation

```python
# Conversation example with approval gate

# 1. Agent suggests risky action
Assistant: I'll write the results to /etc/config.txt

# 2. Vienna intercepts, requires approval
[Vienna] Action 'write_file' is T2, requires approval
[Vienna] Approval request created: approval_abc123

# 3. Conversation pauses until approval
[Vienna] Waiting for operator decision...

# 4. Operator approves via console
$ curl -X POST .../approvals/approval_abc123/approve \
  -d '{"operator": "max", "reason": "Config update approved"}'

# 5. Conversation resumes
[Vienna] Approval granted, executing...
Assistant: File written successfully to /etc/config.txt
```

---

## Multi-Agent Coordination

```python
# Multiple agents, all governed

planner = autogen.AssistantAgent(
    name='Planner',
    system_message='Create execution plans'
)

executor = autogen.UserProxyAgent(
    name='Executor',
    function_map={
        'execute_command': governed_function(execute_command, 'T2')
    }
)

validator = autogen.AssistantAgent(
    name='Validator',
    system_message='Validate execution results'
)

# Group chat with Vienna governance
groupchat = autogen.GroupChat(
    agents=[planner, executor, validator],
    messages=[],
    max_round=10
)

manager = autogen.GroupChatManager(groupchat=groupchat)

# Vienna tracks:
# - Which agent requested which action
# - Approval chain (planner → executor → validator)
# - Full causal graph of conversation
```

---

## Testing

```python
# test_autogen_vienna.py
import pytest
from autogen_vienna import governed_function, governor

def test_t0_function_auto_approved():
    \"\"\"T0 functions should execute without approval\"\"\"
    
    @governed_function(risk_tier='T0')
    def safe_function():
        return 'success'
    
    result = safe_function()
    assert result == 'success'

def test_t2_function_requires_approval():
    \"\"\"T2 functions should wait for approval\"\"\"
    
    @governed_function(risk_tier='T2')
    def risky_function():
        return 'executed'
    
    # Should raise pending approval
    with pytest.raises(ApprovalPendingError):
        risky_function()
```

---

## Production Patterns

### Pattern 1: Conversation Checkpoints

```python
# Save conversation state before T2 actions

class GovernedGroupChat(autogen.GroupChat):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.governor = ViennaGovernor(...)
    
    def append_message(self, message):
        # Before executing function, checkpoint state
        if is_function_call(message):
            self.governor.checkpoint_state({
                'messages': self.messages,
                'round': len(self.messages)
            })
        
        super().append_message(message)
```

### Pattern 2: Approval Notifications

```python
# Notify humans when approval needed

governor.on('approval_required', lambda intent:
    autogen.UserProxyAgent().send(
        message=f\"Approval needed: {intent['action']}\",
        recipient=human_operator
    )
)
```

---

## Comparison: AutoGen Native vs Vienna-Governed

| Feature | AutoGen Native | Vienna-Governed |
|---------|----------------|-----------------|
| Function execution | Direct | Via governance pipeline |
| Policy enforcement | None | Automatic per function |
| Approval workflow | Human-in-loop (manual) | Automated T1/T2 workflow |
| Audit trail | Conversation log | Immutable attestations |
| Rollback | Manual | Automatic (if supported) |

---

## References

- Vienna SDK (Python): `pip install vienna-sdk`
- AutoGen: https://microsoft.github.io/autogen/
- Governance Docs: `../../CANONICAL_EXECUTION_PATH.md`
