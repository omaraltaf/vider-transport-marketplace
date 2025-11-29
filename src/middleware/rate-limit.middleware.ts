import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../config/logger';

/**
 * Rate limiting middleware for authentication endpoints
 * Limit: 5 requests per IP per 15 minutes
 * Requirements: 19.1
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded for authentication endpoint', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      },
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Rate limiting middleware for booking creation endpoints
 * Limit: 20 requests per user per hour
 * Requirements: 19.2
 */
export const bookingRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key instead of IP
  keyGenerator: (req: Request) => {
    // Extract user ID from authenticated request
    const user = (req as any).user;
    return user?.id || req.ip || 'anonymous';
  },
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    logger.warn('Rate limit exceeded for booking creation', {
      userId: user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many booking requests. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      },
    });
  },
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Rate limiting middleware for search endpoints
 * Limit: 100 requests per IP per minute
 * Requirements: 19.3
 */
export const searchRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded for search endpoint', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      query: req.query,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many search requests. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
      },
    });
  },
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'test';
  },
});

/**
 * Generic rate limiter factory for custom limits
 */
export function createRateLimiter(
  windowMs: number,
  max: number,
  message: string,
  useUserId: boolean = false
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: useUserId
      ? (req: Request) => {
          const user = (req as any).user;
          return user?.id || req.ip || 'anonymous';
        }
      : undefined,
    handler: (req: Request, res: Response) => {
      const user = (req as any).user;
      logger.warn('Rate limit exceeded', {
        userId: useUserId ? user?.id : undefined,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: res.getHeader('Retry-After'),
        },
      });
    },
    skip: (req: Request) => {
      return process.env.NODE_ENV === 'test';
    },
  });
}
