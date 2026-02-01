/**
 * useGemsBalance Hook
 * 
 * React hook for fetching and managing user's Gems balance
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

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

      const response = await fetch('/api/gems/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Gems balance');
      }

      const data = await response.json();
      setBalance(data.data.balance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/gems/balance/details', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch balance details');
      }

      const data = await response.json();
      setDetails(data.data);
      setBalance(data.data.balance);
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
