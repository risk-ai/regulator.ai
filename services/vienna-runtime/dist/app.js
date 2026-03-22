"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("./adapters/db/client");
const bootstrap_1 = require("./lib/bootstrap");
const health_1 = __importDefault(require("./routes/health"));
const investigations_1 = __importDefault(require("./routes/investigations"));
const incidents_1 = __importDefault(require("./routes/incidents"));
const artifacts_1 = __importDefault(require("./routes/artifacts"));
const traces_1 = __importDefault(require("./routes/traces"));
async function createApp() {
    // Initialize database and seed data
    await (0, client_1.initializeDatabase)();
    (0, bootstrap_1.bootstrap)();
    const app = (0, express_1.default)();
    // Middleware
    app.use(express_1.default.json());
    app.use((0, cors_1.default)({
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
    }));
    // Request logging
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
    // Routes
    app.use('/health', health_1.default);
    app.use('/api/investigations', investigations_1.default);
    app.use('/api/incidents', incidents_1.default);
    app.use('/api/artifacts', artifacts_1.default);
    app.use('/api/traces', traces_1.default);
    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({
            error: 'not_found',
            message: 'Endpoint not found'
        });
    });
    // Error handler
    app.use((err, _req, res, _next) => {
        console.error('Error:', err);
        res.status(500).json({
            error: 'internal_error',
            message: err.message
        });
    });
    return app;
}
//# sourceMappingURL=app.js.map