/**
 * Intent Parser
 *
 * Extracts structured intent from natural language commands.
 *
 * Separates:
 * - Action (summarize, explain, open, read, analyze)
 * - Target (file, folder, current file)
 * - Query (filename, path, or reference)
 */
export type Intent = 'summarize_file' | 'summarize_folder' | 'read_file' | 'explain_file' | 'open_file' | 'analyze_file' | 'find_file' | 'unknown';
export type TargetType = 'file' | 'folder' | 'current_file' | 'unknown';
export interface ParsedIntent {
    intent: Intent;
    targetType: TargetType;
    query?: string;
    raw: string;
}
export declare class IntentParser {
    /**
     * Parse natural language command into structured intent
     */
    parse(command: string): ParsedIntent;
    /**
     * Extract action verb from command
     */
    private extractAction;
    /**
     * Extract target type (file, folder, current)
     */
    private extractTargetType;
    /**
     * Extract file/folder query from command
     */
    private extractQuery;
    /**
     * Map action + target type to intent
     */
    private mapToIntent;
}
//# sourceMappingURL=intentParser.d.ts.map