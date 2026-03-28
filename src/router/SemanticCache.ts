import * as fs from 'fs/promises';
import * as path from 'path';
import { ILogger, LLMResponse } from '../types';
import { createHash } from 'crypto';

interface CacheEntry {
  hash: string;
  question: string;
  response: LLMResponse;
  timestamp: number;
}

export class SemanticCache {
  private entries: CacheEntry[] = [];
  private cachePath: string;
  private maxEntries = 100;
  private similarityThreshold = 0.85;

  constructor(private dataPath: string, private logger: ILogger) {
    this.cachePath = path.join(dataPath, 'semantic_cache.json');
    this.load();
  }

  async get(question: string): Promise<LLMResponse | null> {
    const hash = this.hash(question);
    const exact = this.entries.find(e => e.hash === hash);
    if (exact) {
      this.logger.info(`[Cache] Exact hit`);
      return exact.response;
    }

    // Simple cosine similarity on hashed embeddings
    for (const entry of this.entries) {
      if (this.similarity(question, entry.question) > this.similarityThreshold) {
        this.logger.info(`[Cache] Semantic hit (${entry.question.substring(0, 30)}...)`);
        return entry.response;
      }
    }
    return null;
  }

  async set(question: string, response: LLMResponse): Promise<void> {
    const hash = this.hash(question);
    this.entries.unshift({ hash, question, response, timestamp: Date.now() });
    if (this.entries.length > this.maxEntries) this.entries.pop();
    await this.save();
  }

  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  private similarity(a: string, b: string): number {
    // Simple Jaccard similarity on word sets
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    return intersection.size / Math.max(setA.size, setB.size);
  }

  private async load() {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      this.entries = JSON.parse(data);
    } catch { this.entries = []; }
  }

  private async save() {
    try {
      const dir = path.dirname(this.cachePath);
      if (!(await fs.stat(dir).catch(() => null))) {
        await fs.mkdir(dir, { recursive: true });
      }
      await fs.writeFile(this.cachePath, JSON.stringify(this.entries, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save semantic cache: ${error}`);
    }
  }
}
