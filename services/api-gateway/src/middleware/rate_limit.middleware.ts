import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimitMiddleware {
  private static store: RateLimitStore = {};
  private static windowMs: number = 15 * 60 * 1000; // 15 minutes
  private static maxRequests: number = 100;

  static limit() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.ip || 'unknown';
      const now = Date.now();

      if (!RateLimitMiddleware.store[key]) {
        RateLimitMiddleware.store[key] = {
          count: 1,
          resetTime: now + RateLimitMiddleware.windowMs,
        };
        return next();
      }

      const record = RateLimitMiddleware.store[key];

      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RateLimitMiddleware.windowMs;
        return next();
      }

      record.count++;

      if (record.count > RateLimitMiddleware.maxRequests) {
        res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }

      next();
    };
  }

  static cleanup() {
    const now = Date.now();
    Object.keys(RateLimitMiddleware.store).forEach(key => {
      if (now > RateLimitMiddleware.store[key].resetTime) {
        delete RateLimitMiddleware.store[key];
      }
    });
  }
}

// Cleanup every 10 minutes
setInterval(() => RateLimitMiddleware.cleanup(), 10 * 60 * 1000);