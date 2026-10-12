import { getDb } from '../database/db';
import { Bid, SafeUser, Auction } from '../types';
import { auctionBidLock } from '../utils/asyncLock';
import { wsService } from './websocket.service';
import { auditService } from './audit.service';
import { observabilityService } from './observability.service';
import { logger } from '../utils/logger';
import { CONFIG } from '../config';

export interface PlaceBidInput {
  auctionId: string;
  amount: number;
  bidder: SafeUser;
  ipAddress?: string;
}

export interface PlaceBidResult {
  bid: Bid;
  auction: Auction;
  extended: boolean;
  newEndTime?: string;
}

class BiddingService {
  /**
   * Places a bid with atomic linearizability guarantees via per-auction mutex locking.
   * Eliminates race conditions, duplicate sequences, and stale bids under high concurrency.
   */
  async placeBid(input: PlaceBidInput): Promise<PlaceBidResult> {
    const startTime = performance.now();
    const { auctionId, amount, bidder, ipAddress = '127.0.0.1' } = input;

    return await auctionBidLock.acquire(auctionId, async () => {
      const db = getDb();
      const now = new Date();
      const nowIso = now.toISOString();

      // 1. Fetch current auction under lock
      const auctionRow = db.prepare(`
        SELECT a.*, hb.username as highest_bidder_name
        FROM auctions a
        LEFT JOIN users hb ON a.highest_bidder_id = hb.id
        WHERE a.id = ?
      `).get(auctionId) as any;

      if (!auctionRow) {
        observabilityService.recordBidLatency(performance.now() - startTime, false, 'auction_not_found');
        throw new Error('Auction not found');
      }

      // 2. Validate Status
      if (auctionRow.status !== 'ACTIVE' && auctionRow.status !== 'EXTENDED') {
        observabilityService.recordBidLatency(performance.now() - startTime, false, 'auction_not_active');
        throw new Error(`Cannot place bid. Auction status is ${auctionRow.status}`);
      }

      // 3. Validate Time
      const endTimeMs = new Date(auctionRow.end_time).getTime();
      const nowMs = now.getTime();
      if (nowMs >= endTimeMs) {
        observabilityService.recordBidLatency(performance.now() - startTime, false, 'auction_expired');
        throw new Error('Auction has already ended');
      }

      // 4. Validate Bid Increment
      const minRequired = auctionRow.current_price + auctionRow.min_increment;
      if (amount < minRequired) {
        observabilityService.recordBidLatency(performance.now() - startTime, false, 'below_minimum_increment');
        throw new Error(
          `Bid amount of $${amount.toLocaleString()} is below the required minimum of $${minRequired.toLocaleString()}`
        );
      }

      // 5. Prevent Self-Outbidding
      if (auctionRow.highest_bidder_id === bidder.id) {
        observabilityService.recordBidLatency(performance.now() - startTime, false, 'self_outbid_rejected');
        throw new Error('You are already the highest bidder for this auction');
      }

      // 6. Check Bidder Deposit Limit / Balance
      const bidderDb = db.prepare('SELECT deposit_balance FROM users WHERE id = ?').get(bidder.id) as { deposit_balance: number } | undefined;
      if (!bidderDb || bidderDb.deposit_balance < amount * 0.1) {
        // Require 10% deposit buffer
        observabilityService.recordBidLatency(performance.now() - startTime, false, 'insufficient_deposit');
        throw new Error('Insufficient deposit balance to guarantee this bid amount (minimum 10% escrow required)');
      }

      // 7. Anti-Sniping Soft-Close Detection
      const remainingMs = endTimeMs - nowMs;
      let isExtended = false;
      let newEndTime = auctionRow.end_time;
      let newExtensionCount = auctionRow.extension_count;
      let newStatus = auctionRow.status;

      if (remainingMs <= CONFIG.ANTI_SNIPE_WINDOW_MS && auctionRow.extension_count < CONFIG.MAX_EXTENSIONS_PER_AUCTION) {
        isExtended = true;
        newExtensionCount += 1;
        newEndTime = new Date(nowMs + CONFIG.EXTENSION_DURATION_MS).toISOString();
        newStatus = 'EXTENDED';
        observabilityService.antiSnipingExtensionsTotal.inc();

        logger.info(`ANTI-SNIPING TRIGGERED: Auction ${auctionId} extended by ${CONFIG.EXTENSION_DURATION_MS / 1000}s`, {
          auctionId,
          bidAmount: amount,
          previousEndTime: auctionRow.end_time,
          newEndTime,
          extensionCount: newExtensionCount
        });
      }

      // 8. Execute Atomic DB Transaction
      const previousHighestBidderId = auctionRow.highest_bidder_id;
      const nextSequence = (auctionRow.bid_count || 0) + 1;
      const bidId = 'bid_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      const isReserveMet = amount >= auctionRow.reserve_price ? 1 : auctionRow.reserve_met;

      const transaction = db.transaction(() => {
        // Mark previous bids as non-winning
        db.prepare('UPDATE bids SET is_winning = 0 WHERE auction_id = ?').run(auctionId);

        // Insert new bid
        db.prepare(`
          INSERT INTO bids (id, auction_id, bidder_id, amount, sequence_num, is_winning, ip_address, created_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `).run(bidId, auctionId, bidder.id, amount, nextSequence, ipAddress, nowIso);

        // Update auction state
        db.prepare(`
          UPDATE auctions
          SET current_price = ?,
              highest_bidder_id = ?,
              bid_count = ?,
              reserve_met = ?,
              end_time = ?,
              extension_count = ?,
              status = ?
          WHERE id = ?
        `).run(amount, bidder.id, nextSequence, isReserveMet, newEndTime, newExtensionCount, newStatus, auctionId);
      });

      transaction();

      const createdBid: Bid = {
        id: bidId,
        auction_id: auctionId,
        bidder_id: bidder.id,
        bidder_name: bidder.username,
        amount,
        sequence_num: nextSequence,
        is_winning: true,
        ip_address: ipAddress,
        created_at: nowIso
      };

      // 9. Record Observability Metrics & Latency
      const processingDurationMs = Number((performance.now() - startTime).toFixed(2));
      observabilityService.recordBidLatency(processingDurationMs, true);

      auditService.record({
        actorId: bidder.id,
        actorRole: bidder.role,
        action: isExtended ? 'BID_PLACED_AND_EXTENDED' : 'BID_PLACED',
        targetEntity: 'AUCTION',
        targetId: auctionId,
        details: {
          bidId,
          amount,
          sequence: nextSequence,
          previousPrice: auctionRow.current_price,
          latencyMs: processingDurationMs,
          antiSnipeExtended: isExtended,
          newEndTime: isExtended ? newEndTime : undefined
        },
        ipAddress
      });

      // 10. Real-time WebSocket Broadcast
      wsService.broadcastToAuction(auctionId, 'BID_PLACED', {
        auction_id: auctionId,
        bid: createdBid,
        current_price: amount,
        highest_bidder_id: bidder.id,
        highest_bidder_name: bidder.username,
        bid_count: nextSequence,
        reserve_met: isReserveMet === 1,
        extended: isExtended,
        new_end_time: newEndTime,
        extension_count: newExtensionCount
      });

      // Notify previous highest bidder of being outbid!
      if (previousHighestBidderId && previousHighestBidderId !== bidder.id) {
        wsService.sendToUser(previousHighestBidderId, 'OUTBID', {
          auction_id: auctionId,
          auction_title: auctionRow.title,
          new_price: amount,
          outbid_by: bidder.username,
          min_next_bid: amount + auctionRow.min_increment,
          message: `You have been outbid on ${auctionRow.title}! Current bid is $${amount.toLocaleString()}`
        });
      }

      // Return updated auction payload
      const updatedAuctionRow = db.prepare(`
        SELECT a.*, hb.username as highest_bidder_name
        FROM auctions a
        LEFT JOIN users hb ON a.highest_bidder_id = hb.id
        WHERE a.id = ?
      `).get(auctionId) as any;

      return {
        bid: createdBid,
        auction: {
          ...updatedAuctionRow,
          inspection_report: JSON.parse(updatedAuctionRow.inspection_report),
          images: JSON.parse(updatedAuctionRow.images),
          reserve_met: updatedAuctionRow.reserve_met === 1,
          reserve_price: bidder.role === 'ADMIN' ? updatedAuctionRow.reserve_price : 0
        },
        extended: isExtended,
        newEndTime: isExtended ? newEndTime : undefined
      };
    });
  }

  getBidsForAuction(auctionId: string, limit = 50): Bid[] {
    const db = getDb();
    const rows = db.prepare(`
      SELECT b.*, u.username as bidder_name
      FROM bids b
      JOIN users u ON b.bidder_id = u.id
      WHERE b.auction_id = ?
      ORDER BY b.sequence_num DESC
      LIMIT ?
    `).all(auctionId, limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      auction_id: r.auction_id,
      bidder_id: r.bidder_id,
      bidder_name: r.bidder_name,
      amount: r.amount,
      sequence_num: r.sequence_num,
      is_winning: r.is_winning === 1,
      ip_address: r.ip_address,
      created_at: r.created_at
    }));
  }
}

export const biddingService = new BiddingService();
