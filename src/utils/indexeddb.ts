interface CachedResponse {
  id: string;
  question: string;
  response: string;
  confidence: number;
  timestamp: number;
  hits: number;
}

const DB_NAME = 'jarvis-cache';
const STORE_NAME = 'responses';
const DB_VERSION = 1;

export class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('question', 'question', { unique: true });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('hits', 'hits');
        }
      };
    });
  }

  async get(question: string): Promise<string | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('question');
      const request = index.get(question.toLowerCase().trim());

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          request.result.hits++;
          request.result.timestamp = Date.now();
          this.updateHits(request.result);
          resolve(request.result.response);
        } else {
          resolve(null);
        }
      };
    });
  }

  async set(question: string, response: string, confidence: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const cached: CachedResponse = {
        id: `${Date.now()}-${Math.random()}`,
        question: question.toLowerCase().trim(),
        response,
        confidence,
        timestamp: Date.now(),
        hits: 0,
      };

      const request = store.add(cached);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getTopResponses(limit: number = 10): Promise<CachedResponse[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('hits');
      const request = index.openCursor(null, 'prev');

      const results: CachedResponse[] = [];
      request.onerror = () => reject(request.error);
      request.onsuccess = (e: Event) => {
        const cursor = (e.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getStats(): Promise<{ total: number; avgConfidence: number; totalHits: number }> {
    await this.ensureInitialized();
    if (!this.db) return { total: 0, avgConfidence: 0, totalHits: 0 };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result as CachedResponse[];
        const total = data.length;
        const avgConfidence = total > 0 ? data.reduce((sum, d) => sum + d.confidence, 0) / total : 0;
        const totalHits = data.reduce((sum, d) => sum + d.hits, 0);

        resolve({ total, avgConfidence, totalHits });
      };
    });
  }

  private async updateHits(item: CachedResponse): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

let instanceCache: IndexedDBCache | null = null;

export function getIndexedDBCache(): IndexedDBCache {
  if (!instanceCache) {
    instanceCache = new IndexedDBCache();
  }
  return instanceCache;
}
