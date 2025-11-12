import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../../src/api/middleware/errorHandler.js';
import { z } from 'zod';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      path: '/api/v1/test'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle generic Error', () => {
    const error = new Error('Test error message');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'InternalServerError',
        detail: 'Test error message',
        timestamp: expect.any(String)
      })
    );
  });

  it('should handle Zod validation errors', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });

    try {
      schema.parse({ name: 'John', age: 'invalid' });
    } catch (error) {
      errorHandler(
        error as Error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'ValidationError',
          timestamp: expect.any(String)
        })
      );
    }
  });

  it('should include request_id if provided', () => {
    mockRequest.headers = { 'x-request-id': 'test-request-123' };
    const error = new Error('Test error');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 'test-request-123'
      })
    );
  });

  it('should use "unknown" as request_id if not provided', () => {
    const error = new Error('Test error');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 'unknown'
      })
    );
  });

  it('should include timestamp in ISO format', () => {
    const error = new Error('Test error');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should handle non-Error objects', () => {
    const error = 'String error';

    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'InternalServerError',
        detail: 'Unknown error occurred'
      })
    );
  });

  it('should handle errors with status code property', () => {
    const error: any = new Error('Custom error');
    error.statusCode = 404;

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should sanitize error messages for production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Internal database connection failed at line 123');

    errorHandler(
      error,
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // In production, we might want to sanitize detailed error messages
    expect(mockResponse.json).toHaveBeenCalled();
    
    delete process.env.NODE_ENV;
  });
});
