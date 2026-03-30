/**
 * API Contract Tests
 *
 * Validates all API endpoints return consistent success/error envelopes.
 */
interface SuccessEnvelope<T = any> {
    success: true;
    data: T;
    timestamp: string;
}
interface ErrorEnvelope {
    success: false;
    error: string;
    code?: string;
    details?: Record<string, unknown>;
    timestamp: string;
}
//# sourceMappingURL=contract.test.d.ts.map