import bcrypt from 'bcryptjs';
import { getDb } from './db';
import { logger } from '../utils/logger';

export function seedDatabase(): void {
  const db = getDb();

  // Check if users already seeded
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) {
    logger.info('Database already seeded, skipping seed step');
    return;
  }

  logger.info('Seeding database with production initial data...');

  // Hash passwords
  const adminPasswordHash = bcrypt.hashSync('AdminPass123!', 10);
  const buyerPasswordHash = bcrypt.hashSync('BuyerPass123!', 10);
  const sellerPasswordHash = bcrypt.hashSync('SellerPass123!', 10);

  const now = new Date();

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, password_hash, role, deposit_balance, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    {
      id: 'usr_admin_01',
      username: 'system_admin',
      email: 'admin@motobid.io',
      hash: adminPasswordHash,
      role: 'ADMIN',
      balance: 1000000.0
    },
    {
      id: 'usr_buyer_01',
      username: 'alex_rider',
      email: 'alex.rider@motobid.io',
      hash: buyerPasswordHash,
      role: 'BUYER',
      balance: 150000.0
    },
    {
      id: 'usr_buyer_02',
      username: 'sarah_speed',
      email: 'sarah.moto@motobid.io',
      hash: buyerPasswordHash,
      role: 'BUYER',
      balance: 200000.0
    },
    {
      id: 'usr_seller_01',
      username: 'marcus_motowerks',
      email: 'marcus.dealer@motobid.io',
      hash: sellerPasswordHash,
      role: 'SELLER',
      balance: 50000.0
    }
  ];

  for (const u of users) {
    insertUser.run(u.id, u.username, u.email, u.hash, u.role, u.balance, now.toISOString());
  }

  // 2. Insert Auctions
  const insertAuction = db.prepare(`
    INSERT OR IGNORE INTO auctions (
      id, seller_id, title, slug, make, model, year, vin, mileage, engine_cc, horsepower,
      category, condition_score, inspection_report, images, starting_price, reserve_price,
      reserve_met, min_increment, current_price, highest_bidder_id, bid_count, status,
      start_time, end_time, original_end_time, extension_count, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const insertBid = db.prepare(`
    INSERT OR IGNORE INTO bids (id, auction_id, bidder_id, amount, sequence_num, is_winning, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Time calculations
  const tMinus10m = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const tMinus20m = new Date(now.getTime() - 20 * 60 * 1000).toISOString();
  const tMinus2h = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const tMinus3h = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
  
  // Future times
  const tPlus45s = new Date(now.getTime() + 45 * 1000).toISOString(); // Immediate anti-sniping demo!
  const tPlus8m = new Date(now.getTime() + 8 * 60 * 1000).toISOString();
  const tPlus25m = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
  const tPlus50m = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
  const tPlus2h = new Date(now.getTime() + 2 * 3600 * 1000).toISOString();

  const auctions = [
    {
      id: 'auc_ducati_v4s',
      seller_id: 'usr_seller_01',
      title: '2023 Ducati Panigale V4 S — Öhlins Electronic Suspension & Akrapovič Full Titanium',
      slug: '2023-ducati-panigale-v4s',
      make: 'Ducati',
      model: 'Panigale V4 S',
      year: 2023,
      vin: 'ZD1DA06W8PB004921',
      mileage: 3240,
      engine_cc: 1103,
      horsepower: 214,
      category: 'SUPERBIKE',
      condition_score: 97,
      inspection_report: JSON.stringify({
        engine_compression: 'EXCELLENT',
        transmission: 'SMOOTH',
        frame_alignment: 'PERFECT',
        electrical_system: 'PASSED',
        brake_pads_percent: 92,
        front_tyre_tread_mm: 4.5,
        rear_tyre_tread_mm: 5.0,
        clean_title: true,
        service_history_verified: true,
        notes: 'Single owner, dry-garage stored. Akrapovič racing exhaust mapped with factory Ducati up-map. Dyno tested at 217 hp.'
      }),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558980664-769d59546b3d?q=80&w=1200&auto=format&fit=crop'
      ]),
      starting_price: 22000.0,
      reserve_price: 26000.0,
      reserve_met: 0,
      min_increment: 250.0,
      current_price: 24750.0,
      highest_bidder_id: 'usr_buyer_01',
      bid_count: 5,
      status: 'ACTIVE',
      start_time: tMinus20m,
      end_time: tPlus25m,
      original_end_time: tPlus25m,
      extension_count: 0
    },
    {
      id: 'auc_yamaha_r1m',
      seller_id: 'usr_seller_01',
      title: '2024 Yamaha YZF-R1M Carbon Special Edition #314 — Pure Track DNA',
      slug: '2024-yamaha-yzf-r1m-carbon',
      make: 'Yamaha',
      model: 'YZF-R1M',
      year: 2024,
      vin: 'JYARN39E2PA008812',
      mileage: 1120,
      engine_cc: 998,
      horsepower: 200,
      category: 'SUPERBIKE',
      condition_score: 99,
      inspection_report: JSON.stringify({
        engine_compression: 'EXCELLENT',
        transmission: 'SMOOTH',
        frame_alignment: 'PERFECT',
        electrical_system: 'PASSED',
        brake_pads_percent: 98,
        front_tyre_tread_mm: 4.8,
        rear_tyre_tread_mm: 5.5,
        clean_title: true,
        service_history_verified: true,
        notes: 'Immaculate carbon fiber bodywork. Never dropped, zero track days. Factory Öhlins ERS suspension.'
      }),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1609630875171-b1321377ee65?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?q=80&w=1200&auto=format&fit=crop'
      ]),
      starting_price: 23000.0,
      reserve_price: 26500.0,
      reserve_met: 1,
      min_increment: 250.0,
      current_price: 26750.0,
      highest_bidder_id: 'usr_buyer_02',
      bid_count: 7,
      status: 'ACTIVE', // Ending very soon to demo anti-sniping soft close!
      start_time: tMinus20m,
      end_time: tPlus45s,
      original_end_time: tPlus45s,
      extension_count: 0
    },
    {
      id: 'auc_bmw_1250gs',
      seller_id: 'usr_seller_01',
      title: '2022 BMW R 1250 GS Adventure Triple Black — Full Touratech Expedition Luggage',
      slug: '2022-bmw-r1250-gs-adventure',
      make: 'BMW',
      model: 'R 1250 GS Adventure',
      year: 2022,
      vin: 'WB10J9305N6F19920',
      mileage: 8940,
      engine_cc: 1254,
      horsepower: 136,
      category: 'ADVENTURE',
      condition_score: 94,
      inspection_report: JSON.stringify({
        engine_compression: 'EXCELLENT',
        transmission: 'SMOOTH',
        frame_alignment: 'PERFECT',
        electrical_system: 'PASSED',
        brake_pads_percent: 85,
        front_tyre_tread_mm: 4.1,
        rear_tyre_tread_mm: 4.6,
        clean_title: true,
        service_history_verified: true,
        notes: 'Full BMW Motorrad dealer service records. Dynamic ESA, Shift Assist Pro, Heated Grips, Keyless Ride.'
      }),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4?q=80&w=1200&auto=format&fit=crop'
      ]),
      starting_price: 16500.0,
      reserve_price: 18500.0,
      reserve_met: 0,
      min_increment: 200.0,
      current_price: 17800.0,
      highest_bidder_id: 'usr_buyer_01',
      bid_count: 4,
      status: 'ACTIVE',
      start_time: tMinus10m,
      end_time: tPlus8m,
      original_end_time: tPlus8m,
      extension_count: 0
    },
    {
      id: 'auc_harley_fatboy',
      seller_id: 'usr_seller_01',
      title: '2021 Harley-Davidson Fat Boy 114 — Milwaukee-Eight 1868cc Vance & Hines Big Shots',
      slug: '2021-harley-davidson-fat-boy-114',
      make: 'Harley-Davidson',
      model: 'Fat Boy 114',
      year: 2021,
      vin: '1HD1YEK14MB029941',
      mileage: 4320,
      engine_cc: 1868,
      horsepower: 94,
      category: 'CRUISER',
      condition_score: 92,
      inspection_report: JSON.stringify({
        engine_compression: 'GOOD',
        transmission: 'SMOOTH',
        frame_alignment: 'PERFECT',
        electrical_system: 'PASSED',
        brake_pads_percent: 88,
        front_tyre_tread_mm: 4.0,
        rear_tyre_tread_mm: 4.2,
        clean_title: true,
        service_history_verified: true,
        notes: 'Chrome solid-disc Lakester wheels in flawless shape. Custom Sargent gel touring seat and quick-release sissy bar.'
      }),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1558981285-6f0c94958bb6?q=80&w=1200&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1200&auto=format&fit=crop'
      ]),
      starting_price: 14500.0,
      reserve_price: 16000.0,
      reserve_met: 0,
      min_increment: 200.0,
      current_price: 14500.0,
      highest_bidder_id: null,
      bid_count: 0,
      status: 'SCHEDULED',
      start_time: tPlus8m,
      end_time: tPlus2h,
      original_end_time: tPlus2h,
      extension_count: 0
    },
    {
      id: 'auc_triumph_thruxton',
      seller_id: 'usr_seller_01',
      title: '2020 Triumph Thruxton RS — Showa BPF & Öhlins Twin Shocks, Matt Storm Grey',
      slug: '2020-triumph-thruxton-rs',
      make: 'Triumph',
      model: 'Thruxton RS',
      year: 2020,
      vin: 'SMTT02RL5LT982310',
      mileage: 5120,
      engine_cc: 1200,
      horsepower: 104,
      category: 'CAFE_RACER',
      condition_score: 95,
      inspection_report: JSON.stringify({
        engine_compression: 'EXCELLENT',
        transmission: 'SMOOTH',
        frame_alignment: 'PERFECT',
        electrical_system: 'PASSED',
        brake_pads_percent: 90,
        front_tyre_tread_mm: 4.4,
        rear_tyre_tread_mm: 4.8,
        clean_title: true,
        service_history_verified: true,
        notes: 'Authentic modern cafe racer. Metzeler Racetec RR tires with high tread. Stainless steel Vance & Hines megaphone slip-ons.'
      }),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1200&auto=format&fit=crop'
      ]),
      starting_price: 11000.0,
      reserve_price: 13000.0,
      reserve_met: 0,
      min_increment: 150.0,
      current_price: 12200.0,
      highest_bidder_id: 'usr_buyer_02',
      bid_count: 3,
      status: 'ACTIVE',
      start_time: tMinus10m,
      end_time: tPlus50m,
      original_end_time: tPlus50m,
      extension_count: 0
    },
    {
      id: 'auc_norton_commando',
      seller_id: 'usr_seller_01',
      title: '1974 Norton Commando 850 Interstate — Restored British Twin Classic',
      slug: '1974-norton-commando-850',
      make: 'Norton',
      model: 'Commando 850',
      year: 1974,
      vin: '307328N1974',
      mileage: 14200,
      engine_cc: 828,
      horsepower: 60,
      category: 'CLASSIC',
      condition_score: 89,
      inspection_report: JSON.stringify({
        engine_compression: 'GOOD',
        transmission: 'ACCEPTABLE',
        frame_alignment: 'PERFECT',
        electrical_system: 'PASSED',
        brake_pads_percent: 80,
        front_tyre_tread_mm: 3.8,
        rear_tyre_tread_mm: 4.0,
        clean_title: true,
        service_history_verified: true,
        notes: 'Complete frame-off mechanical restoration in 2022 with Boyer Bransden electronic ignition. Isolastic mounts adjusted to spec.'
      }),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop'
      ]),
      starting_price: 9000.0,
      reserve_price: 12000.0,
      reserve_met: 1,
      min_increment: 150.0,
      current_price: 14200.0,
      highest_bidder_id: 'usr_buyer_01',
      bid_count: 8,
      status: 'SETTLED',
      start_time: tMinus3h,
      end_time: tMinus2h,
      original_end_time: tMinus2h,
      extension_count: 1
    }
  ];

  for (const a of auctions) {
    insertAuction.run(
      a.id, a.seller_id, a.title, a.slug, a.make, a.model, a.year, a.vin, a.mileage,
      a.engine_cc, a.horsepower, a.category, a.condition_score, a.inspection_report,
      a.images, a.starting_price, a.reserve_price, a.reserve_met, a.min_increment,
      a.current_price, a.highest_bidder_id, a.bid_count, a.status, a.start_time,
      a.end_time, a.original_end_time, a.extension_count, now.toISOString()
    );
  }

  // 3. Seed historical bids for Panigale and Yamaha to provide instant rich bid feeds
  const seedBids = [
    { id: 'bid_ducati_1', auction_id: 'auc_ducati_v4s', bidder_id: 'usr_buyer_01', amount: 22000, seq: 1 },
    { id: 'bid_ducati_2', auction_id: 'auc_ducati_v4s', bidder_id: 'usr_buyer_02', amount: 22500, seq: 2 },
    { id: 'bid_ducati_3', auction_id: 'auc_ducati_v4s', bidder_id: 'usr_buyer_01', amount: 23250, seq: 3 },
    { id: 'bid_ducati_4', auction_id: 'auc_ducati_v4s', bidder_id: 'usr_buyer_02', amount: 24000, seq: 4 },
    { id: 'bid_ducati_5', auction_id: 'auc_ducati_v4s', bidder_id: 'usr_buyer_01', amount: 24750, seq: 5 },
    { id: 'bid_yamaha_1', auction_id: 'auc_yamaha_r1m', bidder_id: 'usr_buyer_02', amount: 23000, seq: 1 },
    { id: 'bid_yamaha_2', auction_id: 'auc_yamaha_r1m', bidder_id: 'usr_buyer_01', amount: 24000, seq: 2 },
    { id: 'bid_yamaha_3', auction_id: 'auc_yamaha_r1m', bidder_id: 'usr_buyer_02', amount: 25000, seq: 3 },
    { id: 'bid_yamaha_4', auction_id: 'auc_yamaha_r1m', bidder_id: 'usr_buyer_01', amount: 25500, seq: 4 },
    { id: 'bid_yamaha_5', auction_id: 'auc_yamaha_r1m', bidder_id: 'usr_buyer_02', amount: 26000, seq: 5 },
    { id: 'bid_yamaha_6', auction_id: 'auc_yamaha_r1m', bidder_id: 'usr_buyer_01', amount: 26500, seq: 6 },
    { id: 'bid_yamaha_7', auction_id: 'auc_yamaha_r1m', bidder_id: 'usr_buyer_02', amount: 26750, seq: 7 }
  ];

  for (const b of seedBids) {
    insertBid.run(
      b.id, b.auction_id, b.bidder_id, b.amount, b.seq,
      b.seq === 5 || b.seq === 7 ? 1 : 0, '127.0.0.1', now.toISOString()
    );
  }

  // 4. Initial Audit Log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, actor_id, actor_role, action, target_entity, target_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAudit.run(
    'aud_seed_01', now.toISOString(), 'usr_admin_01', 'ADMIN', 'SYSTEM_INITIALIZATION',
    'SYSTEM', 'SYSTEM', JSON.stringify({ message: 'Seeded initial inventory and users' }), '127.0.0.1'
  );

  logger.info('Database seeded successfully with users, auctions, and bids.');
}
