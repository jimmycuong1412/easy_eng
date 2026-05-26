/**
 * Test Utilities - Shared helpers for unit and integration tests
 *
 * Provides reusable test helpers, custom matchers, and utilities
 * for testing React components and business logic.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { createMockSupabaseClient } from './mocks/supabase';

/**
 * Test wrapper with all providers needed for component testing
 */
interface AllProvidersProps {
  children: ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  // Add your providers here as they're implemented
  // Example: AuthProvider, ThemeProvider, etc.
  return <>{children}</>;
}

/**
 * Custom render function that wraps components with test providers
 *
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />);
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Creates a mock authenticated user for testing
 */
export function createMockUser(overrides?: Partial<any>) {
  return {
    id: 'test-user-001',
    email: 'test@example.com',
    role: 'student',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock teacher profile for testing
 */
export function createMockTeacher(overrides?: Partial<any>) {
  return {
    id: 'teacher-001',
    user_id: 'test-user-teacher',
    specialties: ['Business English', 'IELTS'],
    hourly_rate: 25.0,
    bio: 'Experienced English teacher',
    availability: [],
    rating: 4.8,
    total_reviews: 156,
    ...overrides,
  };
}

/**
 * Creates a mock class for testing
 */
export function createMockClass(overrides?: Partial<any>) {
  return {
    id: 'class-001',
    teacher_id: 'teacher-001',
    title: 'Business English Conversation',
    description: 'Improve your business communication skills',
    price: 25.0,
    duration_minutes: 60,
    max_students: 5,
    start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: 'scheduled',
    ...overrides,
  };
}

/**
 * Creates a mock booking for testing
 */
export function createMockBooking(overrides?: Partial<any>) {
  return {
    id: 'booking-001',
    student_id: 'test-user-001',
    class_id: 'class-001',
    status: 'confirmed',
    original_price: 25.0,
    cookies_used: 0,
    final_price: 25.0,
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Waits for a condition to be true with timeout
 *
 * @example
 * await waitForCondition(() => element.textContent === 'Loaded', 1000);
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 3000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Simulates async data loading delay for testing loading states
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock Supabase client for testing
 */
export function createTestSupabaseClient() {
  return createMockSupabaseClient();
}

/**
 * Re-export commonly used testing utilities
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
