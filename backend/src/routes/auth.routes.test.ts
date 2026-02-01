/**
 * Auth Routes Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from './auth.routes';
import { jsonMiddleware, urlencodedMiddleware } from '../middleware/common';
import { errorHandler } from '../middleware/error-handler';
import * as authService from '../services/auth.service';

// Mock the auth service
vi.mock('../services/auth.service', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  RegisterSchema: {
    parse: vi.fn((data) => data),
  },
  LoginSchema: {
    parse: vi.fn((data) => data),
  },
}));

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  default: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    http: vi.fn(),
  },
}));

// Mock authenticate middleware
vi.mock('../middleware/auth', () => ({
  authenticate: vi.fn((req, _res, next) => {
    // Simulate authenticated user
    req.user = {
      id: '123',
      email: 'test@example.com',
      role: 'student',
    };
    next();
  }),
}));

describe('Auth Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = express();
    app.use(jsonMiddleware);
    app.use(urlencodedMiddleware);
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        user: {
          id: '123',
          email: 'test@example.com',
        },
        session: {
          access_token: 'mock-token',
        },
      };

      vi.mocked(authService.registerUser).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          fullName: 'Test User',
          role: 'student',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
      expect(authService.registerUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        role: 'student',
      });
    });

    it('should return 400 for invalid input', async () => {
      const { AppError } = await import('../middleware/error-handler');
      vi.mocked(authService.registerUser).mockRejectedValue(
        new AppError('Invalid email address', 400)
      );

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
          fullName: 'T',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const mockResult = {
        user: {
          id: '123',
          email: 'test@example.com',
          role: 'student',
        },
        session: {
          access_token: 'mock-token',
        },
      };

      vi.mocked(authService.loginUser).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should return 401 for invalid credentials', async () => {
      const { AppError } = await import('../middleware/error-handler');
      vi.mocked(authService.loginUser).mockRejectedValue(
        new AppError('Invalid email or password', 401)
      );

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      vi.mocked(authService.logoutUser).mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 without authorization header', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const mockProfile = {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'student',
      };

      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockProfile);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfile);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      vi.mocked(authService.requestPasswordReset).mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 without email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
