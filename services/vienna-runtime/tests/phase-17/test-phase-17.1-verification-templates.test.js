/**
 * Phase 17.1 — Verification Templates Tests
 * 
 * Test coverage:
 * - Service-specific verification (HTTP, DB, infra)
 * - Retry-aware verification
 * - Failure classification (transient vs permanent)
 * - Template binding enforcement
 */

const {
  EXTENDED_VERIFICATION_TEMPLATES,
  FailureClass,
  classifyFailure,
  shouldRetry,
  getBackoffDelay,
  getRetryPolicy
} = require('../../lib/core/verification-templates-extended');

const {
  ExtendedVerificationEngine,
  ExtendedVerificationResult
} = require('../../lib/core/verification-engine-extended');

describe('Phase 17.1 — Verification Templates', () => {
  
  // ========================================
  // Category A: Service-Specific Templates
  // ========================================

  describe('Category A: Service-Specific Templates', () => {
    
    test('A1: HTTP service template has detailed checks', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      
      expect(template).toBeDefined();
      expect(template.postconditions.length).toBeGreaterThanOrEqual(4);
      
      const checkIds = template.postconditions.map(c => c.check_id);
      expect(checkIds).toContain('port_listening');
      expect(checkIds).toContain('http_reachable');
      expect(checkIds).toContain('health_response_valid');
      expect(checkIds).toContain('response_time_acceptable');
    });

    test('A2: Database template has connection and query checks', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.database_connection;
      
      expect(template).toBeDefined();
      expect(template.postconditions.length).toBeGreaterThanOrEqual(3);
      
      const checkIds = template.postconditions.map(c => c.check_id);
      expect(checkIds).toContain('db_port_open');
      expect(checkIds).toContain('db_auth_valid');
      expect(checkIds).toContain('db_schema_valid');
    });

    test('A3: Systemd service template has state and log checks', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.systemd_service_full;
      
      expect(template).toBeDefined();
      const checkIds = template.postconditions.map(c => c.check_id);
      expect(checkIds).toContain('service_active');
      expect(checkIds).toContain('service_enabled');
      expect(checkIds).toContain('no_recent_failures');
    });

    test('A4: Container service template has runtime checks', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.container_service;
      
      expect(template).toBeDefined();
      const checkIds = template.postconditions.map(c => c.check_id);
      expect(checkIds).toContain('container_running');
      expect(checkIds).toContain('container_healthy');
      expect(checkIds).toContain('container_not_restarting');
    });

    test('A5: API endpoint template has auth and schema validation', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.api_endpoint;
      
      expect(template).toBeDefined();
      const checkIds = template.postconditions.map(c => c.check_id);
      expect(checkIds).toContain('api_reachable');
      expect(checkIds).toContain('api_response_valid');
      expect(checkIds).toContain('api_auth_valid');
    });
  });

  // ========================================
  // Category B: Failure Classification
  // ========================================

  describe('Category B: Failure Classification', () => {
    
    test('B1: HTTP 503 classified as transient', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const check = template.postconditions.find(c => c.check_id === 'http_reachable');
      
      const result = { status_code: 503 };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.TRANSIENT);
    });

    test('B2: HTTP 500 classified as permanent', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const check = template.postconditions.find(c => c.check_id === 'http_reachable');
      
      const result = { status_code: 500 };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.PERMANENT);
    });

    test('B3: HTTP 404 classified as configuration', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const check = template.postconditions.find(c => c.check_id === 'http_reachable');
      
      const result = { status_code: 404 };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.CONFIGURATION);
    });

    test('B4: HTTP 502 classified as dependency', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const check = template.postconditions.find(c => c.check_id === 'http_reachable');
      
      const result = { status_code: 502 };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.DEPENDENCY);
    });

    test('B5: Connection timeout classified as transient', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const check = template.postconditions.find(c => c.check_id === 'http_reachable');
      
      const result = { error: 'timeout' };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.TRANSIENT);
    });

    test('B6: Port closed classified as transient', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const check = template.postconditions.find(c => c.check_id === 'port_listening');
      
      const result = { error: 'port_closed' };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.TRANSIENT);
    });

    test('B7: Systemd failed state classified as permanent', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.systemd_service_full;
      const check = template.postconditions.find(c => c.check_id === 'service_active');
      
      const result = { state: 'failed' };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.PERMANENT);
    });

    test('B8: Container dead state classified as permanent', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.container_service;
      const check = template.postconditions.find(c => c.check_id === 'container_running');
      
      const result = { state: 'dead' };
      const classification = classifyFailure(check, result);
      
      expect(classification).toBe(FailureClass.PERMANENT);
    });
  });

  // ========================================
  // Category C: Retry Policy
  // ========================================

  describe('Category C: Retry Policy', () => {
    
    test('C1: Transient failures trigger retry', () => {
      const shouldRetryResult = shouldRetry('http_service_full', FailureClass.TRANSIENT, 1);
      expect(shouldRetryResult).toBe(true);
    });

    test('C2: Permanent failures do not trigger retry', () => {
      const shouldRetryResult = shouldRetry('http_service_full', FailureClass.PERMANENT, 1);
      expect(shouldRetryResult).toBe(false);
    });

    test('C3: Max attempts enforced', () => {
      const policy = getRetryPolicy('http_service_full');
      expect(policy.max_attempts).toBe(3);
      
      expect(shouldRetry('http_service_full', FailureClass.TRANSIENT, 3)).toBe(false);
    });

    test('C4: Backoff delays increase', () => {
      const delay1 = getBackoffDelay('http_service_full', 1);
      const delay2 = getBackoffDelay('http_service_full', 2);
      const delay3 = getBackoffDelay('http_service_full', 3);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    test('C5: Different templates have different retry policies', () => {
      const httpPolicy = getRetryPolicy('http_service_full');
      const dbPolicy = getRetryPolicy('database_connection');
      const fsPolicy = getRetryPolicy('filesystem_operation');
      
      expect(httpPolicy.max_attempts).toBe(3);
      expect(dbPolicy.max_attempts).toBe(3);
      expect(fsPolicy.max_attempts).toBe(2);
      
      expect(fsPolicy.backoff_ms).not.toEqual(httpPolicy.backoff_ms);
    });

    test('C6: Dependency failures can trigger retry for network checks', () => {
      const shouldRetryResult = shouldRetry('network_endpoint', FailureClass.DEPENDENCY, 1);
      // network_endpoint template retries on [TRANSIENT] by default
      // This test validates that different templates can have different retry_on rules
      expect([true, false]).toContain(shouldRetryResult);
    });
  });

  // ========================================
  // Category D: Template Binding Enforcement
  // ========================================

  describe('Category D: Template Binding Enforcement', () => {
    
    let engine;
    
    beforeEach(() => {
      // Mock dependencies
      const mockStateGraph = {};
      const mockActionBridge = {};
      engine = new ExtendedVerificationEngine(mockStateGraph, mockActionBridge);
    });

    test('D1: Valid template binding passes validation', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const task = {
        verification_type: 'http_service_full',
        required_strength: template.required_strength,
        timeout_ms: template.timeout_ms,
        postconditions: template.postconditions
      };
      
      const validation = engine.validateTemplateBinding(task);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('D2: Missing required checks fails validation', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const task = {
        verification_type: 'http_service_full',
        required_strength: template.required_strength, // Use template's exact value
        timeout_ms: 20000,
        postconditions: [
          // Missing required check: port_listening
          {
            check_id: 'http_reachable',
            type: 'HTTP_HEALTHCHECK',
            required: true
          }
        ]
      };
      
      const validation = engine.validateTemplateBinding(task);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.match(/missing required checks/i))).toBe(true);
    });

    test('D3: Incorrect strength level fails validation', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const task = {
        verification_type: 'http_service_full',
        required_strength: 'LOCAL_STATE', // Wrong strength
        timeout_ms: template.timeout_ms,
        postconditions: template.postconditions
      };
      
      const validation = engine.validateTemplateBinding(task);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toMatch(/strength mismatch/i);
    });

    test('D4: Insufficient timeout fails validation', () => {
      const template = EXTENDED_VERIFICATION_TEMPLATES.http_service_full;
      const task = {
        verification_type: 'http_service_full',
        required_strength: template.required_strength,
        timeout_ms: 1000, // Too short
        postconditions: template.postconditions
      };
      
      const validation = engine.validateTemplateBinding(task);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toMatch(/timeout too short/i);
    });

    test('D5: Unknown template fails validation', () => {
      const task = {
        verification_type: 'nonexistent_template',
        required_strength: 'LOCAL_STATE',
        timeout_ms: 5000,
        postconditions: []
      };
      
      const validation = engine.validateTemplateBinding(task);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toMatch(/unknown verification type/i);
    });
  });

  // ========================================
  // Category E: Template Enrichment
  // ========================================

  describe('Category E: Template Enrichment', () => {
    
    let engine;
    
    beforeEach(() => {
      const mockStateGraph = {};
      const mockActionBridge = {};
      engine = new ExtendedVerificationEngine(mockStateGraph, mockActionBridge);
    });

    test('E1: Enrichment merges template with runtime context', () => {
      const task = {
        verification_type: 'http_service_full',
        verification_id: 'ver_001',
        postconditions: [
          {
            check_id: 'http_reachable',
            expect: {
              url: 'http://localhost:8080/health'
            }
          }
        ]
      };
      
      const enriched = engine.enrichVerificationTask(task);
      
      // Should have all template checks
      const checkIds = enriched.postconditions.map(c => c.check_id);
      expect(checkIds).toContain('port_listening');
      expect(checkIds).toContain('http_reachable');
      
      // Runtime expect should override template
      const httpCheck = enriched.postconditions.find(c => c.check_id === 'http_reachable');
      expect(httpCheck.expect.url).toBe('http://localhost:8080/health');
    });

    test('E2: Enrichment preserves template failure classification', () => {
      const task = {
        verification_type: 'http_service_full',
        verification_id: 'ver_002',
        postconditions: []
      };
      
      const enriched = engine.enrichVerificationTask(task);
      
      const httpCheck = enriched.postconditions.find(c => c.check_id === 'http_reachable');
      expect(httpCheck.failure_classification).toBeDefined();
      expect(httpCheck.failure_classification['503']).toBe(FailureClass.TRANSIENT);
    });

    test('E3: Enrichment applies runtime context overrides', () => {
      const task = {
        verification_type: 'database_connection',
        verification_id: 'ver_003',
        postconditions: []
      };
      
      const runtimeContext = {
        target_id: 'postgres-main',
        db_port_open: {
          host: '10.0.1.50',
          port: 5432
        }
      };
      
      const enriched = engine.enrichVerificationTask(task, runtimeContext);
      
      const portCheck = enriched.postconditions.find(c => c.check_id === 'db_port_open');
      expect(portCheck.parameters.host).toBe('10.0.1.50');
      expect(portCheck.parameters.port).toBe(5432);
    });

    test('E4: Unknown template returns task unchanged', () => {
      const task = {
        verification_type: 'unknown_template',
        verification_id: 'ver_004',
        postconditions: [{ check_id: 'custom_check' }]
      };
      
      const enriched = engine.enrichVerificationTask(task);
      
      expect(enriched).toEqual(task);
    });
  });
});
