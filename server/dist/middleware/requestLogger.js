"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
const observability_service_1 = require("../services/observability.service");
function requestLogger(req, res, next) {
    const requestId = req.headers['x-request-id'] || crypto_1.default.randomUUID();
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
        observability_service_1.observabilityService.httpRequestsTotal.inc({ method: req.method, route, status });
        observability_service_1.observabilityService.httpRequestDuration.observe({ method: req.method, route, status }, durationMs / 1000);
        if (!isMetricOrHealth) {
            logger_1.logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`, {
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
