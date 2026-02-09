import dotenv from 'dotenv';
import { SignOptions } from "jsonwebtoken";


dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/wolt-user-service',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"], 
 jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
  
  // Service Discovery (for microservices communication)
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  
  // Redis (for caching and session management)
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // AWS S3 (for profile pictures)
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsS3Bucket: process.env.AWS_S3_BUCKET || 'wolt-clone-uploads',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  
  // Rate limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMaxRequests: 100,
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};