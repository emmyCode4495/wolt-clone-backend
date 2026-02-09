import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthMiddleware {
  static async authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'No token provided',
        });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwtSecret as Secret) as any;

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  }

  static optionalAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwtSecret as Secret) as any;

        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      }
    } catch (error) {
      // Continue without auth
    }
    next();
  }

  static authorize(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
        return;
      }

      next();
    };
  }
}