interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

interface ApiCall {
  method: string;
  url: string;
  status?: number;
  duration: number;
  timestamp: number;
}

class DebugStats {
  private metrics: PerformanceMetric[] = [];
  private apiCalls: ApiCall[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private logCount: Record<string, number> = {
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
  };
  private readonly maxHistory = 100;

  recordMetric(name: string, duration: number) {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift();
    }

    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`[SLOW] ${name} took ${duration}ms`);
    }
  }

  recordApiCall(method: string, url: string, duration: number, status?: number) {
    this.apiCalls.push({
      method,
      url,
      status,
      duration,
      timestamp: Date.now(),
    });

    if (this.apiCalls.length > this.maxHistory) {
      this.apiCalls.shift();
    }
  }

  recordCacheHit() {
    this.cacheHits++;
  }

  recordCacheMiss() {
    this.cacheMisses++;
  }

  recordLog(level: string) {
    if (level in this.logCount) {
      this.logCount[level]++;
    }
  }

  getStats() {
    return {
      metrics: this.metrics,
      apiCalls: this.apiCalls,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      logCount: this.logCount,
    };
  }

  getSummary(): {
    avgMetricTime: number;
    totalApiCalls: number;
    avgApiTime: number;
    cacheHitRate: number;
    errorCount: number;
  } {
    const avgMetricTime = this.metrics.length > 0
      ? Math.round(this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length)
      : 0;

    const totalApiCalls = this.apiCalls.length;
    const avgApiTime = this.apiCalls.length > 0
      ? Math.round(this.apiCalls.reduce((sum, c) => sum + c.duration, 0) / this.apiCalls.length)
      : 0;

    const totalCache = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCache > 0 ? (this.cacheHits / totalCache) * 100 : 0;

    return {
      avgMetricTime,
      totalApiCalls,
      avgApiTime,
      cacheHitRate: Math.round(cacheHitRate),
      errorCount: this.logCount.ERROR,
    };
  }

  clear() {
    this.metrics = [];
    this.apiCalls = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.logCount = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };
  }
}

export const debugStats = new DebugStats();
