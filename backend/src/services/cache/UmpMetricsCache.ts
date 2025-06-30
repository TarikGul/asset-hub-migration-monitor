export class UmpMetricsCache {
  private static instance: UmpMetricsCache;
  private averageLatencyMs: number = 0;
  private totalSizeBytes: number = 0;
  private lastUpdated: Date = new Date();

  // Track counters and running sums for averaging
  private latencyCount: number = 0;
  private latencySum: number = 0;
  private sizeCount: number = 0;
  private sizeSum: number = 0;

  private constructor() {}

  // Singleton pattern - get the single instance
  public static getInstance(): UmpMetricsCache {
    if (!UmpMetricsCache.instance) {
      UmpMetricsCache.instance = new UmpMetricsCache();
    }
    return UmpMetricsCache.instance;
  }

  // Get current values
  getAverageLatencyMs(): number {
    return this.averageLatencyMs;
  }

  getTotalSizeBytes(): number {
    return this.totalSizeBytes;
  }

  getLastUpdated(): Date {
    return this.lastUpdated;
  }

  // Update average latency with new entry
  updateAverageLatency(newLatencyMs: number): void {
    this.latencySum += newLatencyMs;
    this.latencyCount++;

    // Calculate new average
    this.averageLatencyMs = this.latencySum / this.latencyCount;
    this.lastUpdated = new Date();
  }

  // Update average total size with new entry
  updateTotalSize(newTotalSizeBytes: number): void {
    this.sizeSum += newTotalSizeBytes;
    this.sizeCount++;

    // Calculate new average
    this.totalSizeBytes = this.sizeSum / this.sizeCount;
    this.lastUpdated = new Date();
  }

  // Get all metrics as an object
  getMetrics() {
    return {
      averageLatencyMs: this.averageLatencyMs,
      totalSizeBytes: this.totalSizeBytes,
      lastUpdated: this.lastUpdated,
      latencyCount: this.latencyCount,
      sizeCount: this.sizeCount,
    };
  }
}
