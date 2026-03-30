# Vienna OS Integrations

Pre-built adapters for popular AI agent frameworks.

## Available Integrations

### 1. LangChain
Wrap LangChain agents with Vienna OS governance.

```python
from langchain.agents import initialize_agent
from langchain.llms import OpenAI
from vienna_os import ViennaClient
from integrations.langchain.vienna_langchain import GovernedAgent

vienna = ViennaClient(email="user@example.com", password="password")

# Your LangChain agent
agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION)

# Wrap with governance
governed = GovernedAgent(
    agent=agent,
    vienna_client=vienna,
    agent_id="my-langchain-agent",
    default_tier="T0"
)

# Run with governance
result = governed.run("Your query")
```

**Features:**
- Automatic action interception
- Policy validation before tool use
- Approval workflow for high-risk actions
- Full audit trail

### 2. CrewAI
Govern entire CrewAI crews with Vienna OS.

```python
from crewai import Agent, Task, Crew
from vienna_os import ViennaClient
from integrations.crewai.vienna_crewai import GovernedCrew

vienna = ViennaClient(email="user@example.com", password="password")

# Your CrewAI setup
crew = Crew(agents=[researcher, writer], tasks=[research_task, writing_task])

# Wrap with governance
governed_crew = GovernedCrew(
    crew=crew,
    vienna_client=vienna,
    crew_id="research-crew",
    default_tier="T1"
)

# Run with governance
result = governed_crew.kickoff({"topic": "AI Safety"})
```

**Features:**
- Crew-level governance
- Individual agent tracking
- Multi-agent coordination monitoring
- Task-level approval

### 3. AutoGen
Add governance to AutoGen conversations and group chats.

```python
from autogen import AssistantAgent, UserProxyAgent
from vienna_os import ViennaClient
from integrations.autogen.vienna_autogen import GovernedGroupChat

vienna = ViennaClient(email="user@example.com", password="password")

# Your AutoGen agents
agents = [assistant, user_proxy]

# Create governed group chat
group = GovernedGroupChat(
    agents=agents,
    vienna_client=vienna,
    group_id="my-group",
    default_tier="T0",
    max_round=10
)

# Run with governance
group.initiate_chat("Solve this problem")
```

**Features:**
- Message-level governance
- Group chat monitoring
- Code execution approval
- Conversational audit trail

## Installation

```bash
# Install Vienna OS SDK
pip install vienna-os

# Install your framework
pip install langchain  # or crewai, or pyautogen
```

## Configuration

All integrations require:

1. **Vienna OS Client** - Authentication credentials
2. **Agent ID** - Unique identifier for the agent
3. **Default Tier** - Risk tier (T0=low, T1=medium, T2=high, T3=critical)

## Tier Recommendations

- **T0** (Auto-approved): Read-only operations, queries, searches
- **T1** (Manual approval): Write operations, data modifications
- **T2** (High approval): Sensitive actions, external API calls
- **T3** (Critical approval): Destructive actions, financial transactions

## Advanced Usage

### Custom Approval Callbacks

```python
def on_approval_required(execution_id):
    print(f"Action requires approval: {execution_id}")
    # Send notification, log event, etc.

governed_agent.on_approval_required = on_approval_required
```

### Tier Override Per Action

```python
# Override tier for specific actions
result = governed_agent.run(
    "Delete user data",
    tier="T2"  # Force higher tier
)
```

### Webhook Notifications

Register webhooks to receive real-time events:

```python
vienna.register_webhook(
    url="https://your-domain.com/webhooks",
    events=["execution.approval_required", "execution.completed"]
)
```

## Examples

See `/examples` directory for complete examples:
- `langchain_example.py` - Search agent with governance
- `crewai_example.py` - Research crew with approval workflow
- `autogen_example.py` - Code generation with execution approval

## Support

- **Documentation:** https://docs.regulator.ai/integrations
- **GitHub:** https://github.com/risk-ai/regulator.ai
- **Email:** support@regulator.ai

## License

MIT License - see LICENSE file for details
