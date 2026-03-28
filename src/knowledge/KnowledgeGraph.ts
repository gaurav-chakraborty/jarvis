import * as fs from 'fs/promises';
import * as path from 'path';
import { IConfig, ILogger } from '../types/index';

interface KnowledgeNode {
  key: string;
  content: string;
  confidence: number;
  updatedAt: Date;
  tags: string[];
}

interface LearnInput {
  input: string;
  output: string;
  confidence: number;
  context: unknown;
}

export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private storagePath: string;

  constructor(private config: IConfig, private logger: ILogger) {
    this.storagePath = path.join(config.dataPath, 'knowledge.json');
  }

  async initialize(userContext: IConfig['userContext']): Promise<void> {
    await this.loadFromDisk();

    // Seed with user context if provided
    if (userContext.resume) {
      this.nodes.set('resume', {
        key: 'resume',
        content: userContext.resume,
        confidence: 1.0,
        updatedAt: new Date(),
        tags: ['background', 'experience'],
      });
    }

    if (userContext.jobDescription) {
      this.nodes.set('job-description', {
        key: 'job-description',
        content: userContext.jobDescription,
        confidence: 1.0,
        updatedAt: new Date(),
        tags: ['role', 'requirements'],
      });
    }

    this.logger.info(`KnowledgeGraph: initialized with ${this.nodes.size} nodes`);
  }

  async query(text: string): Promise<string[]> {
    const results: string[] = [];
    const lower = text.toLowerCase();

    for (const node of this.nodes.values()) {
      const isRelevant =
        node.tags.some(tag => lower.includes(tag)) ||
        node.content.toLowerCase().split(' ').some(word => word.length > 4 && lower.includes(word));

      if (isRelevant && node.confidence > 0.5) {
        results.push(node.content.substring(0, 200));
      }

      if (results.length >= 3) break;
    }

    return results;
  }

  async learn(input: LearnInput): Promise<void> {
    const key = input.input.substring(0, 50).replace(/\s+/g, '-').toLowerCase();
    const existing = this.nodes.get(key);

    if (existing) {
      // Update confidence via weighted average
      existing.confidence = (existing.confidence + input.confidence) / 2;
      existing.content = input.output;
      existing.updatedAt = new Date();
    } else {
      this.nodes.set(key, {
        key,
        content: input.output,
        confidence: input.confidence,
        updatedAt: new Date(),
        tags: this.extractTags(input.input),
      });
    }

    void input.context;
  }

  async updateContext(context: unknown): Promise<void> {
    this.nodes.set('current-context', {
      key: 'current-context',
      content: JSON.stringify(context),
      confidence: 1.0,
      updatedAt: new Date(),
      tags: ['context'],
    });
  }

  async save(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      const data = Object.fromEntries(this.nodes);
      await fs.writeFile(this.storagePath, JSON.stringify(data, null, 2));
      this.logger.info('KnowledgeGraph: saved');
    } catch (error) {
      this.logger.error('KnowledgeGraph: failed to save:', error);
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const parsed = JSON.parse(data) as Record<string, KnowledgeNode>;
      this.nodes = new Map(Object.entries(parsed));
      this.logger.info(`KnowledgeGraph: loaded ${this.nodes.size} nodes from disk`);
    } catch {
      this.logger.info('KnowledgeGraph: no existing data, starting fresh');
    }
  }

  private extractTags(text: string): string[] {
    const tagKeywords = [
      'technical', 'behavioral', 'experience', 'motivation',
      'python', 'javascript', 'react', 'database', 'api',
      'leadership', 'teamwork', 'architecture', 'performance',
    ];
    const lower = text.toLowerCase();
    return tagKeywords.filter(tag => lower.includes(tag));
  }
}
