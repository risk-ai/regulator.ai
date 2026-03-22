/**
 * No-Provider Mode Tests
 * 
 * EXECUTABLE tests proving core commands work without any LLM provider.
 * These must pass before Day 2 is considered complete.
 */

const { DeterministicCommandParser } = require('../../lib/commands/parser.js');
const { KeywordClassifier } = require('../../lib/commands/keyword.js');
const { LayeredClassifier } = require('../../lib/commands/classifier.js');

describe('No-Provider Mode (Executable Tests)', () => {
  
  describe('Deterministic Parser', () => {
    let parser;
    
    beforeEach(() => {
      parser = new DeterministicCommandParser();
    });
    
    /**
     * Test: All providers disabled -> pause execution still works
     */
    test('pause execution recognized without provider', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('pause execution', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('command');
      expect(result.command).toBe('pauseExecution');
    });
    
    /**
     * Test: All providers disabled -> show status still works
     */
    test('show status recognized without provider', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('show status', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('informational');
      expect(result.command).toBe('showStatus');
    });
    
    /**
     * Test: All providers disabled -> show providers still works
     */
    test('show providers recognized without provider', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('show providers', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('informational');
      expect(result.command).toBe('showProviders');
    });
    
    /**
     * Test: Resume execution works
     */
    test('resume execution recognized', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('resume execution', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('command');
      expect(result.command).toBe('resumeExecution');
    });
    
    /**
     * Test: Show services works
     */
    test('show services recognized', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('show services', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('informational');
      expect(result.command).toBe('showServices');
    });
    
    /**
     * Test: List objectives works
     */
    test('list objectives recognized', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('list objectives', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('informational');
      expect(result.command).toBe('listObjectives');
    });
    
    /**
     * Test: Show dead letters works
     */
    test('show dead letters recognized', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('show dead letters', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('informational');
      expect(result.command).toBe('showDeadLetters');
    });
    
    /**
     * Test: Recovery command classified as recovery
     */
    test('restart openclaw classified as recovery', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('restart openclaw', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('recovery');
      expect(result.command).toBe('restartOpenClaw');
    });
    
    /**
     * Test: Help command works
     */
    test('help command recognized', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('help', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('informational');
      expect(result.command).toBe('showHelp');
    });
    
    test('what can you do recognized', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('what can you do?', context);
      
      expect(result.matched).toBe(true);
      expect(result.classification).toBe('informational');
      expect(result.command).toBe('showHelp');
    });
    
    /**
     * Test: Unrecognized command returns no match
     */
    test('unrecognized message returns no match', async () => {
      const context = { operator: 'test' };
      const result = await parser.tryParse('tell me a joke', context);
      
      expect(result.matched).toBe(false);
    });
    
    /**
     * Test: Get help text
     */
    test('help text contains core commands', () => {
      const helpText = parser.getHelpText();
      
      expect(helpText).toContain('pause execution');
      expect(helpText).toContain('resume execution');
      expect(helpText).toContain('show status');
      expect(helpText).toContain('restart openclaw');
      expect(helpText).toContain('no LLM required');
    });
    
    /**
     * Test: Get available commands
     */
    test('available commands list complete', () => {
      const commands = parser.getAvailableCommands();
      
      expect(commands.length).toBeGreaterThanOrEqual(9);
      
      const commandNames = commands.map(c => c.command);
      expect(commandNames).toContain('pause execution');
      expect(commandNames).toContain('resume execution');
      expect(commandNames).toContain('show status');
      expect(commandNames).toContain('help');
    });
  });
  
  describe('Keyword Classifier', () => {
    let classifier;
    
    beforeEach(() => {
      classifier = new KeywordClassifier();
    });
    
    /**
     * Test: Keyword fallback used when deterministic parser misses
     */
    test('classifies pause-like message as command', () => {
      const result = classifier.classify('can you pause?');
      
      expect(result.classification).toBe('command');
      expect(result.mode).toBe('keyword');
      expect(result.confidence).toBeGreaterThan(0);
    });
    
    test('classifies recovery language correctly', () => {
      const result = classifier.classify('restart the system');
      
      expect(result.classification).toBe('recovery');
      expect(result.mode).toBe('keyword');
    });
    
    test('classifies reasoning questions', () => {
      const result = classifier.classify('why did that fail?');
      
      expect(result.classification).toBe('reasoning');
      expect(result.mode).toBe('keyword');
    });
    
    test('classifies directives', () => {
      const result = classifier.classify('organize my files');
      
      expect(result.classification).toBe('directive');
      expect(result.mode).toBe('keyword');
    });
    
    test('classifies approval requests', () => {
      const result = classifier.classify('emergency override');
      
      expect(result.classification).toBe('approval');
      expect(result.mode).toBe('keyword');
    });
    
    /**
     * Test: Confidence levels
     */
    test('high confidence for clear patterns', () => {
      const result = classifier.classify('pause execution now');
      
      expect(result.confidence).toBeGreaterThan(0.7);
    });
    
    test('lower confidence for ambiguous messages', () => {
      const result = classifier.classify('what is happening?');
      
      expect(result.confidence).toBeLessThan(0.8);
    });
    
    test('isConfident returns correct boolean', () => {
      const highConfidence = { classification: 'command', mode: 'keyword', confidence: 0.9 };
      const lowConfidence = { classification: 'informational', mode: 'keyword', confidence: 0.5 };
      
      expect(classifier.isConfident(highConfidence, 0.7)).toBe(true);
      expect(classifier.isConfident(lowConfidence, 0.7)).toBe(false);
    });
  });
  
  describe('Layered Classifier (No Provider)', () => {
    let classifier;
    
    beforeEach(() => {
      // Initialize with NO provider manager
      classifier = new LayeredClassifier(null);
    });
    
    /**
     * Test: Deterministic layer tried first
     */
    test('deterministic command recognized first', async () => {
      const context = { operator: 'test' };
      const result = await classifier.classify('pause execution', context);
      
      expect(result.classification.mode).toBe('deterministic');
      expect(result.classification.classification).toBe('command');
      expect(result.commandResult).toBeDefined();
      expect(result.commandResult.matched).toBe(true);
    });
    
    /**
     * Test: Keyword fallback when deterministic fails
     */
    test('keyword fallback when no deterministic match', async () => {
      const context = { operator: 'test' };
      const result = await classifier.classify('can you pause?', context);
      
      expect(result.classification.mode).toMatch(/keyword|fallback/);
      expect(result.classification.classification).toBe('command');
    });
    
    /**
     * Test: Unrecognized message with all providers disabled
     */
    test('graceful degradation for unrecognized message', async () => {
      const context = { operator: 'test' };
      const result = await classifier.classify('tell me a joke', context);
      
      expect(result.classification.mode).toBe('fallback');
      expect(result.classification.classification).toBe('informational'); // Default
    });
    
    /**
     * Test: Help text available in no-provider mode
     */
    test('help text available without provider', () => {
      const helpText = classifier.getHelpText();
      
      expect(helpText).toBeDefined();
      expect(helpText).toContain('pause execution');
      expect(helpText).toContain('no LLM required');
    });
    
    /**
     * Test: Available commands accessible
     */
    test('available commands list accessible', () => {
      const commands = classifier.getAvailableCommands();
      
      expect(commands.length).toBeGreaterThan(0);
    });
  });
  
  describe('Integration: Full No-Provider Flow', () => {
    let classifier;
    
    beforeEach(() => {
      classifier = new LayeredClassifier(null);
    });
    
    /**
     * Test: Complete flow from message to classification
     */
    test('end-to-end: deterministic command', async () => {
      const context = { operator: 'test', threadId: 'thread-123' };
      const result = await classifier.classify('show status', context);
      
      // Should be deterministic
      expect(result.classification.mode).toBe('deterministic');
      expect(result.classification.confidence).toBe(1.0);
      
      // Should have command result
      expect(result.commandResult).toBeDefined();
      expect(result.commandResult.command).toBe('showStatus');
    });
    
    test('end-to-end: keyword fallback', async () => {
      const context = { operator: 'test' };
      const result = await classifier.classify('why did that happen?', context);
      
      // Should use keyword (no provider available)
      expect(result.classification.mode).toMatch(/keyword|fallback/);
      expect(result.classification.classification).toBe('reasoning');
    });
    
    test('end-to-end: recovery command', async () => {
      const context = { operator: 'test' };
      const result = await classifier.classify('restart openclaw', context);
      
      // Should be deterministic recovery
      expect(result.classification.mode).toBe('deterministic');
      expect(result.classification.classification).toBe('recovery');
      expect(result.commandResult.command).toBe('restartOpenClaw');
    });
  });
});

// Run with: npx jest tests/commands/no-provider-mode.test.js
