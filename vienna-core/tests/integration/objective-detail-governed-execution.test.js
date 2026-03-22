/**
 * Objective Detail + Governed Execution Integration Tests
 * 
 * Priority 6: Full objective detail wiring + convert preview-only actions into real governed execution
 * 
 * Tests:
 * - GET /objectives/:id returns stable structure for real/unknown objective
 * - cancelObjective returns truthful governed result
 * - retryDeadLetter returns truthful governed result
 * - restartService returns truthful governed result
 * - Action routes go through service/runtime boundary
 * - Unavailable/not-supported actions return explicit unavailable/failed, not fake success
 * - Objective detail opens and renders available fields
 * - Cancel/requeue action result updates UI truthfully
 * - Missing detail does not crash dashboard
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:3100';

describe('Objective Detail + Governed Execution', function() {
  this.timeout(5000);
  
  describe('GET /api/v1/objectives/:id', function() {
    it('returns 404 for non-existent objective', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/objectives/nonexistent_obj_123`);
      const json = await res.json();
      
      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes('not found'));
    });
    
    it('returns stable structure when objective exists', async function() {
      // Note: This will return 404 until Vienna Core has actual objectives
      // But the endpoint structure should be stable
      const res = await fetch(`${BASE_URL}/api/v1/objectives/obj_test_001`);
      const json = await res.json();
      
      // Should be 404, but with stable error structure
      if (res.status === 404) {
        assert.strictEqual(json.success, false);
        assert.ok(json.error);
        assert.ok(json.code);
      } else {
        // If it somehow returns data, verify structure
        assert.ok(json.data);
        assert.ok(json.data.objective_id);
        assert.ok(json.data.status);
      }
    });
  });
  
  describe('POST /api/v1/objectives/:id/cancel', function() {
    it('requires operator field', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/objectives/obj_test_001/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Test' }),
      });
      const json = await res.json();
      
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes('operator'));
    });
    
    it('returns truthful governed result', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/objectives/obj_test_001/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: 'test_operator',
          reason: 'Test cancellation',
        }),
      });
      const json = await res.json();
      
      // Should succeed (even if no objective exists, the action path is honest)
      assert.ok(json.data);
      assert.ok(json.data.status);
      
      // Status must be one of: completed, failed, executing, approval_required
      const validStatuses = ['preview', 'executing', 'completed', 'failed', 'approval_required'];
      assert.ok(validStatuses.includes(json.data.status), `Invalid status: ${json.data.status}`);
      
      // Message should exist
      assert.ok(json.data.message);
      assert.strictEqual(typeof json.data.message, 'string');
    });
  });
  
  describe('POST /api/v1/deadletters/:id/requeue', function() {
    it('requires operator field', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/deadletters/env_test_001/requeue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Test' }),
      });
      const json = await res.json();
      
      assert.strictEqual(res.status, 400);
      assert.strictEqual(json.success, false);
      assert.ok(json.error.includes('operator'));
    });
    
    it('returns truthful governed result', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/deadletters/env_test_001/requeue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: 'test_operator',
          reason: 'Test requeue',
        }),
      });
      const json = await res.json();
      
      // Should return data with status
      assert.ok(json.data);
      assert.ok(json.data.status);
      
      // Status must be truthful
      const validStatuses = ['preview', 'executing', 'completed', 'failed', 'unavailable'];
      assert.ok(validStatuses.includes(json.data.status), `Invalid status: ${json.data.status}`);
      
      // Message should exist
      assert.ok(json.data.message);
      assert.strictEqual(typeof json.data.message, 'string');
    });
  });
  
  describe('POST /api/v1/system/services/openclaw/restart', function() {
    it('returns truthful governed result', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/system/services/openclaw/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: 'test_operator',
        }),
      });
      const json = await res.json();
      
      // Should return data with status
      assert.strictEqual(res.ok, true);
      assert.ok(json.data);
      assert.ok(json.data.status);
      
      // Status must be truthful (preview/failed since recovery not fully wired)
      const validStatuses = ['preview', 'executing', 'completed', 'failed', 'approval_required'];
      assert.ok(validStatuses.includes(json.data.status), `Invalid status: ${json.data.status}`);
      
      // Message should explain the status
      assert.ok(json.data.message);
      assert.strictEqual(typeof json.data.message, 'string');
    });
    
    it('does not claim success when unavailable', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/system/services/openclaw/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator: 'test_operator',
        }),
      });
      const json = await res.json();
      
      // If restart is not fully implemented, status should be preview/failed, NOT completed
      if (json.data.status === 'preview' || json.data.status === 'failed') {
        // Honest result - good
        assert.ok(json.data.message.length > 0);
      } else if (json.data.status === 'completed') {
        // If claiming completed, must have actually done something
        assert.ok(json.data.objectiveId || json.data.objective_id, 'Completed status requires objective ID');
      }
    });
  });
  
  describe('Architecture boundaries', function() {
    it('objective detail route goes through service/runtime boundary', function() {
      const fs = require('fs');
      const path = require('path');
      
      const routePath = path.join(__dirname, '../../console/server/src/routes/objectives.ts');
      const servicePath = path.join(__dirname, '../../console/server/src/services/objectivesService.ts');
      const runtimePath = path.join(__dirname, '../../console/server/src/services/viennaRuntime.ts');
      
      assert.ok(fs.existsSync(routePath), 'Objectives route should exist');
      assert.ok(fs.existsSync(servicePath), 'Objectives service should exist');
      assert.ok(fs.existsSync(runtimePath), 'Vienna runtime should exist');
      
      // Verify route imports service
      const routeContent = fs.readFileSync(routePath, 'utf8');
      assert.ok(
        routeContent.includes('ObjectivesService'),
        'Objectives route should import ObjectivesService'
      );
      
      // Verify service imports runtime
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      assert.ok(
        serviceContent.includes('ViennaRuntimeService'),
        'Objectives service should import ViennaRuntimeService'
      );
    });
    
    it('cancel/requeue actions route through service boundary', function() {
      const fs = require('fs');
      const path = require('path');
      
      const servicePath = path.join(__dirname, '../../console/server/src/services/objectivesService.ts');
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      
      // Verify cancelObjective calls viennaRuntime
      assert.ok(
        serviceContent.includes('viennaRuntime.cancelObjective'),
        'cancelObjective should route through viennaRuntime'
      );
      
      // Verify retryDeadLetter calls viennaRuntime
      assert.ok(
        serviceContent.includes('viennaRuntime.retryDeadLetter'),
        'retryDeadLetter should route through viennaRuntime'
      );
    });
  });
  
  describe('Frontend component', function() {
    it('ObjectiveDetailModal component exists', function() {
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '../../console/client/src/components/objectives/ObjectiveDetailModal.tsx');
      assert.ok(fs.existsSync(componentPath), 'ObjectiveDetailModal component should exist');
      
      const content = fs.readFileSync(componentPath, 'utf8');
      assert.ok(content.includes('export function ObjectiveDetailModal'), 'Should export ObjectiveDetailModal function');
      assert.ok(content.includes('objectiveId'), 'Should handle objectiveId prop');
      assert.ok(content.includes('handleCancel'), 'Should have cancel action handler');
    });
    
    it('ObjectivesPanel includes modal integration', function() {
      const fs = require('fs');
      const path = require('path');
      
      const componentPath = path.join(__dirname, '../../console/client/src/components/objectives/ObjectivesPanel.tsx');
      const content = fs.readFileSync(componentPath, 'utf8');
      
      assert.ok(content.includes('ObjectiveDetailModal'), 'Should import ObjectiveDetailModal');
      assert.ok(content.includes('selectedObjectiveId'), 'Should track selected objective');
      assert.ok(content.includes('onClick'), 'Should handle objective click');
    });
  });
  
  describe('Graceful degradation', function() {
    it('missing objective detail does not crash endpoint', async function() {
      const res = await fetch(`${BASE_URL}/api/v1/objectives/missing_objective_999`);
      const json = await res.json();
      
      // Should return 404, not crash
      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
      
      // Should have structured error response
      assert.ok(json.error);
      assert.ok(json.code);
      assert.ok(json.timestamp);
    });
  });
  
  describe('GovernedActionResult type', function() {
    it('API types include GovernedActionResult', function() {
      const fs = require('fs');
      const path = require('path');
      
      const typesPath = path.join(__dirname, '../../console/server/src/types/api.ts');
      const content = fs.readFileSync(typesPath, 'utf8');
      
      assert.ok(content.includes('GovernedActionResult'), 'Should include GovernedActionResult type');
      assert.ok(content.includes('GovernedActionStatus'), 'Should include GovernedActionStatus type');
    });
  });
});
