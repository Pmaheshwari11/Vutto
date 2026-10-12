"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsService = void 0;
const ws_1 = require("ws");
const logger_1 = require("../utils/logger");
const observability_service_1 = require("./observability.service");
class WebSocketService {
    wss = null;
    rooms = new Map();
    userSockets = new Map();
    heartbeatInterval = null;
    initialize(server) {
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (ws, req) => {
            ws.isAlive = true;
            ws.subscriptions = new Set();
            const clientIp = req.socket.remoteAddress || 'unknown';
            logger_1.logger.info('WebSocket client connected', { clientIp });
            this.updateConnectionMetrics();
            // Default subscribe to global updates
            this.joinRoom(ws, 'global');
            ws.on('pong', () => {
                ws.isAlive = true;
            });
            ws.on('message', (raw) => {
                try {
                    const payload = JSON.parse(raw.toString());
                    this.handleClientMessage(ws, payload);
                }
                catch (err) {
                    logger_1.logger.warn('Failed to parse WebSocket message', { error: err.message });
                }
            });
            ws.on('close', () => {
                logger_1.logger.info('WebSocket client disconnected');
                this.cleanupSocket(ws);
                this.updateConnectionMetrics();
            });
            ws.on('error', (err) => {
                logger_1.logger.error('WebSocket connection error', { error: err.message });
                this.cleanupSocket(ws);
                this.updateConnectionMetrics();
            });
            // Send initial welcome message
            this.sendDirect(ws, {
                event: 'SYSTEM_ALERT',
                data: { message: 'Connected to MotoBid Real-time Engine' },
                timestamp: new Date().toISOString()
            });
        });
        // Setup heartbeat to purge stale sockets
        this.heartbeatInterval = setInterval(() => {
            if (!this.wss)
                return;
            this.wss.clients.forEach((client) => {
                const extWs = client;
                if (!extWs.isAlive) {
                    extWs.terminate();
                    return;
                }
                extWs.isAlive = false;
                extWs.ping();
            });
        }, 30000);
        logger_1.logger.info('WebSocket gateway initialized on path /ws');
    }
    handleClientMessage(ws, msg) {
        switch (msg.event) {
            case 'SUBSCRIBE':
                if (msg.auction_id) {
                    this.joinRoom(ws, `auction:${msg.auction_id}`);
                }
                break;
            case 'UNSUBSCRIBE':
                if (msg.auction_id) {
                    this.leaveRoom(ws, `auction:${msg.auction_id}`);
                }
                break;
            case 'AUTH':
                if (msg.user_id) {
                    ws.userId = msg.user_id;
                    if (!this.userSockets.has(msg.user_id)) {
                        this.userSockets.set(msg.user_id, new Set());
                    }
                    this.userSockets.get(msg.user_id).add(ws);
                }
                break;
            case 'PING':
                this.sendDirect(ws, {
                    event: 'PONG',
                    data: { client_sent: msg.timestamp, server_time: new Date().toISOString() },
                    timestamp: new Date().toISOString()
                });
                break;
        }
    }
    joinRoom(ws, room) {
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(ws);
        ws.subscriptions.add(room);
    }
    leaveRoom(ws, room) {
        const roomSet = this.rooms.get(room);
        if (roomSet) {
            roomSet.delete(ws);
            if (roomSet.size === 0) {
                this.rooms.delete(room);
            }
        }
        ws.subscriptions.delete(room);
    }
    cleanupSocket(ws) {
        ws.subscriptions.forEach((room) => {
            this.leaveRoom(ws, room);
        });
        if (ws.userId && this.userSockets.has(ws.userId)) {
            const userSet = this.userSockets.get(ws.userId);
            userSet.delete(ws);
            if (userSet.size === 0) {
                this.userSockets.delete(ws.userId);
            }
        }
    }
    updateConnectionMetrics() {
        const count = this.wss ? this.wss.clients.size : 0;
        observability_service_1.observabilityService.wsActiveConnections.set(count);
    }
    sendDirect(ws, message) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    broadcastToAuction(auctionId, event, data) {
        const room = `auction:${auctionId}`;
        const payload = JSON.stringify({
            event,
            auction_id: auctionId,
            data,
            timestamp: new Date().toISOString()
        });
        const roomClients = this.rooms.get(room);
        if (roomClients) {
            roomClients.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(payload);
                }
            });
        }
        // Also broadcast summary update to global room for lobby tickers
        this.broadcastGlobal(event, { auction_id: auctionId, ...data });
    }
    broadcastGlobal(event, data) {
        const payload = JSON.stringify({
            event,
            data,
            timestamp: new Date().toISOString()
        });
        const globalClients = this.rooms.get('global');
        if (globalClients) {
            globalClients.forEach((client) => {
                if (client.readyState === ws_1.WebSocket.OPEN) {
                    client.send(payload);
                }
            });
        }
    }
    sendToUser(userId, event, data) {
        const clients = this.userSockets.get(userId);
        if (!clients)
            return;
        const payload = JSON.stringify({
            event,
            data,
            timestamp: new Date().toISOString()
        });
        clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }
    close() {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
        if (this.wss)
            this.wss.close();
    }
}
exports.wsService = new WebSocketService();
