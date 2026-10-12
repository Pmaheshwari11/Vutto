"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.requireRole = requireRole;
const auth_service_1 = require("../services/auth.service");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required. Bearer token missing.' });
        return;
    }
    const token = authHeader.substring(7);
    const user = auth_service_1.authService.verifyToken(token);
    if (!user) {
        res.status(401).json({ error: 'Invalid or expired session token.' });
        return;
    }
    // Refresh user deposit & latest status from DB
    const dbUser = auth_service_1.authService.getUserById(user.id);
    if (!dbUser) {
        res.status(401).json({ error: 'User account no longer exists.' });
        return;
    }
    req.user = dbUser;
    next();
}
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = auth_service_1.authService.verifyToken(token);
        if (user) {
            const dbUser = auth_service_1.authService.getUserById(user.id);
            if (dbUser)
                req.user = dbUser;
        }
    }
    next();
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized. Authentication required.' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                error: `Forbidden. Role '${req.user.role}' is not authorized. Required: ${roles.join(' or ')}`
            });
            return;
        }
        next();
    };
}
