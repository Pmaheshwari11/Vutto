"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.CONFIG = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'motobid-production-super-secret-key-change-in-prod-2026',
    JWT_EXPIRES_IN: '24h',
    // Database configuration
    DB_PATH: process.env.DB_PATH || path_1.default.resolve(process.cwd(), 'data', 'motobid.sqlite'),
    // Real-time Auction Lifecycle & Anti-Sniping Configuration
    ANTI_SNIPE_WINDOW_MS: parseInt(process.env.ANTI_SNIPE_WINDOW_MS || '30000', 10), // 30 seconds
    EXTENSION_DURATION_MS: parseInt(process.env.EXTENSION_DURATION_MS || '60000', 10), // 60 seconds
    MAX_EXTENSIONS_PER_AUCTION: parseInt(process.env.MAX_EXTENSIONS || '15', 10),
    // Background State Ticker interval in ms
    TICKER_INTERVAL_MS: 500,
    // Rate Limiting (per window per IP/User)
    RATE_LIMIT_WINDOW_MS: 60 * 1000,
    RATE_LIMIT_MAX_REQUESTS: 200,
    BID_RATE_LIMIT_MAX: 60, // 60 bids per minute per user/IP
    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
