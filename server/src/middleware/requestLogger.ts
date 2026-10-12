import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { observabilityService } from '../services/observability.service';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.requestId = requestId;
  req.startTime = performance.now();
  res.setHeader('x-request-id', requestId);

  // Exclude noisy metric polling from detailed logging if desired
  const isMetricOrHealth = req.path === '/metrics' || req.path.startsWith('/health');

  res.on('finish', () => {
    const durationMs = Number((performance.now() - (req.startTime || 0)).toFixed(2));
    const route = req.route?.path || req.path;
    const status = res.statusCode.toString();

    // Record Prometheus metrics
    observabilityService.httpRequestsTotal.inc({ method: req.method, route, status });
    observabilityService.httpRequestDuration.observe({ method: req.method, route, status }, durationMs / 1000);

    if (!isMetricOrHealth) {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`, {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
        ip: req.ip
      });
    }
  });

  next();
}
