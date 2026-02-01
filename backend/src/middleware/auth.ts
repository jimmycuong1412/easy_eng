/**
 * Authentication Middleware
 * 
 * JWT validation and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
  };
}

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid token', { error });
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Fetch user profile for role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.error('Failed to fetch user profile', { error: profileError });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Optional authentication - does not fail if no token present
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token present, continue without user
      next();
      return;
    }

    // Token present, validate it
    await authenticate(req, res, next);
  } catch (error) {
    // If error during optional auth, just continue without user
    logger.debug('Optional auth failed, continuing without user', { error });
    next();
  }
}
