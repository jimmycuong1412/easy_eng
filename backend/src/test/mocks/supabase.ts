/**
 * Mock Supabase Client for Backend Testing
 * 
 * Provides a fully mocked Supabase client to avoid real API calls during tests.
 */

import { vi } from 'vitest';

/**
 * Mock data store for test database
 */
const mockDatabase: Record<string, any[]> = {
  profiles: [],
  classes: [],
  bookings: [],
  gem_transactions: [],
  student_gems: [],
};

/**
 * Mock query builder for Supabase queries
 */
class MockQueryBuilder {
  private table: string;
  private filters: Record<string, any> = {};
  private _selectFields = '*';
  private limitValue?: number;
  private orderField?: string;
  private orderDirection: 'asc' | 'desc' = 'asc';

  constructor(table: string) {
    this.table = table;
  }

  select(fields = '*') {
    this._selectFields = fields;
    return this;
  }

  insert(data: any) {
    const records = Array.isArray(data) ? data : [data];
    mockDatabase[this.table] = mockDatabase[this.table] || [];
    mockDatabase[this.table].push(...records);
    return this;
  }

  update(_data: any) {
    // Mock update logic
    return this;
  }

  delete() {
    // Mock delete logic
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    this.filters[`${column}_neq`] = value;
    return this;
  }

  gt(column: string, value: any) {
    this.filters[`${column}_gt`] = value;
    return this;
  }

  gte(column: string, value: any) {
    this.filters[`${column}_gte`] = value;
    return this;
  }

  lt(column: string, value: any) {
    this.filters[`${column}_lt`] = value;
    return this;
  }

  lte(column: string, value: any) {
    this.filters[`${column}_lte`] = value;
    return this;
  }

  like(column: string, pattern: string) {
    this.filters[`${column}_like`] = pattern;
    return this;
  }

  in(column: string, values: any[]) {
    this.filters[`${column}_in`] = values;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderField = column;
    this.orderDirection = options?.ascending ? 'asc' : 'desc';
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  single() {
    const results = this.executeQuery();
    return Promise.resolve({
      data: results[0] || null,
      error: results.length === 0 ? new Error('No rows found') : null,
    });
  }

  maybeSingle() {
    const results = this.executeQuery();
    return Promise.resolve({
      data: results[0] || null,
      error: null,
    });
  }

  async then(resolve: any) {
    const results = this.executeQuery();
    return resolve({
      data: results,
      error: null,
    });
  }

  private executeQuery() {
    const tableData = mockDatabase[this.table] || [];
    let results = tableData.filter((row) => {
      return Object.entries(this.filters).every(([key, value]) => {
        return row[key] === value;
      });
    });

    if (this.orderField) {
      results.sort((a, b) => {
        const aVal = a[this.orderField!];
        const bVal = b[this.orderField!];
        if (this.orderDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    if (this.limitValue) {
      results = results.slice(0, this.limitValue);
    }

    return results;
  }
}

/**
 * Mock Supabase Auth
 */
const mockAuth = {
  getUser: vi.fn().mockResolvedValue({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'student',
      },
    },
    error: null,
  }),
  getSession: vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      },
    },
    error: null,
  }),
  signInWithPassword: vi.fn().mockResolvedValue({
    data: {
      user: { id: 'test-user-id', email: 'test@example.com' },
      session: { access_token: 'mock-token' },
    },
    error: null,
  }),
  signUp: vi.fn().mockResolvedValue({
    data: {
      user: { id: 'new-user-id', email: 'newuser@example.com' },
      session: { access_token: 'mock-token' },
    },
    error: null,
  }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
};

/**
 * Mock Supabase Storage
 */
const mockStorage = {
  from: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({
      data: { path: 'mock/path/file.jpg' },
      error: null,
    }),
    download: vi.fn().mockResolvedValue({
      data: new Blob(['mock file content']),
      error: null,
    }),
    remove: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://mock.supabase.co/storage/v1/object/public/bucket/file.jpg' },
    }),
  }),
};

/**
 * Mock Supabase RPC (Remote Procedure Call)
 */
const mockRpc = vi.fn().mockResolvedValue({
  data: null,
  error: null,
});

/**
 * Main mock Supabase client
 */
export const mockSupabaseClient = {
  from: (table: string) => new MockQueryBuilder(table),
  auth: mockAuth,
  storage: mockStorage,
  rpc: mockRpc,
};

/**
 * Factory to create mock Supabase client
 */
export function createMockSupabaseClient() {
  return mockSupabaseClient;
}

/**
 * Reset mock database to clean state
 */
export function resetMockDatabase() {
  Object.keys(mockDatabase).forEach((key) => {
    mockDatabase[key] = [];
  });
  vi.clearAllMocks();
}

/**
 * Seed mock database with test data
 */
export function seedMockDatabase(data: Record<string, any[]>) {
  Object.entries(data).forEach(([table, records]) => {
    mockDatabase[table] = records;
  });
}

/**
 * Get current mock database state
 */
export function getMockDatabase() {
  return { ...mockDatabase };
}
