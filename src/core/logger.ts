/**
 * Structured Logging with Winston
 * 
 * Provides structured logging capabilities with different log levels
 * Requirements: 9.5, 10.4
 */

import winston from 'winston';
import { config } from '../config.js';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Sensitive keys that should be redacted from logs
 */
const SENSITIVE_KEYS = [
  'api_key',
  'apiKey',
  'password',
  'token',
  'secret',
  'authorization',
  'x-api-key',
  'NEWS_API_KEY',
  'API_KEYS'
];

/**
 * Sanitize log data by redacting sensitive information
 * 
 * Requirement 9.5: Implement log sanitization
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }

  // Handle objects
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Check if key is sensitive
    const isSensitive = SENSITIVE_KEYS.some(
      sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create Winston logger instance
 * 
 * Requirement 10.4: Implement structured logging
 */
const createLogger = (): winston.Logger => {
  const logLevel = config.logLevel;
  const logFormat = config.logFormat;

  // Define log format
  const formats: winston.Logform.Format[] = [
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true })
  ];

  // Add JSON or text format based on configuration
  if (logFormat === 'json') {
    formats.push(winston.format.json());
  } else {
    formats.push(
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 
          ? ` ${JSON.stringify(sanitizeLogData(meta))}` 
          : '';
        return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
      })
    );
  }

  // Create logger
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(...formats),
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          ...formats
        )
      })
    ]
  });

  return logger;
};

/**
 * Global logger instance
 */
export const logger = createLogger();

/**
 * Log helper functions
 */
export const log = {
  /**
   * Log debug message
   * 
   * @param message - Log message
   * @param meta - Additional metadata
   */
  debug(message: string, meta?: Record<string, any>): void {
    logger.debug(message, sanitizeLogData(meta || {}));
  },

  /**
   * Log info message
   * 
   * @param message - Log message
   * @param meta - Additional metadata
   */
  info(message: string, meta?: Record<string, any>): void {
    logger.info(message, sanitizeLogData(meta || {}));
  },

  /**
   * Log warning message
   * 
   * @param message - Log message
   * @param meta - Additional metadata
   */
  warn(message: string, meta?: Record<string, any>): void {
    logger.warn(message, sanitizeLogData(meta || {}));
  },

  /**
   * Log error message
   * 
   * @param message - Log message
   * @param meta - Additional metadata (including error object)
   */
  error(message: string, meta?: Record<string, any>): void {
    logger.error(message, sanitizeLogData(meta || {}));
  },

  /**
   * Log API request
   * 
   * Requirement 10.4: Log important business events
   * 
   * @param requestId - Request ID
   * @param method - HTTP method
   * @param path - Request path
   * @param statusCode - Response status code
   * @param durationMs - Request duration in milliseconds
   * @param meta - Additional metadata
   */
  apiRequest(
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    meta?: Record<string, any>
  ): void {
    logger.info('api_request', sanitizeLogData({
      request_id: requestId,
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
      ...meta
    }));
  },

  /**
   * Log API error
   * 
   * @param requestId - Request ID
   * @param error - Error object
   * @param meta - Additional metadata
   */
  apiError(
    requestId: string,
    error: Error,
    meta?: Record<string, any>
  ): void {
    logger.error('api_error', sanitizeLogData({
      request_id: requestId,
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      ...meta
    }));
  },

  /**
   * Log LLM call
   * 
   * @param requestId - Request ID
   * @param model - Model ID
   * @param durationMs - Call duration in milliseconds
   * @param inputTokens - Input tokens used
   * @param outputTokens - Output tokens generated
   * @param meta - Additional metadata
   */
  llmCall(
    requestId: string,
    model: string,
    durationMs: number,
    inputTokens?: number,
    outputTokens?: number,
    meta?: Record<string, any>
  ): void {
    logger.info('llm_call', sanitizeLogData({
      request_id: requestId,
      model,
      duration_ms: durationMs,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      ...meta
    }));
  },

  /**
   * Log LLM error
   * 
   * @param requestId - Request ID
   * @param model - Model ID
   * @param error - Error object
   * @param retryCount - Number of retries attempted
   * @param meta - Additional metadata
   */
  llmError(
    requestId: string,
    model: string,
    error: Error,
    retryCount: number,
    meta?: Record<string, any>
  ): void {
    logger.error('llm_error', sanitizeLogData({
      request_id: requestId,
      model,
      error_name: error.name,
      error_message: error.message,
      retry_count: retryCount,
      ...meta
    }));
  },

  /**
   * Log cache hit
   * 
   * @param key - Cache key
   * @param cacheType - Cache type (L1, L2)
   */
  cacheHit(key: string, cacheType: 'L1' | 'L2'): void {
    logger.debug('cache_hit', { key, cache_type: cacheType });
  },

  /**
   * Log cache miss
   * 
   * @param key - Cache key
   * @param cacheType - Cache type (L1, L2)
   */
  cacheMiss(key: string, cacheType: 'L1' | 'L2'): void {
    logger.debug('cache_miss', { key, cache_type: cacheType });
  }
};

export default logger;
