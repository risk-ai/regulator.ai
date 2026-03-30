/**
 * SSE Client Handler
 *
 * Handles GET /api/v1/events/stream endpoint with tenant isolation
 * and event type filtering.
 */
import type { Request, Response } from 'express';
export interface SSEConnectionRequest extends Request {
    query: {
        types?: string;
        tenant_id?: string;
    };
    user?: {
        id: string;
        tenant_id?: string;
    };
}
/**
 * Handle SSE connection with filtering and tenant isolation
 */
export declare function handleSSEConnection(req: SSEConnectionRequest, res: Response): Response<any, Record<string, any>>;
/**
 * Get SSE stream statistics (for monitoring)
 */
export declare function getSSEStats(req: Request, res: Response): void;
/**
 * Get recent events for debugging/testing
 */
export declare function getRecentEvents(req: Request, res: Response): Response<any, Record<string, any>>;
/**
 * Test event emission (for development/testing)
 */
export declare function emitTestEvent(req: Request, res: Response): Response<any, Record<string, any>>;
//# sourceMappingURL=sseHandler.d.ts.map