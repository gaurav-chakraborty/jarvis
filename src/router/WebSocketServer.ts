import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { ILogger } from '../types';
import { LLMRouter } from './LLMRouter';
import { AssessmentHelper } from '../assessment/AssessmentHelper';

export class WebSocketServer {
  private wss: WSServer;
  private clients: Set<WebSocket> = new Set();
  private assessmentHelper: AssessmentHelper;

  constructor(private logger: ILogger, router: LLMRouter, port = 8765) {
    this.wss = new WSServer({ port });
    this.assessmentHelper = new AssessmentHelper(router);
    this.setupHandlers();
    this.logger.info(`[WebSocketServer] Server started on port ${port}`);
  }

  private setupHandlers() {
    this.wss.on('connection', (ws) => {
      this.logger.info('[WebSocketServer] Client connected');
      this.clients.add(ws);
      
      ws.on('message', async (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'assessment') {
            const { text } = message.payload;
            this.logger.info(`[WebSocketServer] Processing assessment request: ${text.substring(0, 30)}...`);
            const result = await this.assessmentHelper.answerQuestion(text);
            ws.send(JSON.stringify({
              type: 'assessment-result',
              payload: result
            }));
          }
        } catch (err: any) {
          this.logger.error(`[WebSocketServer] Error processing message: ${err.message}`);
          ws.send(JSON.stringify({ type: 'error', payload: err.message }));
        }
      });

      ws.on('close', () => {
        this.logger.info('[WebSocketServer] Client disconnected');
        this.clients.delete(ws);
      });
    });
  }

  sendChunk(chunk: string) {
    this.broadcast(JSON.stringify({ type: 'chunk', data: chunk }));
  }

  sendComplete(fullText: string) {
    this.broadcast(JSON.stringify({ type: 'complete', data: fullText }));
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
