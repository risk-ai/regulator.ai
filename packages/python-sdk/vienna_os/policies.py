"""Module for managing governance policies."""

from typing import TYPE_CHECKING, Any, Dict, List, Optional
from urllib.parse import quote

from .client import build_query
from .types import (
    PolicyRule, PolicyCreateParams, PolicyUpdateParams, PolicyListParams,
    PolicyEvaluation, PolicyTemplate, RequestOptions,
)

if TYPE_CHECKING:
    from .client import ViennaClient

class PoliciesModule:
    """Module for managing governance policies."""
    
    def __init__(self, client: "ViennaClient"):
        self.client = client
    
    async def list(self, params: Optional[PolicyListParams] = None, options: Optional[RequestOptions] = None) -> List[PolicyRule]:
        """List all policies, optionally filtered."""
        query = build_query(params.model_dump() if params else {})
        return await self.client.request("GET", f"/api/v1/policies{query}", options=options, response_model=PolicyRule)
    
    async def get(self, policy_id: str, options: Optional[RequestOptions] = None) -> PolicyRule:
        """Get a single policy by ID."""
        return await self.client.request("GET", f"/api/v1/policies/{quote(policy_id)}", options=options, response_model=PolicyRule)
    
    async def create(self, params: PolicyCreateParams, options: Optional[RequestOptions] = None) -> PolicyRule:
        """Create a new governance policy."""
        return await self.client.request("POST", "/api/v1/policies", body=params.model_dump(), options=options, response_model=PolicyRule)
    
    async def update(self, policy_id: str, params: PolicyUpdateParams, options: Optional[RequestOptions] = None) -> PolicyRule:
        """Update an existing policy."""
        return await self.client.request("PATCH", f"/api/v1/policies/{quote(policy_id)}", body=params.model_dump(exclude_none=True), options=options, response_model=PolicyRule)
    
    async def delete(self, policy_id: str, options: Optional[RequestOptions] = None) -> None:
        """Delete a policy."""
        await self.client.request("DELETE", f"/api/v1/policies/{quote(policy_id)}", options=options)
    
    async def evaluate(self, payload: Dict[str, Any], options: Optional[RequestOptions] = None) -> PolicyEvaluation:
        """Evaluate policies against a test payload (dry-run)."""
        return await self.client.request("POST", "/api/v1/policies/evaluate", body=payload, options=options, response_model=PolicyEvaluation)
    
    async def templates(self, options: Optional[RequestOptions] = None) -> List[PolicyTemplate]:
        """List available industry policy templates."""
        return await self.client.request("GET", "/api/v1/policies/templates", options=options, response_model=PolicyTemplate)