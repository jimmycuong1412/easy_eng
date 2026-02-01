/**
 * Authentication Controller
 * 
 * Handles authentication HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  requestPasswordReset,
  RegisterSchema,
  LoginSchema,
} from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate input
    const input = RegisterSchema.parse(req.body);

    // Register user
    const result = await registerUser(input);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Login user
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate input
    const input = LoginSchema.parse(req.body);

    // Login user
    const result = await loginUser(input);

    res.json({
      success: true,
      data: result,
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Logout user
 */
export async function logout(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    await logoutUser(token);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader!.substring(7);

    const user = await getCurrentUser(token);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    await requestPasswordReset(email);

    res.json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    });
  } catch (error) {
    next(error);
  }
}
