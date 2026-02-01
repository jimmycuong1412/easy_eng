/**
 * Express Server Entry Point
 * 
 * Main application server for Easy English Learning Platform
 */

import express, { Application } from 'express';
import dotenv from 'dotenv';
import logger from './lib/logger';
import { verifySupabaseConnection } from './lib/supabase';
import {
  corsMiddleware,
  helmetMiddleware,
  compressionMiddleware,
  jsonMiddleware,
  urlencodedMiddleware,
} from './middleware/common';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

/**
 * Middleware setup
 */
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(compressionMiddleware);
app.use(jsonMiddleware);
app.use(urlencodedMiddleware);

// Request logging
app.use((req, _res, next) => {
  logger.http(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * API Routes
 */
app.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: 'Easy English Learning Platform API',
    version: '0.1.0',
  });
});

// Import routes
import authRoutes from './routes/auth.routes';
import classesRoutes from './routes/classes.routes';
import bookingsRoutes from './routes/bookings.routes';
import gemsRoutes from './routes/gems.routes';
import { authenticate } from './middleware/auth';

// Mount routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/classes', authenticate, classesRoutes);
app.use('/api/bookings', authenticate, bookingsRoutes);
app.use('/api/gems', authenticate, gemsRoutes);

/**
 * Error handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start server
 */
async function startServer() {
  try {
    // Verify Supabase connection
    const isConnected = await verifySupabaseConnection();
    if (!isConnected) {
      logger.error('Failed to connect to Supabase. Exiting...');
      process.exit(1);
    }

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Graceful shutdown (not in test mode)
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
}

export default app;
