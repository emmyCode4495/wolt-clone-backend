

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { ProxyMiddleware } from './middleware/proxy.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';
import { RateLimitMiddleware } from './middleware/rate_limit.middleware';
import aiRouter from './routes/ai.route';

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

    // ── Health ──────────────────────────────────────────────────────────────
    this.app.get('/health', (_req, res) => {
      res.json({
        success: true,
        message: 'API Gateway is healthy',
        timestamp: new Date().toISOString(),
        services: {
          userService:       config.userServiceUrl,
          restaurantService: config.restaurantServiceUrl,
          orderService:      config.orderServiceUrl,
          storeService:      config.storeServiceUrl,
          catalogService:    config.catalogServiceUrl,
        },
      });
    });

    // ── Root ────────────────────────────────────────────────────────────────
    this.app.get('/', (_req, res) => {
      res.json({
        success: true,
        message: 'Fuudie API Gateway',
        version: '1.0.0',
        endpoints: {
          // User service
          auth:         '/api/users/register | /api/users/login | /api/users/refresh-token',
          users:        '/api/users/*',
          // Restaurant service
          restaurants:  '/api/restaurants/*',
          menuItems:    '/api/menu-items/*',
          // Order service
          orders:       '/api/orders/*',
          // Store service
          stores:       '/api/stores/*',
          cities:       '/api/cities/*',
          storeCategories: '/api/store-categories/*',
          // Catalog service
          catalog:      '/api/catalog/products/* | /api/catalog/categories/*',

        },
      });
    });

    // ────────────────────────────────────────────────────────────────────────
    // USER SERVICE  :3001
    // ────────────────────────────────────────────────────────────────────────

    // Public auth routes — no token required
    this.app.all('/api/users/register', (req, res) =>
      ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );
    this.app.all('/api/users/login', (req, res) =>
      ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );
    this.app.all('/api/users/refresh-token', (req, res) =>
      ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );

    // Protected user routes
    this.app.all('/api/users/*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.userServiceUrl, req, res)
    );

    // ────────────────────────────────────────────────────────────────────────
    // RESTAURANT SERVICE  :3002
    // ────────────────────────────────────────────────────────────────────────

    // Public browsing (GET)
    this.app.get('/api/restaurants*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );
    this.app.get('/api/menu-items*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    // Protected management (POST/PUT/DELETE etc.)
    this.app.all('/api/restaurants*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );
    this.app.all('/api/menu-items*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.restaurantServiceUrl, req, res)
    );

    // ────────────────────────────────────────────────────────────────────────
    // ORDER SERVICE  :3003  — all routes require auth
    // ────────────────────────────────────────────────────────────────────────

    this.app.all('/api/orders*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.orderServiceUrl, req, res)
    );

    // ────────────────────────────────────────────────────────────────────────
    // STORE SERVICE  :3004
    // ────────────────────────────────────────────────────────────────────────

    // Public — anyone can browse cities, store categories, and store listings
    this.app.get('/api/cities*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.storeServiceUrl, req, res)
    );
    this.app.get('/api/store-categories*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.storeServiceUrl, req, res)
    );
    this.app.get('/api/stores*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.storeServiceUrl, req, res)
    );

    // Protected — creating/updating cities, categories, and stores
    this.app.all('/api/cities*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.storeServiceUrl, req, res)
    );
    this.app.all('/api/store-categories*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.storeServiceUrl, req, res)
    );
    this.app.all('/api/stores*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.storeServiceUrl, req, res)
    );

    // ────────────────────────────────────────────────────────────────────────
    // CATALOG SERVICE  :3005
    // ────────────────────────────────────────────────────────────────────────

    // Block internal order-update endpoint from being called publicly.
    // order-service calls catalog-service directly over the internal network.
    this.app.all('/api/catalog/products/internal/*', (_req, res) => {
      res.status(403).json({
        success: false,
        message: 'This endpoint is not publicly accessible',
      });
    });

    // Public — browsing products and product categories
    this.app.get('/api/catalog*',
      AuthMiddleware.optionalAuth,
      (req, res) => ProxyMiddleware.forwardRequest(config.catalogServiceUrl, req, res)
    );

    // Protected — creating/updating/deleting products and product categories
    this.app.all('/api/catalog*',
      AuthMiddleware.authenticate,
      (req, res) => ProxyMiddleware.forwardRequest(config.catalogServiceUrl, req, res)
    );

     this.app.use('/api/ai', aiRouter);
     
    // ────────────────────────────────────────────────────────────────────────
    // Fallbacks
    // ────────────────────────────────────────────────────────────────────────

    this.app.use((_req, res) => {
      res.status(404).json({ success: false, message: 'Route not found' });
    });

    this.app.use((err: Error, _req: Request, res: Response, _next: any) => {
      console.error('Gateway error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    });

   
  }

  public start(): void {
    const PORT = config.port;

    this.app.listen(PORT, () => {
      console.log(`
🌐 API Gateway Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port:              ${PORT}
🌍 Environment:       ${config.nodeEnv}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 User Service:      ${config.userServiceUrl}
🔗 Restaurant:        ${config.restaurantServiceUrl}
🔗 Order Service:     ${config.orderServiceUrl}
🔗 Store Service:     ${config.storeServiceUrl}
🔗 Catalog Service:   ${config.catalogServiceUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 API:    http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  }
}

const gateway = new APIGateway();
gateway.start();

export default APIGateway;