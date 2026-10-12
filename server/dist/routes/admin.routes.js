"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../middleware/auth.middleware");
const auction_service_1 = require("../services/auction.service");
const audit_service_1 = require("../services/audit.service");
const observability_service_1 = require("../services/observability.service");
const bidding_service_1 = require("../services/bidding.service");
const auth_service_1 = require("../services/auth.service");
const router = (0, express_1.Router)();
// All admin routes require ADMIN role
router.use(auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)('ADMIN'));
// GET /api/admin/metrics - Real-time SRE telemetry snapshot
router.get('/metrics', (_req, res) => {
    try {
        const snapshot = observability_service_1.observabilityService.getMetricsSnapshot();
        res.json({ metrics: snapshot });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET /api/admin/audit-logs - Immutable audit trail
router.get('/audit-logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit || '100', 10);
        const action = req.query.action;
        const logs = audit_service_1.auditService.getLogs(limit, action);
        res.json({ logs, count: logs.length });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// POST /api/admin/auctions/:id/extend - Manual extension
router.post('/auctions/:id/extend', (req, res) => {
    try {
        const seconds = parseInt(req.body.seconds || '60', 10);
        const updated = auction_service_1.auctionService.adminExtendAuction(req.params.id, seconds, req.user, req.ip);
        res.json({ success: true, auction: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// POST /api/admin/auctions/:id/force-close - Emergency abort or close
router.post('/auctions/:id/force-close', (req, res) => {
    try {
        const updated = auction_service_1.auctionService.adminForceClose(req.params.id, req.user, req.ip);
        res.json({ success: true, auction: updated });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// POST /api/admin/simulate-bot-bid - Load & Anti-Sniping Testing Generator
const SimulateBotSchema = zod_1.z.object({
    auctionId: zod_1.z.string(),
    bidderUsername: zod_1.z.enum(['alex_rider', 'sarah_speed']).default('alex_rider'),
    increment: zod_1.z.number().positive().default(500)
});
router.post('/simulate-bot-bid', async (req, res) => {
    try {
        const { auctionId, bidderUsername, increment } = SimulateBotSchema.parse(req.body);
        const auction = auction_service_1.auctionService.getAuctionById(auctionId, 'ADMIN');
        if (!auction) {
            res.status(404).json({ error: 'Auction not found' });
            return;
        }
        // Determine target bot user
        const botUser = bidderUsername === 'alex_rider'
            ? auth_service_1.authService.getUserById('usr_buyer_01')
            : auth_service_1.authService.getUserById('usr_buyer_02');
        const amount = auction.current_price + Math.max(auction.min_increment, increment);
        const result = await bidding_service_1.biddingService.placeBid({
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
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
