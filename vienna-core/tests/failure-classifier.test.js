/**
 * Tests for Failure Classifier
 */

const { FailureClassifier, FailureCategory } = require('../lib/execution/failure-classifier');

describe('FailureClassifier', () => {
  let classifier;
  
  beforeEach(() => {
    classifier = new FailureClassifier();
  });
  
  describe('classify', () => {
    describe('transient failures', () => {
      test('classifies network timeout as transient', () => {
        const error = new Error('Network timeout occurred');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.TRANSIENT);
        expect(result.retryable).toBe(true);
      });
      
      test('classifies ECONNREFUSED as transient', () => {
        const error = new Error('Connection refused');
        error.code = 'ECONNREFUSED';
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.TRANSIENT);
        expect(result.retryable).toBe(true);
      });
      
      test('classifies rate limit as transient', () => {
        const error = new Error('Rate limit exceeded');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.TRANSIENT);
        expect(result.retryable).toBe(true);
      });
      
      test('classifies lock contention as transient', () => {
        const error = new Error('Lock contention detected');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.TRANSIENT);
        expect(result.retryable).toBe(true);
      });
      
      test('classifies token expired as transient', () => {
        const error = new Error('Auth token expired');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.TRANSIENT);
        expect(result.retryable).toBe(true);
      });
      
      test('classifies by error code', () => {
        const error = new Error('Some error');
        error.code = 'ETIMEDOUT';
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.TRANSIENT);
        expect(result.retryable).toBe(true);
      });
    });
    
    describe('permanent failures', () => {
      test('classifies warrant invalid as permanent', () => {
        const error = new Error('Warrant invalid');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
      
      test('classifies warrant expired as permanent', () => {
        const error = new Error('Warrant expired at 2024-01-01');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
      
      test('classifies permission denied as permanent', () => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
      
      test('classifies file not found as permanent', () => {
        const error = new Error('File not found: /test.txt');
        error.code = 'ENOENT';
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
      
      test('classifies trading guard block as permanent', () => {
        const error = new Error('Trading guard blocked: autonomous window active');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
      
      test('classifies action not in scope as permanent', () => {
        const error = new Error('Action not in scope of warrant');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
      
      test('classifies by error code', () => {
        const error = new Error('Some error');
        error.code = 'WARRANT_EXPIRED';
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
      });
    });
    
    describe('unknown failures', () => {
      test('defaults unknown errors to permanent', () => {
        const error = new Error('Unknown error xyz123');
        const result = classifier.classify(error);
        
        expect(result.category).toBe(FailureCategory.PERMANENT);
        expect(result.retryable).toBe(false);
        expect(result.reason).toContain('Unknown failure pattern');
      });
    });
  });
  
  describe('computeRetryDelay', () => {
    test('computes exponential backoff', () => {
      const delay0 = classifier.computeRetryDelay(0, { jitter: false });
      const delay1 = classifier.computeRetryDelay(1, { jitter: false });
      const delay2 = classifier.computeRetryDelay(2, { jitter: false });
      
      expect(delay0).toBe(1000);  // 1000 * 2^0 = 1000
      expect(delay1).toBe(2000);  // 1000 * 2^1 = 2000
      expect(delay2).toBe(4000);  // 1000 * 2^2 = 4000
    });
    
    test('caps delay at max_delay_ms', () => {
      const delay = classifier.computeRetryDelay(10, { 
        base_delay_ms: 1000,
        max_delay_ms: 5000,
        jitter: false
      });
      
      expect(delay).toBe(5000);
    });
    
    test('applies jitter', () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(classifier.computeRetryDelay(1, { jitter: true }));
      }
      
      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
      
      // All delays should be within ±25% of 2000
      delays.forEach(delay => {
        expect(delay).toBeGreaterThan(1500);
        expect(delay).toBeLessThan(2500);
      });
    });
    
    test('respects custom base_delay_ms', () => {
      const delay = classifier.computeRetryDelay(0, { 
        base_delay_ms: 500,
        jitter: false
      });
      
      expect(delay).toBe(500);
    });
  });
});
