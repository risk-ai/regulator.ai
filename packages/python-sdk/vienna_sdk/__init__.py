"""
Vienna OS Python SDK — AI Agent Governance Platform

Govern your AI agents with cryptographic warrants, risk-tiered approval
workflows, and immutable audit trails.

Usage:
    from vienna_sdk import ViennaClient

    client = ViennaClient(api_key="vos_your_key")
    result = client.submit_intent(action="deploy_code", params={"service": "api"})

    if result.status == "approved":
        # Execute with warrant
        client.report_execution(result.warrant_id, success=True)
"""

__version__ = "0.1.0"

from .client import ViennaClient
from .frameworks import (
    create_langchain_adapter,
    create_crewai_adapter,
    create_autogen_adapter,
    create_openclaw_adapter,
)
from .errors import (
    ViennaError,
    ViennaAuthError,
    ViennaRateLimitError,
    ViennaValidationError,
    ViennaNotFoundError,
)
from .types import (
    IntentResult,
    Warrant,
    RiskTier,
    IntentStatus,
    ApprovalStatus,
)

__all__ = [
    "ViennaClient",
    "create_langchain_adapter",
    "create_crewai_adapter",
    "create_autogen_adapter",
    "create_openclaw_adapter",
    "ViennaError",
    "ViennaAuthError",
    "ViennaRateLimitError",
    "ViennaValidationError",
    "ViennaNotFoundError",
    "IntentResult",
    "Warrant",
    "RiskTier",
    "IntentStatus",
    "ApprovalStatus",
]
