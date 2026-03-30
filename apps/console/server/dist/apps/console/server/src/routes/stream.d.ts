/**
 * SSE Stream Route
 * GET /api/v1/stream
 *
 * Real-time event stream for dashboard updates
 */
import { Router } from 'express';
import { ViennaEventStream } from '../sse/eventStream.js';
export declare function createStreamRouter(eventStream: ViennaEventStream): Router;
//# sourceMappingURL=stream.d.ts.map