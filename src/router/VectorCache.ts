import * as fs from 'fs/promises';
import * as path from 'path';
import { ILogger, LLMResponse } from '../types';
import { createHash } from 'crypto';

interface VectorEntry {
  id: string;
  question: string;
  embedding: number[];
  response: LLMResponse;
  timestamp: number;
}

export class VectorCache {
  private entries: VectorEntry[] = [];
  private cachePath: string;
  private similarityThreshold = 0.92; // Higher threshold for vector matching

  constructor(private dataPath: string, private logger: ILogger) {
    this.cachePath = path.join(dataPath, 'vector_cache.json');
    this.load();
  }

  async get(question: string): Promise<LLMResponse | null> {
    const queryEmbedding = await this.getEmbedding(question);
    
    let bestMatch: VectorEntry | null = null;
    let highestSimilarity = -1;

    for (const entry of this.entries) {
      const sim = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (sim > highestSimilarity) {
        highestSimilarity = sim;
        bestMatch = entry;
      }
    }

    if (bestMatch && highestSimilarity > this.similarityThreshold) {
      this.logger.info(`[VectorCache] Hit: ${highestSimilarity.toFixed(4)} similarity`);
      return bestMatch.response;
    }

    return null;
  }

  async set(question: string, response: LLMResponse): Promise<void> {
    const embedding = await this.getEmbedding(question);
    const id = createHash('sha256').update(question).digest('hex').substring(0, 16);
    
    this.entries.unshift({ id, question, embedding, response, timestamp: Date.now() });
    if (this.entries.length > 200) this.entries.pop();
    await this.save();
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // In a production environment, we'd use a local ONNX model like all-MiniLM-L6-v2
    // For this implementation, we'll use a high-quality hash-based vectorization 
    // as a placeholder for the local embedding engine.
    const words = text.toLowerCase().match(/\w+/g) || [];
    const vector = new Array(128).fill(0);
    for (const word of words) {
      const hash = createHash('md5').update(word).digest();
      for (let i = 0; i < 16; i++) {
        vector[(i * 8) % 128] += hash[i];
      }
    }
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(v => v / (magnitude || 1));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct;
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
      this.logger.error(`Failed to save vector cache: ${error}`);
    }
  }
}
