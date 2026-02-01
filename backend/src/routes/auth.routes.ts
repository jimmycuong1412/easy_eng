/**
 * Authentication Routes
 * 
 * Defines auth endpoints
 */

import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

/**
 * Public routes
 */
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', asyncHandler(forgotPassword));

/**
 * Protected routes (require authentication)
 */
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(getMe));

export default router;
