import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { auctionService } from '../services/auction.service';
import { auditService } from '../services/audit.service';
import { observabilityService } from '../services/observability.service';
import { biddingService } from '../services/bidding.service';
import { authService } from '../services/auth.service';

const router = Router();

// All admin routes require ADMIN role
router.use(requireAuth, requireRole('ADMIN'));

// GET /api/admin/metrics - Real-time SRE telemetry snapshot
router.get('/metrics', (_req: Request, res: Response) => {
  try {
    const snapshot = observabilityService.getMetricsSnapshot();
    res.json({ metrics: snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs - Immutable audit trail
router.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const action = req.query.action as string | undefined;
    const logs = auditService.getLogs(limit, action);
    res.json({ logs, count: logs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/auctions/:id/extend - Manual extension
router.post('/auctions/:id/extend', (req: Request, res: Response) => {
  try {
    const seconds = parseInt(req.body.seconds || '60', 10);
    const updated = auctionService.adminExtendAuction(req.params.id, seconds, req.user!, req.ip);
    res.json({ success: true, auction: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/auctions/:id/force-close - Emergency abort or close
router.post('/auctions/:id/force-close', (req: Request, res: Response) => {
  try {
    const updated = auctionService.adminForceClose(req.params.id, req.user!, req.ip);
    res.json({ success: true, auction: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/simulate-bot-bid - Load & Anti-Sniping Testing Generator
const SimulateBotSchema = z.object({
  auctionId: z.string(),
  bidderUsername: z.enum(['alex_rider', 'sarah_speed']).default('alex_rider'),
  increment: z.number().positive().default(500)
});

router.post('/simulate-bot-bid', async (req: Request, res: Response) => {
  try {
    const { auctionId, bidderUsername, increment } = SimulateBotSchema.parse(req.body);
    const auction = auctionService.getAuctionById(auctionId, 'ADMIN');
    if (!auction) {
      res.status(404).json({ error: 'Auction not found' });
      return;
    }

    // Determine target bot user
    const botUser = bidderUsername === 'alex_rider'
      ? authService.getUserById('usr_buyer_01')!
      : authService.getUserById('usr_buyer_02')!;

    const amount = auction.current_price + Math.max(auction.min_increment, increment);

    const result = await biddingService.placeBid({
      auctionId,
      amount,
      bidder: botUser,
      ipAddress: '127.0.0.1 (BOT SIMULATOR)'
    });

    res.json({
      success: true,
      message: `Simulated bot bid placed by ${botUser.username} for $${amount.toLocaleString()}`,
      result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
