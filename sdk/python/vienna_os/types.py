"""Vienna OS SDK Types."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Intent:
    """An intent to perform an action through the governance pipeline."""
    action: str
    payload: dict[str, Any] = field(default_factory=dict)
    simulation: bool = False


@dataclass
class Proposal:
    """A proposal created by the pipeline."""
    id: str
    state: str
    risk_tier: int | str


@dataclass
class PolicyEvaluation:
    """Result of policy evaluation."""
    id: str
    decision: str
    matched_rule: str
    tier: int | str


@dataclass
class Warrant:
    """A cryptographic execution warrant."""
    id: str
    signature: str
    expires_at: str


@dataclass
class IntentResult:
    """Result of submitting an intent through the pipeline."""
    proposal: Proposal
    policy_evaluation: PolicyEvaluation
    warrant: Optional[Warrant]
    simulation: bool
    pipeline: str  # "executed" | "pending_approval" | "denied" | "simulated"

    @classmethod
    def from_dict(cls, data: dict) -> IntentResult:
        return cls(
            proposal=Proposal(**data["proposal"]),
            policy_evaluation=PolicyEvaluation(**data["policy_evaluation"]),
            warrant=Warrant(**data["warrant"]) if data.get("warrant") else None,
            simulation=data.get("simulation", False),
            pipeline=data["pipeline"],
        )


@dataclass
class Agent:
    """A registered agent."""
    id: str
    display_name: str
    status: str
    trust_score: int
    agent_type: str = "autonomous"


@dataclass
class WarrantVerification:
    """Result of warrant verification."""
    valid: bool
    warrant_id: str
    expires_at: str
    revoked: bool
