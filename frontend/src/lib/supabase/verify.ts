'use client';

import { getSupabaseClient } from '@/lib/supabase/client';

export interface SupabaseConnectionStatus {
  isConnected: boolean;
  message: string;
  details?: {
    url: string;
    hasAnonKey: boolean;
    canQuery: boolean;
    responseTime?: number;
    error?: string;
  };
}

/**
 * Verifies the connection to Supabase
 */
export async function verifySupabaseConnection(): Promise<SupabaseConnectionStatus> {
  try {
    const supabase = getSupabaseClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check if environment variables are set
    if (!url || !hasAnonKey) {
      return {
        isConnected: false,
        message: 'Missing Supabase environment variables',
        details: {
          url: url || 'NOT SET',
          hasAnonKey,
          canQuery: false,
          error: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not configured',
        },
      };
    }

    // Test connection with a simple query
    const startTime = Date.now();
    
    // Try to get current session (doesn't require auth)
    const { data, error } = await supabase.auth.getSession();
    
    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        isConnected: false,
        message: 'Connection failed',
        details: {
          url,
          hasAnonKey,
          canQuery: false,
          responseTime,
          error: error.message,
        },
      };
    }

    return {
      isConnected: true,
      message: 'Connected successfully',
      details: {
        url,
        hasAnonKey,
        canQuery: true,
        responseTime,
      },
    };
  } catch (error) {
    return {
      isConnected: false,
      message: 'Unexpected error',
      details: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        canQuery: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
