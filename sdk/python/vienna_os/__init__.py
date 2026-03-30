"""
Vienna OS SDK — The execution kernel for AI agents.

Agents propose. Vienna OS decides.
Every action warranted. Every execution verified.
"""

from .client import ViennaClient
from .errors import ViennaError, AuthError, PolicyDeniedError, WarrantExpiredError
from .types import Intent, IntentResult, Proposal, Warrant, Agent

__version__ = "0.1.0"
__all__ = [
    "ViennaClient",
    "ViennaError",
    "AuthError",
    "PolicyDeniedError",
    "WarrantExpiredError",
    "Intent",
    "IntentResult",
    "Proposal",
    "Warrant",
    "Agent",
]
