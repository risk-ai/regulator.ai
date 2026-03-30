"""Module for submitting intents and managing approvals (warrants)."""

from typing import TYPE_CHECKING, List, Optional
from urllib.parse import quote

from .client import build_query
from .types import (
    IntentRequest, IntentResult, IntentStatusResponse, IntentSimulationResult,
    Approval, ApprovalListParams, ApproveParams, DenyParams, RequestOptions,
)

if TYPE_CHECKING:
    from .client import ViennaClient

class IntentModule:
    """Module for submitting and managing agent intents through the governance pipeline."""
    
    def __init__(self, client: "ViennaClient"):
        self.client = client
    
    async def submit(self, intent: IntentRequest, options: Optional[RequestOptions] = None) -> IntentResult:
        """Submit an agent intent for governance evaluation and execution."""
        return await self.client.request("POST", "/api/v1/intents", body=intent.model_dump(), options=options, response_model=IntentResult)
    
    async def status(self, intent_id: str, options: Optional[RequestOptions] = None) -> IntentStatusResponse:
        """Check the current status of a previously submitted intent."""
        return await self.client.request("GET", f"/api/v1/intents/{quote(intent_id)}", options=options, response_model=IntentStatusResponse)
    
    async def simulate(self, intent: IntentRequest, options: Optional[RequestOptions] = None) -> IntentSimulationResult:
        """Simulate an intent without executing it (dry-run)."""
        return await self.client.request("POST", "/api/v1/intents/simulate", body=intent.model_dump(), options=options, response_model=IntentSimulationResult)

class ApprovalsModule:
    """Module for managing approval workflows."""
    
    def __init__(self, client: "ViennaClient"):
        self.client = client
    
    async def list(self, params: Optional[ApprovalListParams] = None, options: Optional[RequestOptions] = None) -> List[Approval]:
        """List approvals, optionally filtered by status or source."""
        query = build_query(params.model_dump() if params else {})
        return await self.client.request("GET", f"/api/v1/approvals{query}", options=options, response_model=Approval)
    
    async def get(self, approval_id: str, options: Optional[RequestOptions] = None) -> Approval:
        """Get a single approval by ID."""
        return await self.client.request("GET", f"/api/v1/approvals/{quote(approval_id)}", options=options, response_model=Approval)
    
    async def approve(self, approval_id: str, params: ApproveParams, options: Optional[RequestOptions] = None) -> Approval:
        """Approve a pending action."""
        return await self.client.request("POST", f"/api/v1/approvals/{quote(approval_id)}/approve", body=params.model_dump(), options=options, response_model=Approval)
    
    async def deny(self, approval_id: str, params: DenyParams, options: Optional[RequestOptions] = None) -> Approval:
        """Deny a pending action."""
        return await self.client.request("POST", f"/api/v1/approvals/{quote(approval_id)}/deny", body=params.model_dump(), options=options, response_model=Approval)