"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const traces_1 = require("../adapters/db/repositories/traces");
const router = (0, express_1.Router)();
// GET /api/traces/:id - Get trace details
router.get('/:id', (req, res) => {
    const repo = new traces_1.TraceRepository();
    const trace = repo.findById(req.params.id);
    if (!trace) {
        return res.status(404).json({
            error: 'trace_not_found',
            message: `Trace ${req.params.id} not found`
        });
    }
    res.json(trace);
});
// GET /api/traces/:id/timeline - Get trace timeline
router.get('/:id/timeline', (req, res) => {
    const repo = new traces_1.TraceRepository();
    const timeline = repo.getTimeline(req.params.id);
    res.json({
        trace_id: req.params.id,
        timeline,
        count: timeline.length
    });
});
exports.default = router;
//# sourceMappingURL=traces.js.map