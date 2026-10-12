import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { getDb } from '../database/db';
import { auditService } from '../services/audit.service';

const router = Router();

const RegisterSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric'),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['BUYER', 'SELLER']).optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const validated = RegisterSchema.parse(req.body);
    const result = await authService.register(validated, req.ip);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const result = await authService.login(validated, req.ip);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

router.post('/deposit', requireAuth, (req: Request, res: Response) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Deposit amount must be greater than zero' });
      return;
    }

    const db = getDb();
    db.prepare('UPDATE users SET deposit_balance = deposit_balance + ? WHERE id = ?').run(amount, req.user!.id);
    const updated = authService.getUserById(req.user!.id);

    auditService.record({
      actorId: req.user!.id,
      actorRole: req.user!.role,
      action: 'DEPOSIT_ADDED',
      targetEntity: 'USER',
      targetId: req.user!.id,
      details: { amountAdded: amount, newBalance: updated?.deposit_balance },
      ipAddress: req.ip
    });

    res.json({ message: 'Funds deposited successfully', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
