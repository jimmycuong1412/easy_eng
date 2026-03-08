/**
 * useGemsBalance Hook
 * Updated: 2026-02-20
 * React hook for fetching and managing user's Gems (cookies) balance
 * via Supabase RPC get_gems_balance.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface GemsBalanceDetails {
  user_id: string;
  balance: number;
  transaction_count: number;
  total_earned: number;
  total_spent: number;
  last_transaction_at: string | null;
}

export function useGemsBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [details, setDetails] = useState<GemsBalanceDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setBalance(0); return; }

      const { data, error: rpcError } = await supabase.rpc('get_gems_balance', { p_user_id: user.id });
      if (rpcError) throw rpcError;
      setBalance((data as number) ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // fetchDetails: falls back to balance-only since there is no separate details RPC
  const fetchDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: rpcError } = await supabase.rpc('get_gems_balance', { p_user_id: user.id });
      if (rpcError) throw rpcError;
      const bal = (data as number) ?? 0;
      setBalance(bal);
      setDetails({ user_id: user.id, balance: bal, transaction_count: 0, total_earned: 0, total_spent: 0, last_transaction_at: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    details,
    isLoading,
    error,
    refreshBalance,
    fetchDetails,
  };
}
