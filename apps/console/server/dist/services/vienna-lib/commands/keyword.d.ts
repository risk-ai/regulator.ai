/**
 * Keyword Classifier
 *
 * Rule-based classification using keywords and patterns.
 * Second layer - used when deterministic parser fails.
 * Works without LLM provider.
 */
import type { ClassificationResult } from './types.js';
export interface KeywordRule {
    classification: 'informational' | 'reasoning' | 'directive' | 'command' | 'approval' | 'recovery';
    keywords: string[];
    patterns?: RegExp[];
    confidence: number;
}
export declare class KeywordClassifier {
    private rules;
    constructor();
    /**
     * Register keyword-based classification rules
     */
    private registerRules;
    /**
     * Add a classification rule
     */
    private addRule;
    /**
     * Classify message using keywords
     */
    classify(message: string): ClassificationResult;
    /**
     * Check if classification is confident enough
     */
    isConfident(result: ClassificationResult, threshold?: number): boolean;
}
//# sourceMappingURL=keyword.d.ts.map