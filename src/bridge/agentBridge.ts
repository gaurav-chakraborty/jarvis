import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';

export type AgentEvent =
  | { type: 'transcript'; payload: { text: string; confidence: number } }
  | { type: 'decision'; payload: { action: string; response: string; reasoning: string; confidence: number } }
  | { type: 'stateChange'; payload: { state: string } }
  | { type: 'autonomyChange'; payload: { level: 'low' | 'medium' | 'high' } };

export class AgentBridge {
  private nativeProcess: ChildProcess | null = null;
  private ws: WebSocket | null = null;
  private eventHandlers = new Map<string, Array<(payload: unknown) => void>>();
  private wsPort: number;

  constructor(wsPort = 8765) {
    this.wsPort = wsPort;
  }

  async start(): Promise<void> {
    this.nativeProcess = spawn('/Applications/Jarvis.app/Contents/MacOS/Jarvis', [], {
      env: { ...process.env },
      stdio: 'inherit',
    });

    this.nativeProcess.on('error', (err) => {
      console.error('[AgentBridge] Native process error:', err.message);
    });

    this.nativeProcess.on('exit', (code) => {
      console.log(`[AgentBridge] Native process exited with code ${code}`);
    });

    // Wait for native app to open its WebSocket server
    await this.connectWithRetry();
  }

  private connectWithRetry(maxAttempts = 10, delayMs = 500): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const tryConnect = () => {
        attempts++;
        const ws = new WebSocket(`ws://localhost:${this.wsPort}`);

        ws.once('open', () => {
          this.ws = ws;
          this.ws.on('message', (data: Buffer) => {
            try {
              const event = JSON.parse(data.toString()) as AgentEvent;
              this.emit(event.type, event.payload);
            } catch {
              // ignore malformed messages
            }
          });
          resolve();
        });

        ws.once('error', () => {
          ws.terminate();
          if (attempts < maxAttempts) {
            setTimeout(tryConnect, delayMs);
          } else {
            reject(new Error(`[AgentBridge] Could not connect to native app after ${maxAttempts} attempts`));
          }
        });
      };

      tryConnect();
    });
  }

  on<T = unknown>(event: string, handler: (payload: T) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler as (payload: unknown) => void);
  }

  private emit(event: string, payload: unknown): void {
    this.eventHandlers.get(event)?.forEach((h) => h(payload));
  }

  send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  setContext(context: { role: string; company: string; interviewers: string[] }): void {
    this.send({ type: 'context', payload: context });
  }

  setAutonomy(level: 'low' | 'medium' | 'high'): void {
    this.send({ type: 'setAutonomy', payload: { level } });
  }

  forceAction(): void {
    this.send({ type: 'forceAction' });
  }

  stop(): void {
    this.ws?.close();
    this.nativeProcess?.kill();
  }
}
