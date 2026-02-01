/**
 * Database Connection Pool Configuration
 *
 * Provides a configured Supabase client with connection pooling
 * for backend API database operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from './logger';

// Environment variables validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

/**
 * Admin Supabase client with service role key
 * Use this for server-side operations that bypass RLS
 */
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'easy-eng-backend',
      },
    },
  }
);

/**
 * Connection pool configuration
 * Supabase handles connection pooling automatically via Supavisor
 */
export const dbConfig = {
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  maxUses: parseInt(process.env.DB_MAX_USES || '7500', 10),
};

/**
 * Test database connection
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine for testing
      logger.error('Database connection test failed:', error);
      return false;
    }

    logger.info('Database connection test successful');
    return true;
  } catch (err) {
    logger.error('Database connection test error:', err);
    return false;
  }
}

/**
 * Execute a database transaction
 * Supabase doesn't have native transaction support via the client,
 * but we can use RPC functions for atomic operations
 */
export async function executeTransaction<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    const result = await fn();
    logger.debug('Transaction completed successfully');
    return result;
  } catch (error) {
    logger.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Health check for database connection
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error && error.code !== 'PGRST116') {
      return {
        healthy: false,
        latency,
        error: error.message,
      };
    }

    return {
      healthy: true,
      latency,
    };
  } catch (err) {
    const error = err as Error;
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Initialize database connection pool
 * Called at application startup
 */
export async function initializeDatabase(): Promise<void> {
  logger.info('Initializing database connection pool...', dbConfig);

  const isConnected = await testDatabaseConnection();

  if (!isConnected) {
    throw new Error('Failed to connect to database');
  }

  logger.info('Database connection pool initialized successfully');
}

// Export the admin client as default
export default supabaseAdmin;
