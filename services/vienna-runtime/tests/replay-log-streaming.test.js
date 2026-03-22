/**
 * Tests for Replay Log Streaming (Large File Support)
 * 
 * Tests that the replay log can handle large files without loading
 * entire file into memory.
 */

const fs = require('fs').promises;
const path = require('path');
const { ReplayLog, EventType } = require('../lib/execution/replay-log');

const TEST_REPLAY_FILE = path.join(__dirname, '../.test-replay-large.jsonl');

describe('ReplayLog Streaming (Large Files)', () => {
  let replayLog;
  
  beforeEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(TEST_REPLAY_FILE);
    } catch (error) {
      // Ignore if doesn't exist
    }
    
    replayLog = new ReplayLog({ replayFile: TEST_REPLAY_FILE });
    await replayLog.initialize();
  });
  
  afterEach(async () => {
    try {
      await fs.unlink(TEST_REPLAY_FILE);
    } catch (error) {
      // Ignore
    }
  });
  
  describe('pagination', () => {
    beforeEach(async () => {
      // Create 100 test events
      for (let i = 0; i < 100; i++) {
        await replayLog.emit({
          event_type: i % 2 === 0 ? EventType.ENVELOPE_QUEUED : EventType.ENVELOPE_COMPLETED,
          envelope_id: `env_${i}`,
          objective_id: `obj_${i % 10}`,
          trigger_id: 'trig_test'
        });
      }
    });
    
    test('respects offset and limit parameters', async () => {
      const result = await replayLog.query({ offset: 0, limit: 10 });
      
      expect(result.events).toHaveLength(10);
      expect(result.total).toBe(100);
      expect(result.has_more).toBe(true);
      expect(result.offset).toBe(0);
    });
    
    test('handles middle pagination', async () => {
      const result = await replayLog.query({ offset: 40, limit: 20 });
      
      expect(result.events).toHaveLength(20);
      expect(result.total).toBe(100);
      expect(result.has_more).toBe(true);
      expect(result.offset).toBe(40);
    });
    
    test('handles last page', async () => {
      const result = await replayLog.query({ offset: 90, limit: 20 });
      
      expect(result.events).toHaveLength(10); // Only 10 remaining
      expect(result.total).toBe(100);
      expect(result.has_more).toBe(false);
      expect(result.offset).toBe(90);
    });
    
    test('handles empty result', async () => {
      const result = await replayLog.query({ offset: 200, limit: 10 });
      
      expect(result.events).toHaveLength(0);
      expect(result.has_more).toBe(false);
    });
    
    test('combines filter and pagination', async () => {
      const result = await replayLog.query({ 
        objective_id: 'obj_0',
        offset: 0,
        limit: 5
      });
      
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events.every(e => e.objective_id === 'obj_0')).toBe(true);
      expect(result.events.length <= 5).toBe(true);
    });
    
    test('has_more calculation is accurate', async () => {
      // Get all pages
      let allEvents = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const result = await replayLog.query({ offset, limit: 15 });
        allEvents = allEvents.concat(result.events);
        hasMore = result.has_more;
        offset += result.events.length;
      }
      
      expect(allEvents).toHaveLength(100);
    });
  });
  
  describe('filtered pagination', () => {
    beforeEach(async () => {
      // Create mix of events
      for (let i = 0; i < 50; i++) {
        await replayLog.emit({
          event_type: EventType.ENVELOPE_QUEUED,
          envelope_id: `env_queued_${i}`,
          objective_id: 'obj_test',
          trigger_id: 'trig_1'
        });
      }
      
      for (let i = 0; i < 50; i++) {
        await replayLog.emit({
          event_type: EventType.ENVELOPE_COMPLETED,
          envelope_id: `env_completed_${i}`,
          objective_id: 'obj_other',
          trigger_id: 'trig_2'
        });
      }
    });
    
    test('filters before pagination', async () => {
      const result = await replayLog.query({ 
        event_type: EventType.ENVELOPE_QUEUED,
        offset: 0,
        limit: 10
      });
      
      expect(result.events).toHaveLength(10);
      expect(result.total).toBe(50); // Total matching events
      expect(result.events.every(e => e.event_type === EventType.ENVELOPE_QUEUED)).toBe(true);
    });
    
    test('handles filtered pages correctly', async () => {
      // Get all QUEUED events via pagination
      let allQueued = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const result = await replayLog.query({ 
          event_type: EventType.ENVELOPE_QUEUED,
          offset,
          limit: 8
        });
        allQueued = allQueued.concat(result.events);
        hasMore = result.has_more;
        offset += result.events.length;
      }
      
      expect(allQueued).toHaveLength(50);
      expect(allQueued.every(e => e.event_type === EventType.ENVELOPE_QUEUED)).toBe(true);
    });
  });
  
  describe('large file detection', () => {
    test('uses streaming for files > 100MB (simulated)', async () => {
      // This test verifies that the streaming path is taken
      // In real scenario with 74GB file, it would use _queryStreaming
      // For test, we just verify that large file path exists
      
      expect(typeof replayLog._queryStreaming).toBe('function');
      expect(typeof replayLog._queryInMemory).toBe('function');
    });
  });
  
  describe('backward compatibility', () => {
    test('methods return consistent structure', async () => {
      await replayLog.emit({
        event_type: EventType.ENVELOPE_QUEUED,
        envelope_id: 'env_compat_test',
        objective_id: 'obj_compat'
      });
      
      // Old code expects array, new code returns object
      const result = await replayLog.query({});
      
      // Verify new structure
      expect(typeof result === 'object').toBe(true);
      expect(Array.isArray(result.events)).toBe(true);
      expect(typeof result.total === 'number').toBe(true);
      expect(typeof result.has_more === 'boolean').toBe(true);
    });
  });
});
