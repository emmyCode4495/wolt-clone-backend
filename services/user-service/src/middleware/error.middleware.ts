import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErrorMiddleware {
  /**
   * Global error handler
   */
  static handle(
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;
    const message = err.message || 'Internal server error';

    // Log error
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    // Send error response
    res.status(statusCode).json({
      success: false,
      message,
      ...(config.nodeEnv === 'development' && {
        stack: err.stack,
        error: err,
      }),
    });
  }

  /**
   * Handle 404 errors
   */
  static notFound(req: Request, res: Response): void {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`,
    });
  }

  /**
   * Async handler wrapper to catch errors
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}