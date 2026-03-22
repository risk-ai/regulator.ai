/**
 * Phase 3A: Output Collision Safety Tests
 * 
 * Validates:
 * - Canonical output naming
 * - Numeric suffix collision handling
 * - In-memory path reservation
 * - Concurrent write safety
 * - Final path verification
 */

const { OutputPathResolver } = require('../lib/execution/output-path-resolver');
const { ActionExecutor } = require('../lib/execution/action-executor');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

describe('Phase 3A: Output Collision Safety', () => {
  let testWorkspace;
  let resolver;
  let executor;
  
  beforeEach(async () => {
    // Create temporary test workspace
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'vienna-test-'));
    resolver = new OutputPathResolver(testWorkspace);
    executor = new ActionExecutor(testWorkspace);
  });
  
  afterEach(async () => {
    // Cleanup test workspace
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });
  
  describe('OutputPathResolver', () => {
    test('derives canonical summary path', () => {
      const canonical = resolver.deriveCanonicalPath('/test/file.md', 'summary');
      expect(canonical).toBe('/test/file.summary.md');
    });
    
    test('derives canonical aggregate summary path', () => {
      const canonical = resolver.deriveCanonicalPath('/test/folder', 'aggregate-summary');
      expect(canonical).toBe('/test/folder/_folder-summary.md');
    });
    
    test('derives canonical report path', () => {
      const canonical = resolver.deriveCanonicalPath('/test/data.json', 'report');
      expect(canonical).toBe('/test/data.report.json');
    });
    
    test('resolves to canonical path when no collision', async () => {
      const resolved = await resolver.resolveOutputPath({
        sourcePath: '/test/contract.md',
        purpose: 'summary',
        objectiveId: 'obj_001',
        envelopeId: 'env_001',
      });
      
      expect(resolved.finalPath).toBe('/test/contract.summary.md');
      expect(resolved.collided).toBe(false);
      expect(resolved.collisionIndex).toBe(0);
    });
    
    test('appends suffix when collision detected', async () => {
      // Create existing file
      const existingPath = path.join(testWorkspace, 'test', 'contract.summary.md');
      await fs.mkdir(path.dirname(existingPath), { recursive: true });
      await fs.writeFile(existingPath, 'existing summary');
      
      const resolved = await resolver.resolveOutputPath({
        sourcePath: '/test/contract.md',
        purpose: 'summary',
        objectiveId: 'obj_002',
        envelopeId: 'env_002',
      });
      
      expect(resolved.finalPath).toBe('/test/contract.summary-2.md');
      expect(resolved.collided).toBe(true);
      expect(resolved.collisionIndex).toBe(2);
    });
    
    test('handles multiple collisions', async () => {
      // Create existing files
      const testDir = path.join(testWorkspace, 'test');
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'contract.summary.md'), 'v1');
      await fs.writeFile(path.join(testDir, 'contract.summary-2.md'), 'v2');
      await fs.writeFile(path.join(testDir, 'contract.summary-3.md'), 'v3');
      
      const resolved = await resolver.resolveOutputPath({
        sourcePath: '/test/contract.md',
        purpose: 'summary',
        objectiveId: 'obj_003',
        envelopeId: 'env_003',
      });
      
      expect(resolved.finalPath).toBe('/test/contract.summary-4.md');
      expect(resolved.collisionIndex).toBe(4);
    });
    
    test('reserves path in memory', async () => {
      await resolver.reservePath('/test/reserved.md', 'obj_001', 'env_001');
      
      const isTaken = await resolver.isPathTaken('/test/reserved.md');
      expect(isTaken).toBe(true);
    });
    
    test('releases path reservation', async () => {
      await resolver.reservePath('/test/reserved.md', 'obj_001', 'env_001');
      await resolver.releasePath('/test/reserved.md');
      
      const isTaken = await resolver.isPathTaken('/test/reserved.md');
      expect(isTaken).toBe(false);
    });
    
    test('prevents concurrent collision', async () => {
      // Reserve a path
      await resolver.reservePath('/test/concurrent.summary.md', 'obj_001', 'env_001');
      
      // Second request should get collision-safe path
      const resolved = await resolver.resolveOutputPath({
        sourcePath: '/test/concurrent.md',
        purpose: 'summary',
        objectiveId: 'obj_002',
        envelopeId: 'env_002',
      });
      
      expect(resolved.finalPath).toBe('/test/concurrent.summary-2.md');
      expect(resolved.collided).toBe(true);
    });
    
    test('cleans up expired reservations', async () => {
      // Create resolver with short timeout
      const shortResolver = new OutputPathResolver(testWorkspace);
      shortResolver.reservationTimeoutMs = 100; // 100ms timeout
      
      await shortResolver.reservePath('/test/expiring.md', 'obj_001', 'env_001');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cleaned = shortResolver.cleanupExpiredReservations();
      expect(cleaned).toBe(1);
      
      const isTaken = await shortResolver.isPathTaken('/test/expiring.md');
      expect(isTaken).toBe(false);
    });
  });
  
  describe('ActionExecutor Integration', () => {
    test('writes file without collision', async () => {
      const envelope = {
        envelope_id: 'env_001',
        objective_id: 'obj_001',
        action_type: 'write_file',
        target: '/test.summary.md',
        input: '# Test Summary\n\nContent here.',
        params: {
          source_path: '/test.md',
          output_purpose: 'summary',
        },
      };
      
      const result = await executor.writeFile(envelope);
      
      expect(result.success).toBe(true);
      expect(result.metadata.path).toBe('/test.summary.md');
      expect(result.metadata.collided).toBe(false);
      
      // Verify file exists
      const writtenPath = path.join(testWorkspace, 'test.summary.md');
      const exists = await fs.access(writtenPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
    
    test('writes file with collision suffix', async () => {
      // Create existing file
      const existingPath = path.join(testWorkspace, 'test.summary.md');
      await fs.writeFile(existingPath, 'existing content');
      
      const envelope = {
        envelope_id: 'env_002',
        objective_id: 'obj_002',
        action_type: 'write_file',
        target: '/test.summary.md',
        input: '# New Summary\n\nNew content.',
        params: {
          source_path: '/test.md',
          output_purpose: 'summary',
        },
      };
      
      const result = await executor.writeFile(envelope);
      
      expect(result.success).toBe(true);
      expect(result.metadata.path).toBe('/test.summary-2.md');
      expect(result.metadata.collided).toBe(true);
      expect(result.metadata.collision_index).toBe(2);
      
      // Verify collision-safe file exists
      const newPath = path.join(testWorkspace, 'test.summary-2.md');
      const exists = await fs.access(newPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Verify original file unchanged
      const originalContent = await fs.readFile(existingPath, 'utf-8');
      expect(originalContent).toBe('existing content');
    });
    
    test('verification uses resolved path', async () => {
      // Write with collision
      const existingPath = path.join(testWorkspace, 'test.summary.md');
      await fs.writeFile(existingPath, 'existing');
      
      const writeEnvelope = {
        envelope_id: 'env_003',
        objective_id: 'obj_003',
        action_type: 'write_file',
        target: '/test.summary.md',
        input: 'new content',
        params: {
          source_path: '/test.md',
          output_purpose: 'summary',
        },
      };
      
      const writeResult = await executor.writeFile(writeEnvelope);
      const finalPath = writeResult.metadata.path;
      
      // Verify using final path
      const verifyEnvelope = {
        envelope_id: 'env_004',
        objective_id: 'obj_003',
        action_type: 'verify_write',
        target: '/test.summary.md', // Original target
        params: {
          final_path: finalPath, // Pass resolved path
        },
      };
      
      const verifyResult = await executor.verifyWrite(verifyEnvelope);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.metadata.verified).toBe(true);
      expect(verifyResult.metadata.path).toBe(finalPath);
    });
  });
  
  describe('Collision Safety Guarantees', () => {
    test('never overwrites existing files', async () => {
      // Create original file
      const originalPath = path.join(testWorkspace, 'important.summary.md');
      const originalContent = 'IMPORTANT: Do not lose this content';
      await fs.writeFile(originalPath, originalContent);
      
      // Attempt to write to same target
      const envelope = {
        envelope_id: 'env_005',
        objective_id: 'obj_005',
        action_type: 'write_file',
        target: '/important.summary.md',
        input: 'New content that should not overwrite',
        params: {
          source_path: '/important.md',
          output_purpose: 'summary',
        },
      };
      
      const result = await executor.writeFile(envelope);
      
      // Verify collision-safe path was used
      expect(result.metadata.path).toBe('/important.summary-2.md');
      
      // Verify original file unchanged
      const preservedContent = await fs.readFile(originalPath, 'utf-8');
      expect(preservedContent).toBe(originalContent);
    });
  });
});
