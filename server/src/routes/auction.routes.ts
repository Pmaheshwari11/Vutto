import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { auctionService } from '../services/auction.service';
import { biddingService } from '../services/bidding.service';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

const CreateAuctionSchema = z.object({
  title: z.string().min(5),
  make: z.string().min(2),
  model: z.string().min(2),
  year: z.number().int().min(1900).max(2027),
  vin: z.string().min(5).max(30),
  mileage: z.number().min(0),
  engine_cc: z.number().int().min(50),
  horsepower: z.number().int().min(5),
  category: z.enum(['SUPERBIKE', 'CRUISER', 'CAFE_RACER', 'ADVENTURE', 'CLASSIC']),
  condition_score: z.number().int().min(1).max(100),
  inspection_report: z.object({
    engine_compression: z.enum(['EXCELLENT', 'GOOD', 'FAIR']),
    transmission: z.enum(['SMOOTH', 'ACCEPTABLE', 'NEEDS_SERVICE']),
    frame_alignment: z.enum(['PERFECT', 'MINOR_SCRATCHES']),
    electrical_system: z.enum(['PASSED', 'WARNING']),
    brake_pads_percent: z.number().min(0).max(100),
    front_tyre_tread_mm: z.number().min(0),
    rear_tyre_tread_mm: z.number().min(0),
    clean_title: z.boolean(),
    service_history_verified: z.boolean(),
    notes: z.string()
  }),
  images: z.array(z.string().url()).min(1),
  starting_price: z.number().positive(),
  reserve_price: z.number().positive(),
  min_increment: z.number().positive(),
  durationMinutes: z.number().int().min(1).max(10080),
  startImmediately: z.boolean().optional()
});

// GET /api/auctions
router.get('/', optionalAuth, (req: Request, res: Response) => {
  try {
    const { status, category, search } = req.query;
    const auctions = auctionService.getAuctions({
      status: status as string,
      category: category as string,
      search: search as string,
      currentUserRole: req.user?.role
    });
    res.json({ auctions, count: auctions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auctions/:id
router.get('/:id', optionalAuth, (req: Request, res: Response) => {
  try {
    const auction = auctionService.getAuctionById(req.params.id, req.user?.role);
    if (!auction) {
      res.status(404).json({ error: 'Auction not found' });
      return;
    }
    const bids = biddingService.getBidsForAuction(auction.id, 50);
    res.json({ auction, bids });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auctions/:id/bids
router.get('/:id/bids', (req: Request, res: Response) => {
  try {
    const bids = biddingService.getBidsForAuction(req.params.id, 100);
    res.json({ bids, count: bids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auctions (SELLER or ADMIN)
router.post('/', requireAuth, requireRole('SELLER', 'ADMIN'), (req: Request, res: Response) => {
  try {
    const validated = CreateAuctionSchema.parse(req.body);
    const auction = auctionService.createAuction(
      {
        ...validated,
        sellerId: req.user!.id
      },
      req.user!,
      req.ip
    );
    res.status(201).json({ auction });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
