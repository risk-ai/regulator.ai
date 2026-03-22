"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../adapters/db/client");
const router = (0, express_1.Router)();
const startTime = Date.now();
router.get('/', async (_req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const dbInfo = (0, client_1.getDatabaseInfo)();
    const dbHealthy = await (0, client_1.checkDatabaseHealth)();
    const health = {
        status: dbHealthy ? 'healthy' : 'degraded',
        version: '1.0.0',
        uptime_seconds: uptime,
        components: {
            state_graph: {
                status: dbHealthy ? 'healthy' : 'unhealthy',
                type: dbInfo.backend,
                configured: dbInfo.configured,
                path: dbInfo.path
            },
            artifact_storage: {
                status: 'healthy',
                disk_usage: 'N/A (dev mode)'
            }
        }
    };
    res.json(health);
});
exports.default = router;
//# sourceMappingURL=health.js.map