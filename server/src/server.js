import dotenv from 'dotenv';
import app from './app.js';
import { connectDB, disconnectDB } from './config/database.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start the HTTP server
const startServer = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error(`[Server] Failed to connect to database on startup: ${error.message}`);
    console.warn('[Server] Starting server without active MongoDB connection (will retry or serve health checks)');
  }

  const server = app.listen(PORT, () => {
    console.log(`[Server] CloudLabs Operations Dashboard API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Environments endpoint: http://localhost:${PORT}/api/environments`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectDB();
      process.exit(0);
    });

    // Force shutdown after 10s timeout
    setTimeout(() => {
      console.error('[Server] Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  });
};

startServer();
