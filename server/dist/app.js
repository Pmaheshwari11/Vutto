"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const requestLogger_1 = require("./middleware/requestLogger");
const rateLimiter_1 = require("./middleware/rateLimiter");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const auction_routes_1 = __importDefault(require("./routes/auction.routes"));
const bid_routes_1 = __importDefault(require("./routes/bid.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const ops_routes_1 = __importDefault(require("./routes/ops.routes"));
const logger_1 = require("./utils/logger");
function createApp() {
    const app = (0, express_1.default)();
    // Basic security and parsing
    app.use((0, cors_1.default)({ origin: config_1.CONFIG.CORS_ORIGIN, credentials: true }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Observability & Request Tracing middleware
    app.use(requestLogger_1.requestLogger);
    // Prometheus and Health Check routes (bypass rate limiter)
    app.use('/', ops_routes_1.default);
    // Apply standard rate limiter to API routes
    app.use('/api', rateLimiter_1.standardApiLimiter);
    // API Domain Routes
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/auctions', bid_routes_1.default); // Handles /api/auctions/:id/bids
    app.use('/api/auctions', auction_routes_1.default);
    app.use('/api/admin', admin_routes_1.default);
    // Serve static client bundle if built
    const clientDist = path_1.default.resolve(__dirname, '../../client/dist');
    if (fs_1.default.existsSync(clientDist)) {
        app.use(express_1.default.static(clientDist));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path === '/metrics' || req.path.startsWith('/health')) {
                return next();
            }
            res.sendFile(path_1.default.join(clientDist, 'index.html'));
        });
    }
    // 404 handler for API routes
    app.use('/api/*', (_req, res) => {
        res.status(404).json({ error: 'API route not found' });
    });
    // Global Error Handler
    app.use((err, _req, res, _next) => {
        logger_1.logger.error('Unhandled server error', { error: err.message, stack: err.stack });
        res.status(err.status || 500).json({
            error: err.message || 'Internal server error',
            requestId: _req.requestId
        });
    });
    return app;
}
