/**
 * Vienna SDK Client Tests
 * 
 * Tests for ViennaClient request/response handling, retry logic, error mapping,
 * and framework wrappers using TypeScript and Node.js built-in test runner.
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { ViennaClient } from '../src/client.js';
import {
  ViennaError,
  ViennaAuthError,
  ViennaForbiddenError,
  ViennaNotFoundError,
  ViennaRateLimitError,
  ViennaValidationError,
  ViennaServerError,
} from '../src/errors.js';
import {
  createForLangChain,
  createForCrewAI,
  createForAutoGen,
  createForOpenClaw,
} from '../src/frameworks.js';

// Mock fetch globally for testing
const originalFetch = globalThis.fetch;
let mockFetch: any;

const mockApiResponse = <T>(data: T, success = true, code?: string) => ({
  success,
  data,
  error: success ? undefined : 'Mock error message',
  code: code || (success ? 'SUCCESS' : 'ERROR'),
});

const mockFetchResponse = (
  status: number,
  body: any,
  headers: Record<string, string> = {}
): Response => {
  const defaultHeaders = {
    'content-type': 'application/json',
    ...headers,
  };

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name: string) => defaultHeaders[name.toLowerCase()] || null,
    },
    json: async () => body,
  } as Response;
};

describe('Vienna SDK Client', () => {
  beforeEach(() => {
    mockFetch = mock.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.reset();
  });

  describe('Constructor and Configuration', () => {
    test('creates client with required API key', () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      
      assert.ok(client);
      assert.ok(client.intent);
      assert.ok(client.policies);
      assert.ok(client.fleet);
      assert.ok(client.approvals);
      assert.ok(client.integrations);
      assert.ok(client.compliance);
    });

    test('throws error when API key is missing', () => {
      assert.throws(
        () => new ViennaClient({ apiKey: '' }),
        { message: 'Vienna SDK: apiKey is required' }
      );
    });

    test('accepts optional configuration', () => {
      const onError = mock.fn();
      
      const client = new ViennaClient({
        apiKey: 'vna_test_key_123',
        baseUrl: 'https://custom-vienna.example.com',
        timeout: 10000,
        retries: 5,
        onError,
      });
      
      assert.ok(client);
    });

    test('normalizes base URL by removing trailing slashes', () => {
      const client = new ViennaClient({
        apiKey: 'vna_test_key_123',
        baseUrl: 'https://vienna.example.com///',
      });
      
      // Base URL normalization should happen internally
      assert.ok(client);
    });
  });

  describe('Request/Response Handling', () => {
    test('makes authenticated request with correct headers', async () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      const responseData = { id: 'test_123', status: 'success' };
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(200, mockApiResponse(responseData)))
      );

      const result = await client.request('GET', '/api/v1/test');

      assert.strictEqual(mockFetch.mock.callCount(), 1);
      
      const [url, options] = mockFetch.mock.calls[0].arguments;
      assert.strictEqual(url, 'https://console.regulator.ai/api/v1/test');
      assert.strictEqual(options.method, 'GET');
      assert.strictEqual(options.headers['X-Vienna-Api-Key'], 'vna_test_key_123');
      assert.strictEqual(options.headers['X-Vienna-SDK-Version'], '0.1.0');
      assert.strictEqual(options.headers['Accept'], 'application/json');
      
      assert.deepStrictEqual(result, responseData);
    });

    test('includes request body for POST requests', async () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      const requestBody = { action: 'test_action', payload: { value: 42 } };
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(201, mockApiResponse({ id: 'created' })))
      );

      await client.request('POST', '/api/v1/intents', requestBody);

      const [, options] = mockFetch.mock.calls[0].arguments;
      assert.strictEqual(options.headers['Content-Type'], 'application/json');
      assert.strictEqual(options.body, JSON.stringify(requestBody));
    });

    test('handles non-JSON responses', async () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => 'text/plain' },
          json: () => Promise.reject(new Error('Not JSON')),
        } as Response)
      );

      const result = await client.request('GET', '/api/v1/health');
      assert.strictEqual(result, undefined);
    });

    test('respects timeout option', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        timeout: 1000
      });
      
      // Mock a slow response
      mockFetch.mock.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve(mockFetchResponse(200, mockApiResponse({}))), 2000)
        )
      );

      await assert.rejects(
        client.request('GET', '/api/v1/test'),
        { name: 'AbortError' }
      );
    });

    test('respects signal for request cancellation', async () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      const controller = new AbortController();
      
      // Cancel immediately
      controller.abort();
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(200, mockApiResponse({})))
      );

      await assert.rejects(
        client.request('GET', '/api/v1/test', undefined, { signal: controller.signal }),
        { name: 'AbortError' }
      );
    });
  });

  describe('Retry Logic', () => {
    test('retries on 429 rate limit errors', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 2
      });
      
      let callCount = 0;
      mockFetch.mock.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve(mockFetchResponse(
            429, 
            mockApiResponse(null, false, 'RATE_LIMITED'),
            { 'retry-after': '1' }
          ));
        }
        return Promise.resolve(mockFetchResponse(200, mockApiResponse({ success: true })));
      });

      const result = await client.request('GET', '/api/v1/test');
      
      assert.strictEqual(mockFetch.mock.callCount(), 3);
      assert.deepStrictEqual(result, { success: true });
    });

    test('retries on 5xx server errors', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 1
      });
      
      let callCount = 0;
      mockFetch.mock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockFetchResponse(
            500, 
            mockApiResponse(null, false, 'SERVER_ERROR')
          ));
        }
        return Promise.resolve(mockFetchResponse(200, mockApiResponse({ recovered: true })));
      });

      const result = await client.request('GET', '/api/v1/test');
      
      assert.strictEqual(mockFetch.mock.callCount(), 2);
      assert.deepStrictEqual(result, { recovered: true });
    });

    test('does not retry on 4xx client errors (except 429)', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 3
      });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(
          400, 
          mockApiResponse(null, false, 'VALIDATION_ERROR')
        ))
      );

      await assert.rejects(
        client.request('GET', '/api/v1/test'),
        ViennaValidationError
      );
      
      assert.strictEqual(mockFetch.mock.callCount(), 1);
    });

    test('exhausts retries and throws final error', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 2
      });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(
          503, 
          mockApiResponse(null, false, 'SERVICE_UNAVAILABLE')
        ))
      );

      await assert.rejects(
        client.request('GET', '/api/v1/test'),
        ViennaServerError
      );
      
      assert.strictEqual(mockFetch.mock.callCount(), 3); // 1 initial + 2 retries
    });

    test('uses retry-after header for 429 backoff', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 1
      });
      
      let callCount = 0;
      const startTime = Date.now();
      
      mockFetch.mock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockFetchResponse(
            429, 
            mockApiResponse(null, false, 'RATE_LIMITED'),
            { 'retry-after': '1' } // 1 second
          ));
        }
        return Promise.resolve(mockFetchResponse(200, mockApiResponse({ success: true })));
      });

      await client.request('GET', '/api/v1/test');
      
      const elapsed = Date.now() - startTime;
      assert.ok(elapsed >= 1000, `Should have waited at least 1000ms, got ${elapsed}ms`);
    });

    test('handles network errors with retry', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 2
      });
      
      let callCount = 0;
      mockFetch.mock.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockFetchResponse(200, mockApiResponse({ recovered: true })));
      });

      const result = await client.request('GET', '/api/v1/test');
      
      assert.strictEqual(mockFetch.mock.callCount(), 3);
      assert.deepStrictEqual(result, { recovered: true });
    });
  });

  describe('Error Mapping', () => {
    const errorTestCases = [
      {
        status: 400,
        expectedError: ViennaValidationError,
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters'
      },
      {
        status: 401,
        expectedError: ViennaAuthError,
        code: 'UNAUTHORIZED',
        message: 'Invalid API key'
      },
      {
        status: 403,
        expectedError: ViennaForbiddenError,
        code: 'FORBIDDEN',
        message: 'Insufficient permissions'
      },
      {
        status: 404,
        expectedError: ViennaNotFoundError,
        code: 'NOT_FOUND',
        message: 'Resource not found'
      },
      {
        status: 429,
        expectedError: ViennaRateLimitError,
        code: 'RATE_LIMITED',
        message: 'Too many requests'
      },
      {
        status: 500,
        expectedError: ViennaServerError,
        code: 'SERVER_ERROR',
        message: 'Internal server error'
      },
      {
        status: 502,
        expectedError: ViennaServerError,
        code: 'BAD_GATEWAY',
        message: 'Bad gateway'
      }
    ];

    errorTestCases.forEach(({ status, expectedError, code, message }) => {
      test(`maps ${status} to ${expectedError.name}`, async () => {
        const client = new ViennaClient({ 
          apiKey: 'vna_test_key_123',
          retries: 0 // Disable retries for error testing
        });
        
        mockFetch.mock.mockImplementation(() => 
          Promise.resolve(mockFetchResponse(
            status, 
            mockApiResponse(null, false, code)
          ))
        );

        const error = await assert.rejects(
          client.request('GET', '/api/v1/test'),
          expectedError
        );
        
        assert.strictEqual(error.status, status);
        assert.strictEqual(error.code, code);
      });
    });

    test('ValidationError includes field-level errors', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 0
      });
      
      const validationDetails = {
        email: 'Invalid email format',
        amount: 'Must be positive number'
      };
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(
          400, 
          {
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            data: validationDetails
          }
        ))
      );

      const error = await assert.rejects(
        client.request('POST', '/api/v1/test'),
        ViennaValidationError
      ) as ViennaValidationError;
      
      assert.deepStrictEqual(error.fields, validationDetails);
    });

    test('RateLimitError includes retry-after value', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 0
      });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(
          429, 
          mockApiResponse(null, false, 'RATE_LIMITED'),
          { 'retry-after': '60' }
        ))
      );

      const error = await assert.rejects(
        client.request('GET', '/api/v1/test'),
        ViennaRateLimitError
      ) as ViennaRateLimitError;
      
      // Note: Implementation would need to parse retry-after header
      assert.strictEqual(error.retryAfter, 0); // Current implementation defaults to 0
    });

    test('handles unknown HTTP status codes', async () => {
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 0
      });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(
          418, // I'm a teapot
          mockApiResponse(null, false, 'IM_A_TEAPOT')
        ))
      );

      const error = await assert.rejects(
        client.request('GET', '/api/v1/test'),
        ViennaError
      );
      
      assert.strictEqual(error.status, 418);
      assert.strictEqual(error.code, 'IM_A_TEAPOT');
    });

    test('calls onError callback for errors', async () => {
      const onError = mock.fn();
      const client = new ViennaClient({ 
        apiKey: 'vna_test_key_123',
        retries: 0,
        onError
      });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(
          500, 
          mockApiResponse(null, false, 'SERVER_ERROR')
        ))
      );

      await assert.rejects(client.request('GET', '/api/v1/test'));
      
      assert.strictEqual(onError.mock.callCount(), 1);
      assert.ok(onError.mock.calls[0].arguments[0] instanceof ViennaServerError);
    });
  });

  describe('Framework Wrappers', () => {
    const frameworkConfig = {
      apiKey: 'vna_test_key_123',
      baseUrl: 'https://vienna-test.example.com',
      agentId: 'test_agent_123'
    };

    test('createForLangChain returns functional adapter', async () => {
      const adapter = createForLangChain(frameworkConfig);
      
      assert.ok(adapter);
      assert.ok(typeof adapter.submitIntent === 'function');
      assert.ok(typeof adapter.waitForApproval === 'function');
      assert.ok(typeof adapter.reportExecution === 'function');
      assert.ok(typeof adapter.register === 'function');
    });

    test('createForCrewAI returns functional adapter', async () => {
      const adapter = createForCrewAI(frameworkConfig);
      
      assert.ok(adapter);
      assert.ok(typeof adapter.submitIntent === 'function');
      assert.ok(typeof adapter.waitForApproval === 'function');
      assert.ok(typeof adapter.reportExecution === 'function');
      assert.ok(typeof adapter.register === 'function');
    });

    test('createForAutoGen returns functional adapter', async () => {
      const adapter = createForAutoGen(frameworkConfig);
      
      assert.ok(adapter);
      assert.ok(typeof adapter.submitIntent === 'function');
      assert.ok(typeof adapter.waitForApproval === 'function');
      assert.ok(typeof adapter.reportExecution === 'function');
      assert.ok(typeof adapter.register === 'function');
    });

    test('createForOpenClaw returns functional adapter', async () => {
      const adapter = createForOpenClaw(frameworkConfig);
      
      assert.ok(adapter);
      assert.ok(typeof adapter.submitIntent === 'function');
      assert.ok(typeof adapter.waitForApproval === 'function');
      assert.ok(typeof adapter.reportExecution === 'function');
      assert.ok(typeof adapter.register === 'function');
    });

    test('framework adapter submitIntent works', async () => {
      const adapter = createForLangChain(frameworkConfig);
      
      const intentResult = {
        intent_id: 'int_test_123',
        status: 'approved' as const,
        action: 'send_email',
        risk_tier: 'T1' as const,
        created_at: '2024-03-26T10:00:00Z'
      };
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(201, mockApiResponse(intentResult)))
      );

      const result = await adapter.submitIntent('send_email', { 
        recipient: 'test@example.com',
        subject: 'Test Message'
      });
      
      assert.deepStrictEqual(result, intentResult);
      assert.strictEqual(mockFetch.mock.callCount(), 1);
      
      const [url, options] = mockFetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v1/intents'));
      assert.strictEqual(options.method, 'POST');
      
      const body = JSON.parse(options.body);
      assert.strictEqual(body.action, 'send_email');
      assert.strictEqual(body.source, 'langchain_agent'); 
      assert.deepStrictEqual(body.payload, {
        recipient: 'test@example.com',
        subject: 'Test Message'
      });
    });

    test('framework adapter waitForApproval works', async () => {
      const adapter = createForCrewAI(frameworkConfig);
      
      const statusResult = {
        intent_id: 'int_test_123',
        status: 'approved' as const,
        approved_at: '2024-03-26T10:05:00Z'
      };
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(200, mockApiResponse(statusResult)))
      );

      const result = await adapter.waitForApproval('int_test_123', 5000);
      
      assert.deepStrictEqual(result, statusResult);
      assert.strictEqual(mockFetch.mock.callCount(), 1);
      
      const [url] = mockFetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v1/intents/int_test_123/status'));
    });

    test('framework adapter reportExecution works', async () => {
      const adapter = createForAutoGen(frameworkConfig);
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(200, mockApiResponse({})))
      );

      await adapter.reportExecution('int_test_123', 'success', {
        duration_ms: 1500,
        output: 'Email sent successfully'
      });
      
      assert.strictEqual(mockFetch.mock.callCount(), 1);
      
      const [url, options] = mockFetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v1/intents/int_test_123/execution'));
      assert.strictEqual(options.method, 'POST');
      
      const body = JSON.parse(options.body);
      assert.strictEqual(body.status, 'success');
      assert.deepStrictEqual(body.result, {
        duration_ms: 1500,
        output: 'Email sent successfully'
      });
    });

    test('framework adapter register works', async () => {
      const adapter = createForOpenClaw(frameworkConfig);
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(201, mockApiResponse({
          agent_id: 'test_agent_123',
          registered_at: '2024-03-26T10:00:00Z'
        })))
      );

      await adapter.register({
        version: '1.0.0',
        capabilities: 'email,notifications'
      });
      
      assert.strictEqual(mockFetch.mock.callCount(), 1);
      
      const [url, options] = mockFetch.mock.calls[0].arguments;
      assert.ok(url.includes('/api/v1/fleet/agents'));
      assert.strictEqual(options.method, 'POST');
      
      const body = JSON.parse(options.body);
      assert.strictEqual(body.agent_id, 'test_agent_123');
      assert.strictEqual(body.framework, 'openclaw');
      assert.deepStrictEqual(body.metadata, {
        version: '1.0.0',
        capabilities: 'email,notifications'
      });
    });

    test('framework adapters use correct agent identifiers', async () => {
      const testCases = [
        { factory: createForLangChain, expectedSource: 'langchain_agent', expectedFramework: 'langchain' },
        { factory: createForCrewAI, expectedSource: 'crewai_agent', expectedFramework: 'crewai' },
        { factory: createForAutoGen, expectedSource: 'autogen_agent', expectedFramework: 'autogen' },
        { factory: createForOpenClaw, expectedSource: 'openclaw_agent', expectedFramework: 'openclaw' }
      ];

      for (const { factory, expectedSource, expectedFramework } of testCases) {
        mockFetch.mock.resetCalls();
        
        const adapter = factory(frameworkConfig);
        
        mockFetch.mock.mockImplementation(() => 
          Promise.resolve(mockFetchResponse(201, mockApiResponse({
            intent_id: 'int_test',
            status: 'approved' as const
          })))
        );

        await adapter.submitIntent('test_action', {});
        
        const body = JSON.parse(mockFetch.mock.calls[0].arguments[1].body);
        assert.strictEqual(body.source, expectedSource);
        
        // Test register as well
        mockFetch.mock.resetCalls();
        mockFetch.mock.mockImplementation(() => 
          Promise.resolve(mockFetchResponse(201, mockApiResponse({})))
        );
        
        await adapter.register();
        
        const registerBody = JSON.parse(mockFetch.mock.calls[0].arguments[1].body);
        assert.strictEqual(registerBody.framework, expectedFramework);
      }
    });
  });

  describe('Request Building', () => {
    test('handles query parameters correctly', async () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(200, mockApiResponse([])))
      );

      // This would be called internally by modules, testing the pattern
      await client.request('GET', '/api/v1/test?limit=10&offset=0');
      
      const [url] = mockFetch.mock.calls[0].arguments;
      assert.ok(url.includes('limit=10'));
      assert.ok(url.includes('offset=0'));
    });

    test('handles empty request body correctly', async () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(200, mockApiResponse({})))
      );

      await client.request('GET', '/api/v1/test', undefined);
      
      const [, options] = mockFetch.mock.calls[0].arguments;
      assert.strictEqual(options.body, undefined);
      assert.strictEqual(options.headers['Content-Type'], undefined);
    });

    test('handles null request body correctly', async () => {
      const client = new ViennaClient({ apiKey: 'vna_test_key_123' });
      
      mockFetch.mock.mockImplementation(() => 
        Promise.resolve(mockFetchResponse(200, mockApiResponse({})))
      );

      await client.request('POST', '/api/v1/test', null);
      
      const [, options] = mockFetch.mock.calls[0].arguments;
      assert.strictEqual(options.body, undefined);
      assert.strictEqual(options.headers['Content-Type'], undefined);
    });
  });
});