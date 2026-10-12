export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'BUYER', 'SELLER')),
  deposit_balance REAL NOT NULL DEFAULT 50000.0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT NOT NULL UNIQUE,
  mileage INTEGER NOT NULL,
  engine_cc INTEGER NOT NULL,
  horsepower INTEGER NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('SUPERBIKE', 'CRUISER', 'CAFE_RACER', 'ADVENTURE', 'CLASSIC')),
  condition_score INTEGER NOT NULL,
  inspection_report TEXT NOT NULL, -- JSON string
  images TEXT NOT NULL,            -- JSON array of URLs
  starting_price REAL NOT NULL,
  reserve_price REAL NOT NULL,
  reserve_met INTEGER NOT NULL DEFAULT 0, -- Boolean 0 or 1
  min_increment REAL NOT NULL,
  current_price REAL NOT NULL,
  highest_bidder_id TEXT,
  bid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXTENDED', 'ENDED', 'SETTLED', 'UNSOLD', 'CANCELLED')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  original_end_time TEXT NOT NULL,
  extension_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (highest_bidder_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  bidder_id TEXT NOT NULL,
  amount REAL NOT NULL,
  sequence_num INTEGER NOT NULL,
  is_winning INTEGER NOT NULL DEFAULT 1,
  ip_address TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (auction_id) REFERENCES auctions(id),
  FOREIGN KEY (bidder_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL, -- JSON string
  ip_address TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  auction_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, auction_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (auction_id) REFERENCES auctions(id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id, sequence_num DESC);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
`;
