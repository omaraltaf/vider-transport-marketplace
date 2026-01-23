import { createApp } from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './config/logger';

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Vider Platform API running on port ${config.PORT}`);
      logger.info(`📝 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 Frontend URL: ${config.FRONTEND_URL}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
