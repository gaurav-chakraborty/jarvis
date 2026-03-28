import * as fs from 'fs/promises';
import * as path from 'path';
import { IConfig, ILogger, MemoryItem, ConversationTurn, Intent, LLMResponse, Strategy, Decision, Transcript } from '../types/index';

export class MemoryStore {
  private shortTerm: ConversationTurn[] = [];
  private longTerm: Map<string, MemoryItem[]> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private storagePath: string;

  constructor(private config: IConfig, private logger: ILogger) {
    this.storagePath = path.join(config.dataPath, 'memory.json');
  }

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const parsed = JSON.parse(data) as { shortTerm?: ConversationTurn[]; longTerm?: Record<string, MemoryItem[]> };

      this.shortTerm = parsed.shortTerm || [];
      this.longTerm = new Map(Object.entries(parsed.longTerm || {}));

      this.logger.info(`Loaded ${this.shortTerm.length} short-term and ${this.longTerm.size} long-term memories`);
    } catch {
      this.logger.info('No existing memory found, starting fresh');
    }
  }

  async save(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      const data = {
        shortTerm: this.shortTerm,
        longTerm: Object.fromEntries(this.longTerm),
      };
      await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
      this.logger.info('Memory saved');
    } catch (error) {
      this.logger.error('Failed to save memory:', error);
    }
  }

  async store(turn: ConversationTurn): Promise<void> {
    this.shortTerm.push(turn);

    if (this.shortTerm.length > 20) {
      const oldest = this.shortTerm.shift();
      if (oldest) {
        await this.consolidateToLongTerm(oldest);
      }
    }

    const embedding = await this.generateEmbedding(turn.transcript.text);
    this.embeddings.set(turn.transcript.text, embedding);
  }

  async recall(query: string, limit: number = 3): Promise<MemoryItem[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const scored: Array<{ item: MemoryItem; score: number }> = [];

    for (const turn of this.shortTerm) {
      const turnEmbedding = this.embeddings.get(turn.transcript.text);
      if (turnEmbedding) {
        const similarity = this.cosineSimilarity(queryEmbedding, turnEmbedding);
        scored.push({
          item: {
            content: turn.response.text,
            type: 'interaction',
            timestamp: turn.timestamp,
            metadata: { question: turn.transcript.text, confidence: turn.response.confidence },
          },
          score: similarity,
        });
      }
    }

    for (const [topic, items] of this.longTerm.entries()) {
      if (query.toLowerCase().includes(topic) || topic.includes(query.toLowerCase())) {
        for (const item of items) {
          scored.push({ item, score: 0.7 });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.item);
  }

  private async consolidateToLongTerm(turn: ConversationTurn): Promise<void> {
    const topics = this.extractTopics(turn.transcript.text);

    for (const topic of topics) {
      if (!this.longTerm.has(topic)) {
        this.longTerm.set(topic, []);
      }

      this.longTerm.get(topic)!.push({
        content: turn.response.text,
        type: 'consolidated',
        timestamp: turn.timestamp,
        metadata: { question: turn.transcript.text, confidence: turn.response.confidence },
      });

      const topicItems = this.longTerm.get(topic)!;
      if (topicItems.length > 10) {
        topicItems.shift();
      }
    }
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const topicKeywords = [
      'experience', 'technical', 'behavioral', 'motivation',
      'python', 'javascript', 'react', 'database', 'api',
      'teamwork', 'leadership', 'problem-solving',
    ];

    const lowerText = text.toLowerCase();
    for (const keyword of topicKeywords) {
      if (lowerText.includes(keyword)) {
        topics.push(keyword);
      }
    }

    return topics;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const embedding: number[] = new Array(128).fill(0);
    for (let i = 0; i < text.length; i++) {
      embedding[i % 128] += text.charCodeAt(i);
    }
    return embedding.map(v => v / 1000);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  getRecentInteractions(count: number): ConversationTurn[] {
    return this.shortTerm.slice(-count);
  }

  getTotalInteractions(): number {
    return (
      this.shortTerm.length +
      Array.from(this.longTerm.values()).reduce((sum, arr) => sum + arr.length, 0)
    );
  }

  async setContext(context: unknown): Promise<void> {
    const placeholderTranscript: Transcript = {
      text: `CONTEXT: ${JSON.stringify(context)}`,
      confidence: 1.0,
      timestamp: new Date(),
    };
    const placeholderResponse: LLMResponse = {
      text: '',
      confidence: 1.0,
      strategy: 'context',
      timestamp: new Date(),
    };
    const placeholderIntent: Intent = {
      type: 'context',
      score: 1.0,
      topics: [],
      questionFormat: 'open-ended',
      urgency: 0,
      originalText: '',
      timestamp: new Date(),
    };
    const placeholderStrategy: Strategy = {
      name: 'context',
      description: '',
      confidence: 1.0,
    };
    const placeholderDecision: Decision = {
      shouldAct: false,
      action: 'none',
      response: '',
      confidence: 1.0,
      reasoning: '',
      timestamp: new Date(),
    };

    await this.store({
      transcript: placeholderTranscript,
      response: placeholderResponse,
      intent: placeholderIntent,
      strategy: placeholderStrategy,
      decision: placeholderDecision,
      timestamp: new Date(),
    });
  }
}
