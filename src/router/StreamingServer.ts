import { WebSocketServer, WebSocket } from 'ws';
import { ILogger } from '../types';

export class StreamingServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(private logger: ILogger, port = 8765) {
    this.wss = new WebSocketServer({ port });
    this.wss.on('connection', (ws) => {
      this.logger.info('[StreamingServer] Client connected');
      this.clients.add(ws);
      ws.on('close', () => {
        this.logger.info('[StreamingServer] Client disconnected');
        this.clients.delete(ws);
      });
    });
    this.logger.info(`[StreamingServer] WebSocket server started on port ${port}`);
  }

  sendChunk(chunk: string) {
    const message = JSON.stringify({ type: 'chunk', data: chunk });
    this.broadcast(message);
  }

  sendComplete(fullText: string) {
    const message = JSON.stringify({ type: 'complete', data: fullText });
    this.broadcast(message);
  }

  sendError(error: string) {
    const message = JSON.stringify({ type: 'error', data: error });
    this.broadcast(message);
  }

  private broadcast(message: string) {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  stop() {
    this.wss.close();
  }
}
