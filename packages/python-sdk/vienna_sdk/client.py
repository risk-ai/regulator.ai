"""Vienna OS Python Client — core HTTP client with retry logic."""

import hashlib
import hmac
import json
import time
from typing import Any, Dict, List, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

from .errors import (
    ViennaError,
    ViennaAuthError,
    ViennaForbiddenError,
    ViennaNotFoundError,
    ViennaRateLimitError,
    ViennaValidationError,
    ViennaServerError,
)
from .types import IntentResult, ExecutionReport, RiskTier

SDK_VERSION = "0.1.0"
DEFAULT_BASE_URL = "https://api.regulator.ai"
DEFAULT_TIMEOUT = 30


class ViennaClient:
    """
    Main client for the Vienna OS API.

    Usage:
        client = ViennaClient(api_key="vos_your_key")
        result = client.submit_intent(action="deploy_code", params={"service": "api"})
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        agent_id: str = "python-sdk",
        framework: str = "python",
        timeout: int = DEFAULT_TIMEOUT,
        retries: int = 3,
        signing_key: Optional[str] = None,
    ):
        if not api_key:
            raise ValueError("api_key is required")

        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.agent_id = agent_id
        self.framework = framework
        self.timeout = timeout
        self.retries = retries
        self.signing_key = signing_key

    def submit_intent(
        self,
        action: str,
        params: Optional[Dict[str, Any]] = None,
        objective: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> IntentResult:
        """
        Submit an intent for governance evaluation.

        Args:
            action: Action to perform (e.g., "deploy_code", "send_email")
            params: Action parameters
            objective: Human-readable description
            metadata: Additional metadata

        Returns:
            IntentResult with status, risk tier, and warrant (if approved)
        """
        body = {
            "agent_id": self.agent_id,
            "framework": self.framework,
            "action": action,
            "params": params or {},
            "objective": objective or f"{action} via {self.framework}",
            "metadata": metadata or {},
            "timestamp": _iso_now(),
        }

        data = self._request("POST", "/api/v1/intents", body)
        return IntentResult.from_dict(data)

    def check_intent(self, intent_id: str) -> IntentResult:
        """Check status of a pending intent."""
        data = self._request("GET", f"/api/v1/intents/{intent_id}")
        return IntentResult.from_dict(data)

    def wait_for_approval(
        self,
        intent_id: str,
        timeout_seconds: int = 300,
        poll_interval: float = 2.0,
        max_interval: float = 30.0,
    ) -> IntentResult:
        """
        Wait for an intent to be approved or denied.
        Polls with exponential backoff.

        Args:
            intent_id: Intent ID to wait for
            timeout_seconds: Maximum wait time (default 5 min)
            poll_interval: Initial poll interval in seconds
            max_interval: Maximum poll interval

        Returns:
            IntentResult when resolved

        Raises:
            ViennaError: If timeout exceeded
        """
        deadline = time.time() + timeout_seconds
        interval = poll_interval

        while time.time() < deadline:
            result = self.check_intent(intent_id)
            if result.status.value != "pending":
                return result

            time.sleep(interval)
            interval = min(interval * 1.5, max_interval)

        raise ViennaError(f"Approval timeout after {timeout_seconds}s", 408)

    def report_execution(
        self,
        warrant_id: str,
        success: bool = True,
        output: Optional[str] = None,
        error: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> ExecutionReport:
        """
        Report execution result after warrant-authorized action.

        Args:
            warrant_id: Warrant that authorized this execution
            success: Whether execution succeeded
            output: Execution output (truncated to 10KB)
            error: Error message if failed
            metrics: Execution metrics (duration, resources)
        """
        body = {
            "warrant_id": warrant_id,
            "agent_id": self.agent_id,
            "framework": self.framework,
            "success": success,
            "output": (output or "")[:10000] if output else None,
            "error": error,
            "metrics": metrics or {},
            "completed_at": _iso_now(),
        }

        data = self._request("POST", "/api/v1/executions", body)
        return ExecutionReport(
            execution_id=data.get("execution_id", ""),
            warrant_id=warrant_id,
            verified=data.get("verified", True),
            recorded=data.get("recorded", True),
        )

    def register(
        self,
        name: str,
        capabilities: Optional[List[str]] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Register this agent with Vienna OS.
        Call once during agent initialization.
        """
        body = {
            "agent_id": self.agent_id,
            "framework": self.framework,
            "name": name,
            "capabilities": capabilities or [],
            "config": config or {},
            "registered_at": _iso_now(),
        }

        return self._request("POST", "/api/v1/agents", body)

    def heartbeat(self, status: Optional[Dict[str, Any]] = None) -> None:
        """Send a heartbeat — agent is alive and operational."""
        body = {**(status or {}), "timestamp": _iso_now()}
        self._request("POST", f"/api/v1/agents/{self.agent_id}/heartbeat", body)

    def verify_warrant(self, warrant_id: str) -> Dict[str, Any]:
        """Verify a warrant's validity."""
        return self._request("GET", f"/api/v1/warrants/{warrant_id}")

    def list_policies(self) -> List[Dict[str, Any]]:
        """List active policies visible to this agent."""
        data = self._request("GET", "/api/v1/policies")
        return data.get("policies", [])

    # --- Private ---

    def _request(
        self, method: str, path: str, body: Optional[Dict] = None
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "X-Vienna-Agent": self.agent_id,
            "X-Vienna-Framework": self.framework,
            "X-Vienna-SDK-Version": f"python/{SDK_VERSION}",
        }

        # Optional HMAC request signing
        data_bytes = None
        if body is not None:
            data_bytes = json.dumps(body).encode("utf-8")
            if self.signing_key:
                sig = hmac.new(
                    self.signing_key.encode(), data_bytes, hashlib.sha256
                ).hexdigest()
                headers["X-Vienna-Signature"] = f"hmac-sha256:{sig}"

        last_error = None
        for attempt in range(self.retries + 1):
            try:
                req = Request(url, data=data_bytes, headers=headers, method=method)
                with urlopen(req, timeout=self.timeout) as resp:
                    resp_data = resp.read().decode("utf-8")
                    return json.loads(resp_data) if resp_data else {}

            except HTTPError as e:
                last_error = self._handle_http_error(e)
                if e.code == 429 and attempt < self.retries:
                    retry_after = int(e.headers.get("Retry-After", 2))
                    time.sleep(retry_after)
                    continue
                if e.code >= 500 and attempt < self.retries:
                    time.sleep(2 ** attempt)
                    continue
                raise last_error

            except URLError as e:
                last_error = ViennaError(f"Connection error: {e.reason}")
                if attempt < self.retries:
                    time.sleep(2 ** attempt)
                    continue
                raise last_error

        raise last_error or ViennaError("Request failed after retries")

    def _handle_http_error(self, e: HTTPError) -> ViennaError:
        try:
            body = json.loads(e.read().decode("utf-8"))
            message = body.get("error", body.get("message", str(e)))
        except Exception:
            message = str(e)

        error_map = {
            400: ViennaValidationError,
            401: ViennaAuthError,
            403: ViennaForbiddenError,
            404: ViennaNotFoundError,
            429: ViennaRateLimitError,
        }

        error_cls = error_map.get(e.code, ViennaError)
        if e.code == 429:
            retry_after = int(e.headers.get("Retry-After", 0))
            return ViennaRateLimitError(message, retry_after)
        return error_cls(message)


def _iso_now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
