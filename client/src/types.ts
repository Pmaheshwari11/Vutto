export type UserRole = 'ADMIN' | 'BUYER' | 'SELLER';

export interface SafeUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  deposit_balance: number;
  created_at: string;
}

export type AuctionStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'EXTENDED'
  | 'ENDED'
  | 'SETTLED'
  | 'UNSOLD'
  | 'CANCELLED';

export interface InspectionChecklist {
  engine_compression: 'EXCELLENT' | 'GOOD' | 'FAIR';
  transmission: 'SMOOTH' | 'ACCEPTABLE' | 'NEEDS_SERVICE';
  frame_alignment: 'PERFECT' | 'MINOR_SCRATCHES';
  electrical_system: 'PASSED' | 'WARNING';
  brake_pads_percent: number;
  front_tyre_tread_mm: number;
  rear_tyre_tread_mm: number;
  clean_title: boolean;
  service_history_verified: boolean;
  notes: string;
}

export interface Auction {
  id: string;
  seller_id: string;
  seller_name?: string;
  title: string;
  slug: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  mileage: number;
  engine_cc: number;
  horsepower: number;
  category: 'SUPERBIKE' | 'CRUISER' | 'CAFE_RACER' | 'ADVENTURE' | 'CLASSIC';
  condition_score: number;
  inspection_report: InspectionChecklist;
  images: string[];
  starting_price: number;
  reserve_price: number;
  reserve_met: boolean;
  min_increment: number;
  current_price: number;
  highest_bidder_id: string | null;
  highest_bidder_name?: string | null;
  bid_count: number;
  status: AuctionStatus;
  start_time: string;
  end_time: string;
  original_end_time: string;
  extension_count: number;
  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bidder_name: string;
  amount: number;
  sequence_num: number;
  is_winning: boolean;
  ip_address?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_entity: string;
  target_id: string;
  details: Record<string, any>;
  ip_address: string;
}

export interface SystemMetricsSnapshot {
  timestamp: string;
  uptime_seconds: number;
  active_auctions: number;
  active_ws_connections: number;
  total_bids_processed: number;
  successful_bids: number;
  rejected_bids: number;
  anti_sniping_extensions: number;
  memory_heap_mb: number;
  memory_rss_mb: number;
  event_loop_lag_ms: number;
  p50_bid_latency_ms: number;
  p95_bid_latency_ms: number;
  p99_bid_latency_ms: number;
}
