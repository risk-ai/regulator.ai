/**
 * Proposals API Routes — Phase 15 Stage 7
 */
import { Router } from 'express';
import { getStateGraph } from '../../../../lib/state/state-graph.js';
const ProposalReviewer = require('../../../../lib/core/proposal-review.js');
const router = Router();
const stateGraph = getStateGraph();
/**
 * GET /api/v1/proposals
 *
 * List proposals with optional filters
 */
router.get('/', async (req, res) => {
    try {
        await stateGraph.initialize();
        const filters = {
            proposal_type: req.query.proposal_type,
            status: req.query.status,
            objective_id: req.query.objective_id,
            expired: req.query.expired === 'true' ? true : req.query.expired === 'false' ? false : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : 50,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        const proposals = stateGraph.listProposals(filters);
        res.json({
            proposals,
            count: proposals.length,
            filters
        });
    }
    catch (error) {
        console.error('[Proposals API] List failed:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * GET /api/v1/proposals/:proposal_id
 *
 * Get proposal by ID with history
 */
router.get('/:proposal_id', async (req, res) => {
    try {
        await stateGraph.initialize();
        const proposal = stateGraph.getProposal(req.params.proposal_id);
        if (!proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        const history = stateGraph.getProposalHistory(req.params.proposal_id);
        res.json({
            proposal,
            history
        });
    }
    catch (error) {
        console.error('[Proposals API] Get failed:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/v1/proposals/:proposal_id/approve
 *
 * Approve proposal
 */
router.post('/:proposal_id/approve', async (req, res) => {
    try {
        await stateGraph.initialize();
        const { reviewed_by, modifications } = req.body;
        if (!reviewed_by) {
            return res.status(400).json({ error: 'reviewed_by is required' });
        }
        const reviewer = new ProposalReviewer(stateGraph);
        const result = await reviewer.approve(req.params.proposal_id, reviewed_by, modifications);
        res.json(result);
    }
    catch (error) {
        console.error('[Proposals API] Approve failed:', error);
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/v1/proposals/:proposal_id/reject
 *
 * Reject proposal
 */
router.post('/:proposal_id/reject', async (req, res) => {
    try {
        await stateGraph.initialize();
        const { reviewed_by, reason } = req.body;
        if (!reviewed_by) {
            return res.status(400).json({ error: 'reviewed_by is required' });
        }
        if (!reason) {
            return res.status(400).json({ error: 'reason is required' });
        }
        const reviewer = new ProposalReviewer(stateGraph);
        const result = await reviewer.reject(req.params.proposal_id, reviewed_by, reason);
        res.json(result);
    }
    catch (error) {
        console.error('[Proposals API] Reject failed:', error);
        res.status(400).json({ error: error.message });
    }
});
/**
 * POST /api/v1/proposals/:proposal_id/modify
 *
 * Modify proposal
 */
router.post('/:proposal_id/modify', async (req, res) => {
    try {
        await stateGraph.initialize();
        const { reviewed_by, modifications } = req.body;
        if (!reviewed_by) {
            return res.status(400).json({ error: 'reviewed_by is required' });
        }
        if (!modifications) {
            return res.status(400).json({ error: 'modifications is required' });
        }
        const reviewer = new ProposalReviewer(stateGraph);
        const result = await reviewer.modify(req.params.proposal_id, reviewed_by, modifications);
        res.json(result);
    }
    catch (error) {
        console.error('[Proposals API] Modify failed:', error);
        res.status(400).json({ error: error.message });
    }
});
export default router;
//# sourceMappingURL=proposals.js.map