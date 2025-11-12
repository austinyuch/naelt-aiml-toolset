/**
 * Performance Metrics with Prometheus Client
 * 
 * Provides performance monitoring capabilities
 * Requirements: 9.5, 10.4
 */

import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Metrics registry
 */
export const register = new Registry();

/**
 * Collect default metrics (CPU, memory, etc.)
 */
collectDefaultMetrics({ register });

/**
 * HTTP request counter
 * 
 * Tracks total number of HTTP requests by method, endpoint, and status
 */
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register]
});

/**
 * HTTP request duration histogram
 * 
 * Tracks HTTP request duration in seconds
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register]
});

/**
 * LLM call counter
 * 
 * Tracks total number of LLM API calls by model and status
 */
export const llmCallCounter = new Counter({
  name: 'llm_calls_total',
  help: 'Total number of LLM API calls',
  labelNames: ['model', 'status'],
  registers: [register]
});

/**
 * LLM call duration histogram
 * 
 * Tracks LLM call duration in seconds
 */
export const llmCallDuration = new Histogram({
  name: 'llm_call_duration_seconds',
  help: 'LLM call duration in seconds',
  labelNames: ['model'],
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [register]
});

/**
 * LLM token usage counter
 * 
 * Tracks total tokens used (input and output)
 */
export const llmTokenUsage = new Counter({
  name: 'llm_tokens_total',
  help: 'Total number of LLM tokens used',
  labelNames: ['model', 'type'],
  registers: [register]
});

/**
 * Cache hit counter
 * 
 * Tracks cache hits by cache type
 */
export const cacheHitCounter = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [register]
});

/**
 * Cache miss counter
 * 
 * Tracks cache misses by cache type
 */
export const cacheMissCounter = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [register]
});

/**
 * Content generation counter
 * 
 * Tracks total content generations by topic and platform
 */
export const contentGenerationCounter = new Counter({
  name: 'content_generations_total',
  help: 'Total number of content generations',
  labelNames: ['topic', 'platform'],
  registers: [register]
});

/**
 * Content refinement counter
 * 
 * Tracks total content refinements
 */
export const contentRefinementCounter = new Counter({
  name: 'content_refinements_total',
  help: 'Total number of content refinements',
  registers: [register]
});

/**
 * News search counter
 * 
 * Tracks total news searches
 */
export const newsSearchCounter = new Counter({
  name: 'news_searches_total',
  help: 'Total number of news searches',
  registers: [register]
});

/**
 * Active connections gauge
 * 
 * Tracks current number of active connections
 */
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Current number of active connections',
  registers: [register]
});

/**
 * Memory usage gauge
 * 
 * Tracks current memory usage in bytes
 */
export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Current memory usage in bytes',
  labelNames: ['type'],
  registers: [register]
});

/**
 * Metrics helper functions
 */
export const metrics = {
  /**
   * Record HTTP request
   * 
   * @param method - HTTP method
   * @param endpoint - Request endpoint
   * @param statusCode - Response status code
   * @param durationSeconds - Request duration in seconds
   */
  recordHttpRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    durationSeconds: number
  ): void {
    httpRequestCounter.labels(method, endpoint, statusCode.toString()).inc();
    httpRequestDuration.labels(method, endpoint).observe(durationSeconds);
  },

  /**
   * Record LLM call
   * 
   * @param model - Model ID
   * @param status - Call status (success or error)
   * @param durationSeconds - Call duration in seconds
   * @param inputTokens - Input tokens used
   * @param outputTokens - Output tokens generated
   */
  recordLlmCall(
    model: string,
    status: 'success' | 'error',
    durationSeconds: number,
    inputTokens?: number,
    outputTokens?: number
  ): void {
    llmCallCounter.labels(model, status).inc();
    llmCallDuration.labels(model).observe(durationSeconds);

    if (inputTokens !== undefined) {
      llmTokenUsage.labels(model, 'input').inc(inputTokens);
    }

    if (outputTokens !== undefined) {
      llmTokenUsage.labels(model, 'output').inc(outputTokens);
    }
  },

  /**
   * Record cache hit
   * 
   * @param cacheType - Cache type (L1 or L2)
   */
  recordCacheHit(cacheType: 'L1' | 'L2'): void {
    cacheHitCounter.labels(cacheType).inc();
  },

  /**
   * Record cache miss
   * 
   * @param cacheType - Cache type (L1 or L2)
   */
  recordCacheMiss(cacheType: 'L1' | 'L2'): void {
    cacheMissCounter.labels(cacheType).inc();
  },

  /**
   * Record content generation
   * 
   * @param topic - Topic template
   * @param platform - Platform type
   */
  recordContentGeneration(topic: string, platform: string): void {
    contentGenerationCounter.labels(topic, platform).inc();
  },

  /**
   * Record content refinement
   */
  recordContentRefinement(): void {
    contentRefinementCounter.inc();
  },

  /**
   * Record news search
   */
  recordNewsSearch(): void {
    newsSearchCounter.inc();
  },

  /**
   * Update active connections
   * 
   * @param count - Current number of active connections
   */
  updateActiveConnections(count: number): void {
    activeConnections.set(count);
  },

  /**
   * Update memory usage
   */
  updateMemoryUsage(): void {
    const usage = process.memoryUsage();
    memoryUsage.labels('heap_used').set(usage.heapUsed);
    memoryUsage.labels('heap_total').set(usage.heapTotal);
    memoryUsage.labels('rss').set(usage.rss);
    memoryUsage.labels('external').set(usage.external);
  },

  /**
   * Get metrics in Prometheus format
   * 
   * @returns Metrics string
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  },

  /**
   * Get metrics as JSON
   * 
   * @returns Metrics JSON
   */
  async getMetricsJSON(): Promise<any> {
    return register.getMetricsAsJSON();
  }
};

/**
 * Start periodic memory usage updates
 * 
 * @param intervalMs - Update interval in milliseconds (default: 10000)
 */
export function startMemoryMonitoring(intervalMs: number = 10000): NodeJS.Timeout {
  return setInterval(() => {
    metrics.updateMemoryUsage();
  }, intervalMs);
}

export default metrics;
