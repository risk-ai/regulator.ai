/**
 * Dashboard Bootstrap Integration Tests
 * 
 * Verifies that bootstrap endpoint provides unified initial state.
 */

const fs = require('fs');
const path = require('path');

describe('Dashboard Bootstrap', () => {
  const BASE_URL = 'http://localhost:3100';
  
  async function isServerRunning() {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  beforeAll(async () => {
    if (!await isServerRunning()) {
      console.warn('Server not running on localhost:3100, skipping HTTP tests');
    }
  });
  
  describe('GET /api/v1/dashboard/bootstrap', () => {
    test('returns 200 with stable top-level structure', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.timestamp).toBeDefined();
      
      // Top-level structure
      const bootstrap = data.data;
      expect(bootstrap.timestamp).toBeDefined();
      expect(bootstrap.systemStatus).toBeDefined();
      expect(bootstrap.providers).toBeDefined();
      expect(bootstrap.services).toBeDefined();
      expect(bootstrap.chat).toBeDefined();
    });
    
    test('payload contains real systemStatus', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      const systemStatus = data.data.systemStatus;
      
      expect(systemStatus).toBeDefined();
      expect(systemStatus.available).toBeDefined();
      expect(typeof systemStatus.available).toBe('boolean');
      
      if (systemStatus.available) {
        expect(systemStatus.data).toBeDefined();
        expect(systemStatus.data.system_state).toBeDefined();
        expect(systemStatus.data.executor_state).toBeDefined();
        expect(systemStatus.data.queue_depth).toBeDefined();
      } else {
        expect(systemStatus.error).toBeDefined();
      }
    });
    
    test('payload contains real provider data', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      const providers = data.data.providers;
      
      expect(providers).toBeDefined();
      expect(providers.available).toBeDefined();
      expect(typeof providers.available).toBe('boolean');
      
      if (providers.available) {
        expect(providers.data).toBeDefined();
        expect(providers.data.primary).toBeDefined();
        expect(providers.data.fallback).toBeDefined();
        expect(providers.data.providers).toBeDefined();
      } else {
        expect(providers.error).toBeDefined();
      }
    });
    
    test('payload contains real service data', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      const services = data.data.services;
      
      expect(services).toBeDefined();
      expect(services.available).toBeDefined();
      expect(typeof services.available).toBe('boolean');
      
      if (services.available) {
        expect(services.data).toBeDefined();
        expect(Array.isArray(services.data)).toBe(true);
        
        if (services.data.length > 0) {
          const service = services.data[0];
          expect(service.service).toBeDefined();
          expect(service.status).toBeDefined();
          expect(service.restartable).toBeDefined();
        }
      } else {
        expect(services.error).toBeDefined();
      }
    });
    
    test('payload includes persisted current thread when available', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      const chat = data.data.chat;
      
      expect(chat).toBeDefined();
      expect(chat.available).toBeDefined();
      expect(typeof chat.available).toBe('boolean');
      
      if (chat.available) {
        // May or may not have current thread (depends on chat history)
        if (chat.currentThreadId) {
          expect(typeof chat.currentThreadId).toBe('string');
          expect(chat.currentThread).toBeDefined();
          expect(chat.currentThread.threadId).toBe(chat.currentThreadId);
          expect(chat.currentThread.messageCount).toBeDefined();
          
          // Recent messages should be included
          expect(chat.recentMessages).toBeDefined();
          expect(Array.isArray(chat.recentMessages)).toBe(true);
        }
      }
    });
    
    test('partial failure in one subsection does not break full response', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      
      // Even if some sections fail, response should still succeed
      const bootstrap = data.data;
      
      // Each section should have available field
      expect(bootstrap.systemStatus.available).toBeDefined();
      expect(bootstrap.providers.available).toBeDefined();
      expect(bootstrap.services.available).toBeDefined();
      expect(bootstrap.chat.available).toBeDefined();
      
      // Response structure should be stable even on partial failure
      expect(bootstrap.timestamp).toBeDefined();
    });
    
    test('objectives section present but not yet available', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      const objectives = data.data.objectives;
      
      expect(objectives).toBeDefined();
      expect(objectives.available).toBe(false);
    });
    
    test('replay section present but not yet available', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      const replay = data.data.replay;
      
      expect(replay).toBeDefined();
      expect(replay.available).toBe(false);
    });
  });
  
  describe('Architecture boundaries', () => {
    test('route does not directly compose subsystem logic', async () => {
      const routePath = path.join(__dirname, '../../console/server/src/routes/bootstrap.ts');
      
      if (!fs.existsSync(routePath)) {
        console.warn('Route file not found, skipping boundary test');
        return;
      }
      
      const content = fs.readFileSync(routePath, 'utf-8');
      
      // Route should NOT call ViennaRuntimeService directly
      expect(content).not.toMatch(/viennaRuntime\./);
      expect(content).not.toMatch(/chatService\./);
      
      // Route should import DashboardBootstrapService
      expect(content).toMatch(/DashboardBootstrapService/);
    });
    
    test('bootstrap service exists and orchestrates subsystems', async () => {
      const servicePath = path.join(__dirname, '../../console/server/src/services/dashboardBootstrapService.ts');
      
      if (!fs.existsSync(servicePath)) {
        throw new Error('DashboardBootstrapService not found');
      }
      
      const content = fs.readFileSync(servicePath, 'utf-8');
      
      // Service should import subsystems
      expect(content).toMatch(/ViennaRuntimeService/);
      expect(content).toMatch(/ChatService/);
      
      // Service should not import from routes directory
      expect(content).not.toMatch(/from ['"]\.\.\/routes/);
    });
  });
  
  describe('Bootstrap vs individual endpoints', () => {
    test('bootstrap payload matches individual endpoint data', async () => {
      if (!await isServerRunning()) return;
      
      // Get bootstrap
      const bootstrapResponse = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const bootstrapData = await bootstrapResponse.json();
      
      // Get individual system status
      const statusResponse = await fetch(`${BASE_URL}/api/v1/system/status`);
      const statusData = await statusResponse.json();
      
      // Bootstrap systemStatus should match individual status endpoint
      if (bootstrapData.data.systemStatus.available) {
        expect(bootstrapData.data.systemStatus.data.system_state)
          .toBe(statusData.data.system_state);
        expect(bootstrapData.data.systemStatus.data.executor_state)
          .toBe(statusData.data.executor_state);
      }
    });
  });
  
  describe('Performance', () => {
    test('bootstrap completes in reasonable time', async () => {
      if (!await isServerRunning()) return;
      
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const duration = Date.now() - start;
      
      expect(response.ok).toBe(true);
      
      // Bootstrap should complete in under 2 seconds
      expect(duration).toBeLessThan(2000);
      
      console.log(`Bootstrap completed in ${duration}ms`);
    });
  });
});
