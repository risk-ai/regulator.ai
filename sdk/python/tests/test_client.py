"""
Vienna OS SDK Client Tests

Comprehensive test suite covering all ViennaClient functionality including:
- Constructor validation and configuration
- Intent submission (success, pending, denied) 
- Warrant operations (verify, revoke)
- Approval operations (approve, deny)
- Query methods (list agents, audit trail, system status)
- Simulation mode
- Error handling (auth, network, timeout)
- Context manager operations
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import httpx

from vienna_os import ViennaClient
from vienna_os.types import Intent, IntentResult, Agent, Warrant, WarrantVerification
from vienna_os.errors import AuthError, ViennaError


class TestViennaClientConstructor:
    """Test ViennaClient constructor and configuration."""
    
    def test_constructor_with_required_params(self):
        """Test client creation with minimal required parameters."""
        client = ViennaClient(
            base_url="https://console.regulator.ai",
            agent_id="test-agent"
        )
        
        assert client.base_url == "https://console.regulator.ai"
        assert client.agent_id == "test-agent"
        assert isinstance(client._client, httpx.Client)
    
    def test_constructor_strips_trailing_slash(self):
        """Test that trailing slash is stripped from base_url."""
        client = ViennaClient(
            base_url="https://console.regulator.ai/",
            agent_id="test-agent"
        )
        
        assert client.base_url == "https://console.regulator.ai"
    
    def test_constructor_with_optional_params(self):
        """Test client creation with all optional parameters."""
        client = ViennaClient(
            base_url="https://console.regulator.ai",
            agent_id="test-agent",
            api_key="vos_test_key",
            timeout=60.0
        )
        
        assert client.base_url == "https://console.regulator.ai"
        assert client.agent_id == "test-agent"
        # Check that headers contain authorization
        headers = client._client.headers
        assert headers["Authorization"] == "Bearer vos_test_key"
        assert headers["User-Agent"] == "vienna-os-sdk-python/0.1.0"
        assert headers["Content-Type"] == "application/json"
    
    def test_constructor_without_api_key(self):
        """Test client creation without API key."""
        client = ViennaClient(
            base_url="https://console.regulator.ai",
            agent_id="test-agent"
        )
        
        # Should not have Authorization header
        headers = client._client.headers  
        assert "Authorization" not in headers


class TestViennaClientSubmitIntent:
    """Test intent submission functionality."""
    
    def test_submit_intent_success_executed(self, vienna_client, mock_response, sample_intent_result_data):
        """Test successful intent submission that gets executed."""
        # Mock successful response
        mock_response.json.return_value = {"data": sample_intent_result_data}
        vienna_client._client.request.return_value = mock_response
        
        intent = Intent(action="deploy", payload={"service": "api-gateway"})
        result = vienna_client.submit_intent(intent)
        
        # Verify request was made correctly
        vienna_client._client.request.assert_called_once_with(
            "POST",
            "/api/v1/agent/intent",
            json={
                "agent_id": "test-agent",
                "action": "deploy",
                "payload": {"service": "api-gateway"},
                "simulation": False
            }
        )
        
        # Verify result
        assert isinstance(result, IntentResult)
        assert result.pipeline == "executed"
        assert result.proposal.id == "prop_123"
        assert result.warrant is not None
        assert result.warrant.id == "war_789"
    
    def test_submit_intent_pending_approval(self, vienna_client, mock_response):
        """Test intent submission that requires approval."""
        pending_data = {
            "proposal": {
                "id": "prop_456", 
                "state": "pending",
                "risk_tier": 3
            },
            "policy_evaluation": {
                "id": "eval_789",
                "decision": "pending",
                "matched_rule": "high_risk_rule",
                "tier": 3
            },
            "warrant": None,
            "simulation": False,
            "pipeline": "pending_approval"
        }
        
        mock_response.json.return_value = {"data": pending_data}
        vienna_client._client.request.return_value = mock_response
        
        intent = Intent(action="delete_database", payload={"database": "production"})
        result = vienna_client.submit_intent(intent)
        
        assert result.pipeline == "pending_approval"
        assert result.proposal.id == "prop_456"
        assert result.warrant is None
    
    def test_submit_intent_denied(self, vienna_client, mock_response):
        """Test intent submission that gets denied."""
        denied_data = {
            "proposal": {
                "id": "prop_789",
                "state": "denied", 
                "risk_tier": 4
            },
            "policy_evaluation": {
                "id": "eval_999",
                "decision": "deny",
                "matched_rule": "forbidden_action",
                "tier": 4
            },
            "warrant": None,
            "simulation": False,
            "pipeline": "denied"
        }
        
        mock_response.json.return_value = {"data": denied_data}
        vienna_client._client.request.return_value = mock_response
        
        intent = Intent(action="shutdown_system", payload={})
        result = vienna_client.submit_intent(intent)
        
        assert result.pipeline == "denied"
        assert result.proposal.state == "denied"
        assert result.warrant is None


class TestViennaClientVerifyWarrant:
    """Test warrant verification functionality."""
    
    def test_verify_warrant_success(self, vienna_client, mock_response, sample_warrant_verification_data):
        """Test successful warrant verification."""
        mock_response.json.return_value = {"data": sample_warrant_verification_data}
        vienna_client._client.request.return_value = mock_response
        
        result = vienna_client.verify_warrant("war_789", "sig_abc123")
        
        vienna_client._client.request.assert_called_once_with(
            "POST",
            "/api/v1/warrants/verify",
            json={"warrant_id": "war_789", "signature": "sig_abc123"}
        )
        
        assert isinstance(result, WarrantVerification)
        assert result.valid is True
        assert result.warrant_id == "war_789"
        assert result.revoked is False
    
    def test_verify_warrant_invalid_signature(self, vienna_client, mock_response):
        """Test warrant verification with invalid signature."""
        invalid_data = {
            "valid": False,
            "warrant_id": "war_789",
            "expires_at": "2026-04-01T12:00:00Z", 
            "revoked": False
        }
        
        mock_response.json.return_value = {"data": invalid_data}
        vienna_client._client.request.return_value = mock_response
        
        result = vienna_client.verify_warrant("war_789", "invalid_signature")
        
        assert result.valid is False
        assert result.warrant_id == "war_789"


class TestViennaClientRevokeWarrant:
    """Test warrant revocation functionality."""
    
    def test_revoke_warrant_success(self, vienna_client, mock_response):
        """Test successful warrant revocation."""
        mock_response.json.return_value = {"data": {}}
        vienna_client._client.request.return_value = mock_response
        
        vienna_client.revoke_warrant("war_789", "Emergency revocation")
        
        vienna_client._client.request.assert_called_once_with(
            "POST",
            "/api/v1/warrants/war_789/revoke",
            json={"reason": "Emergency revocation"}
        )
    
    def test_revoke_warrant_without_reason(self, vienna_client, mock_response):
        """Test warrant revocation without reason."""
        mock_response.json.return_value = {"data": {}}
        vienna_client._client.request.return_value = mock_response
        
        vienna_client.revoke_warrant("war_789")
        
        vienna_client._client.request.assert_called_once_with(
            "POST", 
            "/api/v1/warrants/war_789/revoke",
            json={"reason": None}
        )


class TestViennaClientApproveProposal:
    """Test proposal approval functionality."""
    
    def test_approve_proposal_success(self, vienna_client, mock_response):
        """Test successful proposal approval."""
        warrant_data = {
            "warrant": {
                "id": "war_new_123",
                "signature": "sig_approved", 
                "expires_at": "2026-04-01T15:00:00Z"
            }
        }
        
        mock_response.json.return_value = {"data": warrant_data}
        vienna_client._client.request.return_value = mock_response
        
        warrant = vienna_client.approve_proposal("prop_456", "operator-1", "Reviewed and approved")
        
        vienna_client._client.request.assert_called_once_with(
            "POST",
            "/api/v1/proposals/prop_456/approve", 
            json={
                "approved_by": "operator-1",
                "reason": "Reviewed and approved"
            }
        )
        
        assert isinstance(warrant, Warrant)
        assert warrant.id == "war_new_123"
        assert warrant.signature == "sig_approved"
    
    def test_approve_proposal_defaults_to_agent_id(self, vienna_client, mock_response):
        """Test proposal approval with default reviewer."""
        warrant_data = {
            "warrant": {
                "id": "war_default",
                "signature": "sig_default",
                "expires_at": "2026-04-01T15:00:00Z"
            }
        }
        
        mock_response.json.return_value = {"data": warrant_data}
        vienna_client._client.request.return_value = mock_response
        
        vienna_client.approve_proposal("prop_456")
        
        # Should use agent_id as default reviewer
        vienna_client._client.request.assert_called_once_with(
            "POST",
            "/api/v1/proposals/prop_456/approve",
            json={
                "approved_by": "test-agent",  # Should default to client's agent_id
                "reason": None
            }
        )


class TestViennaClientDenyProposal:
    """Test proposal denial functionality."""
    
    def test_deny_proposal_success(self, vienna_client, mock_response):
        """Test successful proposal denial.""" 
        mock_response.json.return_value = {"data": {}}
        vienna_client._client.request.return_value = mock_response
        
        vienna_client.deny_proposal("prop_456", "Security concerns")
        
        vienna_client._client.request.assert_called_once_with(
            "POST",
            "/api/v1/proposals/prop_456/deny",
            json={
                "denied_by": "test-agent",
                "reason": "Security concerns"  
            }
        )


class TestViennaClientListAgents:
    """Test agent listing functionality."""
    
    def test_list_agents_success(self, vienna_client, mock_response, sample_agent_data):
        """Test successful agent listing."""
        agents_data = [
            sample_agent_data,
            {
                "id": "agent_002",
                "display_name": "Another Agent",
                "status": "inactive", 
                "trust_score": 72,
                "agent_type": "supervised"
            }
        ]
        
        mock_response.json.return_value = {"data": agents_data}
        vienna_client._client.request.return_value = mock_response
        
        agents = vienna_client.list_agents()
        
        vienna_client._client.request.assert_called_once_with("GET", "/api/v1/agents")
        
        assert len(agents) == 2
        assert all(isinstance(agent, Agent) for agent in agents)
        assert agents[0].id == "agent_001"
        assert agents[1].status == "inactive"
    
    def test_list_agents_empty(self, vienna_client, mock_response):
        """Test listing agents when none exist."""
        mock_response.json.return_value = {"data": []}
        vienna_client._client.request.return_value = mock_response
        
        agents = vienna_client.list_agents()
        
        assert agents == []


class TestViennaClientGetAuditTrail:
    """Test audit trail functionality."""
    
    def test_get_audit_trail_success(self, vienna_client, mock_response, sample_audit_trail_data):
        """Test successful audit trail retrieval."""
        mock_response.json.return_value = {"data": sample_audit_trail_data}
        vienna_client._client.request.return_value = mock_response
        
        audit_trail = vienna_client.get_audit_trail(25)
        
        vienna_client._client.request.assert_called_once_with("GET", "/api/v1/audit/recent?limit=25")
        
        assert audit_trail["total"] == 1
        assert len(audit_trail["entries"]) == 1
        assert audit_trail["entries"][0]["action"] == "deploy"
    
    def test_get_audit_trail_default_limit(self, vienna_client, mock_response, sample_audit_trail_data):
        """Test audit trail with default limit."""
        mock_response.json.return_value = {"data": sample_audit_trail_data}
        vienna_client._client.request.return_value = mock_response
        
        vienna_client.get_audit_trail()
        
        vienna_client._client.request.assert_called_once_with("GET", "/api/v1/audit/recent?limit=50")


class TestViennaClientGetSystemStatus:
    """Test system status functionality."""
    
    def test_get_system_status_success(self, vienna_client, mock_response, sample_system_status_data):
        """Test successful system status retrieval."""
        mock_response.json.return_value = {"data": sample_system_status_data}
        vienna_client._client.request.return_value = mock_response
        
        status = vienna_client.get_system_status()
        
        vienna_client._client.request.assert_called_once_with("GET", "/health")
        
        assert status["status"] == "healthy"
        assert status["version"] == "0.10.0"
        assert status["agents_count"] == 5


class TestViennaClientSimulate:
    """Test simulation functionality."""
    
    def test_simulate_calls_submit_intent_with_simulation(self, vienna_client, mock_response):
        """Test that simulate properly calls submit_intent with simulation=True."""
        simulation_data = {
            "proposal": {
                "id": "prop_sim",
                "state": "simulated",
                "risk_tier": 2
            },
            "policy_evaluation": {
                "id": "eval_sim", 
                "decision": "allow",
                "matched_rule": "deploy_rule",
                "tier": 2
            },
            "warrant": None,
            "simulation": True,
            "pipeline": "simulated"
        }
        
        mock_response.json.return_value = {"data": simulation_data}
        vienna_client._client.request.return_value = mock_response
        
        result = vienna_client.simulate("deploy", {"service": "test"})
        
        # Should call submit_intent with simulation=True
        vienna_client._client.request.assert_called_once_with(
            "POST",
            "/api/v1/agent/intent",
            json={
                "agent_id": "test-agent", 
                "action": "deploy",
                "payload": {"service": "test"},
                "simulation": True
            }
        )
        
        assert result.pipeline == "simulated"
        assert result.simulation is True


class TestViennaClientErrorHandling:
    """Test error handling scenarios."""
    
    def test_auth_error_401(self, vienna_client, mock_response):
        """Test that 401 responses raise AuthError."""
        mock_response.is_success = False
        mock_response.status_code = 401
        mock_response.json.return_value = {"error": "Invalid API key"}
        vienna_client._client.request.return_value = mock_response
        
        with pytest.raises(AuthError) as exc_info:
            vienna_client.submit_intent(Intent(action="test"))
        
        assert str(exc_info.value) == "Invalid API key"
        assert exc_info.value.code == "AUTH_ERROR"
        assert exc_info.value.status == 401
    
    def test_vienna_error_500(self, vienna_client, mock_response):
        """Test that 500 responses raise ViennaError."""
        mock_response.is_success = False
        mock_response.status_code = 500
        mock_response.json.return_value = {
            "error": "Internal server error",
            "code": "INTERNAL_ERROR"
        }
        vienna_client._client.request.return_value = mock_response
        
        with pytest.raises(ViennaError) as exc_info:
            vienna_client.submit_intent(Intent(action="test"))
        
        assert str(exc_info.value) == "Internal server error"
        assert exc_info.value.code == "INTERNAL_ERROR" 
        assert exc_info.value.status == 500
    
    def test_timeout_error(self, vienna_client):
        """Test that timeouts raise ViennaError."""
        vienna_client._client.request.side_effect = httpx.TimeoutException("Request timed out")
        
        with pytest.raises(ViennaError) as exc_info:
            vienna_client.submit_intent(Intent(action="test"))
        
        assert str(exc_info.value) == "Request timed out"
        assert exc_info.value.code == "TIMEOUT"
    
    def test_network_error(self, vienna_client):
        """Test that network errors raise ViennaError."""
        vienna_client._client.request.side_effect = httpx.HTTPError("Network unreachable")
        
        with pytest.raises(ViennaError) as exc_info:
            vienna_client.submit_intent(Intent(action="test"))
        
        assert str(exc_info.value) == "Network unreachable"
        assert exc_info.value.code == "NETWORK_ERROR"
    
    def test_error_without_details(self, vienna_client, mock_response):
        """Test error handling when response lacks error details."""
        mock_response.is_success = False
        mock_response.status_code = 503
        mock_response.json.return_value = {}  # No error message
        vienna_client._client.request.return_value = mock_response
        
        with pytest.raises(ViennaError) as exc_info:
            vienna_client.submit_intent(Intent(action="test"))
        
        assert str(exc_info.value) == "Request failed: 503"
        assert exc_info.value.code == "REQUEST_FAILED"
        assert exc_info.value.status == 503


class TestViennaClientContextManager:
    """Test context manager functionality."""
    
    def test_context_manager_enter_exit(self, monkeypatch):
        """Test that __enter__ and __exit__ work properly."""
        mock_httpx_client = Mock(spec=httpx.Client)
        monkeypatch.setattr('vienna_os.client.httpx.Client', lambda **kwargs: mock_httpx_client)
        
        with ViennaClient(
            base_url="https://console.regulator.ai",
            agent_id="test-agent"
        ) as client:
            assert isinstance(client, ViennaClient)
            assert client._client is mock_httpx_client
        
        # Should call close on exit
        mock_httpx_client.close.assert_called_once()
    
    def test_close_method(self, vienna_client):
        """Test explicit close method."""
        vienna_client.close()
        vienna_client._client.close.assert_called_once()


class TestViennaClientResponseHandling:
    """Test response data handling."""
    
    def test_response_with_data_wrapper(self, vienna_client, mock_response):
        """Test handling responses wrapped in 'data' field."""
        mock_response.json.return_value = {
            "data": {"status": "healthy"},
            "meta": {"request_id": "req_123"}
        }
        vienna_client._client.request.return_value = mock_response
        
        result = vienna_client.get_system_status()
        
        # Should extract the 'data' field
        assert result == {"status": "healthy"}
    
    def test_response_without_data_wrapper(self, vienna_client, mock_response):
        """Test handling responses without 'data' wrapper."""
        direct_response = {"status": "healthy"}
        mock_response.json.return_value = direct_response
        vienna_client._client.request.return_value = mock_response
        
        result = vienna_client.get_system_status()
        
        # Should return the response as-is when no 'data' field
        assert result == direct_response