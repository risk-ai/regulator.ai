/**
 * Layered Message Classifier
 *
 * Three-layer classification system:
 * 1. Deterministic parser (pattern matching, no LLM)
 * 2. Keyword classifier (rule-based, no LLM)
 * 3. Provider-assisted (LLM classification)
 *
 * Provider classification is NEVER the first step.
 */
import type { ProviderManager } from '../providers/manager.js';
import type { ClassificationResult, MessageContext, CommandResult } from './types.js';
export interface LayeredClassifierConfig {
    keywordConfidenceThreshold?: number;
    enableProviderFallback?: boolean;
}
export declare class LayeredClassifier {
    private parser;
    private keywordClassifier;
    private providerManager;
    private config;
    constructor(providerManager: ProviderManager | null, config?: LayeredClassifierConfig);
    /**
     * Register command handlers with deterministic parser
     */
    registerHandler(name: string, handler: any): void;
    /**
     * Classify message using layered approach
     *
     * Order: deterministic → keyword → provider
     * Provider is NEVER tried first
     */
    classify(message: string, context: MessageContext): Promise<{
        classification: ClassificationResult;
        commandResult?: CommandResult;
    }>;
    /**
     * Get help text for no-provider mode
     */
    getHelpText(): string;
    /**
     * Get available deterministic commands
     */
    getAvailableCommands(): Array<{
        command: string;
        description: string;
    }>;
}
//# sourceMappingURL=classifier.d.ts.map