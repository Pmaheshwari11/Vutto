"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bidding_service_1 = require("../services/bidding.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
const BidSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Bid amount must be positive')
});
// POST /api/auctions/:id/bids
router.post('/:id/bids', auth_middleware_1.requireAuth, rateLimiter_1.bidSubmissionLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = BidSchema.parse(req.body);
        const result = await bidding_service_1.biddingService.placeBid({
            auctionId: id,
            amount,
            bidder: req.user,
            ipAddress: req.ip
        });
        res.status(201).json({
            success: true,
            message: result.extended
                ? `Bid placed! Anti-sniping soft close extended auction to ${new Date(result.newEndTime).toLocaleTimeString()}`
                : 'Bid accepted successfully',
            ...result
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
