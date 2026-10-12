"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const observability_service_1 = require("../services/observability.service");
const router = (0, express_1.Router)();
// Prometheus Metrics Endpoint (Red-metrics, USE-metrics)
router.get('/metrics', async (_req, res) => {
    try {
        res.setHeader('Content-Type', observability_service_1.observabilityService.register.contentType);
        const metrics = await observability_service_1.observabilityService.getPrometheusMetrics();
        res.send(metrics);
    }
    catch (err) {
        res.status(500).send(`Error collecting metrics: ${err.message}`);
    }
});
// High-level Health Check
router.get('/health', (_req, res) => {
    const health = observability_service_1.observabilityService.getHealthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
// Liveness Probe (K8s/Docker)
router.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});
// Readiness Probe (K8s/Docker)
router.get('/health/ready', (_req, res) => {
    const health = observability_service_1.observabilityService.getHealthCheck();
    if (health.status === 'healthy') {
        res.status(200).json({ status: 'ready', details: health.details });
    }
    else {
        res.status(503).json({ status: 'not_ready', details: health.details });
    }
});
exports.default = router;
