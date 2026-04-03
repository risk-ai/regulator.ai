"""
vienna-os: Official Python SDK for Vienna OS

AI Agent Governance Platform SDK providing typed access to
intent submission, policy management, fleet operations,
approval workflows, integrations, and compliance reporting.

This SDK provides full parity with the Node.js SDK.
"""

__version__ = "0.1.0"

# ─── Client ───────────────────────────────────────────────────────────────────
from .client import ViennaClient, ViennaClientLegacy, Intent

# ─── Errors ───────────────────────────────────────────────────────────────────
from .client import (
    ViennaError,
    AuthError,
    PolicyDeniedError,
    WarrantExpiredError,
)
from .errors import (
    ViennaAuthError,
    ViennaForbiddenError,
    ViennaNotFoundError,
    ViennaRateLimitError,
    ViennaValidationError,
    ViennaServerError,
)

# ─── Framework Adapters ──────────────────────────────────────────────────────
from .frameworks import (
    FrameworkAdapter,
    create_langchain_adapter,
    create_crewai_adapter,
    create_autogen_adapter,
    create_openclaw_adapter,
)

# ─── Legacy Modules (for backward compatibility) ─────────────────────────────
from .fleet import FleetModule
from .policies import PoliciesModule
from .warrants import IntentModule, ApprovalsModule
from .compliance import ComplianceModule

# ─── Types (if needed for legacy compatibility) ──────────────────────────────
try:
    from .types import (
        # Config
        ViennaConfig,
        ApiResponse,
        PaginationParams,
        PaginatedList,
        RequestOptions,

        # Intent
        ActionType,
        RiskTier,
        IntentStatus,
        IntentRequest,
        IntentResult,
        IntentStatusResponse,
        IntentSimulationResult,
        PolicyMatch,

        # Policies
        ConditionOperator,
        PolicyCondition,
        PolicyAction,
        PolicyRule,
        PolicyCreateParams,
        PolicyUpdateParams,
        PolicyListParams,
        PolicyEvaluation,
        PolicyTemplate,

        # Fleet
        AgentStatus,
        FleetAgent,
        AgentMetrics,
        AgentActivity,
        AlertSeverity,
        FleetAlert,
        FleetAlertParams,

        # Approvals
        ApprovalStatus,
        Approval,
        ApprovalListParams,
        ApproveParams,
        DenyParams,

        # Compliance
        ComplianceReportType,
        ReportStatus,
        ComplianceReport,
        ComplianceSummary,
        ComplianceGenerateParams,
        QuickStatsParams,

        # Audit & Warrant
        AuditEntry,
        Warrant,
    )
    
    _types_available = True
except ImportError:
    _types_available = False

__all__ = [
    # Main Client (Node SDK parity)
    "ViennaClient",
    "Intent",
    
    # Errors matching Node SDK
    "ViennaError",
    "AuthError", 
    "PolicyDeniedError",
    "WarrantExpiredError",
    
    # Extended Error Types
    "ViennaAuthError",
    "ViennaForbiddenError",
    "ViennaNotFoundError",
    "ViennaRateLimitError",
    "ViennaValidationError",
    "ViennaServerError",
    
    # Framework Adapters
    "FrameworkAdapter",
    "create_langchain_adapter",
    "create_crewai_adapter",
    "create_autogen_adapter",
    "create_openclaw_adapter",
    
    # Legacy Client & Modules (backward compatibility)
    "ViennaClientLegacy",
    "FleetModule",
    "PoliciesModule", 
    "IntentModule",
    "ApprovalsModule",
    "ComplianceModule",
]

# Add types to __all__ if available
if _types_available:
    __all__.extend([
        # Types
        "ViennaConfig",
        "ApiResponse",
        "PaginationParams", 
        "PaginatedList",
        "RequestOptions",
        "ActionType",
        "RiskTier",
        "IntentStatus",
        "IntentRequest",
        "IntentResult",
        "IntentStatusResponse", 
        "IntentSimulationResult",
        "PolicyMatch",
        "ConditionOperator",
        "PolicyCondition",
        "PolicyAction", 
        "PolicyRule",
        "PolicyCreateParams",
        "PolicyUpdateParams",
        "PolicyListParams",
        "PolicyEvaluation",
        "PolicyTemplate",
        "AgentStatus",
        "FleetAgent",
        "AgentMetrics",
        "AgentActivity", 
        "AlertSeverity",
        "FleetAlert",
        "FleetAlertParams",
        "ApprovalStatus",
        "Approval",
        "ApprovalListParams",
        "ApproveParams",
        "DenyParams",
        "ComplianceReportType",
        "ReportStatus", 
        "ComplianceReport",
        "ComplianceSummary",
        "ComplianceGenerateParams",
        "QuickStatsParams",
        "AuditEntry",
        "Warrant",
    ])