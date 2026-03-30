"""
Vienna OS Python Client
"""

import requests
from typing import Optional, Dict, Any, List
from .exceptions import ViennaError, AuthenticationError, ValidationError
from .models import ExecutionResult, Approval, Warrant, Policy, Agent


class ViennaClient:
    """Vienna OS API Client"""
    
    def __init__(
        self,
        base_url: str = "https://console.regulator.ai/api/v1",
        api_key: Optional[str] = None,
        email: Optional[str] = None,
        password: Optional[str] = None
    ):
        """
        Initialize Vienna OS client.
        
        Args:
            base_url: API base URL
            api_key: API key for authentication (alternative to email/password)
            email: User email for JWT authentication
            password: User password for JWT authentication
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.token = None
        
        # Authenticate if credentials provided
        if email and password:
            self.login(email, password)
    
    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        # Add authentication
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        elif self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        
        try:
            response = requests.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=headers,
                timeout=30
            )
            
            # Handle errors
            if response.status_code == 401:
                raise AuthenticationError("Authentication failed")
            elif response.status_code == 400:
                raise ValidationError(response.json().get('error', 'Validation error'))
            elif response.status_code >= 400:
                raise ViennaError(f"API error: {response.status_code} - {response.text}")
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            raise ViennaError(f"Request failed: {str(e)}")
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Login with email and password.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            User information and token
        """
        result = self._request("POST", "/auth/login", {
            "email": email,
            "password": password
        })
        
        if result.get('success'):
            self.token = result.get('token')
            return result.get('user', {})
        else:
            raise AuthenticationError(result.get('error', 'Login failed'))
    
    # Execution API
    
    def execute(
        self,
        action: str,
        agent_id: str,
        context: Optional[Dict] = None,
        tier: str = "T0"
    ) -> ExecutionResult:
        """
        Execute an action with governance.
        
        Args:
            action: Action to execute
            agent_id: Agent performing the action
            context: Additional context (optional)
            tier: Risk tier (T0, T1, T2, T3)
            
        Returns:
            ExecutionResult with execution_id, warrant_id, status
        """
        result = self._request("POST", "/execute", {
            "action": action,
            "agent_id": agent_id,
            "context": context or {},
            "tier": tier
        })
        
        if result.get('success'):
            return ExecutionResult(**result.get('data', {}))
        else:
            raise ViennaError(result.get('error', 'Execution failed'))
    
    def get_executions(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        tier: Optional[str] = None
    ) -> List[Dict]:
        """Get execution history"""
        params = {"limit": limit, "offset": offset}
        if status:
            params["status"] = status
        if tier:
            params["tier"] = tier
            
        result = self._request("GET", "/executions", params=params)
        return result.get('data', [])
    
    def get_execution(self, execution_id: str) -> Dict:
        """Get execution details with audit trail"""
        result = self._request("GET", f"/executions/{execution_id}")
        return result.get('data', {})
    
    def get_execution_stats(self) -> Dict:
        """Get execution statistics"""
        result = self._request("GET", "/executions/stats")
        return result.get('data', {})
    
    # Approvals API
    
    def get_approvals(
        self,
        status: str = "pending",
        tier: Optional[str] = None
    ) -> List[Approval]:
        """
        Get approval requests.
        
        Args:
            status: Filter by status (pending, approved, rejected)
            tier: Filter by tier (T0, T1, T2, T3)
            
        Returns:
            List of Approval objects
        """
        params = {"status": status}
        if tier:
            params["tier"] = tier
            
        result = self._request("GET", "/approvals", params=params)
        return [Approval(**item) for item in result.get('data', [])]
    
    def approve(
        self,
        approval_id: str,
        reviewer_id: str,
        notes: Optional[str] = None
    ) -> Dict:
        """
        Approve an action.
        
        Args:
            approval_id: Approval request ID
            reviewer_id: Reviewer identifier
            notes: Optional approval notes
            
        Returns:
            Approval result with warrant_id
        """
        result = self._request("POST", f"/approvals/{approval_id}/approve", {
            "reviewer_id": reviewer_id,
            "notes": notes
        })
        return result.get('data', {})
    
    def reject(
        self,
        approval_id: str,
        reviewer_id: str,
        reason: str
    ) -> Dict:
        """
        Reject an action.
        
        Args:
            approval_id: Approval request ID
            reviewer_id: Reviewer identifier
            reason: Rejection reason (required)
            
        Returns:
            Rejection result
        """
        result = self._request("POST", f"/approvals/{approval_id}/reject", {
            "reviewer_id": reviewer_id,
            "reason": reason
        })
        return result.get('data', {})
    
    # Warrants API
    
    def get_warrants(self, limit: int = 50) -> List[Warrant]:
        """Get issued warrants"""
        result = self._request("GET", "/warrants", params={"limit": limit})
        return [Warrant(**item) for item in result.get('data', [])]
    
    def verify_warrant(self, warrant_id: str, signature: str) -> Dict:
        """Verify warrant signature"""
        result = self._request("POST", "/warrants/verify", {
            "warrant_id": warrant_id,
            "signature": signature
        })
        return result.get('data', {})
    
    # Policies API
    
    def get_policies(
        self,
        enabled: Optional[bool] = None,
        tier: Optional[str] = None
    ) -> List[Policy]:
        """Get policies"""
        params = {}
        if enabled is not None:
            params["enabled"] = str(enabled).lower()
        if tier:
            params["tier"] = tier
            
        result = self._request("GET", "/policies", params=params)
        return [Policy(**item) for item in result.get('data', [])]
    
    def create_policy(
        self,
        name: str,
        tier: str,
        description: Optional[str] = None,
        rules: Optional[Dict] = None,
        enabled: bool = True,
        priority: int = 100
    ) -> Policy:
        """Create new policy"""
        result = self._request("POST", "/policies", {
            "name": name,
            "tier": tier,
            "description": description,
            "rules": rules or {},
            "enabled": enabled,
            "priority": priority
        })
        return Policy(**result.get('data', {}))
    
    def update_policy(self, policy_id: str, **kwargs) -> Dict:
        """Update policy"""
        result = self._request("PUT", f"/policies/{policy_id}", kwargs)
        return result.get('data', {})
    
    def delete_policy(self, policy_id: str) -> bool:
        """Delete policy"""
        result = self._request("DELETE", f"/policies/{policy_id}")
        return result.get('success', False)
    
    # Agents API
    
    def get_agents(
        self,
        status: Optional[str] = None,
        tier: Optional[str] = None
    ) -> List[Agent]:
        """Get registered agents"""
        params = {}
        if status:
            params["status"] = status
        if tier:
            params["tier"] = tier
            
        result = self._request("GET", "/agents", params=params)
        return [Agent(**item) for item in result.get('data', [])]
    
    def register_agent(
        self,
        name: str,
        type: str,
        description: Optional[str] = None,
        default_tier: str = "T0",
        capabilities: Optional[List[str]] = None,
        config: Optional[Dict] = None
    ) -> Agent:
        """Register new agent"""
        result = self._request("POST", "/agents", {
            "name": name,
            "type": type,
            "description": description,
            "default_tier": default_tier,
            "capabilities": capabilities or [],
            "config": config or {}
        })
        return Agent(**result.get('data', {}))
    
    def update_agent(self, agent_id: str, **kwargs) -> Dict:
        """Update agent"""
        result = self._request("PUT", f"/agents/{agent_id}", kwargs)
        return result.get('data', {})
    
    def delete_agent(self, agent_id: str) -> bool:
        """Delete agent"""
        result = self._request("DELETE", f"/agents/{agent_id}")
        return result.get('success', False)
    
    # Audit API
    
    def export_executions(
        self,
        format: str = "json",
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        tier: Optional[str] = None
    ) -> Any:
        """Export execution audit trail"""
        params = {"format": format}
        if from_date:
            params["from_date"] = from_date
        if to_date:
            params["to_date"] = to_date
        if tier:
            params["tier"] = tier
            
        result = self._request("GET", "/audit/executions", params=params)
        return result.get('data', []) if format == "json" else result
    
    # Health API
    
    def health(self) -> Dict:
        """Check API health"""
        result = self._request("GET", "/health")
        return result
