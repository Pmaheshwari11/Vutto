"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bidSubmissionLimiter = exports.standardApiLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const logger_1 = require("../utils/logger");
function createRateLimiter(options) {
    const store = new Map();
    // Periodic cleanup of expired records every 60s
    setInterval(() => {
        const now = Date.now();
        for (const [key, record] of store.entries()) {
            if (now > record.resetTime) {
                store.delete(key);
            }
        }
    }, 60000);
    return (req, res, next) => {
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
            logger_1.logger.warn(`Rate limit exceeded for key ${key}`, {
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
exports.standardApiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 300,
    message: 'API rate limit exceeded. Please try again in 1 minute.'
});
exports.bidSubmissionLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Bidding rate limit exceeded (max 60 bids/min per user). Anti-spam protection triggered.'
});
