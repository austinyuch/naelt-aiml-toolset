import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Error Handler Middleware
 * 
 * Centralized error handling for all routes
 * Requirements: 9.1, 9.5
 * 
 * @param error - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function errorHandler(
  error: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get request ID
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';
  const timestamp = new Date().toISOString();

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: 'ValidationError',
      detail: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      request_id: requestId,
      timestamp
    });
    return;
  }

  // Handle errors with status code
  if (error.statusCode) {
    res.status(error.statusCode).json({
      error: error.name || 'Error',
      detail: error.message,
      request_id: requestId,
      timestamp
    });
    return;
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Log error for debugging
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      request_id: requestId,
      path: req.path
    });

    res.status(500).json({
      error: 'InternalServerError',
      detail: error.message,
      request_id: requestId,
      timestamp
    });
    return;
  }

  // Handle unknown error types
  console.error('Unknown error:', error);
  res.status(500).json({
    error: 'InternalServerError',
    detail: 'Unknown error occurred',
    request_id: requestId,
    timestamp
  });
}
