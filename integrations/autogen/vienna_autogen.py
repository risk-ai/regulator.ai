"""
Vienna OS + AutoGen Integration
Wrap AutoGen agents with Vienna governance
"""

from typing import Optional, Dict, Any, List
import autogen
from vienna_os import ViennaClient


class GovernedConversableAgent(autogen.ConversableAgent):
    """AutoGen ConversableAgent with Vienna OS governance"""
    
    def __init__(
        self,
        vienna_client: ViennaClient,
        agent_id: str,
        default_tier: str = "T0",
        *args,
        **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.vienna_client = vienna_client
        self.agent_id = agent_id
        self.default_tier = default_tier
        
        # Register agent in Vienna OS
        self.vienna_client.register_agent(
            name=agent_id,
            type="autogen",
            description=kwargs.get('system_message', 'AutoGen agent'),
            default_tier=default_tier
        )
    
    def generate_reply(
        self,
        messages: Optional[List[Dict]] = None,
        sender: Optional["Agent"] = None,
        **kwargs
    ):
        """Override reply generation with governance"""
        # Get the message
        if messages is None:
            messages = self._oai_messages[sender]
        
        message_text = messages[-1].get('content', '') if messages else ''
        
        # Execute through Vienna OS
        result = self.vienna_client.execute(
            action="generate_reply",
            agent_id=self.agent_id,
            context={
                "message": message_text,
                "sender": sender.name if sender else "unknown"
            },
            tier=self.default_tier
        )
        
        # Block if requires approval
        if result.requires_approval:
            return f"[BLOCKED] Action requires approval: {result.execution_id}"
        
        # Generate reply normally
        return super().generate_reply(messages, sender, **kwargs)


class GovernedGroupChat:
    """AutoGen GroupChat with Vienna OS governance"""
    
    def __init__(
        self,
        agents: List[autogen.ConversableAgent],
        vienna_client: ViennaClient,
        group_id: str,
        default_tier: str = "T0",
        **kwargs
    ):
        self.vienna_client = vienna_client
        self.group_id = group_id
        self.default_tier = default_tier
        
        # Wrap each agent
        self.governed_agents = []
        for agent in agents:
            governed = GovernedConversableAgent(
                vienna_client=vienna_client,
                agent_id=f"{group_id}_{agent.name}",
                default_tier=default_tier,
                name=agent.name,
                system_message=agent.system_message,
                llm_config=agent.llm_config
            )
            self.governed_agents.append(governed)
        
        # Create group chat
        self.group_chat = autogen.GroupChat(
            agents=self.governed_agents,
            **kwargs
        )
        
        self.manager = autogen.GroupChatManager(
            groupchat=self.group_chat
        )
    
    def initiate_chat(self, message: str):
        """Start group chat with governance"""
        # Execute through Vienna OS
        result = self.vienna_client.execute(
            action="group_chat",
            agent_id=self.group_id,
            context={
                "message": message,
                "agents": [agent.name for agent in self.governed_agents],
                "max_rounds": self.group_chat.max_round
            },
            tier=self.default_tier
        )
        
        # Block if requires approval
        if result.requires_approval:
            raise Exception(f"Group chat requires approval: {result.execution_id}")
        
        # Run chat
        self.governed_agents[0].initiate_chat(
            self.manager,
            message=message
        )


# Example usage
if __name__ == "__main__":
    # Initialize Vienna client
    vienna = ViennaClient(
        email="demo@regulator.ai",
        password="vienna2024"
    )
    
    # Create AutoGen agents
    config_list = [
        {
            "model": "gpt-4",
            "api_key": "your-key"
        }
    ]
    
    llm_config = {"config_list": config_list}
    
    # Create agents
    assistant = autogen.AssistantAgent(
        name="assistant",
        system_message="You are a helpful AI assistant.",
        llm_config=llm_config
    )
    
    user_proxy = autogen.UserProxyAgent(
        name="user",
        human_input_mode="NEVER",
        code_execution_config={"work_dir": "coding"}
    )
    
    # Create governed group chat
    group = GovernedGroupChat(
        agents=[assistant, user_proxy],
        vienna_client=vienna,
        group_id="autogen-demo-group",
        default_tier="T0",
        max_round=5
    )
    
    # Run with governance
    group.initiate_chat("Solve 2+2")
