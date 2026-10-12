export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  auctionId?: string;
  durationMs?: number;
  [key: string]: any;
}

class StructuredLogger {
  private serviceName: string = 'motobid-core';

  private log(level: LogLevel, message: string, context?: LogContext) {
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
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

export const logger = new StructuredLogger();
