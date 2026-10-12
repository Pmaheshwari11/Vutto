import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const store = new Map<string, RateLimitRecord>();

  // Periodic cleanup of expired records every 60s
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 60000);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Exclude automated tests or health checks from rate limiting
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = (req.user?.id || req.ip || 'anonymous') + ':' + req.baseUrl;
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      logger.warn(`Rate limit exceeded for key ${key}`, {
        ip: req.ip,
        userId: req.user?.id,
        path: req.originalUrl
      });

      res.status(429).json({
        error: options.message || 'Too many requests. Please slow down and try again later.',
        retryAfterSeconds
      });
      return;
    }

    record.count++;
    next();
  };
}

export const standardApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'API rate limit exceeded. Please try again in 1 minute.'
});

export const bidSubmissionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Bidding rate limit exceeded (max 60 bids/min per user). Anti-spam protection triggered.'
});
