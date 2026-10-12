"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../database/db");
const config_1 = require("../config");
const audit_service_1 = require("./audit.service");
class AuthService {
    async register(data, ipAddress = '127.0.0.1') {
        const db = (0, db_1.getDb)();
        // Check duplicate
        const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(data.email, data.username);
        if (existing) {
            throw new Error('User with this email or username already exists');
        }
        const id = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
        const hash = await bcryptjs_1.default.hash(data.password, 10);
        const role = data.role || 'BUYER';
        const depositBalance = 50000.0;
        const createdAt = new Date().toISOString();
        db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, deposit_balance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.username, data.email, hash, role, depositBalance, createdAt);
        audit_service_1.auditService.record({
            actorId: id,
            actorRole: role,
            action: 'USER_REGISTERED',
            targetEntity: 'USER',
            targetId: id,
            details: { username: data.username, email: data.email, role },
            ipAddress
        });
        const safeUser = {
            id,
            username: data.username,
            email: data.email,
            role,
            deposit_balance: depositBalance,
            created_at: createdAt
        };
        const token = this.generateToken(safeUser);
        return { token, user: safeUser };
    }
    async login(credentials, ipAddress = '127.0.0.1') {
        const db = (0, db_1.getDb)();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(credentials.email);
        if (!user) {
            throw new Error('Invalid email or password');
        }
        const isMatch = await bcryptjs_1.default.compare(credentials.password, user.password_hash);
        if (!isMatch) {
            audit_service_1.auditService.record({
                actorId: user.id,
                actorRole: user.role,
                action: 'LOGIN_FAILED',
                targetEntity: 'USER',
                targetId: user.id,
                details: { email: credentials.email },
                ipAddress
            });
            throw new Error('Invalid email or password');
        }
        audit_service_1.auditService.record({
            actorId: user.id,
            actorRole: user.role,
            action: 'LOGIN_SUCCESS',
            targetEntity: 'USER',
            targetId: user.id,
            details: { email: credentials.email },
            ipAddress
        });
        const safeUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            deposit_balance: user.deposit_balance,
            created_at: user.created_at
        };
        const token = this.generateToken(safeUser);
        return { token, user: safeUser };
    }
    getUserById(id) {
        const db = (0, db_1.getDb)();
        const user = db.prepare('SELECT id, username, email, role, deposit_balance, created_at FROM users WHERE id = ?').get(id);
        return user || null;
    }
    generateToken(user) {
        return jsonwebtoken_1.default.sign({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        }, config_1.CONFIG.JWT_SECRET, { expiresIn: config_1.CONFIG.JWT_EXPIRES_IN });
    }
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.CONFIG.JWT_SECRET);
            return {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                role: decoded.role,
                deposit_balance: 0,
                created_at: ''
            };
        }
        catch {
            return null;
        }
    }
}
exports.authService = new AuthService();
