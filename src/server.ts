import app from './app';
import { config } from './config/env';
import { connectDatabase } from './config/db';
import mongoose from 'mongoose';

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(config.port, () => {
      console.log(`=========================================`);
      console.log(`🚀 TaskFlow Backend running on port ${config.port}`);
      console.log(`🌐 Environment: ${config.nodeEnv}`);
      console.log(`📡 Base API URL: http://localhost:${config.port}/api`);
      console.log(`❤️  Health Check: http://localhost:${config.port}/api/health`);
      console.log(`=========================================`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Closing gracefully...`);
      server.close(async () => {
        await mongoose.connection.close();
        console.log('[Server] Database connection closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
