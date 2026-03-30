"""Module for fleet and agent management."""

from typing import TYPE_CHECKING, List, Optional
from urllib.parse import quote

from .client import build_query
from .types import (
    FleetAgent, AgentMetrics, AgentActivity, FleetAlert, FleetAlertParams,
    PaginationParams, PaginatedList, RequestOptions,
)

if TYPE_CHECKING:
    from .client import ViennaClient

class FleetModule:
    """Module for fleet and agent management."""
    
    def __init__(self, client: "ViennaClient"):
        self.client = client
    
    async def list(self, options: Optional[RequestOptions] = None) -> List[FleetAgent]:
        """List all agents in the fleet."""
        return await self.client.request("GET", "/api/v1/fleet", options=options, response_model=FleetAgent)
    
    async def get(self, agent_id: str, options: Optional[RequestOptions] = None) -> FleetAgent:
        """Get a single agent by ID."""
        return await self.client.request("GET", f"/api/v1/fleet/{quote(agent_id)}", options=options, response_model=FleetAgent)
    
    async def metrics(self, agent_id: str, options: Optional[RequestOptions] = None) -> AgentMetrics:
        """Get metrics for a specific agent."""
        return await self.client.request("GET", f"/api/v1/fleet/{quote(agent_id)}/metrics", options=options, response_model=AgentMetrics)
    
    async def activity(self, agent_id: str, pagination: Optional[PaginationParams] = None, options: Optional[RequestOptions] = None) -> PaginatedList[AgentActivity]:
        """Get paginated activity log for an agent."""
        query = build_query(pagination.model_dump() if pagination else {})
        response = await self.client.request("GET", f"/api/v1/fleet/{quote(agent_id)}/activity{query}", options=options)
        return PaginatedList[AgentActivity](
            items=[AgentActivity.model_validate(item) for item in response["items"]],
            total=response["total"], limit=response["limit"], offset=response["offset"]
        )
    
    async def suspend(self, agent_id: str, params: dict, options: Optional[RequestOptions] = None) -> FleetAgent:
        """Suspend an agent, preventing it from submitting intents."""
        return await self.client.request("POST", f"/api/v1/fleet/{quote(agent_id)}/suspend", body=params, options=options, response_model=FleetAgent)
    
    async def activate(self, agent_id: str, options: Optional[RequestOptions] = None) -> FleetAgent:
        """Reactivate a suspended agent."""
        return await self.client.request("POST", f"/api/v1/fleet/{quote(agent_id)}/activate", options=options, response_model=FleetAgent)
    
    async def set_trust(self, agent_id: str, params: dict, options: Optional[RequestOptions] = None) -> FleetAgent:
        """Manually adjust an agent's trust score."""
        return await self.client.request("PUT", f"/api/v1/fleet/{quote(agent_id)}/trust", body=params, options=options, response_model=FleetAgent)
    
    async def alerts(self, params: Optional[FleetAlertParams] = None, options: Optional[RequestOptions] = None) -> List[FleetAlert]:
        """List fleet-wide alerts."""
        query = build_query(params.model_dump() if params else {})
        return await self.client.request("GET", f"/api/v1/fleet/alerts{query}", options=options, response_model=FleetAlert)
    
    async def resolve_alert(self, alert_id: str, params: dict, options: Optional[RequestOptions] = None) -> FleetAlert:
        """Resolve a fleet alert."""
        return await self.client.request("POST", f"/api/v1/fleet/alerts/{quote(alert_id)}/resolve", body=params, options=options, response_model=FleetAlert)