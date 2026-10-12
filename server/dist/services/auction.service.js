"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auctionService = void 0;
const db_1 = require("../database/db");
const websocket_service_1 = require("./websocket.service");
const audit_service_1 = require("./audit.service");
const observability_service_1 = require("./observability.service");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
class AuctionService {
    tickerInterval = null;
    startLifecycleTicker() {
        if (this.tickerInterval)
            return;
        this.tickerInterval = setInterval(() => {
            this.evaluateStateTransitions();
        }, config_1.CONFIG.TICKER_INTERVAL_MS);
        logger_1.logger.info('Auction lifecycle state machine ticker started', {
            intervalMs: config_1.CONFIG.TICKER_INTERVAL_MS
        });
    }
    stopLifecycleTicker() {
        if (this.tickerInterval) {
            clearInterval(this.tickerInterval);
            this.tickerInterval = null;
        }
    }
    evaluateStateTransitions() {
        try {
            const db = (0, db_1.getDb)();
            const now = new Date().toISOString();
            // 1. Transition SCHEDULED -> ACTIVE when start_time <= now
            const scheduledToActive = db.prepare(`
        SELECT id, title FROM auctions
        WHERE status = 'SCHEDULED' AND start_time <= ?
      `).all(now);
            for (const item of scheduledToActive) {
                db.prepare("UPDATE auctions SET status = 'ACTIVE' WHERE id = ?").run(item.id);
                observability_service_1.observabilityService.stateTransitionsTotal.inc({ from: 'SCHEDULED', to: 'ACTIVE' });
                websocket_service_1.wsService.broadcastToAuction(item.id, 'STATUS_CHANGED', {
                    auction_id: item.id,
                    status: 'ACTIVE',
                    message: `Auction for ${item.title} is now LIVE!`
                });
                audit_service_1.auditService.record({
                    actorId: 'SYSTEM',
                    actorRole: 'SYSTEM',
                    action: 'AUCTION_STARTED_AUTO',
                    targetEntity: 'AUCTION',
                    targetId: item.id,
                    details: { title: item.title, timestamp: now }
                });
            }
            // 2. Transition ACTIVE / EXTENDED -> ENDED / UNSOLD when end_time <= now
            const activeToEnd = db.prepare(`
        SELECT id, title, current_price, reserve_price, highest_bidder_id, bid_count, status
        FROM auctions
        WHERE status IN ('ACTIVE', 'EXTENDED') AND end_time <= ?
      `).all(now);
            for (const item of activeToEnd) {
                const reserveMet = item.current_price >= item.reserve_price && item.highest_bidder_id !== null;
                const newStatus = reserveMet ? 'ENDED' : (item.bid_count > 0 ? 'ENDED' : 'UNSOLD');
                db.prepare(`
          UPDATE auctions
          SET status = ?, reserve_met = ?
          WHERE id = ?
        `).run(newStatus, reserveMet ? 1 : 0, item.id);
                observability_service_1.observabilityService.stateTransitionsTotal.inc({ from: item.status, to: newStatus });
                websocket_service_1.wsService.broadcastToAuction(item.id, 'STATUS_CHANGED', {
                    auction_id: item.id,
                    status: newStatus,
                    reserve_met: reserveMet,
                    final_price: item.current_price,
                    winner_id: item.highest_bidder_id,
                    message: reserveMet
                        ? `Auction ENDED! Sold for $${item.current_price.toLocaleString()}`
                        : 'Auction closed without meeting reserve.'
                });
                audit_service_1.auditService.record({
                    actorId: 'SYSTEM',
                    actorRole: 'SYSTEM',
                    action: 'AUCTION_CLOSED_AUTO',
                    targetEntity: 'AUCTION',
                    targetId: item.id,
                    details: {
                        previous_status: item.status,
                        new_status: newStatus,
                        final_price: item.current_price,
                        reserve_price: item.reserve_price,
                        reserve_met: reserveMet,
                        winner_id: item.highest_bidder_id
                    }
                });
            }
        }
        catch (err) {
            logger_1.logger.error('Error during lifecycle ticker execution', { error: err.message });
        }
    }
    getAuctions(filters) {
        const db = (0, db_1.getDb)();
        let query = `
      SELECT a.*, 
             u.username as seller_name,
             hb.username as highest_bidder_name
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN users hb ON a.highest_bidder_id = hb.id
      WHERE 1=1
    `;
        const params = [];
        if (filters?.status && filters.status !== 'ALL') {
            if (filters.status === 'LIVE') {
                query += " AND a.status IN ('ACTIVE', 'EXTENDED')";
            }
            else {
                query += " AND a.status = ?";
                params.push(filters.status);
            }
        }
        if (filters?.category && filters.category !== 'ALL') {
            query += " AND a.category = ?";
            params.push(filters.category);
        }
        if (filters?.search) {
            query += " AND (a.title LIKE ? OR a.make LIKE ? OR a.model LIKE ?)";
            const term = `%${filters.search}%`;
            params.push(term, term, term);
        }
        query += " ORDER BY CASE WHEN a.status IN ('ACTIVE', 'EXTENDED') THEN 1 WHEN a.status = 'SCHEDULED' THEN 2 ELSE 3 END, a.end_time ASC";
        const rows = db.prepare(query).all(...params);
        return rows.map((r) => this.formatAuction(r, filters?.currentUserRole === 'ADMIN'));
    }
    getAuctionById(id, currentUserRole) {
        const db = (0, db_1.getDb)();
        const row = db.prepare(`
      SELECT a.*, 
             u.username as seller_name,
             hb.username as highest_bidder_name
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN users hb ON a.highest_bidder_id = hb.id
      WHERE a.id = ? OR a.slug = ?
    `).get(id, id);
        if (!row)
            return null;
        return this.formatAuction(row, currentUserRole === 'ADMIN');
    }
    createAuction(data, actorUser, ipAddress = '127.0.0.1') {
        const db = (0, db_1.getDb)();
        const id = 'auc_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        const slug = `${data.year}-${data.make.toLowerCase()}-${data.model.toLowerCase()}`.replace(/[^a-z0-9]+/g, '-') + '-' + id.substring(4, 8);
        const now = new Date();
        const startTime = data.startImmediately ? now.toISOString() : new Date(now.getTime() + 10 * 60 * 1000).toISOString();
        const endTime = new Date(new Date(startTime).getTime() + data.durationMinutes * 60 * 1000).toISOString();
        const status = data.startImmediately ? 'ACTIVE' : 'SCHEDULED';
        db.prepare(`
      INSERT INTO auctions (
        id, seller_id, title, slug, make, model, year, vin, mileage, engine_cc, horsepower,
        category, condition_score, inspection_report, images, starting_price, reserve_price,
        reserve_met, min_increment, current_price, highest_bidder_id, bid_count, status,
        start_time, end_time, original_end_time, extension_count, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        0, ?, ?, NULL, 0, ?,
        ?, ?, ?, 0, ?
      )
    `).run(id, data.sellerId, data.title, slug, data.make, data.model, data.year, data.vin, data.mileage, data.engine_cc, data.horsepower, data.category, data.condition_score, JSON.stringify(data.inspection_report), JSON.stringify(data.images), data.starting_price, data.reserve_price, data.min_increment, data.starting_price, status, startTime, endTime, endTime, now.toISOString());
        audit_service_1.auditService.record({
            actorId: actorUser.id,
            actorRole: actorUser.role,
            action: 'AUCTION_CREATED',
            targetEntity: 'AUCTION',
            targetId: id,
            details: { title: data.title, starting_price: data.starting_price, reserve_price: data.reserve_price },
            ipAddress
        });
        const created = this.getAuctionById(id, actorUser.role);
        websocket_service_1.wsService.broadcastGlobal('STATUS_CHANGED', { auction: created });
        return created;
    }
    adminExtendAuction(id, additionalSeconds, actorUser, ipAddress = '127.0.0.1') {
        const db = (0, db_1.getDb)();
        const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(id);
        if (!auction)
            throw new Error('Auction not found');
        const currentEnd = new Date(auction.end_time).getTime();
        const newEnd = new Date(Math.max(Date.now(), currentEnd) + additionalSeconds * 1000).toISOString();
        db.prepare(`
      UPDATE auctions 
      SET end_time = ?, extension_count = extension_count + 1, status = 'EXTENDED'
      WHERE id = ?
    `).run(newEnd, id);
        audit_service_1.auditService.record({
            actorId: actorUser.id,
            actorRole: actorUser.role,
            action: 'ADMIN_AUCTION_EXTENDED',
            targetEntity: 'AUCTION',
            targetId: id,
            details: { additionalSeconds, newEnd },
            ipAddress
        });
        websocket_service_1.wsService.broadcastToAuction(id, 'AUCTION_EXTENDED', {
            auction_id: id,
            new_end_time: newEnd,
            extension_count: auction.extension_count + 1,
            reason: 'Admin Manual Extension'
        });
        return this.getAuctionById(id, actorUser.role);
    }
    adminForceClose(id, actorUser, ipAddress = '127.0.0.1') {
        const db = (0, db_1.getDb)();
        const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(id);
        if (!auction)
            throw new Error('Auction not found');
        const reserveMet = auction.current_price >= auction.reserve_price && auction.highest_bidder_id !== null;
        const newStatus = reserveMet ? 'ENDED' : 'UNSOLD';
        db.prepare(`
      UPDATE auctions 
      SET status = ?, reserve_met = ?, end_time = ?
      WHERE id = ?
    `).run(newStatus, reserveMet ? 1 : 0, new Date().toISOString(), id);
        audit_service_1.auditService.record({
            actorId: actorUser.id,
            actorRole: actorUser.role,
            action: 'ADMIN_AUCTION_FORCE_CLOSED',
            targetEntity: 'AUCTION',
            targetId: id,
            details: { final_price: auction.current_price, status: newStatus },
            ipAddress
        });
        websocket_service_1.wsService.broadcastToAuction(id, 'STATUS_CHANGED', {
            auction_id: id,
            status: newStatus,
            reserve_met: reserveMet,
            message: 'Auction closed by Administrator'
        });
        return this.getAuctionById(id, actorUser.role);
    }
    formatAuction(r, isAdmin) {
        return {
            id: r.id,
            seller_id: r.seller_id,
            seller_name: r.seller_name || 'Verified Dealer',
            title: r.title,
            slug: r.slug,
            make: r.make,
            model: r.model,
            year: r.year,
            vin: r.vin,
            mileage: r.mileage,
            engine_cc: r.engine_cc,
            horsepower: r.horsepower,
            category: r.category,
            condition_score: r.condition_score,
            inspection_report: typeof r.inspection_report === 'string' ? JSON.parse(r.inspection_report) : r.inspection_report,
            images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images,
            starting_price: r.starting_price,
            // Mask reserve price if user is not admin and reserve not yet met
            reserve_price: isAdmin || r.reserve_met === 1 ? r.reserve_price : 0,
            reserve_met: r.reserve_met === 1,
            min_increment: r.min_increment,
            current_price: r.current_price,
            highest_bidder_id: r.highest_bidder_id,
            highest_bidder_name: r.highest_bidder_name || (r.highest_bidder_id ? 'Bidder #' + r.highest_bidder_id.substring(4, 8) : null),
            bid_count: r.bid_count,
            status: r.status,
            start_time: r.start_time,
            end_time: r.end_time,
            original_end_time: r.original_end_time,
            extension_count: r.extension_count,
            created_at: r.created_at
        };
    }
}
exports.auctionService = new AuctionService();
