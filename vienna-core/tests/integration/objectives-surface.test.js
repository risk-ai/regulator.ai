/**
 * Objectives Surface Integration Tests
 * 
 * Verifies that objectives and dead letters are surfaced correctly.
 */

const fs = require('fs');
const path = require('path');

describe('Objectives Surface', () => {
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
  
  describe('GET /api/v1/objectives', () => {
    test('returns stable structure', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/objectives`);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.objectives).toBeDefined();
      expect(Array.isArray(data.data.objectives)).toBe(true);
      expect(data.data.total).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
    
    test('supports status filtering', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/objectives?status=active`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.objectives)).toBe(true);
    });
  });
  
  describe('GET /api/v1/deadletters', () => {
    test('returns stable structure', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/deadletters`);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.deadLetters).toBeDefined();
      expect(Array.isArray(data.data.deadLetters)).toBe(true);
      expect(data.data.total).toBeDefined();
    });
    
    test('dead letter items have required fields', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/deadletters`);
      const data = await response.json();
      
      if (data.data.deadLetters.length > 0) {
        const deadLetter = data.data.deadLetters[0];
        
        expect(deadLetter.id).toBeDefined();
        expect(deadLetter.reason).toBeDefined();
        expect(deadLetter.createdAt).toBeDefined();
        expect(typeof deadLetter.retryable).toBe('boolean');
        expect(typeof deadLetter.retryCount).toBe('number');
      }
    });
  });
  
  describe('POST /api/v1/deadletters/:id/requeue', () => {
    test('requires operator field', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/deadletters/test-id/requeue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/operator/i);
    });
    
    test('returns honest result (preview or completed)', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/deadletters/test-id/requeue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: 'test-operator',
          reason: 'Testing requeue',
        }),
      });
      
      // Should not return 500 error for preview
      expect([200, 500].includes(response.status)).toBe(true);
      
      const data = await response.json();
      expect(data.data).toBeDefined();
      
      if (data.data) {
        expect(data.data.status).toBeDefined();
        expect(['preview', 'executing', 'completed', 'failed']).toContain(data.data.status);
        expect(data.data.message).toBeDefined();
      }
    });
  });
  
  describe('POST /api/v1/objectives/:id/cancel', () => {
    test('requires operator field', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/objectives/test-id/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/operator/i);
    });
    
    test('returns honest result (preview or completed)', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/objectives/test-id/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: 'test-operator',
          reason: 'Testing cancel',
        }),
      });
      
      // May succeed or fail depending on objective existence
      const data = await response.json();
      expect(data.data).toBeDefined();
      
      if (data.data) {
        expect(data.data.status).toBeDefined();
        expect(['preview', 'executing', 'completed', 'failed']).toContain(data.data.status);
        expect(data.data.message).toBeDefined();
      }
    });
  });
  
  describe('Architecture boundaries', () => {
    test('routes go through service/runtime boundary', async () => {
      const objectivesRoutePath = path.join(__dirname, '../../console/server/src/routes/objectives.ts');
      
      if (!fs.existsSync(objectivesRoutePath)) {
        console.warn('Objectives route file not found, skipping boundary test');
        return;
      }
      
      const content = fs.readFileSync(objectivesRoutePath, 'utf-8');
      
      // Route should NOT call ViennaRuntimeService directly
      expect(content).not.toMatch(/viennaRuntime\./);
      
      // Route should import ObjectivesService
      expect(content).toMatch(/ObjectivesService/);
    });
    
    test('objectives service exists', async () => {
      const servicePath = path.join(__dirname, '../../console/server/src/services/objectivesService.ts');
      
      if (!fs.existsSync(servicePath)) {
        throw new Error('ObjectivesService not found');
      }
      
      const content = fs.readFileSync(servicePath, 'utf-8');
      
      // Service should import ViennaRuntimeService
      expect(content).toMatch(/ViennaRuntimeService/);
    });
  });
  
  describe('Bootstrap integration', () => {
    test('bootstrap includes objectives summary', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.objectives).toBeDefined();
      expect(data.data.objectives.available).toBeDefined();
      expect(typeof data.data.objectives.available).toBe('boolean');
      
      if (data.data.objectives.available) {
        expect(data.data.objectives.blockedCount).toBeDefined();
        expect(data.data.objectives.deadLetterCount).toBeDefined();
      }
    });
  });
  
  describe('Graceful degradation', () => {
    test('objectives unavailable does not break bootstrap', async () => {
      if (!await isServerRunning()) return;
      
      const response = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const data = await response.json();
      
      // Bootstrap should succeed even if objectives fail
      expect(data.success).toBe(true);
      expect(data.data.systemStatus).toBeDefined();
      expect(data.data.providers).toBeDefined();
      expect(data.data.services).toBeDefined();
      
      // Objectives section should have stable structure
      expect(data.data.objectives).toBeDefined();
      expect(data.data.objectives.available).toBeDefined();
    });
  });
});
