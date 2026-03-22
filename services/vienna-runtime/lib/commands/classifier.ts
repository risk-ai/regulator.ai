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
import { DeterministicCommandParser } from './parser.js';
import { KeywordClassifier } from './keyword.js';
import type { 
  ClassificationResult, 
  MessageContext, 
  CommandResult 
} from './types.js';

export interface LayeredClassifierConfig {
  keywordConfidenceThreshold?: number; // Minimum confidence to use keyword result
  enableProviderFallback?: boolean;    // Allow LLM fallback
}

export class LayeredClassifier {
  private parser: DeterministicCommandParser;
  private keywordClassifier: KeywordClassifier;
  private providerManager: ProviderManager | null;
  private config: Required<LayeredClassifierConfig>;
  
  constructor(
    providerManager: ProviderManager | null,
    config: LayeredClassifierConfig = {}
  ) {
    this.parser = new DeterministicCommandParser();
    this.keywordClassifier = new KeywordClassifier();
    this.providerManager = providerManager;
    
    this.config = {
      keywordConfidenceThreshold: config.keywordConfidenceThreshold ?? 0.7,
      enableProviderFallback: config.enableProviderFallback ?? true,
    };
    
    console.log('[LayeredClassifier] Initialized with 3-layer classification');
  }
  
  /**
   * Register command handlers with deterministic parser
   */
  registerHandler(name: string, handler: any): void {
    this.parser.registerHandler(name, handler);
  }
  
  /**
   * Classify message using layered approach
   * 
   * Order: deterministic → keyword → provider
   * Provider is NEVER tried first
   */
  async classify(message: string, context: MessageContext): Promise<{
    classification: ClassificationResult;
    commandResult?: CommandResult;
  }> {
    console.log('[LayeredClassifier] Starting classification');
    
    // LAYER 1: Deterministic parser
    const commandResult = await this.parser.tryParse(message, context);
    
    if (commandResult.matched) {
      console.log('[LayeredClassifier] Deterministic match found');
      
      return {
        classification: {
          classification: commandResult.classification!,
          mode: 'deterministic',
          confidence: 1.0,
        },
        commandResult,
      };
    }
    
    console.log('[LayeredClassifier] No deterministic match, trying keyword');
    
    // LAYER 2: Keyword classifier
    const keywordResult = this.keywordClassifier.classify(message);
    
    if (this.keywordClassifier.isConfident(keywordResult, this.config.keywordConfidenceThreshold)) {
      console.log('[LayeredClassifier] High-confidence keyword match');
      
      return {
        classification: keywordResult,
      };
    }
    
    console.log('[LayeredClassifier] Low keyword confidence, checking provider availability');
    
    // LAYER 3: Provider-assisted (only if enabled and provider available)
    if (this.config.enableProviderFallback && this.providerManager) {
      try {
        const provider = await this.providerManager.getHealthyProvider(context.threadId);
        
        if (provider) {
          console.log(`[LayeredClassifier] Using provider: ${provider.name}`);
          
          const providerClassification = await provider.classifyMessage(message, context);
          
          return {
            classification: {
              classification: providerClassification,
              mode: 'llm',
              confidence: 0.9,
              provider: provider.name,
            },
          };
        }
      } catch (error) {
        console.warn('[LayeredClassifier] Provider classification failed:', error);
      }
    }
    
    // FALLBACK: Use keyword result even if low confidence
    console.warn('[LayeredClassifier] No provider available, using keyword fallback');
    
    return {
      classification: {
        ...keywordResult,
        mode: 'fallback',
      },
    };
  }
  
  /**
   * Get help text for no-provider mode
   */
  getHelpText(): string {
    return this.parser.getHelpText();
  }
  
  /**
   * Get available deterministic commands
   */
  getAvailableCommands(): Array<{ command: string; description: string }> {
    return this.parser.getAvailableCommands();
  }
}
