/**
 * Role-Based Access Control Middleware
 * 
 * Restrict access to routes based on user roles
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import logger from '../lib/logger';

type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

/**
 * Require specific roles to access a route
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      logger.warn('RBAC check failed: No user in request');
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      logger.warn('RBAC check failed', {
        userId: req.user.id,
        userRole,
        allowedRoles,
      });
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    // User has required role, proceed
    next();
  };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Require teacher role
 */
export const requireTeacher = requireRole('teacher', 'admin');

/**
 * Require student role
 */
export const requireStudent = requireRole('student', 'admin');

/**
 * Require parent role
 */
export const requireParent = requireRole('parent', 'admin');
