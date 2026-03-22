/**
 * Failure Classifier
 * 
 * Categorizes execution failures as transient or permanent.
 * Only transient failures trigger automatic retry.
 */

/**
 * Failure categories
 */
const FailureCategory = {
  TRANSIENT: 'transient',
  PERMANENT: 'permanent'
};

/**
 * Transient failure patterns
 */
const TRANSIENT_PATTERNS = [
  /network timeout/i,
  /connection refused/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /socket hang up/i,
  /lock.*contention/i,
  /temporarily unavailable/i,
  /rate limit/i,
  /429/,
  /503/,
  /504/,
  /token expired/i
];

/**
 * Transient error codes
 */
const TRANSIENT_CODES = [
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ESOCKETTIMEDOUT',
  'NETWORK_TIMEOUT',
  'LOCK_CONTENTION',
  'RATE_LIMIT',
  'TOKEN_EXPIRED'
];

/**
 * Permanent failure patterns
 */
const PERMANENT_PATTERNS = [
  /warrant.*invalid/i,
  /warrant.*expired/i,
  /permission denied/i,
  /EACCES/i,
  /EPERM/i,
  /file not found/i,
  /ENOENT/i,
  /schema validation failed/i,
  /trading guard blocked/i,
  /action not in scope/i,
  /invalid envelope/i
];

/**
 * Permanent error codes
 */
const PERMANENT_CODES = [
  'WARRANT_INVALID',
  'WARRANT_EXPIRED',
  'EACCES',
  'EPERM',
  'ENOENT',
  'SCHEMA_VALIDATION_FAILED',
  'TRADING_GUARD_BLOCKED',
  'ACTION_NOT_IN_SCOPE',
  'INVALID_ENVELOPE'
];

class FailureClassifier {
  /**
   * Classify failure
   * 
   * @param {Error} error - Error to classify
   * @returns {object} { category: string, retryable: boolean, reason: string }
   */
  classify(error) {
    const message = error.message || String(error);
    const code = error.code || error.name;
    
    // Check permanent patterns first (more specific)
    for (const pattern of PERMANENT_PATTERNS) {
      if (pattern.test(message)) {
        return {
          category: FailureCategory.PERMANENT,
          retryable: false,
          reason: `Matched permanent pattern: ${pattern}`,
          error_code: code
        };
      }
    }
    
    // Check permanent codes
    if (PERMANENT_CODES.includes(code)) {
      return {
        category: FailureCategory.PERMANENT,
        retryable: false,
        reason: `Matched permanent code: ${code}`,
        error_code: code
      };
    }
    
    // Check transient patterns
    for (const pattern of TRANSIENT_PATTERNS) {
      if (pattern.test(message)) {
        return {
          category: FailureCategory.TRANSIENT,
          retryable: true,
          reason: `Matched transient pattern: ${pattern}`,
          error_code: code
        };
      }
    }
    
    // Check transient codes
    if (TRANSIENT_CODES.includes(code)) {
      return {
        category: FailureCategory.TRANSIENT,
        retryable: true,
        reason: `Matched transient code: ${code}`,
        error_code: code
      };
    }
    
    // Default to permanent (conservative)
    return {
      category: FailureCategory.PERMANENT,
      retryable: false,
      reason: 'Unknown failure pattern (default to permanent)',
      error_code: code
    };
  }
  
  /**
   * Compute retry delay with exponential backoff
   * 
   * @param {number} attempt - Retry attempt number (0-based)
   * @param {object} options - Backoff options
   * @returns {number} Delay in milliseconds
   */
  computeRetryDelay(attempt, options = {}) {
    const {
      base_delay_ms = 1000,
      max_delay_ms = 30000,
      jitter = true
    } = options;
    
    // Exponential: base * 2^attempt
    let delay = base_delay_ms * Math.pow(2, attempt);
    
    // Cap at max
    delay = Math.min(delay, max_delay_ms);
    
    // Add jitter (±25%)
    if (jitter) {
      const jitterAmount = delay * 0.25;
      const jitterOffset = (Math.random() - 0.5) * 2 * jitterAmount;
      delay = delay + jitterOffset;
    }
    
    return Math.round(delay);
  }
}

module.exports = { FailureClassifier, FailureCategory };
