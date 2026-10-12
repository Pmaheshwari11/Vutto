"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auction_service_1 = require("../services/auction.service");
const bidding_service_1 = require("../services/bidding.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const CreateAuctionSchema = zod_1.z.object({
    title: zod_1.z.string().min(5),
    make: zod_1.z.string().min(2),
    model: zod_1.z.string().min(2),
    year: zod_1.z.number().int().min(1900).max(2027),
    vin: zod_1.z.string().min(5).max(30),
    mileage: zod_1.z.number().min(0),
    engine_cc: zod_1.z.number().int().min(50),
    horsepower: zod_1.z.number().int().min(5),
    category: zod_1.z.enum(['SUPERBIKE', 'CRUISER', 'CAFE_RACER', 'ADVENTURE', 'CLASSIC']),
    condition_score: zod_1.z.number().int().min(1).max(100),
    inspection_report: zod_1.z.object({
        engine_compression: zod_1.z.enum(['EXCELLENT', 'GOOD', 'FAIR']),
        transmission: zod_1.z.enum(['SMOOTH', 'ACCEPTABLE', 'NEEDS_SERVICE']),
        frame_alignment: zod_1.z.enum(['PERFECT', 'MINOR_SCRATCHES']),
        electrical_system: zod_1.z.enum(['PASSED', 'WARNING']),
        brake_pads_percent: zod_1.z.number().min(0).max(100),
        front_tyre_tread_mm: zod_1.z.number().min(0),
        rear_tyre_tread_mm: zod_1.z.number().min(0),
        clean_title: zod_1.z.boolean(),
        service_history_verified: zod_1.z.boolean(),
        notes: zod_1.z.string()
    }),
    images: zod_1.z.array(zod_1.z.string().url()).min(1),
    starting_price: zod_1.z.number().positive(),
    reserve_price: zod_1.z.number().positive(),
    min_increment: zod_1.z.number().positive(),
    durationMinutes: zod_1.z.number().int().min(1).max(10080),
    startImmediately: zod_1.z.boolean().optional()
});
// GET /api/auctions
router.get('/', auth_middleware_1.optionalAuth, (req, res) => {
    try {
        const { status, category, search } = req.query;
        const auctions = auction_service_1.auctionService.getAuctions({
            status: status,
            category: category,
            search: search,
            currentUserRole: req.user?.role
        });
        res.json({ auctions, count: auctions.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/auctions/:id
router.get('/:id', auth_middleware_1.optionalAuth, (req, res) => {
    try {
        const auction = auction_service_1.auctionService.getAuctionById(req.params.id, req.user?.role);
        if (!auction) {
            res.status(404).json({ error: 'Auction not found' });
            return;
        }
        const bids = bidding_service_1.biddingService.getBidsForAuction(auction.id, 50);
        res.json({ auction, bids });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/auctions/:id/bids
router.get('/:id/bids', (req, res) => {
    try {
        const bids = bidding_service_1.biddingService.getBidsForAuction(req.params.id, 100);
        res.json({ bids, count: bids.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/auctions (SELLER or ADMIN)
router.post('/', auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('SELLER', 'ADMIN'), (req, res) => {
    try {
        const validated = CreateAuctionSchema.parse(req.body);
        const auction = auction_service_1.auctionService.createAuction({
            ...validated,
            sellerId: req.user.id
        }, req.user, req.ip);
        res.status(201).json({ auction });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
