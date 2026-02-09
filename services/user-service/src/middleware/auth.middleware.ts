import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../config';
import { User, UserRole, UserStatus } from '../models/user.model';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

export class AuthMiddleware {
  /**
   * Verify JWT token and attach user to request
   */
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

      const decoded = jwt.verify(token, config.jwtSecret as Secret) as JWTPayload;

      // Verify user still exists and is active
      const user = await User.findById(decoded.id);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      if (user.status !== UserStatus.ACTIVE) {
        res.status(403).json({
          success: false,
          message: 'Account is not active',
        });
        return;
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
        return;
      }

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expired',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Authentication error',
      });
    }
  }

  /**
   * Check if user has required role
   */
  static authorize(...roles: UserRole[]) {
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

  /**
   * Optional authentication - doesn't fail if no token
   */
  static async optionalAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwtSecret as Secret) as JWTPayload;

      const user = await User.findById(decoded.id);

      if (user && user.status === UserStatus.ACTIVE) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
        };
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  }
}