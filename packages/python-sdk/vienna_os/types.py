"""Type definitions for the Vienna OS Python SDK."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field

# ─── Configuration ────────────────────────────────────────────────────────────

class ViennaConfig(BaseModel):
    """Configuration options for the ViennaClient."""
    
    api_key: str = Field(..., description="API key for authentication (starts with 'vna_')")
    base_url: str = Field(
        default="https://vienna-os.fly.dev", 
        description="Base URL of the Vienna OS API"
    )
    timeout: int = Field(default=30000, description="Request timeout in milliseconds")
    retries: int = Field(default=3, description="Number of automatic retries on 429/5xx errors")

class RequestOptions(BaseModel):
    """Per-request options that can override client defaults."""
    
    timeout: Optional[int] = Field(None, description="Override timeout for this request")

# ─── API Envelope ─────────────────────────────────────────────────────────────

class ApiResponse(BaseModel):
    """Standard Vienna API response envelope."""
    
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    code: Optional[str] = None

# ─── Pagination ───────────────────────────────────────────────────────────────

class PaginationParams(BaseModel):
    """Common pagination parameters."""
    
    limit: Optional[int] = None
    offset: Optional[int] = None

class PaginatedList(BaseModel):
    """Paginated list wrapper."""
    
    items: List[Any]
    total: int
    limit: int
    offset: int

# ─── Intent ───────────────────────────────────────────────────────────────────

ActionType = Union[
    Literal["wire_transfer"],
    Literal["deploy"],
    Literal["data_access"],
    Literal["email_send"],
    Literal["api_call"],
    Literal["file_write"],
    Literal["config_change"],
    str
]

RiskTier = Literal["T0", "T1", "T2", "T3"]

IntentStatus = Literal["executed", "pending_approval", "denied", "cancelled", "expired"]

class IntentRequest(BaseModel):
    """Request body for submitting an intent."""
    
    action: ActionType = Field(..., description="The action the agent wants to perform")
    source: str = Field(..., description="Identifier of the agent submitting the intent")
    tenant_id: Optional[str] = Field(None, description="Tenant/environment scope")
    payload: Dict[str, Any] = Field(..., description="Arbitrary payload describing the action details")
    metadata: Optional[Dict[str, str]] = Field(None, description="Optional metadata tags")

class PolicyMatch(BaseModel):
    """A policy that matched during intent evaluation."""
    
    policy_id: str
    policy_name: str
    action: str
    tier: Optional[RiskTier] = None

class IntentResult(BaseModel):
    """Result of an intent submission."""
    
    intent_id: str
    status: IntentStatus
    execution_id: Optional[str] = None
    warrant_id: Optional[str] = None
    risk_tier: RiskTier
    policy_matches: List[PolicyMatch]
    audit_id: str
    created_at: datetime

class IntentStatusResponse(BaseModel):
    """Full intent status response."""
    
    intent_id: str
    status: IntentStatus
    risk_tier: RiskTier
    action: str
    source: str
    payload: Dict[str, Any]
    policy_matches: List[PolicyMatch]
    approval_id: Optional[str] = None
    execution_id: Optional[str] = None
    warrant_id: Optional[str] = None
    audit_id: str
    created_at: datetime
    updated_at: datetime

class IntentSimulationResult(BaseModel):
    """Result of a simulated (dry-run) intent."""
    
    would_execute: bool
    status: IntentStatus
    risk_tier: RiskTier
    policy_matches: List[PolicyMatch]
    required_approvals: List[str]

# ─── Policies ─────────────────────────────────────────────────────────────────

ConditionOperator = Literal[
    "equals", "not_equals", "gt", "gte", "lt", "lte", 
    "contains", "not_contains", "in", "not_in", "regex"
]

class PolicyCondition(BaseModel):
    """A single condition within a policy rule."""
    
    field: str
    operator: ConditionOperator
    value: Any

PolicyAction = Union[
    Literal["allow"],
    Literal["deny"], 
    Literal["require_approval"],
    Literal["log"],
    Literal["notify"],
    str
]

class PolicyRule(BaseModel):
    """A governance policy rule."""
    
    id: str
    name: str
    description: Optional[str] = None
    conditions: List[PolicyCondition]
    action_on_match: PolicyAction
    approval_tier: Optional[RiskTier] = None
    priority: int
    enabled: bool
    tenant_id: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

class PolicyCreateParams(BaseModel):
    """Parameters for creating a new policy."""
    
    name: str
    description: Optional[str] = None
    conditions: List[PolicyCondition]
    action_on_match: PolicyAction
    approval_tier: Optional[RiskTier] = None
    priority: int
    enabled: bool = True
    tenant_id: Optional[str] = None
    tags: Optional[List[str]] = None

class PolicyUpdateParams(BaseModel):
    """Parameters for updating an existing policy."""
    
    name: Optional[str] = None
    description: Optional[str] = None
    conditions: Optional[List[PolicyCondition]] = None
    action_on_match: Optional[PolicyAction] = None
    approval_tier: Optional[RiskTier] = None
    priority: Optional[int] = None
    enabled: Optional[bool] = None
    tags: Optional[List[str]] = None

class PolicyListParams(BaseModel):
    """Filter parameters for listing policies."""
    
    enabled: Optional[bool] = None
    tenant_id: Optional[str] = None
    tag: Optional[str] = None

class PolicyEvaluation(BaseModel):
    """Result of evaluating policies against a test payload."""
    
    matched_policies: List[PolicyMatch]
    final_action: PolicyAction
    risk_tier: RiskTier
    details: List[str]

class PolicyTemplate(BaseModel):
    """An industry policy template."""
    
    id: str
    name: str
    description: str
    industry: str
    conditions: List[PolicyCondition]
    action_on_match: PolicyAction
    approval_tier: Optional[RiskTier] = None

# ─── Fleet ────────────────────────────────────────────────────────────────────

AgentStatus = Literal["active", "suspended", "inactive", "probation"]

class FleetAgent(BaseModel):
    """An agent registered in the fleet."""
    
    id: str
    name: str
    description: Optional[str] = None
    status: AgentStatus
    trust_score: float
    risk_tier: RiskTier
    tenant_id: Optional[str] = None
    last_activity_at: Optional[datetime] = None
    total_intents: int
    denied_intents: int
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

class AgentMetrics(BaseModel):
    """Metrics for a specific agent."""
    
    agent_id: str
    total_intents: int
    approved_intents: int
    denied_intents: int
    pending_intents: int
    avg_response_time_ms: float
    trust_score: float
    risk_tier: RiskTier
    period_start: datetime
    period_end: datetime

class AgentActivity(BaseModel):
    """A single agent activity log entry."""
    
    id: str
    agent_id: str
    action: str
    status: IntentStatus
    risk_tier: RiskTier
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None

AlertSeverity = Literal["low", "medium", "high", "critical"]

class FleetAlert(BaseModel):
    """A fleet-wide alert."""
    
    id: str
    agent_id: str
    severity: AlertSeverity
    type: str
    message: str
    resolved: bool
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

class FleetAlertParams(BaseModel):
    """Filter parameters for listing fleet alerts."""
    
    resolved: Optional[bool] = None
    severity: Optional[AlertSeverity] = None
    agent_id: Optional[str] = None

# ─── Approvals ────────────────────────────────────────────────────────────────

ApprovalStatus = Literal["pending", "approved", "denied", "expired"]

class Approval(BaseModel):
    """An approval request."""
    
    id: str
    intent_id: str
    action: str
    source: str
    risk_tier: RiskTier
    status: ApprovalStatus
    payload: Dict[str, Any]
    operator: Optional[str] = None
    notes: Optional[str] = None
    reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None

class ApprovalListParams(BaseModel):
    """Filter parameters for listing approvals."""
    
    status: Optional[ApprovalStatus] = None
    source: Optional[str] = None
    risk_tier: Optional[RiskTier] = None

class ApproveParams(BaseModel):
    """Parameters for approving a request."""
    
    operator: str
    notes: Optional[str] = None

class DenyParams(BaseModel):
    """Parameters for denying a request."""
    
    operator: str
    reason: str

# ─── Compliance ───────────────────────────────────────────────────────────────

ComplianceReportType = Literal["quarterly", "annual", "monthly", "custom"]

ReportStatus = Literal["generating", "ready", "failed"]

class ComplianceSummary(BaseModel):
    """High-level compliance statistics."""
    
    total_intents: int
    approved_intents: int
    denied_intents: int
    pending_approvals: int
    policy_violations: int
    avg_response_time_ms: float
    compliance_score: float
    top_violating_agents: List[Dict[str, Any]]

class ComplianceReport(BaseModel):
    """A compliance report."""
    
    id: str
    type: ComplianceReportType
    status: ReportStatus
    period_start: datetime
    period_end: datetime
    summary: Optional[ComplianceSummary] = None
    download_url: Optional[str] = None
    created_at: datetime

class ComplianceGenerateParams(BaseModel):
    """Parameters for generating a compliance report."""
    
    type: ComplianceReportType
    period_start: datetime
    period_end: datetime
    tenant_id: Optional[str] = None

class QuickStatsParams(BaseModel):
    """Quick stats request parameters."""
    
    days: int
    tenant_id: Optional[str] = None

# ─── Audit ────────────────────────────────────────────────────────────────────

class AuditEntry(BaseModel):
    """An entry in the audit trail."""
    
    id: str
    intent_id: str
    action: str
    source: str
    status: IntentStatus
    risk_tier: RiskTier
    policy_matches: List[PolicyMatch]
    warrant_id: Optional[str] = None
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

# ─── Warrant ──────────────────────────────────────────────────────────────────

class Warrant(BaseModel):
    """A cryptographic governance warrant."""
    
    id: str
    intent_id: str
    hash: str
    signature: str
    issued_at: datetime
    expires_at: Optional[datetime] = None
    verified: bool