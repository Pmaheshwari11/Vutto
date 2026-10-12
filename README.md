# 🏍️ MotoBid — Production-Grade Bike Auction Platform

> **Software Engineering Internship Assignment Submission**  
> A high-performance, real-time live auction platform for used motorcycles engineered with sub-millisecond concurrency locks, dynamic anti-sniping soft-close protection, comprehensive operational observability, and a modern motorsport-inspired user experience.

---

## ⚡ Quick Links & Seed Credentials

Out of the box, the database is pre-seeded with realistic motorcycle inventory and multi-role accounts. You can also use the **1-Click Role Switcher** in the top navigation bar to toggle between accounts instantly:

| Role | Email | Password | Pre-Funded Balance | Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | `admin@motobid.io` | `AdminPass123!` | $1,000,000 | SRE Telemetry, Audit Logs, Manual Extensions, Force Close, Load Simulator |
| **Pro Buyer 1** | `alex.rider@motobid.io` | `BuyerPass123!` | $150,000 | Live Bidding, Quick Bids, Outbid Alerts, Inspection Sheets |
| **Pro Buyer 2** | `sarah.moto@motobid.io` | `BuyerPass123!` | $200,000 | Concurrent Live Counter-Bidding, Anti-Sniping Testing |
| **Verified Seller** | `marcus.dealer@motobid.io` | `SellerPass123!` | $50,000 | Create Bike Listings, Configure Reserve & Min Increments |

---

## 🚀 Quickstart (Run in 2 Minutes)

### Option 1: Standard Node.js
```bash
# 1. Clone repository & navigate to project
cd bike-auction-platform

# 2. Install all dependencies across workspaces
npm run install:all

# 3. Build production client and server bundles
npm run build

# 4. Start production server
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser!

### Option 2: Docker Compose (1 Command)
```bash
docker compose up --build
```
Open **[http://localhost:5000](http://localhost:5000)**.

---

## 🧪 Automated Testing Suite

The platform includes a comprehensive automated test suite in **Vitest** verifying concurrency resilience, anti-sniping mechanics, and RBAC:

```bash
# Run all tests
npm test
```

### Test Coverage Highlights:
- **`bidding-concurrency.test.ts`**: Dispatches 10 simultaneous bids targeting the same auction at the exact same millisecond. Asserts strict linearizability, monotonic sequence numbers, zero lost updates, and graceful rejection of stale bids.
- **`anti-sniping.test.ts`**: Submits a bid at $T - 15\text{s}$ to assert that the anti-sniping engine pushes the auction deadline by exactly 60 seconds and updates status to `EXTENDED`.
- **`auction-lifecycle.test.ts`**: Tests state machine transitions (`SCHEDULED` $\rightarrow$ `ACTIVE` $\rightarrow$ `ENDED`), reserve price masking, and manual admin extensions.
- **`auth-rbac.test.ts`**: Verifies JWT authentication, bcrypt password validation, and 403 Forbidden enforcement on restricted endpoints.

---

## 🏗️ Architecture & Core Engineering Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Single Page App (Vite)                    │
│   - Live Auction Arena        - Admin SRE Telemetry    - Sound FX Synth│
│   - Real-time Bid Stream      - Multi-Auction Lobby    - Bot Simulator │
└──────────────────┬───────────────────────────────────┬─────────────────┘
                   │ HTTP/REST (Zod Validated)         │ WebSocket (Frames)
                   ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Express Gateway & Observability                   │
│   - Request Tracing (x-request-id)   - Sliding-Window Rate Limiter     │
│   - JWT / RBAC Middleware            - Prometheus /metrics Exporter    │
└──────────────────┬───────────────────────────────────┬─────────────────┘
                   │                                   │
                   ▼                                   ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│     High-Concurrency Bidding Engine  │ │   WebSocket Room Broker       │
│  - Per-Auction Keyed Mutex Lock      │ │   - auction:{id} Room Pub/Sub │
│  - Monotonic Sequence Versioning     │ │   - Targeted OUTBID Messages  │
│  - Dynamic Anti-Sniping Soft-Close   │ │   - 30s Heartbeat Ping/Pong   │
└──────────────────┬───────────────────┘ └───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐ ┌───────────────────────────────┐
│     Auction Lifecycle Ticker         │ │   Immutable Audit Logger      │
│  - 500ms Drift-Free State Machine    │ │   - Append-Only Audit Trail   │
│  - Reserve Price Evaluation          │ │   - Cryptographic / Actor Log │
└──────────────────┬───────────────────┘ └──────────────┬────────────────┘
                   │                                    │
                   └─────────────────┬──────────────────┘
                                     ▼
                   ┌──────────────────────────────────┐
                   │ Transactional SQLite (WAL Mode)  │
                   │  - ACID Durability, Zero Spoil   │
                   │  - Microsecond Local Read/Write  │
                   └──────────────────────────────────┘
```

### 1. High-Concurrency Bidding Engine
- **Per-Auction Keyed Mutex (`AsyncKeyedLock`)**: Isolates concurrent bid requests by auction ID in memory. Guarantees that conflicting bids arriving simultaneously are serialized in exact arrival order, eliminating race conditions while allowing independent auctions to process in parallel.
- **Monotonic Sequence Indexing**: Every accepted bid receives an incremental sequence number (`sequence_num = bid_count + 1`) verified under lock.

