"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const artifacts_1 = require("../adapters/db/repositories/artifacts");
const router = (0, express_1.Router)();
// GET /api/artifacts - List artifacts
router.get('/', (req, res) => {
    const repo = new artifacts_1.ArtifactRepository();
    const artifacts = repo.list();
    res.json({
        artifacts,
        total: artifacts.length
    });
});
// GET /api/artifacts/:id - Get artifact details
router.get('/:id', (req, res) => {
    const repo = new artifacts_1.ArtifactRepository();
    const artifact = repo.findById(req.params.id);
    if (!artifact) {
        return res.status(404).json({
            error: 'artifact_not_found',
            message: `Artifact ${req.params.id} not found`
        });
    }
    res.json(artifact);
});
exports.default = router;
//# sourceMappingURL=artifacts.js.map