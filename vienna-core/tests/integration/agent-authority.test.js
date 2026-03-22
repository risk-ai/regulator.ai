/**
 * Agent Authority Test
 * 
 * Validates that agents cannot bypass executor.
 */

const AgentTools = require('../../lib/agent/tools');
const ViennaCore = require('../../index');
const path = require('path');

const WORKSPACE = path.join(process.env.HOME, '.openclaw', 'workspace');

describe('Agent Authority Boundary', () => {
  let agentTools;
  let tools;
  
  beforeAll(() => {
    ViennaCore.init({ adapter: 'openclaw', workspace: WORKSPACE });
    agentTools = new AgentTools(ViennaCore);
    tools = agentTools.getTools();
  });
  
  test('agent cannot write file directly', () => {
    // Agent does NOT have write_file tool
    expect(tools.write_file).toBeUndefined();
    
    // Attempting to use it would fail
    expect(() => {
      tools.write_file('/tmp/test.txt', 'content');
    }).toThrow();
  });
  
  test('agent cannot execute commands directly', () => {
    expect(tools.exec_command).toBeUndefined();
    
    expect(() => {
      tools.exec_command('ls');
    }).toThrow();
  });
  
  test('agent cannot restart services directly', () => {
    expect(tools.restart_service).toBeUndefined();
    
    expect(() => {
      tools.restart_service('test-service');
    }).toThrow();
  });
  
  test('agent CAN propose envelope (correct path)', async () => {
    const proposal = {
      warrant_id: 'wrt_test',
      objective: 'Agent proposal test',
      actions: [
        {
          type: 'write_file',
          target: '/tmp/agent-proposal-test.txt',
          content: 'test'
        }
      ]
    };
    
    // Agent can create envelope
    const result = await tools.propose_envelope(proposal);
    
    expect(result.success).toBe(true);
    expect(result.envelope).toBeDefined();
    
    // But envelope must be executed by Vienna
    // Agent cannot execute it directly
    expect(tools.execute_envelope).toBeUndefined();
  });
  
  test('agent CAN read files (read-only access)', async () => {
    const testFile = path.join(WORKSPACE, 'PHASE_7.2_EXECUTION_LOG.md');
    
    const result = await tools.read_file(testFile);
    
    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
  });
});
