"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const db_1 = require("../database/db");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
const RegisterSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric'),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['BUYER', 'SELLER']).optional()
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1)
});
router.post('/register', async (req, res) => {
    try {
        const validated = RegisterSchema.parse(req.body);
        const result = await auth_service_1.authService.register(validated, req.ip);
        res.status(201).json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const validated = LoginSchema.parse(req.body);
        const result = await auth_service_1.authService.login(validated, req.ip);
        res.json(result);
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
});
router.get('/me', auth_middleware_1.requireAuth, (req, res) => {
    res.json({ user: req.user });
});
router.post('/deposit', auth_middleware_1.requireAuth, (req, res) => {
    try {
        const amount = Number(req.body.amount);
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Deposit amount must be greater than zero' });
            return;
        }
        const db = (0, db_1.getDb)();
        db.prepare('UPDATE users SET deposit_balance = deposit_balance + ? WHERE id = ?').run(amount, req.user.id);
        const updated = auth_service_1.authService.getUserById(req.user.id);
        audit_service_1.auditService.record({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'DEPOSIT_ADDED',
            targetEntity: 'USER',
            targetId: req.user.id,
            details: { amountAdded: amount, newBalance: updated?.deposit_balance },
            ipAddress: req.ip
        });
        res.json({ message: 'Funds deposited successfully', user: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
