"""
vienna-os: Official Python SDK for Vienna OS

AI Agent Governance Platform SDK providing typed access to
intent submission, policy management, fleet operations,
approval workflows, integrations, and compliance reporting.
"""

__version__ = "0.1.0"

# ─── Client ───────────────────────────────────────────────────────────────────
from .client import ViennaClient

# ─── Modules ──────────────────────────────────────────────────────────────────
from .fleet import FleetModule
from .policies import PoliciesModule
from .warrants import IntentModule, ApprovalsModule
from .compliance import ComplianceModule

# ─── Errors ───────────────────────────────────────────────────────────────────
from .client import (
    ViennaError,
    ViennaAuthError,
    ViennaForbiddenError,
    ViennaNotFoundError,
    ViennaRateLimitError,
    ViennaValidationError,
    ViennaServerError,
)

# ─── Types ────────────────────────────────────────────────────────────────────
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

__all__ = [
    # Client
    "ViennaClient",
    
    # Modules
    "FleetModule",
    "PoliciesModule", 
    "IntentModule",
    "ApprovalsModule",
    "ComplianceModule",
    
    # Errors
    "ViennaError",
    "ViennaAuthError", 
    "ViennaForbiddenError",
    "ViennaNotFoundError",
    "ViennaRateLimitError",
    "ViennaValidationError",
    "ViennaServerError",
    
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
]