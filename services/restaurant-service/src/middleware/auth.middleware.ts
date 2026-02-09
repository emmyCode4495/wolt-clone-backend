import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthMiddleware {
  static extractUser(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): void {
    try {
      // Try to get user from custom headers (forwarded by gateway)
      const userId = req.headers['x-user-id'] as string;
      const userEmail = req.headers['x-user-email'] as string;
      const userRole = req.headers['x-user-role'] as string;

      if (userId && userEmail && userRole) {
        req.user = {
          id: userId,
          email: userEmail,
          role: userRole,
        };
        return next();
      }

      // Fallback: Try to extract from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // Note: In production, you should validate the JWT signature
        // For now, we'll just decode it
        const decoded = jwt.decode(token) as any;
        
        if (decoded && decoded.id) {
          req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
          };
        }
      }

      next();
    } catch (error) {
      // Continue without user info
      next();
    }
  }

  static requireAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }
    next();
  }
}