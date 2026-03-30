"""Module for compliance reporting and statistics."""

from typing import TYPE_CHECKING, List, Optional
from urllib.parse import quote

from .client import build_query
from .types import (
    ComplianceReport, ComplianceGenerateParams, ComplianceSummary,
    QuickStatsParams, RequestOptions,
)

if TYPE_CHECKING:
    from .client import ViennaClient

class ComplianceModule:
    """Module for compliance reporting and statistics."""
    
    def __init__(self, client: "ViennaClient"):
        self.client = client
    
    async def generate(self, params: ComplianceGenerateParams, options: Optional[RequestOptions] = None) -> ComplianceReport:
        """Generate a new compliance report."""
        body = params.model_dump()
        body["period_start"] = params.period_start.isoformat()
        body["period_end"] = params.period_end.isoformat()
        return await self.client.request("POST", "/api/v1/compliance/reports", body=body, options=options, response_model=ComplianceReport)
    
    async def get(self, report_id: str, options: Optional[RequestOptions] = None) -> ComplianceReport:
        """Get a compliance report by ID."""
        return await self.client.request("GET", f"/api/v1/compliance/reports/{quote(report_id)}", options=options, response_model=ComplianceReport)
    
    async def list(self, options: Optional[RequestOptions] = None) -> List[ComplianceReport]:
        """List all compliance reports."""
        return await self.client.request("GET", "/api/v1/compliance/reports", options=options, response_model=ComplianceReport)
    
    async def quick_stats(self, params: QuickStatsParams, options: Optional[RequestOptions] = None) -> ComplianceSummary:
        """Get quick compliance statistics for a rolling window."""
        query = build_query(params.model_dump())
        return await self.client.request("GET", f"/api/v1/compliance/stats{query}", options=options, response_model=ComplianceSummary)