"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const schema_1 = require("./schema");
const logger_1 = require("../utils/logger");
let dbInstance = null;
function getDb() {
    if (dbInstance) {
        return dbInstance;
    }
    // Ensure database directory exists
    const dir = path_1.default.dirname(config_1.CONFIG.DB_PATH);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new better_sqlite3_1.default(config_1.CONFIG.DB_PATH);
    // Performance and integrity PRAGMAs for production-grade SQLite
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('synchronous = NORMAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('busy_timeout = 5000');
    // Execute schema creation
    dbInstance.exec(schema_1.CREATE_TABLES_SQL);
    logger_1.logger.info('Database initialized with WAL mode', { path: config_1.CONFIG.DB_PATH });
    return dbInstance;
}
function closeDb() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
        logger_1.logger.info('Database connection closed');
    }
}
