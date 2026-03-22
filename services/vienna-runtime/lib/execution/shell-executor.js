/**
 * Shell Executor (Phase 6.7)
 * 
 * Governed system command execution for Vienna.
 * 
 * Design constraints:
 * - AI proposes, runtime executes, operator approves
 * - All side-effect commands require warrant
 * - Read-only commands can execute with verification only
 * - Command templates prevent arbitrary execution
 * - Results are structured and auditable
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Command categories for governance
 */
const CommandCategory = {
  READ_ONLY: 'read_only',      // No side effects, safe to execute
  SIDE_EFFECT: 'side_effect',  // Modifies system state, requires warrant
  DANGEROUS: 'dangerous',       // High-risk, requires explicit approval
};

/**
 * Command template registry
 * 
 * Templates define safe command patterns with parameter validation.
 */
const COMMAND_TEMPLATES = {
  // Read-only commands
  'check_port': {
    category: CommandCategory.READ_ONLY,
    description: 'Check if a port is listening',
    command: (port) => `ss -tuln | grep :${port} || netstat -tuln | grep :${port} || echo "not_listening"`,
    validate: (port) => {
      const portNum = parseInt(port);
      return portNum > 0 && portNum < 65536;
    },
    parseResult: (stdout) => {
      if (stdout.includes('not_listening')) {
        return { listening: false };
      }
      return { listening: true, output: stdout.trim() };
    },
  },
  
  'check_process': {
    category: CommandCategory.READ_ONLY,
    description: 'Check if a process is running',
    command: (processName) => `pgrep -f "${processName}" || echo "not_running"`,
    validate: (processName) => {
      return typeof processName === 'string' && processName.length > 0 && processName.length < 100;
    },
    parseResult: (stdout) => {
      if (stdout.includes('not_running')) {
        return { running: false };
      }
      const pids = stdout.trim().split('\n').filter(line => line.match(/^\d+$/));
      return { running: true, pids: pids.map(p => parseInt(p)) };
    },
  },
  
  'show_service_status': {
    category: CommandCategory.READ_ONLY,
    description: 'Get systemd service status',
    command: (serviceName) => `systemctl --user status ${serviceName} 2>&1 || echo "not_found"`,
    validate: (serviceName) => {
      return /^[a-z0-9-_.]+$/.test(serviceName);
    },
    parseResult: (stdout) => {
      if (stdout.includes('not_found') || stdout.includes('could not be found')) {
        return { found: false };
      }
      
      const active = stdout.includes('Active: active');
      const inactive = stdout.includes('Active: inactive');
      const failed = stdout.includes('Active: failed');
      
      return {
        found: true,
        active,
        inactive,
        failed,
        output: stdout,
      };
    },
  },
  
  'read_log_tail': {
    category: CommandCategory.READ_ONLY,
    description: 'Read last N lines of a log file',
    command: (logPath, lines = 50) => `tail -n ${lines} "${logPath}" 2>&1`,
    validate: (logPath, lines = 50) => {
      const linesNum = parseInt(lines);
      return typeof logPath === 'string' &&
             logPath.startsWith('/') &&
             !logPath.includes('..') &&
             linesNum > 0 && linesNum <= 1000;
    },
    parseResult: (stdout) => {
      return { lines: stdout.split('\n').filter(l => l.length > 0) };
    },
  },
  
  // Side-effect commands (require warrant)
  'restart_service': {
    category: CommandCategory.SIDE_EFFECT,
    description: 'Restart a systemd service',
    command: (serviceName) => `systemctl --user restart ${serviceName}`,
    validate: (serviceName) => {
      return /^[a-z0-9-_.]+$/.test(serviceName);
    },
    parseResult: (stdout, stderr) => {
      const success = !stderr || stderr.length === 0;
      return { success, output: stdout || stderr };
    },
    requiresWarrant: true,
    riskTier: 'T1',
  },
  
  'stop_service': {
    category: CommandCategory.SIDE_EFFECT,
    description: 'Stop a systemd service',
    command: (serviceName) => `systemctl --user stop ${serviceName}`,
    validate: (serviceName) => {
      return /^[a-z0-9-_.]+$/.test(serviceName);
    },
    parseResult: (stdout, stderr) => {
      const success = !stderr || stderr.length === 0;
      return { success, output: stdout || stderr };
    },
    requiresWarrant: true,
    riskTier: 'T1',
  },
  
  'start_service': {
    category: CommandCategory.SIDE_EFFECT,
    description: 'Start a systemd service',
    command: (serviceName) => `systemctl --user start ${serviceName}`,
    validate: (serviceName) => {
      return /^[a-z0-9-_.]+$/.test(serviceName);
    },
    parseResult: (stdout, stderr) => {
      const success = !stderr || stderr.length === 0;
      return { success, output: stdout || stderr };
    },
    requiresWarrant: true,
    riskTier: 'T1',
  },
  
  'kill_process': {
    category: CommandCategory.DANGEROUS,
    description: 'Kill a process by PID',
    command: (pid, signal = 'TERM') => `kill -${signal} ${pid}`,
    validate: (pid, signal = 'TERM') => {
      const pidNum = parseInt(pid);
      const validSignals = ['TERM', 'KILL', 'INT', 'HUP'];
      return pidNum > 0 && validSignals.includes(signal);
    },
    parseResult: (stdout, stderr) => {
      const success = !stderr || stderr.length === 0;
      return { success, output: stdout || stderr };
    },
    requiresWarrant: true,
    riskTier: 'T2',
  },
};

/**
 * Shell Executor
 * 
 * Executes system commands through governed templates.
 */
