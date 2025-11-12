import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { log } from '../../core/logger.js';
import { metrics } from '../../core/metrics.js';

/**
 * Monitoring Middleware
 * 
 * Adds request tracking, logging, and metrics collection
 * Requirements: 9.5, 10.4
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function monitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate or use existing request ID
  // Requirement 10.4: Implement request tracking (request_id)
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Add request ID to request object for later use
  (req as any).requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('x-request-id', requestId);

  // Record start time
  const startTime = Date.now();

  // Log incoming request
  log.debug('Incoming request', {
    request_id: requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    user_agent: req.headers['user-agent']
  });

  // Listen for response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000;

    // Log API request
    // Requirement 10.4: Log important business events
    log.apiRequest(
      requestId,
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        query: req.query,
        ip: req.ip
      }
    );

    // Record metrics
    // Requirement 9.5: Track performance metrics
    metrics.recordHttpRequest(
      req.method,
      req.path,
      res.statusCode,
      durationSeconds
    );
  });

  // Listen for response error event
  res.on('error', (error) => {
    log.apiError(requestId, error, {
      method: req.method,
      path: req.path
    });
  });

  // Continue to next middleware
  next();
}
