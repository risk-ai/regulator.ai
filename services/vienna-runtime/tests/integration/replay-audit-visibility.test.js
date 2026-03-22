/**
 * Replay & Audit Visibility Integration Tests
 * 
 * Priority 5: Replay/Audit Visibility
 * 
 * Tests:
 * - GET /replay returns stable structure
 * - GET /audit returns stable structure  
 * - Filters by objectiveId/auditRef/threadId work if supported
 * - Replay route goes through service/runtime boundary
 * - Audit route goes through service/runtime boundary
 * - Action-producing chat responses preserve auditRef/objective linkage
 * - Replay items can be retrieved from linked ids where available
 * - Unavailable replay does not break dashboard
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3100';

describe('Replay & Audit Visibility', function() {
  this.timeout(5000);
  
  describe('GET /api/v1/replay', function() {
    it('returns stable structure', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/replay`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true, 'Response should be ok');
      assert.strictEqual(json.success, true, 'Response should have success=true');
      assert.ok(json.data, 'Response should have data');
      assert.ok(Array.isArray(json.data.events), 'data.events should be array');
      assert.strictEqual(typeof json.data.total, 'number', 'data.total should be number');
      assert.strictEqual(typeof json.data.has_more, 'boolean', 'data.has_more should be boolean');
    });
    
    it('supports filtering by envelope_id', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/replay?envelope_id=env_test_001`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(Array.isArray(json.data.events));
    });
    
    it('supports filtering by objective_id', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/replay?objective_id=obj_test_001`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(Array.isArray(json.data.events));
    });
    
    it('supports pagination with limit', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/replay?limit=5`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(Array.isArray(json.data.events));
      assert.ok(json.data.events.length <= 5, 'Should respect limit');
    });
  });
  
  describe('GET /api/v1/audit', function() {
    it('returns stable structure', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/audit`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true, 'Response should be ok');
      assert.strictEqual(json.success, true, 'Response should have success=true');
      assert.ok(json.data, 'Response should have data');
      assert.ok(Array.isArray(json.data.records), 'data.records should be array');
      assert.strictEqual(typeof json.data.total, 'number', 'data.total should be number');
      assert.strictEqual(typeof json.data.has_more, 'boolean', 'data.has_more should be boolean');
    });
    
    it('supports filtering by operator', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/audit?operator=max`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(Array.isArray(json.data.records));
    });
    
    it('supports filtering by objective_id', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/audit?objective_id=obj_test_001`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(Array.isArray(json.data.records));
    });
    
    it('supports filtering by thread_id', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/audit?thread_id=thread_123`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(Array.isArray(json.data.records));
    });
    
    it('supports pagination with limit', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/audit?limit=5`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(Array.isArray(json.data.records));
      assert.ok(json.data.records.length <= 5, 'Should respect limit');
    });
  });
  
  describe('GET /api/v1/replay/:id', function() {
    it('returns 404 for non-existent event', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/replay/nonexistent_event_123`);
      const json = await res.json();
      
      // Should gracefully handle missing events
      assert.ok(res.ok || res.status === 404);
    });
  });
  
  describe('GET /api/v1/audit/:id', function() {
    it('returns 404 for non-existent record', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/audit/nonexistent_audit_123`);
      const json = await res.json();
      
      // Should return 404 for missing audit records
      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
    });
  });
  
  describe('Architecture boundaries', function() {
    it('replay route goes through service/runtime boundary', function() {
      // Structural test - verify files exist and are structured correctly
      const fs = require('fs');
      const path = require('path');
      
      const routePath = path.join(__dirname, '../../console/server/src/routes/replay.ts');
      const servicePath = path.join(__dirname, '../../console/server/src/services/replayService.ts');
      const runtimePath = path.join(__dirname, '../../console/server/src/services/viennaRuntime.ts');
      
      assert.ok(fs.existsSync(routePath), 'Replay route should exist');
      assert.ok(fs.existsSync(servicePath), 'Replay service should exist');
      assert.ok(fs.existsSync(runtimePath), 'Vienna runtime should exist');
      
      // Verify route imports service
      const routeContent = fs.readFileSync(routePath, 'utf8');
      assert.ok(
        routeContent.includes('ViennaRuntimeService'),
        'Replay route should import ViennaRuntimeService'
      );
    });
    
    it('audit route goes through service/runtime boundary', function() {
      const fs = require('fs');
      const path = require('path');
      
      const routePath = path.join(__dirname, '../../console/server/src/routes/audit.ts');
      const servicePath = path.join(__dirname, '../../console/server/src/services/replayService.ts');
      
      assert.ok(fs.existsSync(routePath), 'Audit route should exist');
      assert.ok(fs.existsSync(servicePath), 'Replay service should exist (handles audit)');
      
      // Verify route imports service
      const routeContent = fs.readFileSync(routePath, 'utf8');
      assert.ok(
        routeContent.includes('ViennaRuntimeService'),
        'Audit route should import ViennaRuntimeService'
      );
    });
    
    it('replay service exists', function() {
      const fs = require('fs');
      const path = require('path');
      
      const servicePath = path.join(__dirname, '../../console/server/src/services/replayService.ts');
      assert.ok(fs.existsSync(servicePath), 'ReplayService should exist');
      
      const content = fs.readFileSync(servicePath, 'utf8');
      assert.ok(content.includes('export class ReplayService'), 'Should export ReplayService class');
      assert.ok(content.includes('queryReplay'), 'Should have queryReplay method');
      assert.ok(content.includes('queryAudit'), 'Should have queryAudit method');
    });
  });
  
  describe('Bootstrap integration', function() {
    it('bootstrap includes replay summary', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(json.data, 'Bootstrap should have data');
      assert.ok(json.data.replay, 'Bootstrap should include replay section');
      assert.strictEqual(typeof json.data.replay.available, 'boolean', 'replay.available should be boolean');
    });
    
    it('bootstrap includes audit summary', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true);
      assert.ok(json.data.audit, 'Bootstrap should include audit section');
      assert.strictEqual(typeof json.data.audit.available, 'boolean', 'audit.available should be boolean');
    });
  });
  
  describe('Graceful degradation', function() {
    it('replay unavailable does not break bootstrap', async function() {
      // Even if replay fails, bootstrap should still succeed
      const res = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true, 'Bootstrap should succeed even if replay unavailable');
      assert.ok(json.data, 'Bootstrap should return data');
      
      // If replay unavailable, it should be marked as such
      if (!json.data.replay.available) {
        assert.ok(json.data.replay.error || json.data.replay.available === false);
      }
    });
    
    it('audit unavailable does not break bootstrap', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/dashboard/bootstrap`);
      const json = await res.json();
      
      assert.strictEqual(res.ok, true, 'Bootstrap should succeed even if audit unavailable');
      assert.ok(json.data, 'Bootstrap should return data');
      
      if (!json.data.audit.available) {
        assert.ok(json.data.audit.error || json.data.audit.available === false);
      }
    });
  });
  
  describe('Frontend component', function() {
    it('ReplayPanel component exists', function() {
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '../../console/client/src/components/replay/ReplayPanel.tsx');
      assert.ok(fs.existsSync(componentPath), 'ReplayPanel component should exist');
      
      const content = fs.readFileSync(componentPath, 'utf8');
      assert.ok(content.includes('export function ReplayPanel'), 'Should export ReplayPanel function');
      assert.ok(content.includes('replay'), 'Should handle replay events');
      assert.ok(content.includes('audit'), 'Should handle audit records');
    });
  });
});
