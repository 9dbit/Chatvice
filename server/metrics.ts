
export interface MetricData {
  timestamp: number;
  merchantId: string;
  endpoint: string;
  duration: number;
  status: number;
  errorType?: string;
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private readonly MAX_METRICS = 10000;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute

  constructor() {
    // Auto-flush metrics periodically
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  track(data: MetricData) {
    this.metrics.push(data);
    
    // Prevent memory overflow
    if (this.metrics.length > this.MAX_METRICS) {
      this.flush();
    }
  }

  private flush() {
    if (this.metrics.length === 0) return;
    
    // Calculate aggregates
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    
    // Log performance summary
    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
    const errorRate = recentMetrics.filter(m => m.status >= 400).length / recentMetrics.length;
    
    console.log(`[Metrics] Requests: ${recentMetrics.length}, Avg Duration: ${avgDuration.toFixed(2)}ms, Error Rate: ${(errorRate * 100).toFixed(2)}%`);
    
    // Clear old metrics
    this.metrics = this.metrics.slice(-1000); // Keep last 1000
  }

  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;
    
    const recent1m = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const recent5m = this.metrics.filter(m => m.timestamp > fiveMinutesAgo);
    
    return {
      requests1m: recent1m.length,
      requests5m: recent5m.length,
      avgDuration1m: recent1m.reduce((sum, m) => sum + m.duration, 0) / (recent1m.length || 1),
      avgDuration5m: recent5m.reduce((sum, m) => sum + m.duration, 0) / (recent5m.length || 1),
      errorRate1m: recent1m.filter(m => m.status >= 400).length / (recent1m.length || 1),
      errorRate5m: recent5m.filter(m => m.status >= 400).length / (recent5m.length || 1),
      topEndpoints: this.getTopEndpoints(recent5m),
    };
  }

  private getTopEndpoints(metrics: MetricData[]) {
    const endpointCounts: Record<string, number> = {};
    metrics.forEach(m => {
      endpointCounts[m.endpoint] = (endpointCounts[m.endpoint] || 0) + 1;
    });
    
    return Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }
}

export const metricsCollector = new MetricsCollector();
