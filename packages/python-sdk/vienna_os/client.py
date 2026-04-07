"""Vienna OS Client - Python SDK with Node SDK parity

The main SDK entry point. Provides a typed interface to the
Vienna OS execution pipeline with full parity to the Node SDK.

Example:
    ```python
    import asyncio
    from vienna_os import ViennaClient

    async def main():
        vienna = ViennaClient(
            base_url='https://console.regulator.ai',
            agent_id='my-agent-id',
            api_key='vos_...',
        )
        
        # Submit an intent through the governance pipeline
        result = await vienna.submit_intent({
            'action': 'deploy',
            'payload': {'service': 'api-gateway', 'version': 'v2.4.1'},
        })
        
        if result['pipeline'] == 'executed':
            print('Warrant:', result['warrant']['id'])
        elif result['pipeline'] == 'pending_approval':
            print('Awaiting operator approval...')
        
        await vienna.close()

    asyncio.run(main())
    ```
"""

import asyncio
import json
import time
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlencode

import httpx

__version__ = "0.1.0"

DEFAULT_TIMEOUT = 30000


# ─── Exceptions ───────────────────────────────────────────────────────────────

class ViennaError(Exception):
    """Base exception for Vienna SDK errors."""
    
    def __init__(self, message: str, code: str = "UNKNOWN_ERROR", status: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


class AuthError(ViennaError):
    """Authentication failed (401)."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, "AUTH_ERROR", 401)


class PolicyDeniedError(ViennaError):
    """Policy denied the action (403)."""
    
    def __init__(self, message: str, rule: str, tier: str):
        super().__init__(message, "POLICY_DENIED", 403)
        self.rule = rule
        self.tier = tier


class WarrantExpiredError(ViennaError):
    """Warrant has expired (410)."""
    
    def __init__(self, warrant_id: str):
        super().__init__(f"Warrant {warrant_id} has expired", "WARRANT_EXPIRED", 410)
        self.warrant_id = warrant_id


# ─── Types ────────────────────────────────────────────────────────────────────

class Intent:
    """Represents an agent intent to be submitted."""
    
    def __init__(self, action: str, payload: Optional[Dict[str, Any]] = None, simulation: bool = False):
        self.action = action
        self.payload = payload or {}
        self.simulation = simulation
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'action': self.action,
            'payload': self.payload,
            'simulation': self.simulation,
        }


# ─── Main Client ──────────────────────────────────────────────────────────────

class ViennaClient:
    """
    Vienna OS Client with full Node SDK parity.
    
    Provides a typed interface to the Vienna OS execution pipeline
    matching the functionality of the Node SDK.
    """
    
    def __init__(
        self,
        base_url: str,
        agent_id: str,
        api_key: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
        fetch_fn: Optional[Any] = None,
    ):
        """Initialize the Vienna client.
        
        Args:
            base_url: Vienna OS API base URL
            agent_id: Agent ID to use for intents
            api_key: API key for authentication
            timeout: Request timeout in milliseconds
            fetch_fn: Custom fetch implementation (unused in Python)
        """
        self.base_url = base_url.rstrip('/')
        self.agent_id = agent_id
        self.api_key = api_key
        self.timeout = timeout / 1000.0  # Convert to seconds
        
        # Initialize HTTP client
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': f'vienna-os-sdk/{__version__}',
        }
        
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        
        self.http_client = httpx.AsyncClient(
            timeout=self.timeout,
            headers=headers,
        )
    
    async def close(self) -> None:
        """Close the HTTP client."""
        await self.http_client.aclose()
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()

    # ─── Core Pipeline ────────────────────────────────────────────────

    async def submit_intent(self, intent: Union[Intent, Dict[str, Any]]) -> Dict[str, Any]:
        """Submit an intent through the governance pipeline.
        
        Flow: intent → policy evaluation → risk tier → warrant (or pending) → audit
        
        Args:
            intent: Intent object or dictionary with action, payload, simulation
            
        Returns:
            IntentResult with proposal, policy_evaluation, warrant, pipeline status
        """
        if isinstance(intent, Intent):
            intent_data = intent.to_dict()
        else:
            intent_data = intent
        
        data = await self._post('/api/v1/agent/intent', {
            'agent_id': self.agent_id,
            'action': intent_data.get('action'),
            'payload': intent_data.get('payload', {}),
            'simulation': intent_data.get('simulation', False),
        })
        return data

    async def verify_warrant(self, warrant_id: str, signature: Optional[str] = None) -> Dict[str, Any]:
        """Verify a warrant before execution.
        
        Returns whether the warrant is still valid (not expired, not revoked).
        
        Args:
            warrant_id: ID of the warrant to verify
            signature: Optional signature to verify
            
        Returns:
            WarrantVerification with valid, warrant_id, expires_at, revoked
        """
        return await self._post('/api/v1/warrants/verify', {
            'warrant_id': warrant_id,
            'signature': signature,
        })

    async def revoke_warrant(self, warrant_id: str, reason: Optional[str] = None) -> None:
        """Revoke an active warrant.
        
        Args:
            warrant_id: ID of the warrant to revoke
            reason: Optional reason for revocation
        """
        await self._post(f'/api/v1/warrants/{warrant_id}/revoke', {'reason': reason})

    # ─── Approvals ────────────────────────────────────────────────────

    async def approve_proposal(
        self, 
        proposal_id: str, 
        options: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Approve a pending proposal (operator action).
        
        Returns the issued warrant.
        
        Args:
            proposal_id: ID of the proposal to approve
            options: Optional dict with reviewer, reason
            
        Returns:
            Dict with warrant information
        """
        options = options or {}
        return await self._post(f'/api/v1/proposals/{proposal_id}/approve', {
            'approved_by': options.get('reviewer', self.agent_id),
            'reason': options.get('reason'),
        })

    async def deny_proposal(self, proposal_id: str, reason: str) -> None:
        """Deny a pending proposal (operator action).
        
        Args:
            proposal_id: ID of the proposal to deny
            reason: Reason for denial
        """
        await self._post(f'/api/v1/proposals/{proposal_id}/deny', {
            'denied_by': self.agent_id,
            'reason': reason,
        })

    # ─── Query ────────────────────────────────────────────────────────

    async def list_agents(self) -> List[Dict[str, Any]]:
        """List registered agents.
        
        Returns:
            List of Agent objects with id, agent_id, display_name, status, etc.
        """
        data = await self._get('/api/v1/agents')
        return data

    async def get_audit_trail(self, limit: int = 50) -> Dict[str, Any]:
        """Get recent audit trail entries.
        
        Args:
            limit: Maximum number of entries to return
            
        Returns:
            Dict with entries list and total count
        """
        return await self._get(f'/api/v1/audit/recent?limit={limit}')

    async def get_system_status(self) -> Dict[str, Any]:
        """Get system health status.
        
        Returns:
            SystemStatus with healthy, version, agents, proposals, warrants counts
        """
        return await self._get('/health')

    # ─── Simulation ───────────────────────────────────────────────────

    async def simulate(self, intent: Union[Intent, Dict[str, Any]]) -> Dict[str, Any]:
        """Run an intent in simulation mode (no side effects).
        
        Useful for testing policy evaluation without executing.
        
        Args:
            intent: Intent to simulate (simulation flag will be set to True)
            
        Returns:
            IntentResult with simulation=True
        """
        if isinstance(intent, Intent):
            intent_data = intent.to_dict()
        else:
            intent_data = dict(intent)
        
        intent_data['simulation'] = True
        return await self.submit_intent(intent_data)

    # ─── Convenience Methods ──────────────────────────────────────────

    async def execute_passback(self, intent: Union[Intent, Dict[str, Any]]) -> Dict[str, Any]:
        """Execute passback convenience method.
        
        Flow: submit → get warrant → (user executes) → send callback
        
        This method submits an intent, waits for a warrant, and returns
        the warrant information for the user to execute. After execution,
        the user should send a callback (not implemented here as it's 
        execution-specific).
        
        Args:
            intent: Intent to submit
            
        Returns:
            Dict with warrant and execution instructions
        """
        result = await self.submit_intent(intent)
        
        if result.get('pipeline') == 'executed' and result.get('warrant'):
            return {
                'warrant': result['warrant'],
                'status': 'ready_to_execute',
                'message': 'Warrant issued - execute your action and send callback',
            }
        elif result.get('pipeline') == 'pending_approval':
            return {
                'proposal_id': result.get('proposal', {}).get('id'),
                'status': 'pending_approval', 
                'message': 'Intent requires approval before execution',
            }
        else:
            return {
                'status': result.get('pipeline', 'unknown'),
                'message': f"Intent {result.get('pipeline', 'failed')}",
                'result': result,
            }

    # ─── HTTP Layer ───────────────────────────────────────────────────

    async def _get(self, path: str) -> Any:
        """Make a GET request."""
        res = await self._request('GET', path)
        return res.get('data', res)

    async def _post(self, path: str, body: Dict[str, Any]) -> Any:
        """Make a POST request."""
        res = await self._request('POST', path, body)
        return res.get('data', res)

    async def _request(
        self,
        method: str,
        path: str,
        body: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make an authenticated request to the Vienna API."""
        url = f"{self.base_url}{path}"
        
        try:
            response = await self.http_client.request(
                method=method,
                url=url,
                json=body,
            )
            
            data = response.json()
            
            if not response.is_success:
                if response.status_code == 401:
                    raise AuthError(data.get('error', 'Authentication failed'))
                raise ViennaError(
                    data.get('error', f'Request failed: {response.status_code}'),
                    data.get('code', 'REQUEST_FAILED'),
                    response.status_code,
                )
            
            return data
            
        except httpx.TimeoutException:
            raise ViennaError('Request timed out', 'TIMEOUT')
        except httpx.HTTPError as err:
            raise ViennaError(
                str(err) or 'Network error',
                'NETWORK_ERROR',
            )


# Re-export for backwards compatibility with existing modular SDK
from .warrants import IntentModule, ApprovalsModule
from .policies import PoliciesModule
from .fleet import FleetModule
from .compliance import ComplianceModule

class ViennaClientLegacy(ViennaClient):
    """Legacy client that maintains the modular structure for backward compatibility."""
    
    def __init__(self, api_key: Optional[str] = None, config: Optional[Dict] = None, **kwargs):
        """Initialize with legacy config format."""
        if config is not None:
            super().__init__(
                base_url=config.get('base_url', 'https://console.regulator.ai'),
                agent_id=config.get('agent_id', ''),
                api_key=config.get('api_key'),
                timeout=config.get('timeout', DEFAULT_TIMEOUT),
            )
        elif api_key is not None:
            super().__init__(
                base_url=kwargs.get('base_url', 'https://console.regulator.ai'),
                agent_id=kwargs.get('agent_id', ''),
                api_key=api_key,
                timeout=kwargs.get('timeout', DEFAULT_TIMEOUT),
            )
        else:
            raise ValueError("Either api_key or config must be provided")
        
        # Initialize legacy modules for backward compatibility
        self.intent = IntentModule(self)
        self.policies = PoliciesModule(self)
        self.fleet = FleetModule(self)
        self.approvals = ApprovalsModule(self)
        self.compliance = ComplianceModule(self)
    
    async def request(self, method: str, path: str, body=None, options=None, response_model=None):
        """Legacy request method for backward compatibility."""
        if method.upper() == 'GET':
            return await self._get(path)
        elif method.upper() == 'POST':
            return await self._post(path, body or {})
        else:
            return await self._request(method, path, body)