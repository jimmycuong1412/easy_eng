/**
 * Edge Function Test Utilities
 *
 * Provides helpers for testing Supabase Edge Functions (Deno runtime)
 * with mock requests, responses, and Supabase client.
 */

/**
 * Creates a mock Request object for testing Edge Functions
 *
 * @example
 * const request = createMockRequest({
 *   method: 'POST',
 *   body: { name: 'Test' },
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}): Request {
  const {
    method = 'GET',
    url = 'http://localhost:54321/functions/v1/test',
    body = null,
    headers = {},
  } = options;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
  }

  return new Request(url, init);
}

/**
 * Creates a mock Supabase client for Edge Function testing
 */
export function createMockSupabaseClient() {
  return {
    from: (table: string) => ({
      select: () => mockQueryBuilder(),
      insert: () => mockQueryBuilder(),
      update: () => mockQueryBuilder(),
      delete: () => mockQueryBuilder(),
      upsert: () => mockQueryBuilder(),
    }),
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'test-user-001',
            email: 'test@example.com',
            role: 'authenticated',
          },
        },
        error: null,
      }),
    },
    rpc: async (name: string, params?: any) => ({
      data: null,
      error: null,
    }),
  };
}

/**
 * Mock query builder for database operations
 */
function mockQueryBuilder() {
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    in: () => builder,
    is: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    then: async (resolve: any) => {
      resolve({ data: [], error: null });
    },
  };
  return builder;
}

/**
 * Extracts JSON body from Request
 */
export async function getRequestBody(request: Request): Promise<any> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Creates a successful JSON response
 */
export function createSuccessResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Creates an error response
 */
export function createErrorResponse(
  message: string,
  status = 400,
  code?: string
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code: code || `ERROR_${status}`,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Validates JWT token format (mock validation for testing)
 */
export function validateMockJWT(token: string): boolean {
  // Simple format check - real validation happens in Edge Function
  return token.startsWith('Bearer ') && token.length > 20;
}

/**
 * Extracts user ID from mock JWT token
 */
export function extractUserIdFromToken(token: string): string | null {
  if (!validateMockJWT(token)) return null;
  // In real implementation, this would decode JWT
  return 'test-user-001';
}

/**
 * Mock database test data
 */
export const mockTestData = {
  users: [
    {
      id: 'test-user-001',
      email: 'student@example.com',
      role: 'student',
      created_at: new Date().toISOString(),
    },
    {
      id: 'test-teacher-001',
      email: 'teacher@example.com',
      role: 'teacher',
      created_at: new Date().toISOString(),
    },
  ],
  classes: [
    {
      id: 'class-001',
      teacher_id: 'test-teacher-001',
      title: 'Business English',
      price: 25.0,
      duration_minutes: 60,
      max_students: 5,
      start_time: new Date(Date.now() + 86400000).toISOString(),
      status: 'scheduled',
    },
  ],
  bookings: [
    {
      id: 'booking-001',
      student_id: 'test-user-001',
      class_id: 'class-001',
      status: 'confirmed',
      original_price: 25.0,
      cookies_used: 0,
      final_price: 25.0,
      payment_status: 'pending',
    },
  ],
};

/**
 * Helper to test CORS headers
 */
export function validateCorsHeaders(response: Response): boolean {
  const headers = response.headers;
  return (
    headers.has('Access-Control-Allow-Origin') &&
    headers.has('Access-Control-Allow-Methods')
  );
}

/**
 * Helper to simulate Edge Function timeout
 */
export async function simulateTimeout(ms = 5000): Promise<never> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  throw new Error('Function execution timed out');
}
