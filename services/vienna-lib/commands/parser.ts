/**
 * Deterministic Command Parser
 * 
 * Pattern-matched command recognition that works without any LLM provider.
 * First layer of classification - must be tried before keyword or LLM.
 */

import type { CommandResult, MessageContext } from './types.js';

export interface CommandHandler {
  execute(args: Record<string, string>, context: MessageContext): Promise<string>;
}

export interface CommandPattern {
  pattern: RegExp;
  classification: 'command' | 'recovery' | 'informational';
  handler: string; // Handler method name
  description: string;
}

export class DeterministicCommandParser {
  private patterns: CommandPattern[] = [];
  private handlers: Map<string, CommandHandler> = new Map();
  
  constructor() {
    this.registerCoreCommands();
  }
  
  /**
   * Register core commands that must work without providers
   */
  private registerCoreCommands(): void {
    // Execution control
    this.addPattern({
      pattern: /^pause\s+execution$/i,
      classification: 'command',
      handler: 'pauseExecution',
      description: 'Pause execution',
    });
    
    this.addPattern({
      pattern: /^resume\s+execution$/i,
      classification: 'command',
      handler: 'resumeExecution',
      description: 'Resume execution',
    });
    
    // Status queries
    this.addPattern({
      pattern: /^show\s+status$/i,
      classification: 'informational',
      handler: 'showStatus',
      description: 'Show system status',
    });
    
    this.addPattern({
      pattern: /^show\s+providers$/i,
      classification: 'informational',
      handler: 'showProviders',
      description: 'Show provider health',
    });
    
    this.addPattern({
      pattern: /^show\s+services$/i,
      classification: 'informational',
      handler: 'showServices',
      description: 'Show service status',
    });
    
    // Objective management
    this.addPattern({
      pattern: /^list\s+objectives$/i,
      classification: 'informational',
      handler: 'listObjectives',
      description: 'List active objectives',
    });
    
    this.addPattern({
      pattern: /^show\s+dead\s+letters$/i,
      classification: 'informational',
      handler: 'showDeadLetters',
      description: 'Show dead letters',
    });
    
    // Recovery
    this.addPattern({
      pattern: /^restart\s+openclaw$/i,
      classification: 'recovery',
      handler: 'restartOpenClaw',
      description: 'Restart OpenClaw service',
    });
    
    // Help
    this.addPattern({
      pattern: /^help$/i,
      classification: 'informational',
      handler: 'showHelp',
      description: 'Show available commands',
    });
    
    this.addPattern({
      pattern: /^what\s+can\s+you\s+do\??$/i,
      classification: 'informational',
      handler: 'showHelp',
      description: 'Show available commands',
    });
  }
  
  /**
   * Add a command pattern
   */
  private addPattern(pattern: CommandPattern): void {
    this.patterns.push(pattern);
  }
  
  /**
   * Register a command handler
   */
  registerHandler(name: string, handler: CommandHandler): void {
    this.handlers.set(name, handler);
  }
  
  /**
   * Try to parse message as deterministic command
   */
  async tryParse(message: string, context: MessageContext): Promise<CommandResult> {
    const trimmed = message.trim();
    
    // Try each pattern
    for (const pattern of this.patterns) {
      const match = pattern.pattern.exec(trimmed);
      
      if (match) {
        console.log(`[DeterministicParser] Matched command: ${pattern.handler}`);
        
        // Extract args from named groups
        const args = match.groups || {};
        
        // Get handler
        const handler = this.handlers.get(pattern.handler);
        
        return {
          matched: true,
          classification: pattern.classification,
          command: pattern.handler,
          args,
          handler: handler ? async () => await handler.execute(args, context) : undefined,
        };
      }
    }
    
    // No match
    return {
      matched: false,
      classification: 'informational', // Default
    };
  }
  
  /**
   * Get list of available commands
   */
  getAvailableCommands(): Array<{ command: string; description: string }> {
    return this.patterns.map(p => ({
      command: p.pattern.source.replace(/\^|\$|\\s\+/g, ' ').trim(),
      description: p.description,
    }));
  }
  
  /**
   * Get help text for no-provider mode
   */
  getHelpText(): string {
    const commands = this.getAvailableCommands();
    
    let help = 'Available commands (no LLM required):\n\n';
    
    help += '**Execution Control:**\n';
    help += '• pause execution\n';
    help += '• resume execution\n\n';
    
    help += '**Status Queries:**\n';
    help += '• show status\n';
    help += '• show providers\n';
    help += '• show services\n';
    help += '• list objectives\n';
    help += '• show dead letters\n\n';
    
    help += '**Recovery:**\n';
    help += '• restart openclaw\n\n';
    
    help += '**Help:**\n';
    help += '• help\n';
    help += '• what can you do?\n\n';
    
    help += 'These commands work even when all LLM providers are unavailable.';
    
    return help;
  }
}
