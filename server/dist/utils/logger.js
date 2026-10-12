"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class StructuredLogger {
    serviceName = 'motobid-core';
    log(level, message, context) {
        const entry = {
            timestamp: new Date().toISOString(),
            service: this.serviceName,
            level: level.toUpperCase(),
            message,
            ...(context || {})
        };
        if (process.env.NODE_ENV === 'test' && level === 'debug') {
            return;
        }
        if (process.env.LOG_FORMAT === 'text') {
            const ctxStr = context ? ` | ${JSON.stringify(context)}` : '';
            console.log(`[${entry.timestamp}] [${entry.level}] ${message}${ctxStr}`);
        }
        else {
            console.log(JSON.stringify(entry));
        }
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
    }
}
exports.logger = new StructuredLogger();
