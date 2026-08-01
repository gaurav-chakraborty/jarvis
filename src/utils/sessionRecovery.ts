import { logger } from './secureLogger';

interface SessionState {
  interviewContext?: any;
  currentAnswer?: string;
  finalQuestion?: string;
  timestamp: number;
}

const STORAGE_KEY = 'jarvis-session-state';
const AUTO_SAVE_INTERVAL = 5000;

class SessionRecovery {
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private lastSaveTime: number = 0;

  saveState(state: Partial<SessionState>) {
    try {
      const currentSession = this.getState();
      const newSession: SessionState = {
        ...currentSession,
        ...state,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      this.lastSaveTime = Date.now();

      logger.debug('Session saved', {
        keys: Object.keys(state),
        timestamp: new Date(newSession.timestamp).toISOString(),
      });
    } catch (error) {
      logger.error('Failed to save session state', error as Error);
    }
  }

  getState(): SessionState | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;

      const session = JSON.parse(data) as SessionState;
      const ageSeconds = (Date.now() - session.timestamp) / 1000;

      if (ageSeconds > 3600) {
        logger.info('Session expired (older than 1 hour), clearing');
        this.clearState();
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Failed to retrieve session state', error as Error);
      return null;
    }
  }

  clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      logger.info('Session state cleared');
    } catch (error) {
      logger.error('Failed to clear session state', error as Error);
    }
  }

  startAutoSave(getState: () => Partial<SessionState>) {
    if (this.autoSaveInterval) {
      return;
    }

    this.autoSaveInterval = setInterval(() => {
      this.saveState(getState());
    }, AUTO_SAVE_INTERVAL);

    logger.info('Auto-save started', { intervalMs: AUTO_SAVE_INTERVAL });
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      logger.info('Auto-save stopped');
    }
  }

  getLastSaveTime(): number {
    return this.lastSaveTime;
  }

  getSessionDurationSeconds(): number {
    const state = this.getState();
    if (!state) return 0;
    return Math.round((Date.now() - state.timestamp) / 1000);
  }
}

export const sessionRecovery = new SessionRecovery();
