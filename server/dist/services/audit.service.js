"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const db_1 = require("../database/db");
const logger_1 = require("../utils/logger");
class AuditService {
    record(entry) {
        try {
            const db = (0, db_1.getDb)();
            const id = 'aud_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
            const timestamp = new Date().toISOString();
            db.prepare(`
        INSERT INTO audit_logs (id, timestamp, actor_id, actor_role, action, target_entity, target_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, timestamp, entry.actorId || null, entry.actorRole || null, entry.action, entry.targetEntity, entry.targetId, JSON.stringify(entry.details), entry.ipAddress || 'internal');
            logger_1.logger.info(`Audit Log: [${entry.action}] on ${entry.targetEntity}:${entry.targetId}`, {
                auditId: id,
                actorId: entry.actorId,
                action: entry.action,
                targetId: entry.targetId
            });
        }
        catch (err) {
            logger_1.logger.error('Failed to write audit log', { error: err.message });
        }
    }
    getLogs(limit = 100, actionFilter) {
        const db = (0, db_1.getDb)();
        let query = 'SELECT * FROM audit_logs';
        const params = [];
        if (actionFilter) {
            query += ' WHERE action = ?';
            params.push(actionFilter);
        }
        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);
        const rows = db.prepare(query).all(...params);
        return rows.map((r) => ({
            id: r.id,
            timestamp: r.timestamp,
            actor_id: r.actor_id,
            actor_role: r.actor_role,
            action: r.action,
            target_entity: r.target_entity,
            target_id: r.target_id,
            details: JSON.parse(r.details || '{}'),
            ip_address: r.ip_address
        }));
    }
}
exports.auditService = new AuditService();
