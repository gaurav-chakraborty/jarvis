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
  hits: number;
  bucket: string;
}

export class VectorCache {
  private entries: VectorEntry[] = [];
  private cachePath: string;
  private similarityThreshold = 0.92;
  private bucketIndex: Map<string, VectorEntry[]> = new Map();
  private maxCandidates = 20;

  constructor(private dataPath: string, private logger: ILogger) {
    this.cachePath = path.join(dataPath, 'vector_cache.json');
    this.load();
  }

  async get(question: string): Promise<LLMResponse | null> {
    const queryEmbedding = await this.getEmbedding(question);
    const bucket = this.getBucket(queryEmbedding);

    let bestMatch: VectorEntry | null = null;
    let highestSimilarity = -1;

    const candidates = this.getCandidates(bucket, queryEmbedding);

    for (const entry of candidates) {
      const sim = this.cosineSimilarity(queryEmbedding, entry.embedding);
      if (sim > highestSimilarity) {
        highestSimilarity = sim;
        bestMatch = entry;
      }
    }

    if (bestMatch && highestSimilarity > this.similarityThreshold) {
      bestMatch.hits++;
      this.logger.info(`[VectorCache] Hit: ${highestSimilarity.toFixed(4)} similarity`);
      return bestMatch.response;
    }

    return null;
  }

  private getCandidates(bucket: string, embedding: number[]): VectorEntry[] {
    const candidates: VectorEntry[] = [];

    const bucketEntries = this.bucketIndex.get(bucket) || [];
    candidates.push(...bucketEntries.slice(0, this.maxCandidates));

    if (candidates.length < this.maxCandidates) {
      const adjacentBuckets = this.getAdjacentBuckets(bucket);
      for (const adjacent of adjacentBuckets) {
        const entries = this.bucketIndex.get(adjacent) || [];
        for (const entry of entries) {
          if (!candidates.includes(entry) && candidates.length < this.maxCandidates) {
            candidates.push(entry);
          }
        }
      }
    }

    if (candidates.length === 0) {
      return this.getTopHitEntries(this.maxCandidates);
    }

    return candidates;
  }

  private getTopHitEntries(limit: number): VectorEntry[] {
    return this.entries.sort((a, b) => b.hits - a.hits).slice(0, limit);
  }

  private getBucket(embedding: number[]): string {
    const hash = embedding.slice(0, 4).map(v => Math.round(v * 10)).join('-');
    return `bucket_${hash}`;
  }

  private getAdjacentBuckets(bucket: string): string[] {
    return [bucket, `${bucket}_alt1`, `${bucket}_alt2`];
  }

  async set(question: string, response: LLMResponse): Promise<void> {
    const embedding = await this.getEmbedding(question);
    const id = createHash('sha256').update(question).digest('hex').substring(0, 16);
    const bucket = this.getBucket(embedding);

    const entry: VectorEntry = { id, question, embedding, response, timestamp: Date.now(), hits: 0, bucket };
    this.entries.unshift(entry);

    if (!this.bucketIndex.has(bucket)) {
      this.bucketIndex.set(bucket, []);
    }
    this.bucketIndex.get(bucket)!.unshift(entry);

    if (this.entries.length > 200) {
      const removed = this.entries.pop();
      if (removed) {
        const bucketEntries = this.bucketIndex.get(removed.bucket);
        if (bucketEntries) {
          const idx = bucketEntries.indexOf(removed);
          if (idx > -1) bucketEntries.splice(idx, 1);
        }
      }
    }
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
      this.rebuildBucketIndex();
    } catch {
      this.entries = [];
      this.bucketIndex.clear();
    }
  }

  private rebuildBucketIndex() {
    this.bucketIndex.clear();
    for (const entry of this.entries) {
      const bucket = entry.bucket || this.getBucket(entry.embedding);
      entry.bucket = bucket;
      if (!this.bucketIndex.has(bucket)) {
        this.bucketIndex.set(bucket, []);
      }
      this.bucketIndex.get(bucket)!.push(entry);
    }
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
