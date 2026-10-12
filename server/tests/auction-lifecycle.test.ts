import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeDb } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { auctionService } from '../src/services/auction.service';
import { authService } from '../src/services/auth.service';

describe('Auction Lifecycle State Machine Engine', () => {
  beforeAll(() => {
    seedDatabase();
  });

  afterAll(() => {
    closeDb();
  });

  it('filters auctions by status, category, and search query', () => {
    const liveAuctions = auctionService.getAuctions({ status: 'LIVE' });
    expect(liveAuctions.length).toBeGreaterThan(0);
    expect(liveAuctions.every((a) => a.status === 'ACTIVE' || a.status === 'EXTENDED')).toBe(true);

    const superbikes = auctionService.getAuctions({ category: 'SUPERBIKE' });
    expect(superbikes.every((a) => a.category === 'SUPERBIKE')).toBe(true);

    const searchResults = auctionService.getAuctions({ search: 'Ducati' });
    expect(searchResults.some((a) => a.make === 'Ducati')).toBe(true);
  });

  it('masks reserve price for non-admin buyers when reserve is not yet met', () => {
    const auction = auctionService.getAuctionById('auc_bmw_1250gs', 'BUYER')!;
    expect(auction).toBeDefined();
    expect(auction.reserve_met).toBe(false);
    expect(auction.reserve_price).toBe(0); // Masked!

    const adminAuction = auctionService.getAuctionById('auc_bmw_1250gs', 'ADMIN')!;
    expect(adminAuction.reserve_price).toBeGreaterThan(0); // Visible to admin!
  });

  it('allows administrator to manually extend auction by N seconds', () => {
    const admin = authService.getUserById('usr_admin_01')!;
    const before = auctionService.getAuctionById('auc_ducati_v4s', 'ADMIN')!;
    const beforeEndMs = new Date(before.end_time).getTime();

    const extended = auctionService.adminExtendAuction('auc_ducati_v4s', 300, admin);
    const afterEndMs = new Date(extended.end_time).getTime();

    expect(afterEndMs - beforeEndMs).toBeCloseTo(300 * 1000, -3);
    expect(extended.status).toBe('EXTENDED');
  });

  it('creates new auction with full inspection specifications', () => {
    const seller = authService.getUserById('usr_seller_01')!;
    const uniqueVin = 'VIN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const newAuction = auctionService.createAuction(
      {
        sellerId: seller.id,
        title: '2022 Aprilia RSV4 Factory 1100',
        make: 'Aprilia',
        model: 'RSV4 Factory',
        year: 2022,
        vin: uniqueVin,
        mileage: 2100,
        engine_cc: 1099,
        horsepower: 217,
        category: 'SUPERBIKE',
        condition_score: 98,
        inspection_report: {
          engine_compression: 'EXCELLENT',
          transmission: 'SMOOTH',
          frame_alignment: 'PERFECT',
          electrical_system: 'PASSED',
          brake_pads_percent: 95,
          front_tyre_tread_mm: 4.8,
          rear_tyre_tread_mm: 5.2,
          clean_title: true,
          service_history_verified: true,
          notes: 'Factory semi-active suspension. Carbon winglets.'
        },
        images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1200&auto=format&fit=crop'],
        starting_price: 19000,
        reserve_price: 22000,
        min_increment: 200,
        durationMinutes: 120,
        startImmediately: true
      },
      seller
    );

    expect(newAuction.id).toBeDefined();
    expect(newAuction.status).toBe('ACTIVE');
    expect(newAuction.make).toBe('Aprilia');
    expect(newAuction.condition_score).toBe(98);
  });
});
