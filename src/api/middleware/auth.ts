import { Request, Response, NextFunction } from 'express';

/**
 * API Key Authentication Middleware
 * 
 * Validates API key from x-api-key header
 * Requirements: 9.5
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get API key from header
  const apiKey = req.headers['x-api-key'];

  // Check if API key is provided
  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      detail: 'API key is required'
    });
    return;
  }

  // Get valid API keys from environment variable
  const validKeysString = process.env.API_KEYS || '';
  const validKeys = validKeysString
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0);

  // Check if provided API key is valid
  if (!validKeys.includes(apiKey as string)) {
    res.status(401).json({
      error: 'Unauthorized',
      detail: 'Invalid API key'
    });
    return;
  }

  // API key is valid, proceed to next middleware
  next();
}
