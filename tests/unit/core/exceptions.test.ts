import {
  APIException,
  ValidationError,
  NewsAPIUnavailable,
  LLMProviderError,
  RateLimitExceeded,
} from '../../../src/core/exceptions';

describe('Core Exceptions', () => {
  describe('APIException', () => {
    it('should create an APIException with correct properties', () => {
      const exception = new APIException(500, 'Internal error', 'req_123');

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(APIException);
      expect(exception.statusCode).toBe(500);
      expect(exception.detail).toBe('Internal error');
      expect(exception.requestId).toBe('req_123');
      expect(exception.message).toBe('Internal error');
      expect(exception.name).toBe('APIException');
    });

    it('should have a stack trace', () => {
      const exception = new APIException(500, 'Internal error', 'req_123');

      expect(exception.stack).toBeDefined();
      expect(exception.stack).toContain('APIException');
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with 400 status code', () => {
      const error = new ValidationError('Invalid input', 'req_456');

      expect(error).toBeInstanceOf(APIException);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(400);
      expect(error.detail).toBe('Invalid input');
      expect(error.requestId).toBe('req_456');
      expect(error.name).toBe('ValidationError');
    });

    it('should handle validation error messages', () => {
      const error = new ValidationError(
        'Keywords must be between 1 and 10',
        'req_789'
      );

      expect(error.message).toBe('Keywords must be between 1 and 10');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('NewsAPIUnavailable', () => {
    it('should create a NewsAPIUnavailable with 503 status code', () => {
      const error = new NewsAPIUnavailable(
        'Google News API is temporarily unavailable',
        'req_abc'
      );

      expect(error).toBeInstanceOf(APIException);
      expect(error).toBeInstanceOf(NewsAPIUnavailable);
      expect(error.statusCode).toBe(503);
      expect(error.detail).toBe('Google News API is temporarily unavailable');
      expect(error.requestId).toBe('req_abc');
      expect(error.retryAfter).toBe(60); // Default retry after
      expect(error.name).toBe('NewsAPIUnavailable');
    });

    it('should accept custom retry after value', () => {
      const error = new NewsAPIUnavailable(
        'Service unavailable',
        'req_def',
        120
      );

      expect(error.retryAfter).toBe(120);
    });

    it('should use default retry after when not provided', () => {
      const error = new NewsAPIUnavailable('Service unavailable', 'req_ghi');

      expect(error.retryAfter).toBe(60);
    });
  });

  describe('LLMProviderError', () => {
    it('should create a LLMProviderError with 502 status code', () => {
      const error = new LLMProviderError(
        'AWS Bedrock API error',
        'req_jkl'
      );

      expect(error).toBeInstanceOf(APIException);
      expect(error).toBeInstanceOf(LLMProviderError);
      expect(error.statusCode).toBe(502);
      expect(error.detail).toBe('AWS Bedrock API error');
      expect(error.requestId).toBe('req_jkl');
      expect(error.name).toBe('LLMProviderError');
    });

    it('should handle LLM timeout errors', () => {
      const error = new LLMProviderError(
        'Request timeout after 60 seconds',
        'req_mno'
      );

      expect(error.message).toBe('Request timeout after 60 seconds');
      expect(error.statusCode).toBe(502);
    });
  });

  describe('RateLimitExceeded', () => {
    it('should create a RateLimitExceeded with 429 status code', () => {
      const error = new RateLimitExceeded(
        'Refinement limit exceeded: 5 per hour',
        'req_pqr'
      );

      expect(error).toBeInstanceOf(APIException);
      expect(error).toBeInstanceOf(RateLimitExceeded);
      expect(error.statusCode).toBe(429);
      expect(error.detail).toBe('Refinement limit exceeded: 5 per hour');
      expect(error.requestId).toBe('req_pqr');
      expect(error.name).toBe('RateLimitExceeded');
    });

    it('should handle rate limit messages', () => {
      const error = new RateLimitExceeded(
        'Too many requests',
        'req_stu'
      );

      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
    });
  });

  describe('Error inheritance chain', () => {
    it('should maintain proper inheritance chain', () => {
      const validationError = new ValidationError('test', 'req_1');
      const newsError = new NewsAPIUnavailable('test', 'req_2');
      const llmError = new LLMProviderError('test', 'req_3');
      const rateLimitError = new RateLimitExceeded('test', 'req_4');

      expect(validationError instanceof Error).toBe(true);
      expect(validationError instanceof APIException).toBe(true);
      expect(validationError instanceof ValidationError).toBe(true);

      expect(newsError instanceof Error).toBe(true);
      expect(newsError instanceof APIException).toBe(true);
      expect(newsError instanceof NewsAPIUnavailable).toBe(true);

      expect(llmError instanceof Error).toBe(true);
      expect(llmError instanceof APIException).toBe(true);
      expect(llmError instanceof LLMProviderError).toBe(true);

      expect(rateLimitError instanceof Error).toBe(true);
      expect(rateLimitError instanceof APIException).toBe(true);
      expect(rateLimitError instanceof RateLimitExceeded).toBe(true);
    });
  });

  describe('Error serialization', () => {
    it('should serialize APIException to JSON', () => {
      const error = new APIException(500, 'Test error', 'req_xyz');
      const json = JSON.stringify({
        name: error.name,
        statusCode: error.statusCode,
        detail: error.detail,
        requestId: error.requestId,
      });

      expect(json).toContain('APIException');
      expect(json).toContain('500');
      expect(json).toContain('Test error');
      expect(json).toContain('req_xyz');
    });

    it('should serialize NewsAPIUnavailable with retryAfter', () => {
      const error = new NewsAPIUnavailable('Service down', 'req_123', 90);
      const json = JSON.stringify({
        name: error.name,
        statusCode: error.statusCode,
        detail: error.detail,
        requestId: error.requestId,
        retryAfter: error.retryAfter,
      });

      expect(json).toContain('NewsAPIUnavailable');
      expect(json).toContain('503');
      expect(json).toContain('90');
    });
  });
});
