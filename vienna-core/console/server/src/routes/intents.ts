/**
 * Intent Tracing API Endpoints
 * Phase 11.5
 * 
 * Provides operator visibility into intent lifecycle.
 */

import express from 'express';
import { getStateGraph } from '../../../../lib/state/state-graph.js';
import { ExecutionGraphBuilder } from '../../../../lib/core/execution-graph.js';

const router = express.Router();

/**
 * GET /api/v1/intents
 * List intent traces with filters
 */
router.get('/', async (req, res) => {
  try {
    const stateGraph = getStateGraph();
    await stateGraph.initialize();

    const filters: any = {};
    
    if (req.query.intent_type) {
      filters.intent_type = req.query.intent_type as string;
    }
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    if (req.query.source_type) {
      filters.source_type = req.query.source_type as string;
    }

    const traces = stateGraph.listIntentTraces(filters);

    res.json({
      success: true,
      intents: traces
    });
  } catch (error: any) {
    console.error('[Intents API] List error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/intents/:intent_id
 * Get single intent trace with full details
 */
router.get('/:intent_id', async (req, res) => {
  try {
    const { intent_id } = req.params;
    const stateGraph = getStateGraph();
    await stateGraph.initialize();

    const trace = stateGraph.getIntentTrace(intent_id);

    if (!trace) {
      return res.status(404).json({
        success: false,
        error: 'intent_not_found'
      });
    }

    res.json({
      success: true,
      intent: trace
    });
  } catch (error: any) {
    console.error('[Intents API] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/intents/:intent_id/graph
 * Get execution graph for intent
 */
router.get('/:intent_id/graph', async (req, res) => {
  try {
    const { intent_id } = req.params;
    const stateGraph = getStateGraph();
    await stateGraph.initialize();

    const builder = new ExecutionGraphBuilder(stateGraph);
    const graph = await builder.buildIntentGraph(intent_id);

    res.json({
      success: true,
      graph
    });
  } catch (error: any) {
    console.error('[Intents API] Graph error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'intent_not_found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/intents/:intent_id/timeline
 * Get chronological timeline for intent
 */
router.get('/:intent_id/timeline', async (req, res) => {
  try {
    const { intent_id } = req.params;
    const stateGraph = getStateGraph();
    await stateGraph.initialize();

    const builder = new ExecutionGraphBuilder(stateGraph);
    const timeline = await builder.getIntentTimeline(intent_id);

    res.json({
      success: true,
      timeline
    });
  } catch (error: any) {
    console.error('[Intents API] Timeline error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'intent_not_found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/intents/:intent_id/explanation
 * Explain why action was taken or denied
 */
router.get('/:intent_id/explanation', async (req, res) => {
  try {
    const { intent_id } = req.params;
    const stateGraph = getStateGraph();
    await stateGraph.initialize();

    const builder = new ExecutionGraphBuilder(stateGraph);
    const explanation = await builder.explainDecision(intent_id);

    res.json({
      success: true,
      explanation
    });
  } catch (error: any) {
    console.error('[Intents API] Explanation error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'intent_not_found'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
