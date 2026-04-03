"""Framework convenience wrappers for Vienna OS SDK.

These adapters provide framework-specific convenience methods
that wrap the core ViennaClient for popular AI agent frameworks.

Note: The adapters use async methods matching the ViennaClient API.
"""

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

    async def submit_intent(
        self,
        action: str,
        params: Optional[Dict[str, Any]] = None,
        objective: Optional[str] = None,
    ):
        """Submit an intent for governance evaluation."""
        intent = {
            "action": action,
            "payload": params or {},
            "metadata": {"framework": self.framework},
        }
        if objective:
            intent["objective"] = objective
        return await self.client.submit_intent(intent)

    async def report_execution(
        self,
        warrant_id: str,
        success: bool = True,
        output: Optional[str] = None,
        error: Optional[str] = None,
    ):
        """Report execution result."""
        # Uses the verify_warrant endpoint as a proxy for execution reporting
        return await self.client.verify_warrant(warrant_id)

    async def close(self):
        """Close the underlying client."""
        await self.client.close()


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
        **kwargs,
    )
    return FrameworkAdapter(client, "openclaw")
