/**
 * Commands Routes (Phase 6.7)
 * 
 * System command execution for Vienna operator.
 */

import { Router, Request, Response } from 'express';
import type { ViennaRuntimeService } from '../services/viennaRuntime.js';

export function createCommandsRouter(vienna: ViennaRuntimeService): Router {
  const router = Router();
  
  /**
   * GET /api/v1/commands/available
   * Get available system commands
   */
  router.get('/available', async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      
      const commands = await vienna.getAvailableCommands(category);
      
      res.json({
        success: true,
        data: {
          commands,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[CommandsRoute] Error getting available commands:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'COMMANDS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * POST /api/v1/commands/propose
   * Propose a command for execution
   */
  router.post('/propose', async (req: Request, res: Response) => {
    try {
      const { commandName, args, context } = req.body;
      
      if (!commandName) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: commandName',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const proposal = await vienna.proposeSystemCommand(commandName, args || [], context || {});
      
      res.json({
        success: true,
        data: proposal,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[CommandsRoute] Error proposing command:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PROPOSE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * POST /api/v1/commands/execute
   * Execute a system command (with governance)
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { commandName, args, context } = req.body;
      
      if (!commandName) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: commandName',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      if (!context?.operator) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: context.operator',
          code: 'INVALID_REQUEST',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      const result = await vienna.executeSystemCommand(commandName, args || [], context);
      
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[CommandsRoute] Error executing command:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXECUTE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  /**
   * GET /api/v1/commands/diagnose
   * Diagnose system and propose fixes
   */
  router.get('/diagnose', async (req: Request, res: Response) => {
    try {
      const diagnosis = await vienna.diagnoseAndProposeFixes();
      
      res.json({
        success: true,
        data: diagnosis,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[CommandsRoute] Error diagnosing system:', error);
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DIAGNOSE_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  return router;
}
