/**
 * Custom exception classes for the Advocacy Content Generator API
 * 
 * These exceptions provide structured error handling with HTTP status codes
 * and request tracking for better debugging and monitoring.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

/**
 * Base exception class for all API errors
 * 
 * @extends Error
 */
export class APIException extends Error {
  /**
   * Creates an APIException
   * 
   * @param statusCode - HTTP status code for the error
   * @param detail - Detailed error message
   * @param requestId - Request ID for tracing
   */
  constructor(
    public statusCode: number,
    public detail: string,
    public requestId: string
  ) {
    super(detail);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Exception for validation errors (HTTP 400)
 * 
 * Thrown when request data fails validation checks
 */
export class ValidationError extends APIException {
  /**
   * Creates a ValidationError
   * 
   * @param detail - Detailed validation error message
   * @param requestId - Request ID for tracing
   */
  constructor(detail: string, requestId: string) {
    super(400, detail, requestId);
  }
}

/**
 * Exception for News API unavailability (HTTP 503)
 * 
 * Thrown when the external News API service is unavailable
 */
export class NewsAPIUnavailable extends APIException {
  /**
   * Creates a NewsAPIUnavailable exception
   * 
   * @param detail - Detailed error message
   * @param requestId - Request ID for tracing
   * @param retryAfter - Seconds to wait before retrying (default: 60)
   */
  constructor(
    detail: string,
    requestId: string,
    public retryAfter: number = 60
  ) {
    super(503, detail, requestId);
  }
}

/**
 * Exception for LLM provider errors (HTTP 502)
 * 
 * Thrown when the LLM service (AWS Bedrock) returns an error
 */
export class LLMProviderError extends APIException {
  /**
   * Creates a LLMProviderError
   * 
   * @param detail - Detailed error message from LLM provider
   * @param requestId - Request ID for tracing
   */
  constructor(detail: string, requestId: string) {
    super(502, detail, requestId);
  }
}

/**
 * Exception for rate limit exceeded (HTTP 429)
 * 
 * Thrown when a client exceeds the allowed request rate
 */
export class RateLimitExceeded extends APIException {
  /**
   * Creates a RateLimitExceeded exception
   * 
   * @param detail - Detailed rate limit error message
   * @param requestId - Request ID for tracing
   */
  constructor(detail: string, requestId: string) {
    super(429, detail, requestId);
  }
}
