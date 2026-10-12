import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeDb } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { biddingService } from '../src/services/bidding.service';
import { authService } from '../src/services/auth.service';
import { CONFIG } from '../src/config';

describe('Anti-Sniping Soft-Close Mechanism', () => {
  beforeAll(() => {
    seedDatabase();
  });

  afterAll(() => {
    closeDb();
  });

  it('dynamically extends auction deadline when a bid is submitted in the closing window', async () => {
    const db = getDb();
    const testAuctionId = 'auc_yamaha_r1m';

    // Set auction end_time to 15 seconds from now (well within the 30s anti-snipe window)
    const now = Date.now();
    const closeTime = new Date(now + 15 * 1000).toISOString();
    
    // Ensure highest bidder is buyer 2 so buyer 1 can place bid cleanly
    db.prepare("UPDATE auctions SET end_time = ?, extension_count = 0, status = 'ACTIVE', highest_bidder_id = 'usr_buyer_02' WHERE id = ?").run(closeTime, testAuctionId);

    const buyer1 = authService.getUserById('usr_buyer_01')!;
    const auction = db.prepare('SELECT current_price, min_increment FROM auctions WHERE id = ?').get(testAuctionId) as any;

    const bidAmount = auction.current_price + auction.min_increment;
    const result = await biddingService.placeBid({
      auctionId: testAuctionId,
      amount: bidAmount,
      bidder: buyer1
    });

    expect(result.extended).toBe(true);
    expect(result.newEndTime).toBeDefined();

    // Verify auction was extended by CONFIG.EXTENSION_DURATION_MS
    const newEndMs = new Date(result.newEndTime!).getTime();
    expect(newEndMs).toBeGreaterThan(new Date(closeTime).getTime());
    expect(newEndMs - now).toBeGreaterThanOrEqual(CONFIG.EXTENSION_DURATION_MS - 2000);

    // Verify DB updated extension_count and status
    const updated = db.prepare('SELECT status, extension_count FROM auctions WHERE id = ?').get(testAuctionId) as any;
    expect(updated.status).toBe('EXTENDED');
    expect(updated.extension_count).toBe(1);
  });
});
