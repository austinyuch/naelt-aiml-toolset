import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../../../src/api/middleware/auth.js';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Set environment variable for testing
    process.env.API_KEYS = 'test-key-1,test-key-2,test-key-3';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.API_KEYS;
  });

  it('should call next() for valid API key', () => {
    mockRequest.headers = { 'x-api-key': 'test-key-1' };

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should accept any valid API key from the list', () => {
    const validKeys = ['test-key-1', 'test-key-2', 'test-key-3'];

    validKeys.forEach(key => {
      jest.clearAllMocks();
      mockRequest.headers = { 'x-api-key': key };

      authMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  it('should return 401 for missing API key', () => {
    mockRequest.headers = {};

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      detail: 'API key is required'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid API key', () => {
    mockRequest.headers = { 'x-api-key': 'invalid-key' };

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      detail: 'Invalid API key'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 for empty API key', () => {
    mockRequest.headers = { 'x-api-key': '' };

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should be case-sensitive for API keys', () => {
    mockRequest.headers = { 'x-api-key': 'TEST-KEY-1' };

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should handle missing API_KEYS environment variable', () => {
    delete process.env.API_KEYS;
    mockRequest.headers = { 'x-api-key': 'any-key' };

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should trim whitespace from API keys', () => {
    process.env.API_KEYS = ' test-key-1 , test-key-2 ';
    mockRequest.headers = { 'x-api-key': 'test-key-1' };

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
  });
});
