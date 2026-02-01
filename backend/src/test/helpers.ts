/**
 * Test Helper Utilities
 * 
 * Common utilities for API testing with Supertest and Vitest
 */

import { expect } from 'vitest';
import type { Application } from 'express';
import request from 'supertest';

/**
 * Create authenticated request with JWT token
 */
export function authenticatedRequest(app: Application, token: string) {
  return request(app).set('Authorization', `Bearer ${token}`);
}

/**
 * Generate mock JWT token for testing
 */
export function generateMockToken(payload: { userId: string; role: string }): string {
  // In real implementation, use jsonwebtoken
  // For testing, return a predictable token
  return `mock-jwt-${payload.userId}-${payload.role}`;
}

/**
 * Mock user profiles for testing
 */
export const mockUsers = {
  student: {
    id: 'test-student-id',
    email: 'student@test.com',
    role: 'student',
  },
  teacher: {
    id: 'test-teacher-id',
    email: 'teacher@test.com',
    role: 'teacher',
  },
  admin: {
    id: 'test-admin-id',
    email: 'admin@test.com',
    role: 'admin',
  },
};

/**
 * Wait for async operations in tests
 */
export async function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create test request with common headers
 */
export function createTestRequest(app: Application) {
  return request(app)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json');
}

/**
 * Assert API error response structure
 */
export function expectApiError(response: any, statusCode: number, message?: string) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (message) {
    expect(response.body.error).toContain(message);
  }
}

/**
 * Assert API success response structure
 */
export function expectApiSuccess(response: any, statusCode: number = 200) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
}

/**
 * Clean database table for testing
 */
export async function cleanTable(tableName: string): Promise<void> {
  // Implementation will use Supabase admin client
  // For now, this is a placeholder
  console.log(`Cleaning table: ${tableName}`);
}

/**
 * Seed test data into database
 */
export async function seedTestData(data: Record<string, any[]>): Promise<void> {
  // Implementation will insert test data
  // For now, this is a placeholder
  console.log('Seeding test data:', Object.keys(data));
}
