"""Type definitions for Vienna OS SDK."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime


class RiskTier(str, Enum):
    """Risk classification tiers."""
    T0 = "T0"  # Informational — auto-approve
    T1 = "T1"  # Low Risk — policy auto-approve
    T2 = "T2"  # Medium Risk — single human approval
    T3 = "T3"  # High Risk — multi-party approval (2+)


class IntentStatus(str, Enum):
    """Intent lifecycle status."""
    APPROVED = "approved"
    PENDING = "pending"
    DENIED = "denied"
    EXPIRED = "expired"


class ApprovalStatus(str, Enum):
    """Approval workflow status."""
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    EXPIRED = "expired"


@dataclass
class Warrant:
    """Cryptographic execution warrant."""
    warrant_id: str
    issued_at: str
    expires_at: str
    risk_tier: RiskTier
    allowed_actions: List[str]
    constraints: Dict[str, Any] = field(default_factory=dict)
    signature: Optional[str] = None
    issuer: str = "vienna-os"
    verified: bool = True


@dataclass
class IntentResult:
    """Result of intent submission."""
    intent_id: str
    status: IntentStatus
    risk_tier: RiskTier
    warrant_id: Optional[str] = None
    warrant: Optional[Warrant] = None
    reason: Optional[str] = None
    poll_url: Optional[str] = None
    approval_required: int = 0

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "IntentResult":
        warrant = None
        if data.get("warrant"):
            w = data["warrant"]
            warrant = Warrant(
                warrant_id=w.get("warrant_id", ""),
                issued_at=w.get("issued_at", ""),
                expires_at=w.get("expires_at", ""),
                risk_tier=RiskTier(w.get("risk_tier", "T0")),
                allowed_actions=w.get("allowed_actions", []),
                constraints=w.get("constraints", {}),
                signature=w.get("signature"),
                issuer=w.get("issuer", "vienna-os"),
                verified=w.get("verified", True),
            )
        return cls(
            intent_id=data.get("intent_id", ""),
            status=IntentStatus(data.get("status", "pending")),
            risk_tier=RiskTier(data.get("risk_tier", "T1")),
            warrant_id=data.get("warrant_id"),
            warrant=warrant,
            reason=data.get("reason"),
            poll_url=data.get("poll_url"),
            approval_required=data.get("approval_required", 0),
        )


@dataclass
class ExecutionReport:
    """Execution result report."""
    execution_id: str
    warrant_id: str
    verified: bool
    recorded: bool = True
