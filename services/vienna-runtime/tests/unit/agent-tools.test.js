/**
 * Unit tests for Agent Tools (Phase 7.2)
 */

const AgentTools = require('../../lib/agent/tools');
const ViennaCore = require('../../index');
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

describe('Agent Tools (Phase 7.2)', () => {
  let agentTools;
  let tools;
  
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
    agentTools = new AgentTools(ViennaCore);
    tools = agentTools.getTools();
  });
  
  describe('getTools()', () => {
    test('provides read_file tool', () => {
      expect(tools.read_file).toBeDefined();
      expect(typeof tools.read_file).toBe('function');
    });
    
    test('provides propose_envelope tool', () => {
      expect(tools.propose_envelope).toBeDefined();
      expect(typeof tools.propose_envelope).toBe('function');
    });
    
    test('does NOT provide write_file', () => {
      expect(tools.write_file).toBeUndefined();
    });
    
    test('does NOT provide edit_file', () => {
      expect(tools.edit_file).toBeUndefined();
    });
    
    test('does NOT provide exec_command', () => {
      expect(tools.exec_command).toBeUndefined();
    });
    
    test('does NOT provide restart_service', () => {
      expect(tools.restart_service).toBeUndefined();
    });
  });
  
  describe('read_file', () => {
    test('reads file successfully', async () => {
      const testFile = path.join(WORKSPACE, 'PHASE_7.2_EXECUTION_LOG.md');
      
      const result = await tools.read_file(testFile);
      
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.path).toBe(testFile);
    });
    
    test('returns error for nonexistent file', async () => {
      const result = await tools.read_file('/tmp/nonexistent-file-xyz.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('propose_envelope', () => {
    test('creates valid envelope proposal', async () => {
      const proposal = {
        warrant_id: 'wrt_test',
        objective: 'Test envelope proposal',
        actions: [
          {
            type: 'write_file',
            target: '/tmp/test.txt',
            content: 'test'
          }
        ]
      };
      
      const result = await tools.propose_envelope(proposal);
      
      expect(result.success).toBe(true);
      expect(result.envelope_id).toMatch(/^env_/);
      expect(result.envelope).toBeDefined();
      expect(result.envelope.actions).toHaveLength(1);
    });
    
    test('rejects invalid proposal', async () => {
      const invalidProposal = {
        warrant_id: 'wrt_test',
        // Missing objective and actions
      };
      
      const result = await tools.propose_envelope(invalidProposal);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
  
  describe('describe_tools', () => {
    test('lists available tools', () => {
      const description = tools.describe_tools();
      
      expect(description.available_tools).toBeDefined();
      expect(description.available_tools.length).toBeGreaterThan(0);
      
      const toolNames = description.available_tools.map(t => t.name);
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('propose_envelope');
    });
    
    test('lists removed tools', () => {
      const description = tools.describe_tools();
      
      expect(description.removed_tools).toBeDefined();
      expect(description.removed_tools.length).toBeGreaterThan(0);
      
      const removedStr = description.removed_tools.join(' ');
      expect(removedStr).toContain('write_file');
      expect(removedStr).toContain('edit_file');
      expect(removedStr).toContain('exec_command');
    });
  });
});
