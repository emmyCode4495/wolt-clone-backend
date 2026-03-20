import dotenv from 'dotenv';
dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  apiGatewayUrl: string;
  userServiceUrl: string;
  corsOrigin: string;
  logLevel: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/wolt-restaurant-service',
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
};