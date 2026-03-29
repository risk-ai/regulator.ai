/**
 * Error Message Improvements
 * User-friendly error messages with actionable suggestions
 */

export interface ErrorContext {
  code: string;
  message: string;
  suggestions?: string[];
  docsUrl?: string;
  recoverable?: boolean;
}

export const ERROR_CATALOG: Record<string, ErrorContext> = {
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests in a short period',
    suggestions: [
      'Wait a few seconds and try again',
      'Reduce request frequency',
      'Contact support if you need higher limits'
    ],
    docsUrl: '/docs/rate-limits',
    recoverable: true
  },
  
  QUOTA_EXHAUSTED: {
    code: 'QUOTA_EXHAUSTED',
    message: 'Your quota for this action type has been exhausted',
    suggestions: [
      'Wait until quota resets (shown in response headers)',
      'Upgrade your plan for higher quotas',
      'Review quota usage in dashboard'
    ],
    docsUrl: '/docs/quotas',
    recoverable: true
  },
  
  BUDGET_EXCEEDED: {
    code: 'BUDGET_EXCEEDED',
    message: 'Execution cost exceeds remaining budget',
    suggestions: [
      'Increase your budget allocation',
      'Review recent cost trends in dashboard',
      'Optimize execution patterns to reduce costs'
    ],
    docsUrl: '/docs/budgets',
    recoverable: true
  },
  
  POLICY_DENIED: {
    code: 'POLICY_DENIED',
    message: 'Action denied by governance policy',
    suggestions: [
      'Review policy rules in Policies page',
      'Modify intent parameters to comply with policy',
      'Request policy exception from administrator'
    ],
    docsUrl: '/docs/policies',
    recoverable: true
  },
  
  APPROVAL_PENDING: {
    code: 'APPROVAL_PENDING',
    message: 'Action requires operator approval (T1/T2)',
    suggestions: [
      'Wait for operator to approve request',
      'Check Approvals page for status',
      'Notify operator if urgent'
    ],
    docsUrl: '/docs/approvals',
    recoverable: true
  },
  
  APPROVAL_DENIED: {
    code: 'APPROVAL_DENIED',
    message: 'Operator denied approval for this action',
    suggestions: [
      'Review denial reason in Approvals history',
      'Modify intent and resubmit',
      'Contact operator for clarification'
    ],
    docsUrl: '/docs/approvals',
    recoverable: true
  },
  
  EXECUTION_FAILED: {
    code: 'EXECUTION_FAILED',
    message: 'Execution failed during adapter invocation',
    suggestions: [
      'Check execution trace for error details',
      'Verify adapter credentials and permissions',
      'Retry with different parameters',
      'Report to support if error persists'
    ],
    docsUrl: '/docs/troubleshooting',
    recoverable: true
  },
  
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Intent parameters failed validation',
    suggestions: [
      'Check parameter types and formats',
      'Review API documentation for required fields',
      'Ensure all required parameters are provided'
    ],
    docsUrl: '/docs/api-reference',
    recoverable: true
  },
  
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required or invalid API key',
    suggestions: [
      'Verify API key is correct',
      'Check key has not expired',
      'Ensure Authorization header is present',
      'Generate new API key if needed'
    ],
    docsUrl: '/docs/authentication',
    recoverable: true
  },
  
  TENANT_SUSPENDED: {
    code: 'TENANT_SUSPENDED',
    message: 'Tenant account has been suspended',
    suggestions: [
      'Contact billing to resolve payment issues',
      'Review suspension reason in email notification',
      'Escalate to support if error is incorrect'
    ],
    docsUrl: '/docs/account-status',
    recoverable: false
  },
  
  SYSTEM_PAUSED: {
    code: 'SYSTEM_PAUSED',
    message: 'Execution system is paused',
    suggestions: [
      'Wait for operator to resume execution',
      'Check system status in dashboard',
      'Contact operator if pause is unexpected'
    ],
    docsUrl: '/docs/system-status',
    recoverable: true
  },
  
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    suggestions: [
      'Retry the operation',
      'Check system status page',
      'Report to support with execution ID',
      'Include error details in bug report'
    ],
    docsUrl: '/docs/support',
    recoverable: true
  }
};

/**
 * Get user-friendly error message with suggestions
 */
export function getErrorMessage(errorCode: string, rawMessage?: string): ErrorContext {
  const catalogEntry = ERROR_CATALOG[errorCode];
  
  if (catalogEntry) {
    return catalogEntry;
  }
  
  // Fallback for unknown errors
  return {
    code: errorCode || 'UNKNOWN_ERROR',
    message: rawMessage || 'An unexpected error occurred',
    suggestions: [
      'Retry the operation',
      'Check system status',
      'Contact support if issue persists'
    ],
    docsUrl: '/docs/troubleshooting',
    recoverable: true
  };
}

/**
 * Format error for display
 */
export function formatError(error: any): string {
  const errorCode = error.code || error.error_code || 'UNKNOWN_ERROR';
  const context = getErrorMessage(errorCode, error.message || error.error);
  
  let formatted = `${context.message}\n\n`;
  
  if (context.suggestions && context.suggestions.length > 0) {
    formatted += 'What to do next:\n';
    context.suggestions.forEach((suggestion, idx) => {
      formatted += `${idx + 1}. ${suggestion}\n`;
    });
  }
  
  if (context.docsUrl) {
    formatted += `\nLearn more: ${context.docsUrl}`;
  }
  
  return formatted;
}
