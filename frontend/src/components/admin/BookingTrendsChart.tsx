'use client';

/**
 * Booking Trends Chart Component
 *
 * Displays booking trends, conversion rates, and fill rates
 *
 * Related Tasks: T106 [US5] Create booking trends chart
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, TrendingUp, Users, Percent, Loader2 } from 'lucide-react';

export default function BookingTrendsChart({ startDate, endDate }: any) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchBookingAnalytics();
  }, [startDate, endDate]);

  const fetchBookingAnalytics = async () => {
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
        'get-booking-analytics',
        { body: params.toString() }
      );

      if (fnError) throw fnError;
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch booking analytics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load booking data');
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-6 w-6" />}
          label="Total Bookings"
          value={summary.total_bookings || 0}
          trend={summary.booking_growth}
          color="blue"
        />
        <StatCard
          icon={<Users className="h-6 w-6" />}
          label="Confirmed"
          value={summary.confirmed_bookings || 0}
          subtitle={`${summary.conversion_rate || 0}% conversion`}
          color="green"
        />
        <StatCard
          icon={<Percent className="h-6 w-6" />}
          label="Fill Rate"
          value={`${summary.avg_fill_rate || 0}%`}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Completion Rate"
          value={`${summary.completion_rate || 0}%`}
          color="indigo"
        />
      </div>

      {/* Booking Trends Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Daily Booking Trends
        </h3>

        <div className="space-y-2">
          {data?.booking_trends?.slice(0, 14).map((day: any, index: number) => {
            const maxBookings = Math.max(
              ...data.booking_trends.slice(0, 14).map((d: any) => d.total_bookings),
              1
            );

            return (
              <div key={index} className="flex items-center gap-2">
                <span className="w-24 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(day.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className="flex-1">
                  <div className="relative h-8 w-full">
                    <div
                      className="absolute h-full rounded bg-blue-200 dark:bg-blue-900/50"
                      style={{ width: `${(day.total_bookings / maxBookings) * 100}%` }}
                    />
                    <div
                      className="absolute h-full rounded bg-green-500"
                      style={{ width: `${(day.confirmed_bookings / maxBookings) * 100}%` }}
                    />
                    <span className="absolute left-2 top-1 text-xs font-medium text-white">
                      {day.confirmed_bookings}/{day.total_bookings}
                    </span>
                  </div>
                </div>
                <span className="w-16 text-right text-xs text-gray-600 dark:text-gray-400">
                  ${day.total_revenue?.toFixed(0) || 0}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Classes */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Top Performing Classes
        </h3>

        <div className="space-y-3">
          {data?.class_performance?.slice(0, 10).map((cls: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{cls.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {cls.topic} • {cls.level} • {cls.teacher_name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">
                  ${cls.total_revenue?.toFixed(0) || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {cls.total_bookings} bookings • {cls.fill_rate_pct?.toFixed(0) || 0}% full
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, trend, color }: any) {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    indigo: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
          {trend !== undefined && (
            <p className={`mt-1 text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </p>
          )}
        </div>
        <div className={`rounded-full p-2 ${colors[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
