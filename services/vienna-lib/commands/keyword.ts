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

export class KeywordClassifier {
  private rules: KeywordRule[] = [];
  
  constructor() {
    this.registerRules();
  }
  
  /**
   * Register keyword-based classification rules
   */
  private registerRules(): void {
    // Command patterns
    this.addRule({
      classification: 'command',
      keywords: ['pause', 'resume', 'stop', 'start', 'retry', 'cancel', 'show', 'list'],
      patterns: [
        /^(pause|resume|stop|start|retry|cancel)\s+/i,
        /^(show|list|get)\s+/i,
      ],
      confidence: 0.9,
    });
    
    // Recovery patterns
    this.addRule({
      classification: 'recovery',
      keywords: ['restart', 'recover', 'restore', 'reset', 'fix'],
      patterns: [
        /restart\s+(openclaw|service|system)/i,
        /recover\s+from/i,
        /restore\s+/i,
      ],
      confidence: 0.85,
    });
    
    // Reasoning patterns
    this.addRule({
      classification: 'reasoning',
      keywords: ['why', 'explain', 'analyze', 'how', 'what caused', 'reason'],
      patterns: [
        /^why\s+/i,
        /^how\s+(did|does)/i,
        /explain\s+/i,
        /what\s+caused/i,
      ],
      confidence: 0.8,
    });
    
    // Directive patterns
    this.addRule({
      classification: 'directive',
      keywords: ['organize', 'generate', 'create', 'update', 'process', 'build'],
      patterns: [
        /organize\s+/i,
        /generate\s+/i,
        /create\s+(a|an|the)/i,
        /build\s+(a|an|the)/i,
      ],
      confidence: 0.75,
    });
    
    // Approval patterns (high-risk operations)
    this.addRule({
      classification: 'approval',
      keywords: ['override', 'delete all', 'emergency', 'force', 'bypass'],
      patterns: [
        /emergency\s+override/i,
        /delete\s+all/i,
        /force\s+(execute|run|start)/i,
      ],
      confidence: 0.9,
    });
    
    // Informational (default, low confidence)
    this.addRule({
      classification: 'informational',
      keywords: ['what', 'when', 'where', 'status', 'show', 'list', 'tell me'],
      patterns: [
        /^what\s+(is|are)/i,
        /^when\s+(did|does|will)/i,
        /tell\s+me\s+about/i,
      ],
      confidence: 0.6,
    });
  }
  
  /**
   * Add a classification rule
   */
  private addRule(rule: KeywordRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Classify message using keywords
   */
  classify(message: string): ClassificationResult {
    const lowerMessage = message.toLowerCase();
    
    let bestMatch: ClassificationResult = {
      classification: 'informational',
      mode: 'keyword',
      confidence: 0.3, // Low default confidence
    };
    
    // Check each rule
    for (const rule of this.rules) {
      let score = 0;
      
      // Check keywords
      for (const keyword of rule.keywords) {
        if (lowerMessage.includes(keyword)) {
          score += 0.3;
        }
      }
      
      // Check patterns
      if (rule.patterns) {
        for (const pattern of rule.patterns) {
          if (pattern.test(message)) {
            score += 0.5;
          }
        }
      }
      
      // Normalize score
      const confidence = Math.min(score * rule.confidence, rule.confidence);
      
      // Update best match
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          classification: rule.classification,
          mode: 'keyword',
          confidence,
        };
      }
    }
    
    console.log(`[KeywordClassifier] Classified as "${bestMatch.classification}" (confidence: ${bestMatch.confidence.toFixed(2)})`);
    
    return bestMatch;
  }
  
  /**
   * Check if classification is confident enough
   */
  isConfident(result: ClassificationResult, threshold: number = 0.7): boolean {
    return result.confidence >= threshold;
  }
}
