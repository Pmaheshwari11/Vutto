import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { seedDatabase } from '../src/database/seed';
import { closeDb } from '../src/database/db';

describe('Auth & RBAC Security Verification', () => {
  let app: any;

  beforeAll(() => {
    seedDatabase();
    app = createApp();
  });

  afterAll(() => {
    closeDb();
  });

  it('authenticates valid credentials and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@motobid.io', password: 'AdminPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('rejects invalid login attempts with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@motobid.io', password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });

  it('denies BUYER access to ADMIN operational endpoints with 403 Forbidden', async () => {
    // Log in as buyer
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex.rider@motobid.io', password: 'BuyerPass123!' });

    const buyerToken = loginRes.body.token;

    // Attempt to access admin metrics
    const metricsRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(metricsRes.status).toBe(403);
  });

  it('allows ADMIN to access operational metrics and audit logs', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@motobid.io', password: 'AdminPass123!' });

    const adminToken = loginRes.body.token;

    const metricsRes = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.metrics).toBeDefined();
    expect(metricsRes.body.metrics.active_auctions).toBeGreaterThanOrEqual(1);

    const auditRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.logs.length).toBeGreaterThan(0);
  });
});
