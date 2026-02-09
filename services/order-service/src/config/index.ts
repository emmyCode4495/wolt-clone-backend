import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  userServiceUrl: string;
  restaurantServiceUrl: string;
  corsOrigin: string;
  taxRate: number; // e.g., 0.08 for 8% tax
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/wolt-order-service',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  restaurantServiceUrl: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  taxRate: parseFloat(process.env.TAX_RATE || '0.08'),
};