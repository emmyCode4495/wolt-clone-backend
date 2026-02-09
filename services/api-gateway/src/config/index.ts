import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  userServiceUrl: string;
  restaurantServiceUrl: string;
  orderServiceUrl: string;
  corsOrigin: string;
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  restaurantServiceUrl: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002',
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,
};