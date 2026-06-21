"""
Vienna OS Python SDK — Thin HTTP client for the Vienna OS governance platform.

Usage:
    from vienna_os import ViennaOS

    client = ViennaOS(api_key="your-api-key")
    proposal = client.submit_proposal(agent_id="agent-123", action="send_email", payload={...})
    warrant = client.get_warrant(proposal_id=proposal["id"])
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import httpx


class ViennaOSError(Exception):
    """Base exception for Vienna OS SDK errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class ViennaOS:
    """
    Vienna OS governance client.

    Args:
        api_key:  Your tenant API key (from Settings → API Keys).
        base_url: Console proxy base URL (defaults to https://console.regulator.ai).
        timeout:  HTTP request timeout in seconds (default: 30).
    """

    DEFAULT_BASE_URL = "https://console.regulator.ai"

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 30.0,
    ) -> None:
        if not api_key:
            raise ValueError("api_key is required")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "vienna-os-python-sdk/0.1.0",
            },
            timeout=timeout,
        )

    # ------------------------------------------------------------------
    # Proposals
    # ------------------------------------------------------------------

    def submit_proposal(
        self,
        agent_id: str,
        action: str,
        payload: Optional[Dict[str, Any]] = None,
        simulation: bool = False,
        risk_tier: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Submit an agent action proposal for governance evaluation.

        Returns the proposal object. If the action is auto-approved a
        ``warrant`` key will be present. If it requires human review,
        ``state`` will be ``"pending"``.

        Args:
            agent_id:   Registered agent ID.
            action:     The action the agent wants to perform (e.g. "send_email").
            payload:    Action-specific parameters.
            simulation: Dry-run mode — evaluates policy without executing.
            risk_tier:  Override risk tier (0–3). Omit to let policy decide.

        Returns:
            Proposal dict with keys: id, state, warrant (if approved), ...
        """
        body: Dict[str, Any] = {
            "agent_id": agent_id,
            "action": action,
            "payload": payload or {},
            "simulation": simulation,
        }
        if risk_tier is not None:
            body["risk_tier"] = risk_tier

        return self._request("POST", "/api/v1/agent/intent", json=body)

    # ------------------------------------------------------------------
    # Warrants
    # ------------------------------------------------------------------

    def get_warrant(self, proposal_id: str) -> Dict[str, Any]:
        """
        Retrieve the warrant (approval token) for an approved proposal.

        Args:
            proposal_id: Proposal ID returned by ``submit_proposal()``.

        Returns:
            Warrant dict with: id, proposal_id, signature, expires_at, ...
        """
        return self._request("GET", f"/api/v1/warrants/{proposal_id}")

    def verify_warrant(self, warrant_id: str) -> Dict[str, Any]:
        """
        Verify that a warrant is valid (not expired, not revoked).

        Args:
            warrant_id: Warrant ID.

        Returns:
            Dict with: valid (bool), reason (str if invalid), warrant info.
        """
        return self._request("GET", f"/api/v1/warrants/{warrant_id}/verify")

    # ------------------------------------------------------------------
    # Policies
    # ------------------------------------------------------------------

    def list_policies(
        self,
        enabled: Optional[bool] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        List governance policies for the tenant.

        Args:
            enabled: Filter by enabled status. ``None`` returns all.
            limit:   Max results (default 50).

        Returns:
            List of policy dicts.
        """
        params: Dict[str, Any] = {"limit": limit}
        if enabled is not None:
            params["enabled"] = str(enabled).lower()
        return self._request("GET", "/api/v1/policies", params=params)

    def get_policy(self, policy_id: str) -> Dict[str, Any]:
        """
        Retrieve a single policy by ID.

        Args:
            policy_id: Policy UUID.

        Returns:
            Policy dict.
        """
        return self._request("GET", f"/api/v1/policies/{policy_id}")

    def create_policy(
        self,
        name: str,
        description: str = "",
        conditions: Optional[Dict[str, Any]] = None,
        actions: Optional[Dict[str, Any]] = None,
        priority: int = 0,
        enabled: bool = True,
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new governance policy.

        Args:
            name:        Policy display name.
            description: Human-readable description.
            conditions:  Policy evaluation conditions (rule conditions dict).
            actions:     Actions to take when conditions match.
            priority:    Evaluation priority (higher = evaluated first).
            enabled:     Whether the policy is active immediately.
            tags:        Optional list of string tags.

        Returns:
            Created policy dict with ``id``.
        """
        body: Dict[str, Any] = {
            "name": name,
            "description": description,
            "conditions": conditions or {},
            "actions": actions or {},
            "priority": priority,
            "enabled": enabled,
            "tags": tags or [],
        }
        return self._request("POST", "/api/v1/policies", json=body)

    def update_policy(self, policy_id: str, **kwargs: Any) -> Dict[str, Any]:
        """
        Update an existing policy (partial update).

        Args:
            policy_id: Policy UUID.
            **kwargs:  Fields to update (name, description, enabled, ...).

        Returns:
            Updated policy dict.
        """
        return self._request("PATCH", f"/api/v1/policies/{policy_id}", json=kwargs)

    def delete_policy(self, policy_id: str) -> Dict[str, Any]:
        """
        Delete a policy.

        Args:
            policy_id: Policy UUID.

        Returns:
            Deletion confirmation dict.
        """
        return self._request("DELETE", f"/api/v1/policies/{policy_id}")

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _request(
        self,
        method: str,
        path: str,
        json: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Any:
        """Send an HTTP request and return the ``data`` field on success."""
        try:
            response = self._client.request(method, path, json=json, params=params)
        except httpx.TimeoutException as exc:
            raise ViennaOSError(f"Request timed out: {exc}") from exc
        except httpx.RequestError as exc:
            raise ViennaOSError(f"Request failed: {exc}") from exc

        try:
            body = response.json()
        except Exception:
            body = {}

        if not response.is_success:
            error_msg = body.get("error") or body.get("message") or f"HTTP {response.status_code}"
            raise ViennaOSError(
                error_msg,
                status_code=response.status_code,
                response=body,
            )

        # Success envelope: { success: true, data: ... }
        if isinstance(body, dict) and "data" in body:
            return body["data"]
        return body

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> "ViennaOS":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
