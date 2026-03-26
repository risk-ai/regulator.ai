"""Framework convenience wrappers for Vienna OS SDK."""

from typing import Any, Dict, List, Optional
from .client import ViennaClient


class FrameworkAdapter:
    """
    Simplified adapter for AI agent frameworks.
    Wraps ViennaClient with framework-specific convenience methods.
    """

    def __init__(self, client: ViennaClient, framework: str):
        self.client = client
        self.framework = framework

    def submit_intent(
        self,
        action: str,
        params: Optional[Dict[str, Any]] = None,
        objective: Optional[str] = None,
    ):
        """Submit an intent for governance evaluation."""
        return self.client.submit_intent(
            action=action,
            params=params,
            objective=objective,
            metadata={"framework": self.framework},
        )

    def wait_for_approval(self, intent_id: str, timeout_seconds: int = 300):
        """Wait for intent approval (polling with backoff)."""
        return self.client.wait_for_approval(intent_id, timeout_seconds)

    def report_execution(
        self,
        warrant_id: str,
        success: bool = True,
        output: Optional[str] = None,
        error: Optional[str] = None,
    ):
        """Report execution result."""
        return self.client.report_execution(
            warrant_id=warrant_id,
            success=success,
            output=output,
            error=error,
        )

    def register(self, name: str, capabilities: Optional[List[str]] = None):
        """Register agent with Vienna OS."""
        return self.client.register(name=name, capabilities=capabilities)

    def heartbeat(self, status: Optional[Dict[str, Any]] = None):
        """Send heartbeat."""
        return self.client.heartbeat(status)


def create_langchain_adapter(
    api_key: str,
    base_url: str = "https://api.regulator.ai",
    agent_id: str = "langchain-agent",
    **kwargs,
) -> FrameworkAdapter:
    """Create a Vienna adapter for LangChain agents."""
    client = ViennaClient(
        api_key=api_key,
        base_url=base_url,
        agent_id=agent_id,
        framework="langchain",
        **kwargs,
    )
    return FrameworkAdapter(client, "langchain")


def create_crewai_adapter(
    api_key: str,
    base_url: str = "https://api.regulator.ai",
    agent_id: str = "crewai-agent",
    **kwargs,
) -> FrameworkAdapter:
    """Create a Vienna adapter for CrewAI agents."""
    client = ViennaClient(
        api_key=api_key,
        base_url=base_url,
        agent_id=agent_id,
        framework="crewai",
        **kwargs,
    )
    return FrameworkAdapter(client, "crewai")


def create_autogen_adapter(
    api_key: str,
    base_url: str = "https://api.regulator.ai",
    agent_id: str = "autogen-agent",
    **kwargs,
) -> FrameworkAdapter:
    """Create a Vienna adapter for Microsoft AutoGen agents."""
    client = ViennaClient(
        api_key=api_key,
        base_url=base_url,
        agent_id=agent_id,
        framework="autogen",
        **kwargs,
    )
    return FrameworkAdapter(client, "autogen")


def create_openclaw_adapter(
    api_key: str,
    base_url: str = "https://api.regulator.ai",
    agent_id: str = "openclaw-agent",
    **kwargs,
) -> FrameworkAdapter:
    """Create a Vienna adapter for OpenClaw agents."""
    client = ViennaClient(
        api_key=api_key,
        base_url=base_url,
        agent_id=agent_id,
        framework="openclaw",
        **kwargs,
    )
    return FrameworkAdapter(client, "openclaw")
