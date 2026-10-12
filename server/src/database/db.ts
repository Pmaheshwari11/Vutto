import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CONFIG } from '../config';
import { CREATE_TABLES_SQL } from './schema';
import { logger } from '../utils/logger';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure database directory exists
  const dir = path.dirname(CONFIG.DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(CONFIG.DB_PATH);

  // Performance and integrity PRAGMAs for production-grade SQLite
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('busy_timeout = 5000');

  // Execute schema creation
  dbInstance.exec(CREATE_TABLES_SQL);

  logger.info('Database initialized with WAL mode', { path: CONFIG.DB_PATH });
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}
