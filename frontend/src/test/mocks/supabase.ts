/**
 * Mock Supabase Client for Testing
 *
 * Provides a mock implementation of Supabase client for unit and integration tests.
 * Allows testing components that interact with Supabase without making real API calls.
 */

type MockData = Record<string, any[]>;

/**
 * Creates a mock Supabase client with configurable responses
 *
 * @example
 * const mockClient = createMockSupabaseClient({
 *   users: [{ id: '1', email: 'test@example.com' }]
 * });
 */
export function createMockSupabaseClient(initialData: MockData = {}) {
  const mockData = { ...initialData };
  let mockError: Error | null = null;

  const mockClient = {
    // Mock data storage
    _data: mockData,
    _setError: (error: Error | null) => {
      mockError = error;
    },
    _reset: () => {
      mockError = null;
    },

    // Auth mock
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: 'test-user-001', email: 'test@example.com' },
            access_token: 'mock-token',
          },
        },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-001', email: 'test@example.com' } },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-001', email: 'test@example.com' },
          session: { access_token: 'mock-token' },
        },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: {
          user: { id: 'test-user-001', email: 'test@example.com' },
          session: { access_token: 'mock-token' },
        },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },

    // Query builder mock
    from: jest.fn((table: string) => {
      const builder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockReturnThis(),

        // Execute query and return mock data
        then: jest.fn((resolve) => {
          if (mockError) {
            resolve({ data: null, error: mockError });
          } else {
            const data = mockData[table] || [];
            resolve({ data, error: null });
          }
          return Promise.resolve();
        }),
      };

      return builder;
    }),

    // RPC mock
    rpc: jest.fn((functionName: string, params?: any) => ({
      then: jest.fn((resolve) => {
        if (mockError) {
          resolve({ data: null, error: mockError });
        } else {
          resolve({ data: null, error: null });
        }
        return Promise.resolve();
      }),
    })),

    // Storage mock
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: `${bucket}/test-file.jpg` },
          error: null,
        }),
        download: jest.fn().mockResolvedValue({
          data: new Blob(),
          error: null,
        }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: `https://example.com/${bucket}/test-file.jpg` },
        }),
      })),
    },

    // Realtime mock
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockResolvedValue({ error: null }),
    })),
  };

  return mockClient;
}

/**
 * Creates a mock Supabase client with error responses
 *
 * @example
 * const mockClient = createMockSupabaseClientWithError(
 *   new Error('Database connection failed')
 * );
 */
export function createMockSupabaseClientWithError(error: Error) {
  const client = createMockSupabaseClient();
  client._setError(error);
  return client;
}

/**
 * Mock factory for common test scenarios
 */
export const mockSupabaseScenarios = {
  /**
   * User is authenticated
   */
  authenticated: () => createMockSupabaseClient(),

  /**
   * User is not authenticated
   */
  unauthenticated: () => {
    const client = createMockSupabaseClient();
    client.auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    client.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    return client;
  },

  /**
   * Network error scenario
   */
  networkError: () =>
    createMockSupabaseClientWithError(new Error('Network request failed')),

  /**
   * Unauthorized error scenario
   */
  unauthorized: () =>
    createMockSupabaseClientWithError(new Error('Unauthorized access')),

  /**
   * Database error scenario
   */
  databaseError: () =>
    createMockSupabaseClientWithError(new Error('Database query failed')),
};
