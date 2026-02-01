/**
 * Authentication Service
 * 
 * Handles user authentication via Supabase Auth
 */

import { z } from 'zod';
import supabase from '../lib/supabase';
import logger from '../lib/logger';
import { AppError } from '../middleware/error-handler';

/**
 * Validation schemas
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['student', 'teacher', 'parent']).default('student'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Register a new user
 */
export async function registerUser(input: RegisterInput) {
  try {
    const { email, password, fullName, role } = input;

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      logger.error('Registration failed', { error, email });
      throw new AppError(error.message, 400);
    }

    if (!data.user) {
      throw new AppError('Registration failed', 500);
    }

    // Update role in profile (created by trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', data.user.id);

    if (profileError) {
      logger.error('Failed to update profile role', { error: profileError });
      // Don't fail registration, role can be updated later
    }

    logger.info('User registered successfully', { userId: data.user.id, email });

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Unexpected registration error', { error });
    throw new AppError('Registration failed', 500);
  }
}

/**
 * Login user
 */
export async function loginUser(input: LoginInput) {
  try {
    const { email, password } = input;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn('Login failed', { error, email });
      throw new AppError('Invalid email or password', 401);
    }

    if (!data.user || !data.session) {
      throw new AppError('Login failed', 500);
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      logger.error('Failed to fetch profile', { error: profileError });
      // Continue without profile data
    }

    logger.info('User logged in successfully', { userId: data.user.id, email });

    return {
      user: profile || {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Unexpected login error', { error });
    throw new AppError('Login failed', 500);
  }
}

/**
 * Logout user
 */
export async function logoutUser(accessToken: string) {
  try {
    // Supabase logout requires setting the session first
    const { error } = await supabase.auth.admin.signOut(accessToken);

    if (error) {
      logger.error('Logout failed', { error });
      throw new AppError('Logout failed', 500);
    }

    logger.info('User logged out successfully');

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Unexpected logout error', { error });
    throw new AppError('Logout failed', 500);
  }
}

/**
 * Get current user by access token
 */
export async function getCurrentUser(accessToken: string) {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new AppError('Invalid or expired token', 401);
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      logger.error('Failed to fetch profile', { error: profileError });
      throw new AppError('Failed to fetch user profile', 500);
    }

    return profile;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Unexpected error fetching user', { error });
    throw new AppError('Failed to fetch user', 500);
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });

    if (error) {
      logger.error('Password reset request failed', { error, email });
      throw new AppError('Failed to send password reset email', 500);
    }

    logger.info('Password reset email sent', { email });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Unexpected error requesting password reset', { error });
    throw new AppError('Failed to request password reset', 500);
  }
}
