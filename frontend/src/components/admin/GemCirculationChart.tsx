'use client';

/**
 * Gem Circulation Chart Component
 *
 * Displays Gem minting, burning, and balance distribution
 *
 * Related Tasks: T107 [US5] Create Gem circulation chart
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Gem, TrendingUp, Users, Loader2 } from 'lucide-react';

export default function GemCirculationChart({ startDate, endDate }: any) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchGemAnalytics();
  }, [startDate, endDate]);

  const fetchGemAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const { data: result, error: fnError } = await supabase.functions.invoke(
        'get-gem-analytics',
        { body: params.toString() }
      );

      if (fnError) throw fnError;
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch Gem analytics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Gem data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const distribution = data?.distribution || {};

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total in Circulation</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.total_in_circulation?.toLocaleString() || 0}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30">
              <Gem className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Minted (Period)</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">
                +{summary.total_minted?.toLocaleString() || 0}
              </p>
              {summary.minting_growth !== undefined && (
                <p className="mt-1 text-sm text-gray-500">
                  {summary.minting_growth >= 0 ? '+' : ''}
                  {summary.minting_growth.toFixed(1)}% vs prev period
                </p>
              )}
            </div>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Burned (Period)</p>
              <p className="mt-1 text-2xl font-semibold text-red-600">
                -{summary.total_burned?.toLocaleString() || 0}
              </p>
            </div>
            <div className="h-6 w-6 text-red-500">↓</div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Balance</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {summary.avg_balance?.toFixed(0) || 0}
              </p>
            </div>
            <Users className="h-6 w-6 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Balance Distribution */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Student Balance Distribution
        </h3>

        <div className="space-y-3">
          {[
            { level: 'high', label: 'High Balance (200+)', color: 'bg-green-500' },
            { level: 'medium', label: 'Medium Balance (50-199)', color: 'bg-blue-500' },
            { level: 'low', label: 'Low Balance (1-49)', color: 'bg-yellow-500' },
            { level: 'empty', label: 'Empty (0)', color: 'bg-gray-400' },
          ].map((item) => {
            const count = distribution[item.level] || 0;
            const percentage = distribution.percentages?.[item.level] || 0;
            const total = distribution.total_students || 1;

            return (
              <div key={item.level}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Circulation by Activity */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Circulation by Activity Type
        </h3>

        <div className="space-y-3">
          {data?.circulation_by_activity?.map((activity: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700"
            >
              <div>
                <p className="font-medium capitalize text-gray-900 dark:text-white">
                  {activity.activity_type.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activity.total_transactions} transactions
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">
                  +{activity.gems_minted.toLocaleString()}
                </p>
                {activity.gems_burned > 0 && (
                  <p className="text-sm text-red-600">-{activity.gems_burned.toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Balances */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Top Student Balances
        </h3>

        <div className="space-y-2">
          {data?.top_balances?.slice(0, 10).map((student: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{student.full_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {student.total_transactions} transactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Gem className="h-4 w-4 text-purple-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {student.current_balance.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
