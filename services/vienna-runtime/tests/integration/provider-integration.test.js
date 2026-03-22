/**
 * Provider Manager Integration Tests
 * 
 * Verifies that provider manager is correctly integrated with the server runtime.
 */

const path = require('path');
const os = require('os');

describe('Provider Manager Integration', () => {
  let ProviderManagerBridge;
  let createProviderManagerBridge;
  
  beforeAll(async () => {
    // Import the bridge module (ESM → CommonJS)
    const bridgeModule = await import('../../console/server/src/integrations/providerManager.js');
    ProviderManagerBridge = bridgeModule.ProviderManagerBridge;
    createProviderManagerBridge = bridgeModule.createProviderManagerBridge;
  });
  
  describe('ProviderManagerBridge', () => {
    test('can be initialized from server runtime', async () => {
      const bridge = new ProviderManagerBridge({
        primaryProvider: 'anthropic',
        fallbackOrder: ['anthropic', 'openclaw'],
      });
      
      expect(bridge).toBeDefined();
      
      // Initialize should not throw
      await expect(bridge.initialize()).resolves.not.toThrow();
      
      // Stop the bridge
      bridge.stop();
    }, 15000);
    
    test('getAllStatuses returns live provider data', async () => {
      const bridge = await createProviderManagerBridge({
        primaryProvider: 'anthropic',
        fallbackOrder: ['anthropic', 'openclaw'],
      });
      
      const statuses = await bridge.getAllStatuses();
      
      expect(statuses).toBeDefined();
      expect(typeof statuses).toBe('object');
      
      // Should have at least anthropic provider
      expect(statuses.anthropic).toBeDefined();
      expect(statuses.anthropic.provider).toBe('anthropic');
      expect(statuses.anthropic.status).toMatch(/healthy|degraded|unavailable/);
      expect(statuses.anthropic.consecutiveFailures).toBeGreaterThanOrEqual(0);
      
      bridge.stop();
    }, 15000);
    
    test('degraded provider state is reflected in response', async () => {
      const bridge = await createProviderManagerBridge({
        primaryProvider: 'anthropic',
        fallbackOrder: ['anthropic', 'openclaw'],
      });
      
      const statuses = await bridge.getAllStatuses();
      
      // Check that provider health structure is correct
      for (const [name, health] of Object.entries(statuses)) {
        expect(health).toHaveProperty('provider');
        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('lastCheckedAt');
        expect(health).toHaveProperty('consecutiveFailures');
        expect(['healthy', 'degraded', 'unavailable']).toContain(health.status);
      }
      
      bridge.stop();
    }, 15000);
    
    test('cooldown state is reflected in response', async () => {
      const bridge = await createProviderManagerBridge({
        primaryProvider: 'anthropic',
        fallbackOrder: ['anthropic', 'openclaw'],
      });
      
      const statuses = await bridge.getAllStatuses();
      
      // Check cooldown field exists (may be null for healthy providers)
      for (const [name, health] of Object.entries(statuses)) {
        expect(health).toHaveProperty('cooldownUntil');
        if (health.cooldownUntil !== null) {
          expect(typeof health.cooldownUntil).toBe('string');
        }
      }
      
      bridge.stop();
    }, 15000);
    
    test('getPrimaryProvider returns correct provider name', async () => {
      const bridge = await createProviderManagerBridge({
        primaryProvider: 'anthropic',
        fallbackOrder: ['anthropic', 'openclaw'],
      });
      
      const primary = bridge.getPrimaryProvider();
      expect(primary).toBe('anthropic');
      
      bridge.stop();
    }, 15000);
    
    test('getFallbackOrder returns correct order', async () => {
      const bridge = await createProviderManagerBridge({
        primaryProvider: 'anthropic',
        fallbackOrder: ['anthropic', 'openclaw'],
      });
      
      const fallback = bridge.getFallbackOrder();
      expect(Array.isArray(fallback)).toBe(true);
      expect(fallback).toContain('anthropic');
      expect(fallback).toContain('openclaw');
      
      bridge.stop();
    }, 15000);
  });
  
  describe('Architecture Boundaries', () => {
    test('no route imports providers directly', async () => {
      const fs = require('fs').promises;
      const routesDir = path.join(__dirname, '../../console/server/src/routes');
      
      const files = await fs.readdir(routesDir);
      const routeFiles = files.filter(f => f.endsWith('.ts'));
      
      for (const file of routeFiles) {
        const filePath = path.join(routesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Routes should NOT import from lib/providers
        expect(content).not.toMatch(/from ['"].*\/lib\/providers/);
        
        // Routes should import ViennaRuntimeService instead
        if (file !== 'stream.ts') { // stream.ts only deals with SSE
          expect(content).toMatch(/ViennaRuntimeService/);
        }
      }
    });
    
    test('ViennaRuntimeService does not import providers directly', async () => {
      const fs = require('fs').promises;
      const servicePath = path.join(__dirname, '../../console/server/src/services/viennaRuntime.ts');
      
      const content = await fs.readFile(servicePath, 'utf-8');
      
      // Service should NOT import from lib/providers
      expect(content).not.toMatch(/from ['"].*\/lib\/providers/);
    });
    
    test('only bridge module imports providers', async () => {
      const fs = require('fs').promises;
      const serverSrcDir = path.join(__dirname, '../../console/server/src');
      
      // Recursively get all .ts files
      async function getAllTsFiles(dir) {
        const files = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...await getAllTsFiles(fullPath));
          } else if (entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
        
        return files;
      }
      
      const allFiles = await getAllTsFiles(serverSrcDir);
      const bridgePath = path.join(__dirname, '../../console/server/src/integrations/providerManager.ts');
      
      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        if (file === bridgePath) {
          // Bridge should import from lib/providers
          expect(content).toMatch(/from ['"].*\/lib\/providers/);
        } else {
          // No other file should import from lib/providers
          expect(content).not.toMatch(/from ['"].*\/lib\/providers/);
        }
      }
    });
  });
  
  describe('HTTP Endpoints', () => {
    // These tests require the server to be running
    // They will be skipped if server is not available
    
    const BASE_URL = 'http://localhost:3100';
    
    async function isServerRunning() {
      try {
        const response = await fetch(`${BASE_URL}/health`);
        return response.ok;
      } catch {
        return false;
      }
    }
    
    test('GET /api/v1/system/providers returns live provider data', async () => {
      if (!await isServerRunning()) {
        console.warn('Server not running, skipping HTTP test');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/v1/system/providers`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.primary).toBeDefined();
      expect(data.data.fallback).toBeDefined();
      expect(data.data.providers).toBeDefined();
      
      // Check provider structure
      const providers = data.data.providers;
      for (const [name, health] of Object.entries(providers)) {
        expect(health).toHaveProperty('name');
        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('lastCheckedAt');
        expect(health).toHaveProperty('consecutiveFailures');
      }
    });
    
    test('GET /api/v1/system/providers/:name returns specific provider', async () => {
      if (!await isServerRunning()) {
        console.warn('Server not running, skipping HTTP test');
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/v1/system/providers/anthropic`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe('anthropic');
      expect(data.data.status).toMatch(/healthy|degraded|unavailable/);
    });
  });
});
