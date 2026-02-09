// import express, { Application, Request, Response } from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import morgan from 'morgan';
// import { config } from './config';
// import { ProxyMiddleware } from './middleware/proxy.middleware';
// import { AuthMiddleware, AuthRequest } from './middleware/auth.middleware';
// import { RateLimitMiddleware } from './middleware/rate_limit.middleware';

// class APIGateway {
//   private app: Application;

//   constructor() {
//     this.app = express();
//     this.initializeMiddleware();
//     this.initializeRoutes();
//   }

//   private initializeMiddleware(): void {
//     this.app.use(helmet());
//     this.app.use(cors({ origin: config.corsOrigin, credentials: true }));
//     this.app.use(express.json({ limit: '10mb' }));
//     this.app.use(express.urlencoded({ extended: true }));

//     if (config.nodeEnv === 'development') {
//       this.app.use(morgan('dev'));
//     }

//     this.app.use(RateLimitMiddleware.limit());
//   }

//   private initializeRoutes(): void {
//     // Health check
//     this.app.get('/health', (_req, res) => {
//       res.json({
//         success: true,
//         message: 'API Gateway is healthy',
//         services: {
//           userService: config.userServiceUrl,
//           restaurantService: config.restaurantServiceUrl,
//         },
//       });
//     });

//     // Root
//     this.app.get('/', (_req, res) => {
//       res.json({
//         success: true,
//         message: 'Wolt Clone API Gateway',
//         version: '1.0.0',
//         services: {
//           users: '/api/users',
//           restaurants: '/api/restaurants',
//         },
//       });
//     });

//     // User Service Routes (public)
//     this.app.all('/api/users/register', (req, res) => 
//       ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
//     );
//     this.app.all('/api/users/login', (req, res) => 
//       ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
//     );
//     this.app.all('/api/users/refresh-token', (req, res) => 
//       ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
//     );

//     // User Service Routes (protected)
//     this.app.all('/api/users/*', 
//       AuthMiddleware.authenticate,
//       (req, res) => ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
//     );

//     // Restaurant Service Routes (public - browsing)
//     this.app.get('/api/restaurants*',
//       AuthMiddleware.optionalAuth,
//       (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
//     );

//     // Restaurant Service Routes (protected - management)
//     this.app.all('/api/restaurants*',
//       AuthMiddleware.authenticate,
//       (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
//     );

//     // Menu Items Routes
//     this.app.get('/api/menu-items*',
//       AuthMiddleware.optionalAuth,
//       (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
//     );

//     this.app.all('/api/menu-items*',
//       AuthMiddleware.authenticate,
//       (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
//     );

//     // Categories Routes
//     this.app.get('/api/categories*',
//       AuthMiddleware.optionalAuth,
//       (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
//     );

//     this.app.all('/api/categories*',
//       AuthMiddleware.authenticate,
//       (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
//     );

//     // 404
//     this.app.use((_req, res) => {
//       res.status(404).json({
//         success: false,
//         message: 'Route not found',
//       });
//     });

//     // Error handler
//     this.app.use((err: Error, _req: Request, res: Response, _next: any) => {
//       console.error('Gateway error:', err);
//       res.status(500).json({
//         success: false,
//         message: 'Internal server error',
//       });
//     });
//   }

//   public start(): void {
//     const PORT = config.port;

//     this.app.listen(PORT, () => {
//       console.log(`
// 🌐 API Gateway Started
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📍 Port: ${PORT}
// 🌍 Environment: ${config.nodeEnv}
// 🔗 User Service: ${config.userServiceUrl}
// 🔗 Restaurant Service: ${config.restaurantServiceUrl}
// 📡 API: http://localhost:${PORT}
// 🏥 Health: http://localhost:${PORT}/health
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//       `);
//     });
//   }
// }

// const gateway = new APIGateway();
// gateway.start();

// export default APIGateway;

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { ProxyMiddleware } from './middleware/proxy.middleware';
import { AuthMiddleware, AuthRequest } from './middleware/auth.middleware';
import { RateLimitMiddleware } from './middleware/rate_limit.middleware';

class APIGateway {
  private app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({ origin: config.corsOrigin, credentials: true }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }

    this.app.use(RateLimitMiddleware.limit());
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'API Gateway is healthy',
        services: {
          userService: config.userServiceUrl,
          restaurantService: config.restaurantServiceUrl,
          orderService: config.orderServiceUrl,
        },
      });
    });

    // Root
    this.app.get('/', (_req, res) => {
      res.json({
        success: true,
        message: 'Wolt Clone API Gateway',
        version: '1.0.0',
        services: {
          users: '/api/users',
          restaurants: '/api/restaurants',
          orders: '/api/orders',
        },
      });
    });

    // User Service Routes (public)
    this.app.all('/api/users/register', (req, res) => 
      ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );
    this.app.all('/api/users/login', (req, res) => 
      ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );
    this.app.all('/api/users/refresh-token', (req, res) => 
      ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );

    // User Service Routes (protected)
    this.app.all('/api/users/*', 
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );

    // Restaurant Service Routes (public - browsing)
    this.app.get('/api/restaurants*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    // Restaurant Service Routes (protected - management)
    this.app.all('/api/restaurants*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    // Menu Items Routes
    this.app.get('/api/menu-items*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    this.app.all('/api/menu-items*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    // Categories Routes
    this.app.get('/api/categories*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    this.app.all('/api/categories*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    // Order Service Routes (all protected)
    this.app.all('/api/orders*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.orderServiceUrl, req, res)
    );

    // 404
    this.app.use((_req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
      });
    });

    // Error handler
    this.app.use((err: Error, _req: Request, res: Response, _next: any) => {
      console.error('Gateway error:', err);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    });
  }

  public start(): void {
    const PORT = config.port;

    this.app.listen(PORT, () => {
      console.log(`
🌐 API Gateway Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
🌍 Environment: ${config.nodeEnv}
🔗 User Service: ${config.userServiceUrl}
🔗 Restaurant Service: ${config.restaurantServiceUrl}
📡 API: http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  }
}

const gateway = new APIGateway();
gateway.start();

export default APIGateway;