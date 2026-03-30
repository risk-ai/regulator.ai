/**
 * Vienna OS SDK Errors
 */

export class ViennaError extends Error {
  code: string;
  status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'ViennaError';
    this.code = code;
    this.status = status;
  }
}

export class AuthError extends ViennaError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export class PolicyDeniedError extends ViennaError {
  rule: string;
  tier: string;

  constructor(message: string, rule: string, tier: string) {
    super(message, 'POLICY_DENIED', 403);
    this.name = 'PolicyDeniedError';
    this.rule = rule;
    this.tier = tier;
  }
}

export class WarrantExpiredError extends ViennaError {
  warrantId: string;

  constructor(warrantId: string) {
    super(`Warrant ${warrantId} has expired`, 'WARRANT_EXPIRED', 410);
    this.name = 'WarrantExpiredError';
    this.warrantId = warrantId;
  }
}
