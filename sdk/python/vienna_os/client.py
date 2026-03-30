"""
Vienna OS Client

The main SDK entry point. Provides a typed interface to the
Vienna OS execution pipeline.

Example::

    from vienna_os import ViennaClient, Intent

    vienna = ViennaClient(
        base_url="https://console.regulator.ai",
        agent_id="my-agent-id",
        api_key="vos_...",
    )

    # Submit an intent through the governance pipeline
    result = vienna.submit_intent(Intent(
        action="deploy",
        payload={"service": "api-gateway", "version": "v2.4.1"},
    ))

    if result.pipeline == "executed":
        print(f"Warrant: {result.warrant.id}")
    elif result.pipeline == "pending_approval":
        print("Awaiting operator approval...")
"""

from __future__ import annotations

from typing import Any, Optional

import httpx

from .errors import AuthError, ViennaError
from .types import Agent, Intent, IntentResult, Warrant, WarrantVerification


class ViennaClient:
    """Vienna OS API client."""

    def __init__(
        self,
        base_url: str,
        agent_id: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.agent_id = agent_id
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "vienna-os-sdk-python/0.1.0",
                **({"Authorization": f"Bearer {api_key}"} if api_key else {}),
            },
        )

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # ─── Core Pipeline ───────────────────────────────────────────

    def submit_intent(self, intent: Intent) -> IntentResult:
        """Submit an intent through the governance pipeline.

        Flow: intent → policy evaluation → risk tier → warrant (or pending) → audit
        """
        data = self._post(
            "/api/v1/agent/intent",
            {
                "agent_id": self.agent_id,
                "action": intent.action,
                "payload": intent.payload,
                "simulation": intent.simulation,
            },
        )
        return IntentResult.from_dict(data)

    def verify_warrant(
        self, warrant_id: str, signature: Optional[str] = None
    ) -> WarrantVerification:
        """Verify a warrant before execution."""
        data = self._post(
            "/api/v1/warrants/verify",
            {"warrant_id": warrant_id, "signature": signature},
        )
        return WarrantVerification(**data)

    def revoke_warrant(self, warrant_id: str, reason: Optional[str] = None) -> None:
        """Revoke an active warrant."""
        self._post(f"/api/v1/warrants/{warrant_id}/revoke", {"reason": reason})

    # ─── Approvals ───────────────────────────────────────────────

    def approve_proposal(
        self, proposal_id: str, reviewer: Optional[str] = None
    ) -> Warrant:
        """Approve a pending proposal. Returns the issued warrant."""
        data = self._post(
            f"/api/v1/proposals/{proposal_id}/approve", {"reviewer": reviewer}
        )
        return Warrant(**data["warrant"])

    def deny_proposal(self, proposal_id: str, reason: str) -> None:
        """Deny a pending proposal."""
        self._post(f"/api/v1/proposals/{proposal_id}/deny", {"reason": reason})

    # ─── Query ───────────────────────────────────────────────────

    def list_agents(self) -> list[Agent]:
        """List registered agents."""
        data = self._get("/api/v1/agents")
        return [Agent(**a) for a in data]

    def get_audit_trail(self, limit: int = 50) -> dict:
        """Get recent audit trail entries."""
        return self._get(f"/api/v1/audit/recent?limit={limit}")

    def get_system_status(self) -> dict:
        """Get system health status."""
        return self._get("/health")

    # ─── Simulation ──────────────────────────────────────────────

    def simulate(self, action: str, payload: Optional[dict] = None) -> IntentResult:
        """Run an intent in simulation mode (no side effects)."""
        return self.submit_intent(
            Intent(action=action, payload=payload or {}, simulation=True)
        )

    # ─── HTTP Layer ──────────────────────────────────────────────

    def _get(self, path: str) -> Any:
        return self._request("GET", path)

    def _post(self, path: str, body: dict) -> Any:
        return self._request("POST", path, body)

    def _request(self, method: str, path: str, body: Optional[dict] = None) -> Any:
        try:
            res = self._client.request(
                method,
                path,
                json=body,
            )
        except httpx.TimeoutException:
            raise ViennaError("Request timed out", "TIMEOUT")
        except httpx.HTTPError as e:
            raise ViennaError(str(e), "NETWORK_ERROR")

        data = res.json()

        if res.status_code == 401:
            raise AuthError(data.get("error", "Authentication failed"))
        if not res.is_success:
            raise ViennaError(
                data.get("error", f"Request failed: {res.status_code}"),
                data.get("code", "REQUEST_FAILED"),
                res.status_code,
            )

        return data.get("data", data)
