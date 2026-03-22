/**
 * SSE Stream Route
 * GET /api/v1/stream
 * 
 * Real-time event stream for dashboard updates
 */

import { Router, Request, Response } from 'express';
import { ViennaEventStream } from '../sse/eventStream.js';
import { randomBytes } from 'crypto';

export function createStreamRouter(eventStream: ViennaEventStream): Router {
  const router = Router();

  /**
   * GET /api/v1/stream
   * Subscribe to Vienna event stream
   */
  router.get('/', (req: Request, res: Response) => {
    // Generate unique client ID
    const clientId = randomBytes(16).toString('hex');
    
    console.log(`SSE client connected: ${clientId}`);
    
    // Subscribe client
    eventStream.subscribe(clientId, res);
    
    // Log disconnection
    res.on('close', () => {
      console.log(`SSE client disconnected: ${clientId}`);
    });
  });

  return router;
}
