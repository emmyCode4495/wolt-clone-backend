// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';

// export interface AuthRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//     role: string;
//   };
// }

// export class AuthMiddleware {
//   /**
//    * Populate req.user from API gateway headers first, then fall back to
//    * decoding a Bearer token directly. Never fails — leaves req.user
//    * undefined if nothing valid is found, so public routes still work.
//    */
//   static extractUser(req: AuthRequest, _res: Response, next: NextFunction): void {
//     try {
//       const userId    = req.headers['x-user-id']    as string;
//       const userEmail = req.headers['x-user-email'] as string;
//       const userRole  = req.headers['x-user-role']  as string;

//       if (userId && userEmail && userRole) {
//         req.user = { id: userId, email: userEmail, role: userRole };
//         return next();
//       }

//       const authHeader = req.headers.authorization;
//       if (authHeader?.startsWith('Bearer ')) {
//         const token   = authHeader.substring(7);
//         const decoded = jwt.decode(token) as any;
//         if (decoded?.id) {
//           req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
//         }
//       }

//       next();
//     } catch {
//       next();
//     }
//   }

//   /**
//    * Hard block — 401 if no user is attached to the request.
//    */
//   static requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
//     if (!req.user) {
//       res.status(401).json({ success: false, message: 'Authentication required' });
//       return;
//     }
//     next();
//   }

//   /**
//    * Hard block — 403 if the authenticated user is not an admin.
//    */
//   static requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
//     if (!req.user) {
//       res.status(401).json({ success: false, message: 'Authentication required' });
//       return;
//     }
//     if (req.user.role !== 'admin') {
//       res.status(403).json({ success: false, message: 'Admin access required' });
//       return;
//     }
//     next();
//   }

//   /**
//    * Hard block — 403 if the user is neither a store_owner nor an admin.
//    * Used for store creation and ownership-scoped updates.
//    */
//   static requireOwnerOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
//     if (!req.user) {
//       res.status(401).json({ success: false, message: 'Authentication required' });
//       return;
//     }
//     if (req.user.role !== 'admin' && req.user.role !== 'store_owner') {
//       res.status(403).json({ success: false, message: 'Store owner or admin access required' });
//       return;
//     }
//     next();
//   }
// }


import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthMiddleware {
  /**
   * Reads user identity from api-gateway injected headers first,
   * then falls back to decoding a Bearer token directly.
   * Never blocks — public routes still work if no identity found.
   */
  static extractUser(req: AuthRequest, _res: Response, next: NextFunction): void {
    try {
      const userId    = req.headers['x-user-id']    as string;
      const userEmail = req.headers['x-user-email'] as string;
      const userRole  = req.headers['x-user-role']  as string;

      if (userId && userEmail && userRole) {
        req.user = { id: userId, email: userEmail, role: userRole };
        return next();
      }

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token   = authHeader.substring(7);
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        if (decoded?.id) {
          req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
        }
      }

      next();
    } catch {
      next();
    }
  }

  static requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    next();
  }

  static requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Admin access required' });
      return;
    }
    next();
  }

  static requireOwnerOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    if (req.user.role !== 'admin' && req.user.role !== 'store_owner') {
      res.status(403).json({ success: false, message: 'Store owner or admin access required' });
      return;
    }
    next();
  }

  static optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
    AuthMiddleware.extractUser(req, _res, next);
  }
}

// ─── Named function exports ───────────────────────────────────────────────────
// Aliases that let existing routes use the flat import style:
//   import { authenticate, requireAdmin, requireOwnerOrAdmin } from '../middleware/auth.middleware'
// while the class pattern stays available for new code.

/**
 * authenticate — extracts the user from headers/token AND hard-blocks if not found.
 * Combines extractUser + requireAuth in one middleware.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthRequest;
  AuthMiddleware.extractUser(authReq, res, (err?: any) => {
    if (err) return next(err);
    AuthMiddleware.requireAuth(authReq, res, next);
  });
};

/** requireAdmin — assumes authenticate already ran; blocks if user is not admin. */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  AuthMiddleware.requireAdmin(req as AuthRequest, res, next);
};

/** requireOwnerOrAdmin — blocks if user is not store_owner or admin. */
export const requireOwnerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  AuthMiddleware.requireOwnerOrAdmin(req as AuthRequest, res, next);
};

/** optionalAuth — populates req.user if a valid token is present, never blocks. */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  AuthMiddleware.extractUser(req as AuthRequest, res, next);
};