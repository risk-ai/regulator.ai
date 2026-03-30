"""
Vienna OS + LangChain Integration
Wrap LangChain agents with Vienna governance
"""

from typing import Optional, Dict, Any
from langchain.agents import Agent
from langchain.callbacks.base import BaseCallbackHandler
from vienna_os import ViennaClient


class ViennaCallbackHandler(BaseCallbackHandler):
    """LangChain callback handler for Vienna OS governance"""
    
    def __init__(self, vienna_client: ViennaClient, agent_id: str, default_tier: str = "T0"):
        self.client = vienna_client
        self.agent_id = agent_id
        self.default_tier = default_tier
        self.execution_id = None
    
    def on_agent_action(self, action, **kwargs):
        """Intercept agent actions for governance"""
        # Execute through Vienna OS
        result = self.client.execute(
            action=action.tool,
            agent_id=self.agent_id,
            context={
                "tool_input": str(action.tool_input),
                "log": action.log
            },
            tier=self.default_tier
        )
        
        self.execution_id = result.execution_id
        
        # Block if requires approval
        if result.requires_approval:
            raise Exception(f"Action requires approval: {result.execution_id}")
        
        return result


class GovernedAgent:
    """LangChain Agent wrapped with Vienna OS governance"""
    
    def __init__(
        self,
        agent: Agent,
        vienna_client: ViennaClient,
        agent_id: str,
        default_tier: str = "T0"
    ):
        self.agent = agent
        self.vienna_client = vienna_client
        self.agent_id = agent_id
        self.default_tier = default_tier
        
        # Register agent in Vienna OS
        self.vienna_client.register_agent(
            name=agent_id,
            type="langchain",
            description=f"LangChain agent: {agent.__class__.__name__}",
            default_tier=default_tier
        )
    
    def run(self, input_text: str, **kwargs):
        """Run agent with governance"""
        callback = ViennaCallbackHandler(
            self.vienna_client,
            self.agent_id,
            self.default_tier
        )
        
        return self.agent.run(
            input_text,
            callbacks=[callback],
            **kwargs
        )


# Example usage
if __name__ == "__main__":
    from langchain.agents import initialize_agent, AgentType
    from langchain.llms import OpenAI
    from langchain.tools import Tool
    
    # Initialize Vienna client
    vienna = ViennaClient(
        email="demo@regulator.ai",
        password="vienna2024"
    )
    
    # Create LangChain agent
    llm = OpenAI(temperature=0)
    tools = [
        Tool(
            name="Search",
            func=lambda x: f"Search results for: {x}",
            description="Search the web"
        )
    ]
    
    agent = initialize_agent(
        tools,
        llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION
    )
    
    # Wrap with Vienna governance
    governed_agent = GovernedAgent(
        agent=agent,
        vienna_client=vienna,
        agent_id="langchain-search-agent",
        default_tier="T0"
    )
    
    # Run with governance
    result = governed_agent.run("What is Vienna OS?")
    print(result)
