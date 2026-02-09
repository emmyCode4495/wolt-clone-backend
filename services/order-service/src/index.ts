import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { config } from './config';
import orderRoutes from './routes/order.routes';
import { ErrorMiddleware } from './middleware/error.middleware';

class Server {
  private app: Application;

  constructor() {
    this.app = express();
    this.connectDatabase();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private async connectDatabase(): Promise<void> {
    try {
      await mongoose.connect(config.mongoUri);
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  private initializeMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({ origin: config.corsOrigin, credentials: true }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }

    // Health check
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Order service is healthy',
        timestamp: new Date().toISOString(),
        service: 'order-service',
      });
    });
  }

  private initializeRoutes(): void {
    this.app.use('/api/orders', orderRoutes);

    this.app.get('/', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'Wolt Clone Order Service API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          orders: '/api/orders',
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(ErrorMiddleware.notFound);
    this.app.use(ErrorMiddleware.handle);
  }

  public start(): void {
    const PORT = config.port;

    this.app.listen(PORT, () => {
      console.log(`
🛒 Order Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Port: ${PORT}
🌍 Environment: ${config.nodeEnv}
🗄️  Database: Connected
📡 API: http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });

    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  private async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down gracefully...');
    
    try {
      await mongoose.connection.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

const server = new Server();
server.start();

export default Server;