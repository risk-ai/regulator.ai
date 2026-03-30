"""Main Vienna OS client and error definitions."""

import asyncio
import json
from typing import Any, Dict, Optional, Type, TypeVar, Generic
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel

from .types import ViennaConfig, RequestOptions

__version__ = "0.1.0"

DEFAULT_BASE_URL = "https://vienna-os.fly.dev"
DEFAULT_TIMEOUT = 30000
DEFAULT_RETRIES = 3

T = TypeVar("T", bound=BaseModel)

# ─── Exceptions ───────────────────────────────────────────────────────────────

class ViennaError(Exception):
    """Base exception for Vienna SDK errors."""
    
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code

class ViennaAuthError(ViennaError):
    """Authentication failed (401)."""
    pass

class ViennaForbiddenError(ViennaError):
    """Access denied (403)."""
    pass

class ViennaNotFoundError(ViennaError):
    """Resource not found (404)."""
    pass

class ViennaRateLimitError(ViennaError):
    """Rate limit exceeded (429)."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message, 429)
        self.retry_after = retry_after

class ViennaValidationError(ViennaError):
    """Request validation failed (422)."""
    pass

class ViennaServerError(ViennaError):
    """Server error (5xx)."""
    pass

# ─── Utilities ────────────────────────────────────────────────────────────────

def build_query(params: Dict[str, Any]) -> str:
    """Build query string from parameters."""
    if not params:
        return ""
    
    # Filter out None values and convert to strings
    clean_params = {k: str(v) for k, v in params.items() if v is not None}
    if not clean_params:
        return ""
    
    return "?" + urlencode(clean_params)

def is_retryable(status_code: int) -> bool:
    """Check if HTTP status code is retryable."""
    return status_code == 429 or 500 <= status_code < 600

def backoff_delay(attempt: int) -> float:
    """Calculate exponential backoff delay in seconds."""
    return min(2 ** attempt, 60)

async def parse_response(response: httpx.Response) -> Any:
    """Parse HTTP response and handle errors."""
    # Handle successful responses
    if 200 <= response.status_code < 300:
        try:
            return response.json()
        except json.JSONDecodeError:
            return response.text
    
    # Handle error responses
    try:
        error_data = response.json()
        error_msg = error_data.get("error", f"HTTP {response.status_code}")
    except json.JSONDecodeError:
        error_msg = response.text or f"HTTP {response.status_code}"
    
    # Map status codes to specific exceptions
    if response.status_code == 401:
        raise ViennaAuthError(error_msg, response.status_code)
    elif response.status_code == 403:
        raise ViennaForbiddenError(error_msg, response.status_code)
    elif response.status_code == 404:
        raise ViennaNotFoundError(error_msg, response.status_code)
    elif response.status_code == 422:
        raise ViennaValidationError(error_msg, response.status_code)
    elif response.status_code == 429:
        retry_after = response.headers.get("retry-after")
        retry_seconds = int(retry_after) if retry_after else None
        raise ViennaRateLimitError(error_msg, retry_seconds)
    elif 500 <= response.status_code < 600:
        raise ViennaServerError(error_msg, response.status_code)
    else:
        raise ViennaError(error_msg, response.status_code)

# ─── Main Client ──────────────────────────────────────────────────────────────

class ViennaClient:
    """
    Main client for the Vienna OS API.
    
    Example:
        ```python
        import asyncio
        from vienna_os import ViennaClient
        
        async def main():
            vienna = ViennaClient(api_key="vna_your_api_key")
            result = await vienna.intent.submit({
                "action": "deploy",
                "source": "ci-bot", 
                "payload": {}
            })
            await vienna.close()
        
        asyncio.run(main())
        ```
    """
    
    def __init__(self, api_key: Optional[str] = None, config: Optional[ViennaConfig] = None, **kwargs):
        """Initialize the Vienna client."""
        if config is not None:
            self.config = config
        elif api_key is not None:
            config_data = {"api_key": api_key, **kwargs}
            self.config = ViennaConfig(**config_data)
        else:
            raise ValueError("Either api_key or config must be provided")
        
        if not self.config.api_key:
            raise ValueError("API key is required")
        
        # Clean up base URL
        self.base_url = self.config.base_url.rstrip("/")
        
        # Initialize HTTP client
        self.http_client = httpx.AsyncClient(
            timeout=self.config.timeout / 1000.0,
            headers={
                "X-Vienna-Api-Key": self.config.api_key,
                "X-Vienna-SDK-Version": __version__,
                "Accept": "application/json",
                "User-Agent": f"vienna-os-python/{__version__}",
            }
        )
        
        # Initialize modules
        from .warrants import IntentModule, ApprovalsModule
        from .policies import PoliciesModule
        from .fleet import FleetModule  
        from .compliance import ComplianceModule
        
        self.intent = IntentModule(self)
        self.policies = PoliciesModule(self)
        self.fleet = FleetModule(self)
        self.approvals = ApprovalsModule(self)
        self.compliance = ComplianceModule(self)
    
    async def close(self):
        """Close the HTTP client."""
        await self.http_client.aclose()
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def request(
        self,
        method: str,
        path: str,
        body: Optional[Any] = None,
        options: Optional[RequestOptions] = None,
        response_model: Optional[Type[T]] = None
    ) -> Any:
        """Make an authenticated request to the Vienna API."""
        url = f"{self.base_url}{path}"
        request_timeout = (options.timeout / 1000.0) if options and options.timeout else None
        
        last_error: Optional[Exception] = None
        
        for attempt in range(self.config.retries + 1):
            try:
                # Prepare request
                headers = {}
                if body is not None:
                    headers["Content-Type"] = "application/json"
                
                # Make request
                response = await self.http_client.request(
                    method=method,
                    url=url,
                    json=body,
                    headers=headers,
                    timeout=request_timeout
                )
                
                # If retryable and we have retries left, back off
                if is_retryable(response.status_code) and attempt < self.config.retries:
                    retry_after = response.headers.get("retry-after")
                    delay = int(retry_after) if retry_after else backoff_delay(attempt)
                    await asyncio.sleep(delay)
                    continue
                
                # Parse response
                data = await parse_response(response)
                
                # Convert to Pydantic model if requested
                if response_model and data is not None:
                    if isinstance(data, list):
                        return [response_model.model_validate(item) for item in data]
                    else:
                        return response_model.model_validate(data)
                
                return data
                
            except Exception as error:
                last_error = error
                
                # Don't retry on auth errors or non-retryable errors
                if isinstance(error, (ViennaAuthError, ViennaForbiddenError, ViennaNotFoundError, ViennaValidationError)):
                    raise error
                
                # Don't retry if we've exhausted attempts
                if attempt >= self.config.retries:
                    raise error
                
                # Back off before retry
                if attempt < self.config.retries:
                    delay = backoff_delay(attempt)
                    await asyncio.sleep(delay)
        
        # Should never reach here, but just in case
        raise last_error or ViennaError("Request failed after retries")