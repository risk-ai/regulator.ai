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
    handler: string;
    description: string;
}
export declare class DeterministicCommandParser {
    private patterns;
    private handlers;
    constructor();
    /**
     * Register core commands that must work without providers
     */
    private registerCoreCommands;
    /**
     * Add a command pattern
     */
    private addPattern;
    /**
     * Register a command handler
     */
    registerHandler(name: string, handler: CommandHandler): void;
    /**
     * Try to parse message as deterministic command
     */
    tryParse(message: string, context: MessageContext): Promise<CommandResult>;
    /**
     * Get list of available commands
     */
    getAvailableCommands(): Array<{
        command: string;
        description: string;
    }>;
    /**
     * Get help text for no-provider mode
     */
    getHelpText(): string;
}
//# sourceMappingURL=parser.d.ts.map