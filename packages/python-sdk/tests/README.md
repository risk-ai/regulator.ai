# Vienna OS Python SDK Tests

Comprehensive test suite for the Vienna OS Python SDK, following the same patterns as the Node.js SDK tests.

## Test Structure

### `conftest.py`
Shared test fixtures including:
- `mock_httpx_client` - Mock httpx.Client for HTTP requests
- `mock_response` - Mock HTTP response object
- `vienna_client` - Pre-configured ViennaClient with mocked HTTP client
- Sample data fixtures for various API responses

### `test_client.py`
Complete test coverage organized by functionality:

#### Test Classes

1. **TestViennaClientConstructor** - Client initialization
   - Required parameters validation
   - URL normalization (trailing slash removal)
   - Optional parameters (api_key, timeout)
   - Header configuration

2. **TestViennaClientSubmitIntent** - Intent submission
   - Successful execution pipeline
   - Pending approval pipeline
   - Denied pipeline
   - Request payload validation

3. **TestViennaClientVerifyWarrant** - Warrant verification
   - Valid warrant verification
   - Invalid signature handling
   - Request structure validation

4. **TestViennaClientRevokeWarrant** - Warrant revocation
   - Successful revocation with reason
   - Revocation without reason

5. **TestViennaClientApproveProposal** - Proposal approval
   - Successful approval returning warrant
   - Default reviewer (agent_id) fallback
   - Custom reviewer and reason

6. **TestViennaClientDenyProposal** - Proposal denial
   - Successful denial with reason

7. **TestViennaClientListAgents** - Agent listing
   - Multiple agents response
   - Empty agents list

8. **TestViennaClientGetAuditTrail** - Audit trail retrieval
   - Custom limit parameter
   - Default limit (50)
   - Response structure validation

9. **TestViennaClientGetSystemStatus** - System status
   - Health check response parsing

10. **TestViennaClientSimulate** - Simulation mode
    - Verification that simulate() calls submit_intent with simulation=True
    - Simulation-specific response handling

11. **TestViennaClientErrorHandling** - Error scenarios
    - 401 responses → AuthError
    - 500 responses → ViennaError
    - Timeout exceptions → ViennaError
    - Network errors → ViennaError
    - Response without error details

12. **TestViennaClientContextManager** - Context management
    - `__enter__` and `__exit__` functionality
    - Explicit `close()` method

13. **TestViennaClientResponseHandling** - Response parsing
    - Responses wrapped in 'data' field
    - Direct responses without wrapper

## Test Coverage

The test suite covers all public methods of `ViennaClient`:

### Core Pipeline Methods
- ✅ `submit_intent()` - All pipeline states (executed, pending_approval, denied)
- ✅ `verify_warrant()` - Success and failure cases
- ✅ `revoke_warrant()` - With and without reason

### Approval Methods  
- ✅ `approve_proposal()` - Success case, default reviewer
- ✅ `deny_proposal()` - Success case

### Query Methods
- ✅ `list_agents()` - Success and empty cases
- ✅ `get_audit_trail()` - Custom and default limits
- ✅ `get_system_status()` - Success case

### Utility Methods
- ✅ `simulate()` - Proper delegation to submit_intent
- ✅ `close()` - Resource cleanup
- ✅ Context manager protocol

### Error Handling
- ✅ AuthError for 401 responses
- ✅ ViennaError for other HTTP errors
- ✅ ViennaError for network/timeout issues
- ✅ Proper error code and status propagation

## Running Tests

```bash
# Install dependencies
pip install httpx pytest pytest-mock

# Run all tests with verbose output
python -m pytest tests/ -v

# Run specific test class
python -m pytest tests/test_client.py::TestViennaClientConstructor -v

# Run with coverage
pip install pytest-cov
python -m pytest tests/ --cov=vienna_os --cov-report=html
```

## Mocking Strategy

Tests use `unittest.mock` and `httpx` response mocking:
- Mock `httpx.Client.request()` method for HTTP calls
- Use fixtures for consistent test data
- Mock at the HTTP layer to test full request/response cycle
- Validate request parameters (method, URL, JSON payload)

## Test Data

Sample data fixtures in `conftest.py` provide realistic API responses matching the Vienna OS API specification.

All tests follow the AAA pattern:
- **Arrange** - Set up mocks and test data
- **Act** - Call the method under test  
- **Assert** - Verify behavior and outputs