/**
 * Simulation Routes — Vienna OS
 * 
 * Control the simulation engine that generates realistic governance traffic.
 * 
 * POST /api/v1/simulation/start   — Start simulation engine
 * POST /api/v1/simulation/stop    — Stop simulation engine
 * GET  /api/v1/simulation/status  — Get simulation status & stats
 * POST /api/v1/simulation/seed    — Generate 24h backfill data
 * POST /api/v1/simulation/reset   — Clear all simulated data
 */

import { Router, Request, Response } from 'express';
import { simulationService } from '../services/simulationService.js';

export function createSimulationRouter(): Router {
  const router = Router();

  /**
   * GET /api/v1/simulation/status — Get simulation status
   */
  router.get('/status', (_req: Request, res: Response) => {
    try {
      const status = simulationService.getStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SIMULATION_STATUS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/simulation/start — Start simulation engine
   */
  router.post('/start', async (_req: Request, res: Response) => {
    try {
      await simulationService.start();
      const status = simulationService.getStatus();
      res.json({
        success: true,
        data: { message: 'Simulation started', ...status },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start simulation',
        code: 'SIMULATION_START_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/simulation/stop — Stop simulation engine
   */
  router.post('/stop', async (_req: Request, res: Response) => {
    try {
      await simulationService.stop();
      res.json({
        success: true,
        data: { message: 'Simulation stopped' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop simulation',
        code: 'SIMULATION_STOP_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/simulation/seed — Generate 24h backfill data
   */
  router.post('/seed', async (_req: Request, res: Response) => {
    try {
      const result = await simulationService.seed();
      res.json({
        success: true,
        data: { message: '24h backfill data generated', ...result },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed data',
        code: 'SIMULATION_SEED_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/v1/simulation/reset — Clear all simulated data
   */
  router.post('/reset', async (_req: Request, res: Response) => {
    try {
      await simulationService.reset();
      res.json({
        success: true,
        data: { message: 'All simulated data cleared' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset simulation',
        code: 'SIMULATION_RESET_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
}