class ShellExecutor {
  constructor(options = {}) {
    this.warrantSystem = options.warrantSystem || null;
    this.auditSystem = options.auditSystem || null;
    this.dryRun = options.dryRun || false;
    
    console.log('[ShellExecutor] Initialized', this.dryRun ? '(DRY RUN)' : '');
  }
  
  /**
   * Get available commands
   * 
   * @param {string} category - Optional category filter
   * @returns {Array<object>} Command metadata
   */
  getAvailableCommands(category = null) {
    const commands = [];
    
    for (const [name, template] of Object.entries(COMMAND_TEMPLATES)) {
      if (category && template.category !== category) continue;
      
      commands.push({
        name,
        category: template.category,
        description: template.description,
        requiresWarrant: template.requiresWarrant || false,
        riskTier: template.riskTier || 'T0',
      });
    }
    
    return commands;
  }
  
  /**
   * Execute a command
   * 
   * @param {string} commandName - Template name
   * @param {Array} args - Command arguments
   * @param {object} context - Execution context (operator, warrant, etc.)
   * @returns {Promise<object>} Execution result
   */
  async execute(commandName, args = [], context = {}) {
    const template = COMMAND_TEMPLATES[commandName];
    
    if (!template) {
      throw new Error(`Unknown command template: ${commandName}`);
    }
    
    // Validate arguments
    if (!template.validate(...args)) {
      throw new Error(`Invalid arguments for command: ${commandName}`);
    }
    
    // Check warrant requirement
    if (template.requiresWarrant && !context.warrant) {
      throw new Error(`Command ${commandName} requires warrant but none provided`);
    }
    
    // Audit command proposal
    if (this.auditSystem) {
      await this.auditSystem.emit({
        action: 'command_proposed',
        result: 'proposed',
        operator: context.operator || 'unknown',
        metadata: {
          command: commandName,
          command_template: template.command(...args).substring(0, 200), // Truncate for audit
          category: template.category,
          risk_tier: template.riskTier || 'T0',
          args: JSON.stringify(args),
          requires_warrant: template.requiresWarrant || false,
          warrant_id: context.warrant || null,
        },
        timestamp: new Date().toISOString(),
      });
    }
    
    // Generate command string
    const commandString = template.command(...args);
    
    console.log(`[ShellExecutor] Executing: ${commandName}`);
    console.log(`[ShellExecutor] Command: ${commandString}`);
    
    // Dry run mode
    if (this.dryRun) {
      console.log('[ShellExecutor] DRY RUN - command not executed');
      return {
        success: true,
        dryRun: true,
        command: commandString,
        result: { message: 'Dry run - command not executed' },
      };
    }
    
    // Execute command
    const startTime = Date.now();
    try {
      const { stdout, stderr } = await execAsync(commandString, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1 MB max output
      });
      const duration = Date.now() - startTime;
      
      // Parse result
      const parsed = template.parseResult ? template.parseResult(stdout, stderr) : { stdout, stderr };
      
      // Audit success
      if (this.auditSystem) {
        await this.auditSystem.emit({
          action: 'command_executed',
          result: 'success',
          operator: context.operator || 'unknown',
          metadata: {
            command: commandName,
            command_template: commandString.substring(0, 200), // Truncate for audit
            category: template.category,
            risk_tier: template.riskTier || 'T0',
            args: JSON.stringify(args),
            execution_duration_ms: duration,
            stdout: (stdout || '').substring(0, 500), // Truncate for audit
            stderr: (stderr || '').substring(0, 500),
            parsed_result: JSON.stringify(parsed).substring(0, 500),
            warrant_id: context.warrant || null,
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      return {
        success: true,
        command: commandString,
        result: parsed,
      };
    } catch (error) {
      console.error(`[ShellExecutor] Command failed: ${error.message}`);
      
      // Audit failure
      if (this.auditSystem) {
        await this.auditSystem.emit({
          action: 'command_failed',
          result: 'failed',
          operator: context.operator || 'unknown',
          metadata: {
            command: commandName,
            command_template: commandString.substring(0, 200), // Truncate for audit
            category: template.category,
            risk_tier: template.riskTier || 'T0',
            args: JSON.stringify(args),
            error: error.message,
            error_stack: error.stack ? error.stack.substring(0, 500) : null,
            warrant_id: context.warrant || null,
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      return {
        success: false,
        command: commandString,
        error: error.message,
      };
    }
  }
  
  /**
   * Propose a command for execution
   * 
   * Returns structured proposal that can be approved by operator.
   * 
   * @param {string} commandName - Template name
   * @param {Array} args - Command arguments
   * @param {object} context - Execution context
   * @returns {object} Command proposal
   */
  proposeCommand(commandName, args = [], context = {}) {
    const template = COMMAND_TEMPLATES[commandName];
    
    if (!template) {
      throw new Error(`Unknown command template: ${commandName}`);
    }
    
    // Validate arguments
    if (!template.validate(...args)) {
      throw new Error(`Invalid arguments for command: ${commandName}`);
    }
    
    const commandString = template.command(...args);
    
    return {
      proposal_id: `shell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      command: commandName,
      category: template.category,
      description: template.description,
      command_string: commandString,
      args,
      requires_warrant: template.requiresWarrant || false,
      risk_tier: template.riskTier || 'T0',
      proposed_at: new Date().toISOString(),
      proposed_by: context.proposedBy || 'vienna',
    };
  }
}

module.exports = {
  ShellExecutor,
  CommandCategory,
  COMMAND_TEMPLATES,
};
