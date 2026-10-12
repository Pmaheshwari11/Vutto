import http from 'http';
import { createApp } from './app';
import { CONFIG } from './config';
import { seedDatabase } from './database/seed';
import { wsService } from './services/websocket.service';
import { auctionService } from './services/auction.service';
import { logger } from './utils/logger';
import { closeDb } from './database/db';

async function bootstrap() {
  try {
    // 1. Seed database with initial users and motorcycle inventory
    seedDatabase();

    // 2. Create Express app
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize native WebSocket gateway
    wsService.initialize(server);

    // 4. Start auction lifecycle ticker
    auctionService.startLifecycleTicker();

    // 5. Start HTTP server
    server.listen(CONFIG.PORT, () => {
      logger.info(`MotoBid Production Server running on http://localhost:${CONFIG.PORT}`, {
        port: CONFIG.PORT,
        env: CONFIG.NODE_ENV,
        metricsPath: '/metrics',
        healthPath: '/health',
        wsPath: '/ws'
      });
    });

    // Graceful Shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);
      auctionService.stopLifecycleTicker();
      wsService.close();

      server.close(() => {
        closeDb();
        logger.info('HTTP server and DB connections terminated cleanly.');
        process.exit(0);
      });

      // Force exit if hanging
      setTimeout(() => {
        logger.error('Graceful shutdown timed out, force exiting.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err: any) {
    logger.error('Failed to bootstrap application', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
