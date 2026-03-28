import { ILogger } from '../types/index';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger implements ILogger {
  private minLevel: number;

  constructor(level: LogLevel = 'info') {
    this.minLevel = LEVELS[level];
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.minLevel <= LEVELS.debug) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.minLevel <= LEVELS.info) {
      console.log(`[INFO]  ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.minLevel <= LEVELS.warn) {
      console.warn(`[WARN]  ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.minLevel <= LEVELS.error) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}
