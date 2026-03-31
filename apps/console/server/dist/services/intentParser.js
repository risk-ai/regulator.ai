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
export class IntentParser {
    /**
     * Parse natural language command into structured intent
     */
    parse(command) {
        const lower = command.toLowerCase().trim();
        // Extract action
        const action = this.extractAction(lower);
        // Extract target type
        const targetType = this.extractTargetType(lower);
        // Extract file/folder query
        const query = this.extractQuery(lower, action, targetType);
        // Map to intent
        const intent = this.mapToIntent(action, targetType);
        return {
            intent,
            targetType,
            query,
            raw: command,
        };
    }
    /**
     * Extract action verb from command
     */
    extractAction(command) {
        const actionPatterns = [
            { pattern: /summarize|summarise/, action: 'summarize' },
            { pattern: /explain|describe/, action: 'explain' },
            { pattern: /open|show|display/, action: 'open' },
            { pattern: /read|view/, action: 'read' },
            { pattern: /analyze|analyse|inspect/, action: 'analyze' },
            { pattern: /find|search|locate/, action: 'find' },
        ];
        for (const { pattern, action } of actionPatterns) {
            if (pattern.test(command)) {
                return action;
            }
        }
        return 'unknown';
    }
    /**
     * Extract target type (file, folder, current)
     */
    extractTargetType(command) {
        // Check for folder indicators
        if (command.includes('folder') ||
            command.includes('directory') ||
            command.includes('dir')) {
            return 'folder';
        }
        // Check for current file indicators
        if (command.includes('this file') ||
            command.includes('the file') ||
            command.includes('current file')) {
            return 'current_file';
        }
        // Check for explicit file indicators
        if (command.includes(' file') ||
            command.includes('.') // Has extension
        ) {
            return 'file';
        }
        // Default to file (most common case)
        return 'file';
    }
    /**
     * Extract file/folder query from command
     */
    extractQuery(command, action, targetType) {
        // If targeting current file, no query needed
        if (targetType === 'current_file') {
            return undefined;
        }
        // Multi-pass cleaning to handle complex patterns like "find and summarize X"
        let cleaned = command;
        // Pass 1: Remove action words (with word boundaries)
        cleaned = cleaned.replace(/\b(find|search|locate|open|show|display|read|view|summarize|summarise|explain|describe|analyze|analyse|inspect)\b/gi, '');
        // Pass 2: Remove conjunctions and articles (with word boundaries)
        cleaned = cleaned.replace(/\b(and|then|the|a)\b/gi, '');
        // Pass 3: Remove file/folder suffixes
        cleaned = cleaned.replace(/\s+(file|folder|directory|dir)$/i, '');
        // Pass 4: Clean up whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        // If nothing left, no query
        if (!cleaned || cleaned === command.toLowerCase()) {
            return undefined;
        }
        return cleaned;
    }
    /**
     * Map action + target type to intent
     */
    mapToIntent(action, targetType) {
        if (action === 'summarize') {
            if (targetType === 'folder') {
                return 'summarize_folder';
            }
            return 'summarize_file';
        }
        if (action === 'explain') {
            return 'explain_file';
        }
        if (action === 'open' || action === 'read') {
            if (targetType === 'file' || targetType === 'current_file') {
                return 'open_file';
            }
        }
        if (action === 'analyze') {
            return 'analyze_file';
        }
        if (action === 'find') {
            return 'find_file';
        }
        return 'unknown';
    }
}
//# sourceMappingURL=intentParser.js.map