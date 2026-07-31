interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private enabled: boolean = true;
  private maxMetricsPerName: number = 100;

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  start(name: string, metadata?: Record<string, any>): () => void {
    if (!this.enabled) return () => {};

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift();
    }

    return () => this.end(name, metrics.length - 1);
  }

  end(name: string, index?: number): void {
    if (!this.enabled) return;

    const metrics = this.metrics.get(name);
    if (!metrics) return;

    const idx = index ?? metrics.length - 1;
    if (idx >= 0 && idx < metrics.length) {
      const metric = metrics[idx];
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;

      if (metric.duration > 1000) {
        console.warn(`Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`, metric.metadata);
      }
    }
  }

  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.get(name) || [];
  }

  getStats(name: string) {
    const metrics = this.getMetrics(name).filter(m => m.duration !== undefined);
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration!);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const median = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];

    return {
      count: metrics.length,
      avg: parseFloat(avg.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      total: parseFloat(durations.reduce((a, b) => a + b, 0).toFixed(2)),
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    for (const [name] of this.metrics) {
      const stat = this.getStats(name);
      if (stat) {
        stats[name] = stat;
      }
    }
    return stats;
  }

  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  log(): void {
    console.table(this.getAllStats());
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function withPerformanceTracking<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const endFn = performanceMonitor.start(name);
    try {
      const result = await fn(...args);
      return result;
    } finally {
      endFn();
    }
  }) as T;
}
