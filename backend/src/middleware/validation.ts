/**
 * Request Validation Middleware
 * 
 * Zod schema validation for request bodies
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import logger from '../lib/logger';

/**
 * Validate request body against Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { errors: error.errors });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      logger.error('Unexpected validation error', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Validate request query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Query validation error', { errors: error.errors });
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      logger.error('Unexpected query validation error', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Validate request params
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Params validation error', { errors: error.errors });
        res.status(400).json({
          success: false,
          error: 'Invalid URL parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }

      logger.error('Unexpected params validation error', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  };
}
