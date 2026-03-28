import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { IConfig, ILogger, Transcript } from '../types/index';

/**
 * Bridges the TypeScript agent to the native Swift audio capture component.
 * The Swift app (Jarvis.app) captures system audio, runs speech recognition,
 * and sends transcripts over a local WebSocket connection on port 8765.
 */
export class AudioCaptureBridge extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsPort: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shuttingDown: boolean = false;

  constructor(private config: IConfig, private logger: ILogger) {
    super();
    // Port must match the WebSocket server started by the native Swift agent
    this.wsPort = parseInt(process.env['NATIVE_WS_PORT'] || '8765', 10);
    void this.config;
  }

  async initialize(): Promise<void> {
    this.logger.info(`AudioCaptureBridge: connecting to native agent on ws://localhost:${this.wsPort}`);
    await this.connect();
  }

  private connect(): Promise<void> {
    return new Promise((resolve) => {
      const tryConnect = () => {
        if (this.shuttingDown) return;

        const ws = new WebSocket(`ws://localhost:${this.wsPort}`);

        ws.once('open', () => {
          this.ws = ws;
          // Expose socket globally so ActionExecutor can send messages back
          global.nativeWebSocket = ws;
          this.logger.info('AudioCaptureBridge: connected to native agent');

          ws.on('message', (data: Buffer) => {
            try {
              const msg = JSON.parse(data.toString()) as { type: string; payload: unknown };
              if (msg.type === 'transcript') {
                const t = msg.payload as { text: string; confidence: number };
                const transcript: Transcript = {
                  text: t.text,
                  confidence: t.confidence,
                  timestamp: new Date(),
                };
                this.emit('transcript', transcript);
              } else if (msg.type === 'audioLevel') {
                this.emit('audio-level', msg.payload as number);
              }
            } catch {
              // ignore malformed messages
            }
          });

          ws.on('close', () => {
            this.logger.warn('AudioCaptureBridge: connection closed, reconnecting in 2s...');
            if (!this.shuttingDown) {
              this.reconnectTimer = setTimeout(tryConnect, 2000);
            }
          });

          resolve();
        });

        ws.once('error', () => {
          ws.terminate();
          if (!this.shuttingDown) {
            this.logger.debug('AudioCaptureBridge: native agent not yet available, retrying in 2s...');
            this.reconnectTimer = setTimeout(tryConnect, 2000);
          }
          // Resolve anyway so the agent can start in fallback/CLI mode
          resolve();
        });
      };

      tryConnect();
    });
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
    global.nativeWebSocket = undefined;
    this.logger.info('AudioCaptureBridge: shut down');
  }
}
