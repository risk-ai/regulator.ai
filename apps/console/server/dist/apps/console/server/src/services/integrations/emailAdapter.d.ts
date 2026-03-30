/**
 * Email Integration Adapter — Vienna OS
 *
 * Sends HTML email notifications for approvals, alerts, and reports.
 * Supports Resend API or raw SMTP. Generates signed JWT links for one-click approvals.
 */
import type { IntegrationAdapter, ConfigSchema } from './types.js';
export declare function verifyApprovalToken(token: string, secret: string): {
    valid: boolean;
    payload?: any;
    error?: string;
};
export declare const emailAdapter: IntegrationAdapter;
export declare const emailConfigSchema: ConfigSchema;
//# sourceMappingURL=emailAdapter.d.ts.map