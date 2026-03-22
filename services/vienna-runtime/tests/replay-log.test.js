/**
 * Tests for Replay Log
 */

const fs = require('fs').promises;
const path = require('path');
const { ReplayLog, EventType } = require('../lib/execution/replay-log');

const TEST_REPLAY_FILE = path.join(__dirname, '../.test-replay.jsonl');

describe('ReplayLog', () => {
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
  
  describe('emit', () => {
    test('writes event to log file', async () => {
      await replayLog.emit({
        event_type: EventType.ENVELOPE_QUEUED,
        envelope_id: 'env_123',
        objective_id: 'obj_123',
        trigger_id: 'trig_123'
      });
      
      const content = await fs.readFile(TEST_REPLAY_FILE, 'utf8');
      expect(content).toContain('env_123');
      expect(content).toContain(EventType.ENVELOPE_QUEUED);
    });
    
    test('generates event_id and timestamp', async () => {
      await replayLog.emit({
        event_type: EventType.ENVELOPE_COMPLETED,
        envelope_id: 'env_456'
      });
      
      const result = await replayLog.query({});
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toHaveProperty('event_id');
      expect(result.events[0]).toHaveProperty('timestamp');
      expect(result.events[0].event_id).toMatch(/^evt_/);
    });
  });
  
  describe('query', () => {
    beforeEach(async () => {
      // Seed with test events
      await replayLog.emit({
        event_type: EventType.ENVELOPE_QUEUED,
        envelope_id: 'env_1',
        objective_id: 'obj_A',
        trigger_id: 'trig_X',
        causal_depth: 0
      });
      
      await replayLog.emit({
        event_type: EventType.ENVELOPE_EXECUTING,
        envelope_id: 'env_1',
        objective_id: 'obj_A',
        trigger_id: 'trig_X'
      });
      
      await replayLog.emit({
        event_type: EventType.ENVELOPE_COMPLETED,
        envelope_id: 'env_1',
        objective_id: 'obj_A',
        trigger_id: 'trig_X'
      });
      
      await replayLog.emit({
        event_type: EventType.ENVELOPE_QUEUED,
        envelope_id: 'env_2',
        objective_id: 'obj_B',
        trigger_id: 'trig_Y',
        causal_depth: 1
      });
    });
    
    test('returns paginated results with metadata', async () => {
      const result = await replayLog.query({});
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('has_more');
      expect(result).toHaveProperty('offset');
      expect(result.events).toHaveLength(4);
      expect(result.total).toBe(4);
      expect(result.has_more).toBe(false);
    });
    
    test('filters by objective_id', async () => {
      const result = await replayLog.query({ objective_id: 'obj_A' });
      expect(result.events).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.events.every(e => e.objective_id === 'obj_A')).toBe(true);
    });
    
    test('filters by trigger_id', async () => {
      const result = await replayLog.query({ trigger_id: 'trig_X' });
      expect(result.events).toHaveLength(3);
      expect(result.total).toBe(3);
    });
    
    test('filters by envelope_id', async () => {
      const result = await replayLog.query({ envelope_id: 'env_2' });
      expect(result.events).toHaveLength(1);
      expect(result.events[0].envelope_id).toBe('env_2');
    });
    
    test('supports envelope_id wildcard', async () => {
      const result = await replayLog.query({ envelope_id: 'env_*' });
      expect(result.events).toHaveLength(4);
      expect(result.total).toBe(4);
    });
    
    test('filters by event_type', async () => {
      const result = await replayLog.query({ 
        event_type: EventType.ENVELOPE_COMPLETED 
      });
      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);
    });
    
    test('filters by causal_depth_gte', async () => {
      const result = await replayLog.query({ causal_depth_gte: 1 });
      expect(result.events).toHaveLength(1);
      expect(result.events[0].causal_depth).toBe(1);
    });
    
    test('supports pagination with offset and limit', async () => {
      const result1 = await replayLog.query({ offset: 0, limit: 2 });
      expect(result1.events).toHaveLength(2);
      expect(result1.total).toBe(4);
      expect(result1.has_more).toBe(true);
      expect(result1.offset).toBe(0);
      
      const result2 = await replayLog.query({ offset: 2, limit: 2 });
      expect(result2.events).toHaveLength(2);
      expect(result2.has_more).toBe(false);
      expect(result2.offset).toBe(2);
    });
    
    test('filters by time_range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10000);
      const future = new Date(now.getTime() + 10000);
      
      const result = await replayLog.query({ 
        time_range: [past, future] 
      });
      
      expect(result.events).toHaveLength(4);
      expect(result.total).toBe(4);
    });
    
    test('returns empty result for non-existent log', async () => {
      const newLog = new ReplayLog({ replayFile: '/tmp/nonexistent-replay.jsonl' });
      await newLog.initialize();
      
      const result = await newLog.query({});
      expect(result.events).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.has_more).toBe(false);
    });
  });
  
  describe('getObjectiveEvents', () => {
    test('returns all events for objective', async () => {
      await replayLog.emit({
        event_type: EventType.ENVELOPE_QUEUED,
        envelope_id: 'env_1',
        objective_id: 'obj_test'
      });
      
      await replayLog.emit({
        event_type: EventType.ENVELOPE_COMPLETED,
        envelope_id: 'env_1',
        objective_id: 'obj_test'
      });
      
      const events = await replayLog.getObjectiveEvents('obj_test');
      expect(events).toHaveLength(2);
      expect(events.every(e => e.objective_id === 'obj_test')).toBe(true);
    });
  });
  
  describe('getMetrics', () => {
    beforeEach(async () => {
      await replayLog.emit({
        event_type: EventType.ENVELOPE_QUEUED,
        envelope_id: 'env_1',
        trigger_id: 'trig_test'
      });
      
      // Wait a bit to create latency
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await replayLog.emit({
        event_type: EventType.ENVELOPE_COMPLETED,
        envelope_id: 'env_1',
        trigger_id: 'trig_test'
      });
      
      await replayLog.emit({
        event_type: EventType.ENVELOPE_QUEUED,
        envelope_id: 'env_2',
        trigger_id: 'trig_test'
      });
      
      await replayLog.emit({
        event_type: EventType.ENVELOPE_FAILED,
        envelope_id: 'env_2',
        trigger_id: 'trig_test'
      });
      
      await replayLog.emit({
        event_type: EventType.RECURSION_REJECTED,
        envelope_id: 'env_3',
        trigger_id: 'trig_test'
      });
    });
    
    test('computes execution metrics', async () => {
      const metrics = await replayLog.getMetrics({ trigger_id: 'trig_test' });
      
      expect(metrics.total_events).toBe(5);
      expect(metrics.completed_count).toBe(1);
      expect(metrics.failed_count).toBe(1);
      expect(metrics.recursion_rejected_count).toBe(1);
      expect(metrics.failure_rate).toBeCloseTo(0.5);
      expect(metrics.avg_latency_ms).toBeGreaterThan(0);
    });
  });
});
