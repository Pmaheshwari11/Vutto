import { Router, Request, Response } from 'express';
import { observabilityService } from '../services/observability.service';

const router = Router();

// Prometheus Metrics Endpoint (Red-metrics, USE-metrics)
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', observabilityService.register.contentType);
    const metrics = await observabilityService.getPrometheusMetrics();
    res.send(metrics);
  } catch (err: any) {
    res.status(500).send(`Error collecting metrics: ${err.message}`);
  }
});

// High-level Health Check
router.get('/health', (_req: Request, res: Response) => {
  const health = observabilityService.getHealthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Liveness Probe (K8s/Docker)
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});

// Readiness Probe (K8s/Docker)
router.get('/health/ready', (_req: Request, res: Response) => {
  const health = observabilityService.getHealthCheck();
  if (health.status === 'healthy') {
    res.status(200).json({ status: 'ready', details: health.details });
  } else {
    res.status(503).json({ status: 'not_ready', details: health.details });
  }
});

export default router;
