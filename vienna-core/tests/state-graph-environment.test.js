/**
 * State Graph Environment Isolation Tests (Phase 7.1a)
 * 
 * Validates prod/test environment separation
 */

const { StateGraph } = require('../lib/state/state-graph');
const fs = require('fs');
const path = require('path');

const PROD_DB_PATH = path.join(process.env.HOME, '.openclaw', 'runtime', 'prod', 'state', 'state-graph.db');
const TEST_DB_PATH = path.join(process.env.HOME, '.openclaw', 'runtime', 'test', 'state', 'state-graph.db');

describe('State Graph Environment Isolation - Phase 7.1a', () => {
  beforeEach(() => {
    // Clean both environments
    if (fs.existsSync(PROD_DB_PATH)) {
      fs.unlinkSync(PROD_DB_PATH);
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  afterEach(() => {
    // Clean both environments
    if (fs.existsSync(PROD_DB_PATH)) {
      fs.unlinkSync(PROD_DB_PATH);
    }
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // ============================================================
  // ENV1: DEFAULT ENVIRONMENT IS PROD
  // ============================================================

  test('ENV1: Default environment is prod', async () => {
    const stateGraph = new StateGraph();
    expect(stateGraph.environment).toBe('prod');
    expect(stateGraph.dbPath).toContain('/runtime/prod/state/');
  });

  test('ENV1.1: VIENNA_ENV=prod selects prod path', async () => {
    process.env.VIENNA_ENV = 'prod';
    const stateGraph = new StateGraph();
    expect(stateGraph.environment).toBe('prod');
    expect(stateGraph.dbPath).toBe(PROD_DB_PATH);
    delete process.env.VIENNA_ENV;
  });

  test('ENV1.2: VIENNA_ENV=test selects test path', async () => {
    process.env.VIENNA_ENV = 'test';
    const stateGraph = new StateGraph();
    expect(stateGraph.environment).toBe('test');
    expect(stateGraph.dbPath).toBe(TEST_DB_PATH);
    delete process.env.VIENNA_ENV;
  });

  // ============================================================
  // ENV2: PROD AND TEST ARE ISOLATED
  // ============================================================

  test('ENV2: Writes in test do not affect prod', async () => {
    // Write to test environment
    process.env.VIENNA_ENV = 'test';
    const testGraph = new StateGraph();
    await testGraph.initialize();
    
    testGraph.createService({
      service_id: 'test-only-service',
      service_name: 'Test Only Service',
      service_type: 'api',
      status: 'running'
    });
    
    testGraph.close();
    delete process.env.VIENNA_ENV;

    // Check prod environment
    process.env.VIENNA_ENV = 'prod';
    const prodGraph = new StateGraph();
    await prodGraph.initialize();
    
    const service = prodGraph.getService('test-only-service');
    expect(service).toBeUndefined();
    
    prodGraph.close();
    delete process.env.VIENNA_ENV;
  });

  test('ENV2.1: Writes in prod do not affect test', async () => {
    // Write to prod environment
    process.env.VIENNA_ENV = 'prod';
    const prodGraph = new StateGraph();
    await prodGraph.initialize();
    
    prodGraph.createService({
      service_id: 'prod-only-service',
      service_name: 'Prod Only Service',
      service_type: 'api',
      status: 'running'
    });
    
    prodGraph.close();
    delete process.env.VIENNA_ENV;

    // Check test environment
    process.env.VIENNA_ENV = 'test';
    const testGraph = new StateGraph();
    await testGraph.initialize();
    
    const service = testGraph.getService('prod-only-service');
    expect(service).toBeUndefined();
    
    testGraph.close();
    delete process.env.VIENNA_ENV;
  });

  test('ENV2.2: Both environments can coexist', async () => {
    // Write to prod
    process.env.VIENNA_ENV = 'prod';
    const prodGraph = new StateGraph();
    await prodGraph.initialize();
    prodGraph.createService({
      service_id: 'shared-id',
      service_name: 'Prod Version',
      service_type: 'api',
      status: 'running'
    });
    prodGraph.close();
    delete process.env.VIENNA_ENV;

    // Write to test
    process.env.VIENNA_ENV = 'test';
    const testGraph = new StateGraph();
    await testGraph.initialize();
    testGraph.createService({
      service_id: 'shared-id',
      service_name: 'Test Version',
      service_type: 'api',
      status: 'degraded'
    });
    testGraph.close();
    delete process.env.VIENNA_ENV;

    // Verify prod still has original
    process.env.VIENNA_ENV = 'prod';
    const prodCheck = new StateGraph();
    await prodCheck.initialize();
    const prodService = prodCheck.getService('shared-id');
    expect(prodService.service_name).toBe('Prod Version');
    expect(prodService.status).toBe('running');
    prodCheck.close();
    delete process.env.VIENNA_ENV;

    // Verify test still has original
    process.env.VIENNA_ENV = 'test';
    const testCheck = new StateGraph();
    await testCheck.initialize();
    const testService = testCheck.getService('shared-id');
    expect(testService.service_name).toBe('Test Version');
    expect(testService.status).toBe('degraded');
    testCheck.close();
    delete process.env.VIENNA_ENV;
  });

  // ============================================================
  // ENV3: BOOTSTRAP RESPECTS ENVIRONMENT
  // ============================================================

  test('ENV3: Bootstrap creates environment-specific database', async () => {
    process.env.VIENNA_ENV = 'test';
    const stateGraph = new StateGraph();
    await stateGraph.initialize();
    
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
    expect(fs.existsSync(PROD_DB_PATH)).toBe(false);
    
    stateGraph.close();
    delete process.env.VIENNA_ENV;
  });

  test('ENV3.1: Prod and test bootstrap independently', async () => {
    // Bootstrap prod
    process.env.VIENNA_ENV = 'prod';
    const prodGraph = new StateGraph();
    await prodGraph.initialize();
    prodGraph.createService({
      service_id: 'bootstrap-test',
      service_name: 'Bootstrap Test',
      service_type: 'api',
      status: 'running'
    });
    prodGraph.close();
    delete process.env.VIENNA_ENV;

    // Bootstrap test
    process.env.VIENNA_ENV = 'test';
    const testGraph = new StateGraph();
    await testGraph.initialize();
    
    const services = testGraph.listServices();
    expect(services.length).toBe(0); // Test starts empty
    
    testGraph.close();
    delete process.env.VIENNA_ENV;

    // Verify both databases exist
    expect(fs.existsSync(PROD_DB_PATH)).toBe(true);
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  // ============================================================
  // ENV4: PATH STRUCTURE
  // ============================================================

  test('ENV4: Prod path structure correct', () => {
    process.env.VIENNA_ENV = 'prod';
    const stateGraph = new StateGraph();
    
    expect(stateGraph.dbPath).toBe(PROD_DB_PATH);
    expect(stateGraph.dbPath).toContain('.openclaw/runtime/prod/state/');
    
    delete process.env.VIENNA_ENV;
  });

  test('ENV4.1: Test path structure correct', () => {
    process.env.VIENNA_ENV = 'test';
    const stateGraph = new StateGraph();
    
    expect(stateGraph.dbPath).toBe(TEST_DB_PATH);
    expect(stateGraph.dbPath).toContain('.openclaw/runtime/test/state/');
    
    delete process.env.VIENNA_ENV;
  });

  test('ENV4.2: Custom dbPath overrides environment', () => {
    const customPath = '/tmp/custom-state-graph.db';
    const stateGraph = new StateGraph({ dbPath: customPath });
    
    expect(stateGraph.dbPath).toBe(customPath);
    expect(stateGraph.dbPath).not.toContain('.openclaw/runtime/');
  });

  // ============================================================
  // ENV5: DIRECTORY CREATION
  // ============================================================

  test('ENV5: Initialize creates runtime directories', async () => {
    process.env.VIENNA_ENV = 'test';
    const stateGraph = new StateGraph();
    
    const stateDir = path.dirname(stateGraph.dbPath);
    if (fs.existsSync(stateDir)) {
      fs.rmSync(stateDir, { recursive: true });
    }

    await stateGraph.initialize();
    
    expect(fs.existsSync(stateDir)).toBe(true);
    expect(fs.existsSync(stateGraph.dbPath)).toBe(true);
    
    stateGraph.close();
    delete process.env.VIENNA_ENV;
  });
});
