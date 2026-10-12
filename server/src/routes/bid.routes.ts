import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { biddingService } from '../services/bidding.service';
import { requireAuth } from '../middleware/auth.middleware';
import { bidSubmissionLimiter } from '../middleware/rateLimiter';

const router = Router();

const BidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive')
});

// POST /api/auctions/:id/bids
router.post('/:id/bids', requireAuth, bidSubmissionLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = BidSchema.parse(req.body);

    const result = await biddingService.placeBid({
      auctionId: id,
      amount,
      bidder: req.user!,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: result.extended
        ? `Bid placed! Anti-sniping soft close extended auction to ${new Date(result.newEndTime!).toLocaleTimeString()}`
        : 'Bid accepted successfully',
      ...result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
