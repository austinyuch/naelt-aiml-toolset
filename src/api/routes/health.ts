import { Router, Request, Response } from 'express';
import { metrics } from '../../core/metrics.js';

export const healthRouter = Router();

/**
 * Health check endpoint
 * 
 * @route GET /health
 * @returns {object} 200 - Health status response
 * @returns {object} 500 - Internal server error
 * 
 * @example response - 200 - Success response
 * {
 *   "status": "healthy",
 *   "version": "1.0.0",
 *   "service_mode": "unified",
 *   "timestamp": "2025-11-12T10:30:00.000Z"
 * }
 */
healthRouter.get('/health', (req: Request, res: Response) => {
  const serviceMode = process.env.SERVICE_MODE || 'unified';
  
  res.json({
    status: 'healthy',
    version: '1.0.0',
    service_mode: serviceMode,
    timestamp: new Date().toISOString()
  });
});

/**
 * Metrics endpoint
 * 
 * @route GET /metrics
 * @returns {string} 200 - Prometheus metrics in text format
 * @returns {object} 500 - Internal server error
 * 
 * @example response - 200 - Success response (Prometheus format)
 * # HELP http_requests_total Total number of HTTP requests
 * # TYPE http_requests_total counter
 * http_requests_total{method="GET",endpoint="/health",status="200"} 42
 */
healthRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metricsData = await metrics.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsData);
  } catch (error) {
    res.status(500).json({
      error: 'MetricsError',
      detail: 'Failed to retrieve metrics'
    });
  }
});
