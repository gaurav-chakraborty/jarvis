import { debugStats } from './debugStats';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  stack?: string;
}

class SecureLogger {
  private logHistory: LogEntry[] = [];
  private readonly maxHistorySize = 100;
  private readonly sensitivePatterns = [
    /api[_-]?key/gi,
    /token/gi,
    /password/gi,
    /secret/gi,
    /authorization/gi,
    /bearer/gi,
    /email/gi,
    /phone/gi,
    /(social_security_number|ssn)/gi,
    /(credit_card|card_number)/gi,
  ];

  private isSensitiveKey(key: string): boolean {
    return this.sensitivePatterns.some(pattern => pattern.test(key));
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }
    return value;
  }

  private sanitizeString(str: string): string {
    return str
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[EMAIL]')
      .replace(/(\d{3}[-.]?\d{3}[-.]?\d{4})/g, '[PHONE]')
      .replace(/(\d{3}-\d{2}-\d{4})/g, '[SSN]')
      .replace(/(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})/g, '[CARD]');
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeValue(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeValue(value);
      }
    }
    return sanitized;
  }

  private log(level: LogLevel, message: string, data?: any, stack?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? this.sanitizeObject(data) : undefined,
      stack,
    };

    this.logHistory.push(entry);

    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    debugStats.recordLog(level);

    const logFn = {
      DEBUG: console.debug,
      INFO: console.info,
      WARN: console.warn,
      ERROR: console.error,
    }[level];

    logFn(`[${level}] ${message}`, entry.data || '');
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  error(message: string, error?: Error | any, data?: any) {
    const stack = error instanceof Error ? error.stack : undefined;
    this.log('ERROR', message, data, stack);
  }

  getHistory(level?: LogLevel, limit: number = 50): LogEntry[] {
    let entries = this.logHistory;
    if (level) {
      entries = entries.filter(entry => entry.level === level);
    }
    return entries.slice(-limit);
  }

  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    const byLevel: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    for (const entry of this.logHistory) {
      byLevel[entry.level]++;
    }

    return {
      total: this.logHistory.length,
      byLevel,
      oldestEntry: this.logHistory[0]?.timestamp,
      newestEntry: this.logHistory[this.logHistory.length - 1]?.timestamp,
    };
  }

  clear() {
    this.logHistory = [];
  }
}

export const logger = new SecureLogger();
