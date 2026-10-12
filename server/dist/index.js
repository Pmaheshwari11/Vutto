"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const config_1 = require("./config");
const seed_1 = require("./database/seed");
const websocket_service_1 = require("./services/websocket.service");
const auction_service_1 = require("./services/auction.service");
const logger_1 = require("./utils/logger");
const db_1 = require("./database/db");
async function bootstrap() {
    try {
        // 1. Seed database with initial users and motorcycle inventory
        (0, seed_1.seedDatabase)();
        // 2. Create Express app
        const app = (0, app_1.createApp)();
        const server = http_1.default.createServer(app);
        // 3. Initialize native WebSocket gateway
        websocket_service_1.wsService.initialize(server);
        // 4. Start auction lifecycle ticker
        auction_service_1.auctionService.startLifecycleTicker();
        // 5. Start HTTP server
        server.listen(config_1.CONFIG.PORT, () => {
            logger_1.logger.info(`MotoBid Production Server running on http://localhost:${config_1.CONFIG.PORT}`, {
                port: config_1.CONFIG.PORT,
                env: config_1.CONFIG.NODE_ENV,
                metricsPath: '/metrics',
                healthPath: '/health',
                wsPath: '/ws'
            });
        });
        // Graceful Shutdown
        const shutdown = (signal) => {
            logger_1.logger.info(`Received ${signal}. Initiating graceful shutdown...`);
            auction_service_1.auctionService.stopLifecycleTicker();
            websocket_service_1.wsService.close();
            server.close(() => {
                (0, db_1.closeDb)();
                logger_1.logger.info('HTTP server and DB connections terminated cleanly.');
                process.exit(0);
            });
            // Force exit if hanging
            setTimeout(() => {
                logger_1.logger.error('Graceful shutdown timed out, force exiting.');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (err) {
        logger_1.logger.error('Failed to bootstrap application', { error: err.message, stack: err.stack });
        process.exit(1);
    }
}
bootstrap();
