"""
Vienna OS Data Models
"""

from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class ExecutionResult:
    """Execution result"""
    execution_id: str
    warrant_id: Optional[str] = None
    status: str = "pending"
    tier: str = "T0"
    policies_applied: List[str] = None
    requires_approval: bool = False
    timestamp: Optional[str] = None
    
    def __post_init__(self):
        if self.policies_applied is None:
            self.policies_applied = []


@dataclass
class Approval:
    """Approval request"""
    approval_id: str
    execution_id: str
    required_tier: str
    status: str
    action_summary: str
    risk_summary: Optional[str] = None
    requested_at: Optional[str] = None
    requested_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewer_notes: Optional[str] = None
    expires_at: Optional[str] = None


@dataclass
class Warrant:
    """Cryptographic warrant"""
    warrant_id: str
    execution_id: str
    issued_at: str
    signature: Optional[str] = None
    expired: bool = False


@dataclass
class Policy:
    """Governance policy"""
    id: str
    name: str
    tier: str
    description: Optional[str] = None
    rules: Optional[Dict] = None
    enabled: bool = True
    priority: int = 100
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def __post_init__(self):
        if self.rules is None:
            self.rules = {}


@dataclass
class Agent:
    """Registered agent"""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    default_tier: str = "T0"
    capabilities: Optional[List[str]] = None
    config: Optional[Dict] = None
    status: str = "active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def __post_init__(self):
        if self.capabilities is None:
            self.capabilities = []
        if self.config is None:
            self.config = {}
