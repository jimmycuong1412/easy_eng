/**
 * Error Handler Middleware
 * 
 * Centralized error handling for Express
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * Must be registered last in middleware chain
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Determine error message
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(err instanceof AppError && err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('404 Not Found', { path: req.path, method: req.method });
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
