/**
 * Gems Service
 * 
 * Handles all Gems-related operations including balance queries,
 * earning, and spending Gems with atomicity guarantees.
 */

import { supabase } from '../lib/supabase';

export interface GemsTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  booking_id: string | null;
  class_id: string | null;
  metadata: Record<string, any>;
  granted_by: string | null;
  created_at: string;
}

export interface GemsBalance {
  user_id: string;
  balance: number;
  transaction_count: number;
  total_earned: number;
  total_spent: number;
  last_transaction_at: string | null;
}

/**
 * Get user's current Gems balance
 */
export async function getGemsBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_gems_balance', { p_user_id: userId });

  if (error) {
    throw new Error(`Failed to get Gems balance: ${error.message}`);
  }

  return data || 0;
}

/**
 * Get detailed balance information with stats
 */
export async function getGemsBalanceDetails(userId: string): Promise<GemsBalance | null> {
  const { data, error } = await supabase
    .from('user_gems_balances')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to get balance details: ${error.message}`);
  }

  if (!data) {
    // User has no transactions yet
    return {
      user_id: userId,
      balance: 0,
      transaction_count: 0,
      total_earned: 0,
      total_spent: 0,
      last_transaction_at: null,
    };
  }

  return data;
}

/**
 * Add Gems to user's balance (earning)
 */
export async function addGems(params: {
  userId: string;
  amount: number;
  transactionType: string;
  description?: string;
  classId?: string;
  bookingId?: string;
  metadata?: Record<string, any>;
  grantedBy?: string;
}): Promise<GemsTransaction> {
  const {
    userId,
    amount,
    transactionType,
    description,
    classId,
    bookingId,
    metadata = {},
    grantedBy,
  } = params;

  // Validate amount is positive
  if (amount <= 0) {
    throw new Error('Amount must be positive for earning Gems');
  }

  // Insert transaction (positive amount)
  const { data, error } = await supabase
    .from('gem_transactions')
    .insert({
      user_id: userId,
      amount, // Positive for earning
      transaction_type: transactionType,
      description: description || null,
      class_id: classId || null,
      booking_id: bookingId || null,
      metadata,
      granted_by: grantedBy || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add Gems: ${error.message}`);
  }

  return data;
}

/**
 * Deduct Gems from user's balance (spending)
 * Will throw error if balance becomes negative (enforced by DB trigger)
 */
export async function deductGems(params: {
  userId: string;
  amount: number;
  transactionType: string;
  description?: string;
  classId?: string;
  bookingId?: string;
  metadata?: Record<string, any>;
}): Promise<GemsTransaction> {
  const {
    userId,
    amount,
    transactionType,
    description,
    classId,
    bookingId,
    metadata = {},
  } = params;

  // Validate amount is positive (will be negated for spending)
  if (amount <= 0) {
    throw new Error('Amount must be positive for deducting Gems');
  }

  // Check current balance before attempting deduction
  const currentBalance = await getGemsBalance(userId);
  if (currentBalance < amount) {
    throw new Error(`Insufficient Gems balance. Current: ${currentBalance}, Required: ${amount}`);
  }

  // Insert transaction (negative amount for spending)
  const { data, error } = await supabase
    .from('gem_transactions')
    .insert({
      user_id: userId,
      amount: -amount, // Negative for spending
      transaction_type: transactionType,
      description: description || null,
      class_id: classId || null,
      booking_id: bookingId || null,
      metadata,
      granted_by: null,
    })
    .select()
    .single();

  if (error) {
    // Database trigger will prevent negative balance
    if (error.message.includes('Insufficient Gems balance')) {
      throw new Error(`Insufficient Gems balance. Current: ${currentBalance}, Required: ${amount}`);
    }
    throw new Error(`Failed to deduct Gems: ${error.message}`);
  }

  return data;
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(params: {
  userId: string;
  limit?: number;
  offset?: number;
  transactionType?: string;
}): Promise<{ transactions: GemsTransaction[]; total: number }> {
  const { userId, limit = 50, offset = 0, transactionType } = params;

  let query = supabase
    .from('gem_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to get transaction history: ${error.message}`);
  }

  return {
    transactions: data || [],
    total: count || 0,
  };
}

/**
 * Validate if user has sufficient Gems for a transaction
 */
export async function validateSufficientGems(
  userId: string,
  requiredAmount: number
): Promise<{ isValid: boolean; currentBalance: number; shortfall?: number }> {
  const currentBalance = await getGemsBalance(userId);
  const isValid = currentBalance >= requiredAmount;

  return {
    isValid,
    currentBalance,
    shortfall: isValid ? undefined : requiredAmount - currentBalance,
  };
}

/**
 * Grant Gems to user (admin function)
 */
export async function grantGems(params: {
  userId: string;
  amount: number;
  grantedBy: string;
  reason: string;
  metadata?: Record<string, any>;
}): Promise<GemsTransaction> {
  return addGems({
    userId: params.userId,
    amount: params.amount,
    transactionType: 'admin_grant',
    description: params.reason,
    metadata: params.metadata || {},
    grantedBy: params.grantedBy,
  });
}
