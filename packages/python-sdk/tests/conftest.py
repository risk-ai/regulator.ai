"""Shared test fixtures for Vienna OS SDK tests."""

import pytest
from unittest.mock import Mock, MagicMock
import httpx
from vienna_os import ViennaClient
from vienna_os.types import Intent


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.Client with request method."""
    mock_client = Mock(spec=httpx.Client)
    mock_client.request = Mock()
    return mock_client


@pytest.fixture 
def mock_response():
    """Mock httpx.Response."""
    response = Mock(spec=httpx.Response)
    response.is_success = True
    response.status_code = 200
    response.json = Mock(return_value={'data': {}})
    return response


@pytest.fixture
def vienna_client(monkeypatch, mock_httpx_client):
    """Vienna client with mocked HTTP client."""
    monkeypatch.setattr('vienna_os.client.httpx.Client', lambda **kwargs: mock_httpx_client)
    
    client = ViennaClient(
        base_url="https://console.regulator.ai",
        agent_id="test-agent",
        api_key="vos_test_key",
        timeout=30.0
    )
    client._client = mock_httpx_client
    return client


@pytest.fixture
def sample_intent():
    """Sample intent for testing."""
    return Intent(
        action="deploy",
        payload={"service": "api-gateway", "version": "v2.0.0"},
        simulation=False
    )


@pytest.fixture
def sample_intent_result_data():
    """Sample intent result data."""
    return {
        "proposal": {
            "id": "prop_123",
            "state": "approved", 
            "risk_tier": 2
        },
        "policy_evaluation": {
            "id": "eval_456",
            "decision": "allow",
            "matched_rule": "deploy_rule",
            "tier": 2
        },
        "warrant": {
            "id": "war_789",
            "signature": "sig_abc123",
            "expires_at": "2026-04-01T12:00:00Z"
        },
        "simulation": False,
        "pipeline": "executed"
    }


@pytest.fixture  
def sample_agent_data():
    """Sample agent data."""
    return {
        "id": "agent_001",
        "display_name": "Test Agent",
        "status": "active",
        "trust_score": 85,
        "agent_type": "autonomous"
    }


@pytest.fixture
def sample_warrant_verification_data():
    """Sample warrant verification data."""
    return {
        "valid": True,
        "warrant_id": "war_789", 
        "expires_at": "2026-04-01T12:00:00Z",
        "revoked": False
    }


@pytest.fixture
def sample_audit_trail_data():
    """Sample audit trail data."""
    return {
        "entries": [
            {
                "id": "audit_001",
                "action": "deploy",
                "timestamp": "2026-03-31T10:00:00Z",
                "agent_id": "test-agent"
            }
        ],
        "total": 1,
        "limit": 50
    }


@pytest.fixture
def sample_system_status_data():
    """Sample system status data."""  
    return {
        "status": "healthy",
        "uptime": 123456,
        "version": "0.10.0",
        "agents_count": 5
    }