### 2. Dynamic Anti-Sniping (Soft-Close) Engine
- **Problem**: Fixed-deadline auctions are vulnerable to automated bot sniping at $T - 500\text{ms}$, preventing legitimate human bidders from reacting.
- **Solution**: If a valid bid is placed within the final **30 seconds** of an auction, the deadline is dynamically extended by **60 seconds** (capped at 15 extensions). Real-time events alert all participants to counter-bid.

### 3. Production-Grade Observability (SRE Center)
- **Prometheus Metrics (`/metrics`)**: Standard RED/USE metrics exposing `http_requests_total`, `http_request_duration_seconds`, `ws_active_connections`, `bids_processed_total`, `bid_processing_duration_seconds`, and `anti_sniping_extensions_total`.
- **Structured JSON Logging**: Every log entry includes an ISO timestamp, correlation ID (`x-request-id`), service tag, latency in ms, and user context.
- **Health Probes**:
  - `GET /health`: Comprehensive status with database latency (sub-0.1ms), memory footprint, and uptime.
  - `GET /health/live`: Kubernetes / Docker liveness probe.
  - `GET /health/ready`: Database read/write readiness probe.
- **Immutable Audit Trail**: Append-only audit logger capturing all bids, state transitions, authentication attempts, and admin overrides with IP address and timestamp.
- **Synthetic Load Generator**: Built into the Admin UI, allowing evaluators to simulate concurrent bot bidding with 1 click to test live socket streaming and anti-sniping.

### 4. Motorsport User Experience & Audio Synthesizer
- **Dark Motorsport Aesthetic**: Jet-black carbon grid with racing gold, emerald leader glow, and pulsing crimson soft-close alerts.
- **Procedural Web Audio API**: Zero external audio files required. Uses native browser audio synthesis to produce realistic pneumatic bid chimes, outbid alert sirens, and resonant wooden gavel strikes.
- **100-Point Mechanical Inspection Reports**: Complete breakdown of Engine compression, Transmission, Frame alignment, Brake pad %, Tyre tread mm, and verified clean title status.

---

## 📡 API Reference & WebSocket Protocol

### REST Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | High-level system health and DB latency |
| `GET` | `/metrics` | Public | Prometheus text exposition format |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `POST` | `/api/auth/register` | Public | Register new buyer or seller account |
| `POST` | `/api/auth/deposit` | User | Deposit mock escrow funds |
| `GET` | `/api/auctions` | Optional | List auctions with status/category filters |
| `GET` | `/api/auctions/:id` | Optional | Retrieve auction details and bid history |
| `POST` | `/api/auctions` | Seller/Admin | Create new motorcycle listing |
| `POST` | `/api/auctions/:id/bids` | User | **Place bid (Locked & anti-sniping evaluated)** |
| `GET` | `/api/admin/metrics` | Admin | Real-time SRE telemetry snapshot |
| `GET` | `/api/admin/audit-logs` | Admin | Query filterable immutable audit trail |
| `POST` | `/api/admin/auctions/:id/extend` | Admin | Manually extend auction deadline |
| `POST` | `/api/admin/auctions/:id/force-close` | Admin | Emergency force close auction |
| `POST` | `/api/admin/simulate-bot-bid` | Admin | Trigger synthetic bot bid for testing |

### WebSocket Events (`/ws`)

| Event | Direction | Payload Description |
| :--- | :--- | :--- |
| `SUBSCRIBE` | Client $\rightarrow$ Server | Join `auction:{id}` room |
| `UNSUBSCRIBE` | Client $\rightarrow$ Server | Leave `auction:{id}` room |
| `BID_PLACED` | Server $\rightarrow$ Room | Broadcast new winning bid, amount, bidder, and deadline |
| `OUTBID` | Server $\rightarrow$ Displaced User | Targeted alert notifying previous highest bidder |
| `AUCTION_EXTENDED` | Server $\rightarrow$ Room | Alert indicating anti-sniping soft-close extension |
| `STATUS_CHANGED` | Server $\rightarrow$ Global | Lifecycle transition (`ACTIVE`, `ENDED`, `UNSOLD`) |
| `PING` / `PONG` | Bi-directional | 30s heartbeat connection keep-alive |

---

## 📚 Detailed Documentation Links

- **[System Architecture & Design Document](docs/ARCHITECTURE.md)**: Deep dive into the hexagonal architecture, mutex locking, state machine, and data models.
- **[Assumptions & Engineering Trade-offs](docs/ASSUMPTIONS_AND_TRADEOFFS.md)**: Discussion of trade-offs made (SQLite WAL vs Postgres, In-memory Mutex vs Redis Redlock, Web Audio synthesis) and the multi-instance horizontal scaling roadmap.
- **[Production Deployment Guide](docs/DEPLOYMENT.md)**: Step-by-step instructions for Docker, Kubernetes, Nginx reverse proxy, and cloud platforms (Render, Railway, Fly.io, AWS).

---

## 👥 Contributors
Developed for the **Software Engineering Internship Assignment**.
All source code, tests, documentation, and configuration are production-ready.
