"""
Tests for the Vienna OS Python SDK client.
Uses pytest + httpx mock transport to avoid live HTTP calls.
"""

import pytest
import httpx

from vienna_os import ViennaOS
from vienna_os.client import ViennaOSError


# ---------------------------------------------------------------------------
# Mock transport
# ---------------------------------------------------------------------------

class MockTransport(httpx.MockTransport):
    """Thin wrapper that matches route patterns and returns canned responses."""

    def __init__(self, routes: dict):
        self.routes = routes  # {(method, path_prefix): response_dict}

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        method = request.method
        for (m, prefix), (status, body) in self.routes.items():
            if m == method and path.startswith(prefix):
                return httpx.Response(status, json=body)
        return httpx.Response(404, json={"error": "Not found"})


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def make_client(routes: dict) -> ViennaOS:
    client = ViennaOS.__new__(ViennaOS)
    client._api_key = "test-key"
    client._base_url = "https://console.regulator.ai"
    client._client = httpx.Client(
        transport=MockTransport(routes),
        base_url=client._base_url,
        headers={"Authorization": "Bearer test-key"},
    )
    return client


# ---------------------------------------------------------------------------
# Tests — ViennaOS init
# ---------------------------------------------------------------------------

def test_init_raises_on_empty_api_key():
    with pytest.raises(ValueError, match="api_key is required"):
        ViennaOS(api_key="")


def test_init_ok():
    client = ViennaOS(api_key="test-key", base_url="http://localhost:3000")
    assert client._api_key == "test-key"
    assert client._base_url == "http://localhost:3000"
    client.close()


# ---------------------------------------------------------------------------
# Tests — submit_proposal
# ---------------------------------------------------------------------------

PROPOSAL_RESPONSE = {
    "success": True,
    "data": {
        "id": "prop-001",
        "state": "approved",
        "agent_id": "agent-xyz",
        "action": "send_email",
        "warrant": {"id": "wt-001", "signature": "abc123", "expires_at": "2026-06-21T03:00:00Z"},
    },
}


def test_submit_proposal_returns_data():
    client = make_client({("POST", "/api/v1/agent/intent"): (200, PROPOSAL_RESPONSE)})
    result = client.submit_proposal(agent_id="agent-xyz", action="send_email", payload={"to": "a@b.com"})
    assert result["id"] == "prop-001"
    assert result["state"] == "approved"
    assert "warrant" in result


def test_submit_proposal_simulation_flag():
    """Simulation=True should be passed in the request body."""
    import json as json_module
    captured = {}

    def capturing_handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.content
        return httpx.Response(200, json=PROPOSAL_RESPONSE)

    client = ViennaOS.__new__(ViennaOS)
    client._api_key = "test-key"
    client._base_url = "https://console.regulator.ai"
    client._client = httpx.Client(
        transport=httpx.MockTransport(capturing_handler),
        base_url="https://console.regulator.ai",
    )

    client.submit_proposal(agent_id="a", action="b", simulation=True)
    body = json_module.loads(captured["body"])
    assert body["simulation"] is True


# ---------------------------------------------------------------------------
# Tests — get_warrant
# ---------------------------------------------------------------------------

WARRANT_RESPONSE = {
    "success": True,
    "data": {"id": "wt-001", "proposal_id": "prop-001", "valid": True},
}


def test_get_warrant():
    client = make_client({("GET", "/api/v1/warrants/"): (200, WARRANT_RESPONSE)})
    result = client.get_warrant("prop-001")
    assert result["id"] == "wt-001"
    assert result["valid"] is True


# ---------------------------------------------------------------------------
# Tests — list_policies
# ---------------------------------------------------------------------------

POLICIES_RESPONSE = {
    "success": True,
    "data": [
        {"id": "pol-1", "name": "PII Guard", "enabled": True},
        {"id": "pol-2", "name": "Trade Limits", "enabled": False},
    ],
}


def test_list_policies_returns_list():
    client = make_client({("GET", "/api/v1/policies"): (200, POLICIES_RESPONSE)})
    result = client.list_policies()
    assert len(result) == 2
    assert result[0]["name"] == "PII Guard"


# ---------------------------------------------------------------------------
# Tests — create_policy
# ---------------------------------------------------------------------------

CREATE_POLICY_RESPONSE = {
    "success": True,
    "data": {"id": "pol-new", "name": "My Policy", "enabled": True},
}


def test_create_policy():
    client = make_client({("POST", "/api/v1/policies"): (200, CREATE_POLICY_RESPONSE)})
    result = client.create_policy(name="My Policy", description="Test policy")
    assert result["id"] == "pol-new"
    assert result["name"] == "My Policy"


# ---------------------------------------------------------------------------
# Tests — error handling
# ---------------------------------------------------------------------------

def test_raises_on_4xx():
    client = make_client({("GET", "/api/v1/warrants/"): (404, {"error": "Not found"})})
    with pytest.raises(ViennaOSError) as exc_info:
        client.get_warrant("missing-id")
    assert exc_info.value.status_code == 404
    assert "Not found" in str(exc_info.value)


def test_raises_on_5xx():
    client = make_client({("POST", "/api/v1/agent/intent"): (500, {"error": "Internal server error"})})
    with pytest.raises(ViennaOSError) as exc_info:
        client.submit_proposal(agent_id="a", action="b")
    assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# Tests — context manager
# ---------------------------------------------------------------------------

def test_context_manager():
    with ViennaOS(api_key="test-key") as client:
        assert client._api_key == "test-key"
    # Should not raise on exit
