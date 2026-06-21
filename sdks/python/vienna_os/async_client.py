"""
Vienna OS Python SDK — Async client (asyncio / httpx)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import httpx

from .client import ViennaOSError


class AsyncViennaOS:
    """
    Async Vienna OS governance client using ``asyncio`` and ``httpx.AsyncClient``.

    Usage::

        async with AsyncViennaOS(api_key="your-key") as client:
            proposal = await client.submit_proposal(agent_id="...", action="...")
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
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "vienna-os-python-sdk/0.1.0",
            },
            timeout=timeout,
        )

    async def submit_proposal(
        self,
        agent_id: str,
        action: str,
        payload: Optional[Dict[str, Any]] = None,
        simulation: bool = False,
        risk_tier: Optional[int] = None,
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "agent_id": agent_id,
            "action": action,
            "payload": payload or {},
            "simulation": simulation,
        }
        if risk_tier is not None:
            body["risk_tier"] = risk_tier
        return await self._request("POST", "/api/v1/agent/intent", json=body)

    async def get_warrant(self, proposal_id: str) -> Dict[str, Any]:
        return await self._request("GET", f"/api/v1/warrants/{proposal_id}")

    async def list_policies(self, enabled: Optional[bool] = None, limit: int = 50) -> List[Dict[str, Any]]:
        params: Dict[str, Any] = {"limit": limit}
        if enabled is not None:
            params["enabled"] = str(enabled).lower()
        return await self._request("GET", "/api/v1/policies", params=params)

    async def create_policy(self, name: str, **kwargs: Any) -> Dict[str, Any]:
        body = {"name": name, **kwargs}
        return await self._request("POST", "/api/v1/policies", json=body)

    async def _request(
        self, method: str, path: str,
        json: Optional[Dict] = None, params: Optional[Dict] = None
    ) -> Any:
        try:
            response = await self._client.request(method, path, json=json, params=params)
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
            raise ViennaOSError(error_msg, status_code=response.status_code, response=body)

        if isinstance(body, dict) and "data" in body:
            return body["data"]
        return body

    async def close(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncViennaOS":
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.close()
