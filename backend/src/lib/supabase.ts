/**
 * Supabase Client for Backend
 * 
 * Server-side Supabase client with service role key
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import logger from './logger';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Missing Supabase environment variables');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

/**
 * Supabase admin client with service role permissions
 * WARNING: This bypasses Row Level Security (RLS)
 * Only use in trusted server-side code
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Verify Supabase connection on startup
 */
export async function verifySupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      logger.error('Supabase connection failed', { error });
      return false;
    }
    
    logger.info('Supabase connection verified');
    return true;
  } catch (error) {
    logger.error('Supabase connection error', { error });
    return false;
  }
}

export default supabase;
