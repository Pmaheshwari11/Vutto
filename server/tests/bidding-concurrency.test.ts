import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeDb } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { biddingService } from '../src/services/bidding.service';
import { authService } from '../src/services/auth.service';

describe('High-Concurrency Bidding & Race Condition Resilience', () => {
  beforeAll(() => {
    seedDatabase();
  });

  afterAll(() => {
    closeDb();
  });

  it('linearizes concurrent bids and prevents race conditions under high contention', async () => {
    const db = getDb();
    const testAuctionId = 'auc_ducati_v4s';

    // Get two distinct test buyers
    const buyer1 = authService.getUserById('usr_buyer_01')!;
    const buyer2 = authService.getUserById('usr_buyer_02')!;

    // Fetch baseline auction state
    const baseline = db.prepare('SELECT current_price, min_increment FROM auctions WHERE id = ?').get(testAuctionId) as any;
    const basePrice = baseline.current_price;
    const increment = baseline.min_increment;

    // Dispatch 10 concurrent bid attempts simultaneously with interleaved values
    const bidPromises = [
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice + increment * 1, bidder: buyer1 }),
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice + increment * 2, bidder: buyer2 }),
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice + increment * 1, bidder: buyer2 }), // Stale duplicate price
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice + increment * 3, bidder: buyer1 }),
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice + increment * 4, bidder: buyer2 }),
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice - 100, bidder: buyer1 }), // Invalid below minimum
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice + increment * 5, bidder: buyer1 }),
      biddingService.placeBid({ auctionId: testAuctionId, amount: basePrice + increment * 6, bidder: buyer2 })
    ];

    const results = await Promise.allSettled(bidPromises);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // At least 4 bids should succeed and invalid/stale bids should be rejected gracefully
    expect(fulfilled.length).toBeGreaterThanOrEqual(4);
    expect(rejected.length).toBeGreaterThanOrEqual(1);

    // Verify database state integrity
    const updatedAuction = db.prepare('SELECT current_price, bid_count, highest_bidder_id FROM auctions WHERE id = ?').get(testAuctionId) as any;
    expect(updatedAuction.current_price).toBeGreaterThan(basePrice);

    // Verify bids table monotonic sequence integrity
    const bids = db.prepare('SELECT sequence_num, amount, bidder_id FROM bids WHERE auction_id = ? ORDER BY sequence_num ASC').all(testAuctionId) as any[];
    
    for (let i = 1; i < bids.length; i++) {
      expect(bids[i].sequence_num).toBe(bids[i - 1].sequence_num + 1);
      expect(bids[i].amount).toBeGreaterThan(bids[i - 1].amount);
    }
  });

  it('rejects self-outbidding when highest bidder submits another bid', async () => {
    const testAuctionId = 'auc_ducati_v4s';
    const db = getDb();
    const auction = db.prepare('SELECT current_price, min_increment, highest_bidder_id FROM auctions WHERE id = ?').get(testAuctionId) as any;
    const currentHighest = authService.getUserById(auction.highest_bidder_id)!;

    await expect(
      biddingService.placeBid({
        auctionId: testAuctionId,
        amount: auction.current_price + auction.min_increment * 2,
        bidder: currentHighest
      })
    ).rejects.toThrow('You are already the highest bidder for this auction');
  });
});
