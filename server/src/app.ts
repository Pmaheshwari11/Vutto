import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { requestLogger } from './middleware/requestLogger';
import { standardApiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import auctionRoutes from './routes/auction.routes';
import bidRoutes from './routes/bid.routes';
import adminRoutes from './routes/admin.routes';
import opsRoutes from './routes/ops.routes';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  // Basic security and parsing
  app.use(cors({ origin: CONFIG.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Observability & Request Tracing middleware
  app.use(requestLogger);

  // Prometheus and Health Check routes (bypass rate limiter)
  app.use('/', opsRoutes);

  // Apply standard rate limiter to API routes
  app.use('/api', standardApiLimiter);

  // API Domain Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/auctions', bidRoutes); // Handles /api/auctions/:id/bids
  app.use('/api/auctions', auctionRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve static client bundle if built
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path === '/metrics' || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 404 handler for API routes
  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled server error', { error: err.message, stack: err.stack });
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      requestId: _req.requestId
    });
  });

  return app;
}
