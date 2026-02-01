'use client';

/**
 * User Growth Chart Component
 *
 * Displays user registration trends over time by role
 *
 * Related Tasks: T105 [US5] Create user growth chart component
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface UserGrowthData {
  date: string;
  role: string;
  new_users: number;
  cumulative_users: number;
}

interface UserCounts {
  student: number;
  teacher: number;
  admin: number;
  total: number;
}

interface GrowthRates {
  [role: string]: number;
}

interface UserGrowthChartProps {
  startDate?: string;
  endDate?: string;
  interval?: 'day' | 'week' | 'month';
}

export default function UserGrowthChart({
  startDate,
  endDate,
  interval = 'day',
}: UserGrowthChartProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [userCounts, setUserCounts] = useState<UserCounts | null>(null);
  const [growthRates, setGrowthRates] = useState<GrowthRates | null>(null);

  useEffect(() => {
    fetchUserGrowth();
  }, [startDate, endDate, interval]);

  const fetchUserGrowth = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (interval) params.append('interval', interval);

      // Call Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('get-user-analytics', {
        body: params.toString(),
      });

      if (fnError) throw fnError;

      if (data.success) {
        setUserGrowth(data.data.user_growth || []);
        setUserCounts(data.data.current_counts);
        setGrowthRates(data.data.growth_rates);
      } else {
        throw new Error(data.error || 'Failed to fetch user analytics');
      }
    } catch (err: any) {
      console.error('Error fetching user growth:', err);
      setError(err.message || 'Failed to load user growth data');
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

  // Group data by role for display
  const dataByRole: Record<string, UserGrowthData[]> = {};
  userGrowth.forEach((record) => {
    if (!dataByRole[record.role]) {
      dataByRole[record.role] = [];
    }
    dataByRole[record.role].push(record);
  });

  const roles = ['student', 'teacher', 'admin'];
  const roleColors = {
    student: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    teacher: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    admin: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {userCounts?.total || 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        {roles.map((role) => (
          <div
            key={role}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{role}s</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {userCounts?.[role as keyof Omit<UserCounts, 'total'>] || 0}
                </p>
                {growthRates && growthRates[role] !== undefined && (
                  <div className="mt-1 flex items-center text-sm">
                    {growthRates[role] >= 0 ? (
                      <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={growthRates[role] >= 0 ? 'text-green-600' : 'text-red-600'}
                    >
                      {Math.abs(growthRates[role]).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`rounded-full p-2 ${roleColors[role as keyof typeof roleColors]}`}>
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          User Growth Over Time
        </h3>

        {/* Simple bar chart visualization */}
        <div className="space-y-4">
          {roles.map((role) => {
            const roleData = dataByRole[role] || [];
            const maxNewUsers = Math.max(...roleData.map((d) => d.new_users), 1);

            return (
              <div key={role}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                    {role}s
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {roleData.reduce((sum, d) => sum + d.new_users, 0)} new users
                  </span>
                </div>

                <div className="space-y-1">
                  {roleData.slice(0, 10).map((record, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-20 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="flex-1">
                        <div
                          className={`h-6 rounded ${roleColors[role as keyof typeof roleColors]}`}
                          style={{
                            width: `${(record.new_users / maxNewUsers) * 100}%`,
                            minWidth: record.new_users > 0 ? '20px' : '0',
                          }}
                        >
                          <span className="ml-2 text-xs font-medium">{record.new_users}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {userGrowth.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No data available for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}
