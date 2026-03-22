/**
 * Phase 3B: Failure Isolation for Fanout Operations Tests
 * 
 * Validates:
 * - Fanout execution over multiple items
 * - Per-item failure containment
 * - Partial success results
 * - Dead letter creation for failures
 * - Continue-on-error policy
 * - Aggregation of successful outputs
 */

const { FanoutExecutor } = require('../lib/execution/fanout-executor');
const { ActionExecutor } = require('../lib/execution/action-executor');
const { DeadLetterQueue } = require('../lib/execution/dead-letter-queue');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

describe('Phase 3B: Failure Isolation for Fanout Operations', () => {
  let testWorkspace;
  let executor;
  let dlq;
  let fanoutExecutor;
  
  beforeEach(async () => {
    // Create temporary test workspace (unique per test)
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'vienna-test-'));
    
    // Create dead letter queue with unique file per test
    const dlqFile = path.join(testWorkspace, 'dlq', 'dead-letters.jsonl');
    dlq = new DeadLetterQueue({
      dlqFile,
    });
    await dlq.initialize();
    
    // Create executor with DLQ
    executor = new ActionExecutor(testWorkspace, dlq);
    fanoutExecutor = executor.fanoutExecutor;
  });
  
  afterEach(async () => {
    // Cleanup test workspace
    await fs.rm(testWorkspace, { recursive: true, force: true });
  });
  
  describe('FanoutExecutor', () => {
    test('executes fanout over multiple items successfully', async () => {
      // Create test files
      const files = ['file1.md', 'file2.md', 'file3.md'];
      for (const file of files) {
        const filePath = path.join(testWorkspace, file);
        await fs.writeFile(filePath, `Content of ${file}`);
      }
      
      const envelope = {
        envelope_id: 'env_fanout_001',
        objective_id: 'obj_001',
        action_type: 'read_file',
        fanout: true,
        params: {},
      };
      
      const items = files.map(f => `/${f}`);
      const result = await fanoutExecutor.executeFanout(envelope, items);
      
      expect(result.success).toBe(true);
      expect(result.fanout).toBe(true);
      expect(result.metadata.total_items).toBe(3);
      expect(result.metadata.succeeded_count).toBe(3);
      expect(result.metadata.failed_count).toBe(0);
      expect(result.metadata.success_rate).toBe(1.0);
      expect(result.output).toHaveLength(3);
    });
    
    test('isolates failures to individual items', async () => {
      // Create some valid files and leave some missing
      await fs.writeFile(path.join(testWorkspace, 'exists1.md'), 'Content 1');
      await fs.writeFile(path.join(testWorkspace, 'exists2.md'), 'Content 2');
      // missing.md intentionally not created
      
      const envelope = {
        envelope_id: 'env_fanout_002',
        objective_id: 'obj_002',
        action_type: 'read_file',
        fanout: true,
        params: {},
      };
      
      const items = ['/exists1.md', '/missing.md', '/exists2.md'];
      const result = await fanoutExecutor.executeFanout(envelope, items);
      
      expect(result.success).toBe(true); // Partial success
      expect(result.metadata.total_items).toBe(3);
      expect(result.metadata.succeeded_count).toBe(2);
      expect(result.metadata.failed_count).toBe(1);
      expect(result.metadata.success_rate).toBeCloseTo(0.67, 2);
      
      // Check successful items
      expect(result.metadata.succeeded_items).toHaveLength(2);
      expect(result.metadata.succeeded_items[0].item).toBe('/exists1.md');
      expect(result.metadata.succeeded_items[1].item).toBe('/exists2.md');
      
      // Check failed items
      expect(result.metadata.failed_items).toHaveLength(1);
      expect(result.metadata.failed_items[0].item).toBe('/missing.md');
      expect(result.metadata.failed_items[0].error).toContain('ENOENT');
    });
    
    test('creates dead letters for failed items', async () => {
      // Create one valid file
      await fs.writeFile(path.join(testWorkspace, 'valid.md'), 'Valid content');
      
      const envelope = {
        envelope_id: 'env_fanout_003',
        objective_id: 'obj_003',
        action_type: 'read_file',
        fanout: true,
        params: {},
      };
      
      const items = ['/valid.md', '/missing1.md', '/missing2.md'];
      const result = await fanoutExecutor.executeFanout(envelope, items);
      
      // Verify execution
      expect(result.metadata.succeeded_count).toBe(1);
      expect(result.metadata.failed_count).toBe(2);
      
      // Verify dead letters were created
      const deadLetters = dlq.getEntries();
      expect(deadLetters.length).toBe(2);
      
      // Verify dead letter details
      const dl1 = deadLetters.find(dl => dl.envelope?.target === '/missing1.md');
      expect(dl1).toBeDefined();
      expect(dl1.envelope_id).toBe('env_fanout_003_fanout_1');
      expect(dl1.reason).toBe('PERMANENT_FAILURE');
      expect(dl1.envelope.fanout_index).toBe(1);
      
      const dl2 = deadLetters.find(dl => dl.envelope?.target === '/missing2.md');
      expect(dl2).toBeDefined();
      expect(dl2.envelope_id).toBe('env_fanout_003_fanout_2');
    });
    
    test('returns all succeeded when no failures', async () => {
      // Create valid files
      const files = ['a.md', 'b.md', 'c.md', 'd.md'];
      for (const file of files) {
        await fs.writeFile(path.join(testWorkspace, file), `Content ${file}`);
      }
      
      const envelope = {
        envelope_id: 'env_fanout_004',
        objective_id: 'obj_004',
        action_type: 'read_file',
        fanout: true,
        params: {},
      };
      
      const items = files.map(f => `/${f}`);
      const result = await fanoutExecutor.executeFanout(envelope, items);
      
      expect(result.success).toBe(true);
      expect(result.metadata.success_rate).toBe(1.0);
      expect(result.metadata.failed_count).toBe(0);
      
      // Verify no dead letters created
      const deadLetters = dlq.getEntries();
      expect(deadLetters.length).toBe(0);
    });
    
    test('marks permanent failures as non-retryable', async () => {
      const envelope = {
        envelope_id: 'env_fanout_005',
        objective_id: 'obj_005',
        action_type: 'read_file',
        fanout: true,
        params: {},
      };
      
      const items = ['/missing.md'];
      await fanoutExecutor.executeFanout(envelope, items);
      
      const deadLetters = dlq.getEntries();
      expect(deadLetters.length).toBe(1);
      
      // File not found should be marked as PERMANENT_FAILURE
      expect(deadLetters[0].reason).toBe('PERMANENT_FAILURE');
    });
    
    test('creates sub-envelopes with correct lineage', () => {
      const parentEnvelope = {
        envelope_id: 'env_parent_001',
        objective_id: 'obj_001',
        action_type: 'read_file',
        params: { test: 'param' },
      };
      
      const subEnvelope = fanoutExecutor.createSubEnvelope(parentEnvelope, '/test/file.md', 5);
      
      expect(subEnvelope.envelope_id).toBe('env_parent_001_fanout_5');
      expect(subEnvelope.objective_id).toBe('obj_001');
      expect(subEnvelope.parent_envelope_id).toBe('env_parent_001');
      expect(subEnvelope.action_type).toBe('read_file');
      expect(subEnvelope.target).toBe('/test/file.md');
      expect(subEnvelope.fanout_index).toBe(5);
      expect(subEnvelope.params.test).toBe('param');
    });
  });
  
  describe('ActionExecutor Fanout Integration', () => {
    test('detects and delegates fanout actions', async () => {
      // Create test files
      await fs.writeFile(path.join(testWorkspace, 'file1.md'), 'Content 1');
      await fs.writeFile(path.join(testWorkspace, 'file2.md'), 'Content 2');
      
      const envelope = {
        envelope_id: 'env_int_001',
        objective_id: 'obj_int_001',
        action_type: 'read_file',
        fanout: true,
        input: ['/file1.md', '/file2.md'],
        params: {},
      };
      
      const result = await executor.execute(envelope);
      
      expect(result.fanout).toBe(true);
      expect(result.success).toBe(true);
      expect(result.metadata.total_items).toBe(2);
      expect(result.output).toHaveLength(2);
    });
    
    test('executes non-fanout actions normally', async () => {
      await fs.writeFile(path.join(testWorkspace, 'single.md'), 'Single file');
      
      const envelope = {
        envelope_id: 'env_single_001',
        objective_id: 'obj_single_001',
        action_type: 'read_file',
        target: '/single.md',
        params: {},
      };
      
      const result = await executor.execute(envelope);
      
      expect(result.success).toBe(true);
      expect(result.output).toBe('Single file');
      expect(result.fanout).toBeUndefined(); // Not a fanout operation
    });
  });
  
  describe('Folder Summarization Flow (End-to-End)', () => {
    test('folder summarization with partial failures', async () => {
      // Create folder with mixed valid/invalid files
      const folderPath = path.join(testWorkspace, 'test-folder');
      await fs.mkdir(folderPath);
      
      await fs.writeFile(path.join(folderPath, 'valid1.md'), 'Valid content 1');
      await fs.writeFile(path.join(folderPath, 'valid2.md'), 'Valid content 2');
      await fs.writeFile(path.join(folderPath, 'empty.md'), ''); // Empty file (might fail summarization)
      
      // Step 1: List directory
      const listEnvelope = {
        envelope_id: 'env_list_001',
        objective_id: 'obj_folder_001',
        action_type: 'list_directory',
        target: '/test-folder',
        params: {},
      };
      
      const listResult = await executor.execute(listEnvelope);
      expect(listResult.success).toBe(true);
      const files = listResult.output;
      expect(files).toHaveLength(3);
      
      // Step 2: Read files (fanout)
      const readEnvelope = {
        envelope_id: 'env_read_001',
        objective_id: 'obj_folder_001',
        action_type: 'read_file',
        fanout: true,
        input: files,
        params: {},
      };
      
      const readResult = await executor.execute(readEnvelope);
      expect(readResult.success).toBe(true);
      expect(readResult.fanout).toBe(true);
      expect(readResult.metadata.succeeded_count).toBe(3);
      
      // Step 3: Summarize texts (fanout)
      const summarizeEnvelope = {
        envelope_id: 'env_summarize_001',
        objective_id: 'obj_folder_001',
        action_type: 'summarize_text',
        fanout: true,
        input: readResult.output,
        params: { max_length: 100 },
      };
      
      const summarizeResult = await executor.execute(summarizeEnvelope);
      expect(summarizeResult.success).toBe(true);
      expect(summarizeResult.fanout).toBe(true);
      // All texts summarized (even empty one just gets header)
      expect(summarizeResult.metadata.succeeded_count).toBe(3);
      
      // Step 4: Aggregate summaries
      const aggregateEnvelope = {
        envelope_id: 'env_aggregate_001',
        objective_id: 'obj_folder_001',
        action_type: 'aggregate_summaries',
        input: summarizeResult.output,
        params: {},
      };
      
      const aggregateResult = await executor.execute(aggregateEnvelope);
      expect(aggregateResult.success).toBe(true);
      expect(aggregateResult.output).toContain('Folder Summary');
      expect(aggregateResult.output).toContain('Total files: 3');
    });
  });
  
  describe('Dead Letter Inspection', () => {
    test('dead letters include context for debugging', async () => {
      const envelope = {
        envelope_id: 'env_dlq_test_001',
        objective_id: 'obj_dlq_001',
        action_type: 'read_file',
        fanout: true,
        params: {},
      };
      
      const items = ['/nonexistent1.md', '/nonexistent2.md'];
      await fanoutExecutor.executeFanout(envelope, items);
      
      const deadLetters = dlq.getEntries();
      expect(deadLetters.length).toBe(2);
      
      const dl = deadLetters[0];
      expect(dl.envelope_id).toContain('_fanout_');
      expect(dl.envelope.parent_envelope_id).toBe('env_dlq_test_001');
      expect(dl.envelope.fanout_index).toBeDefined();
      expect(dl.envelope.target).toBeDefined();
      expect(dl.envelope.action_type).toBe('read_file');
      expect(dl.dead_lettered_at).toBeDefined();
    });
  });
});
