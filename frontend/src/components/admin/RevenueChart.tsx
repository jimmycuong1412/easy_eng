'use client';

/**
 * Revenue Chart Component
 *
 * Displays revenue breakdown, teacher earnings, and payment method analysis
 *
 * Related Tasks: T108 [US5] Create revenue chart
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, TrendingUp, CreditCard, Users, Loader2 } from 'lucide-react';

export default function RevenueChart({ startDate, endDate }: any) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchRevenueAnalytics();
  }, [startDate, endDate]);

  const fetchRevenueAnalytics = async () => {
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
        'get-revenue-analytics',
        { body: params.toString() }
      );

      if (fnError) throw fnError;
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch revenue analytics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue data');
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
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gross Revenue</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                ${summary.total_gross_revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
              </p>
              {summary.revenue_growth !== undefined && (
                <p className={`mt-1 text-sm ${summary.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.revenue_growth >= 0 ? '+' : ''}
                  {summary.revenue_growth.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Teacher Earnings</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                ${summary.total_teacher_earnings?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">70% split</p>
            </div>
            <Users className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Platform Fee</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                ${summary.total_platform_fee?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">30% split</p>
            </div>
            <TrendingUp className="h-6 w-6 text-purple-500" />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                ${summary.total_net_profit?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {summary.net_margin_pct?.toFixed(1) || 0}% margin
              </p>
            </div>
            <DollarSign className="h-6 w-6 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Revenue by Payment Method */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Revenue by Payment Method
        </h3>

        <div className="space-y-3">
          {data?.revenue_by_method?.map((method: any, index: number) => {
            const totalRevenue = data.revenue_by_method.reduce(
              (sum: number, m: any) => sum + m.gross_revenue,
              0
            );
            const percentage = totalRevenue > 0 ? (method.gross_revenue / totalRevenue) * 100 : 0;

            const methodColors: any = {
              vnpay: 'bg-blue-500',
              momo: 'bg-pink-500',
              zalopay: 'bg-cyan-500',
              stripe: 'bg-purple-500',
              gems_only: 'bg-amber-500',
            };

            return (
              <div key={index}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-medium uppercase text-gray-700 dark:text-gray-300">
                      {method.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    ${method.gross_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-2 rounded-full ${methodColors[method.payment_method] || 'bg-gray-400'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {method.booking_count} bookings • Gateway fees: $
                  {method.gateway_fees.toFixed(0)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Earning Teachers */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Top Earning Teachers
        </h3>

        <div className="space-y-3">
          {data?.top_teachers?.map((teacher: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{teacher.teacher_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {teacher.classes_taught} classes • {teacher.total_bookings} bookings
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">
                  ${teacher.total_earnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ${teacher.avg_booking_price.toFixed(0)} avg
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Revenue Breakdown
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600 dark:text-gray-400">Gross Revenue</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${summary.total_gross_revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2 pl-4">
            <span className="text-gray-600 dark:text-gray-400">Gems Discount Value</span>
            <span className="text-amber-600">
              -${summary.total_gems_value?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-gray-600 dark:text-gray-400">Net Cash Revenue</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ${summary.total_net_revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2 pl-4">
            <span className="text-gray-600 dark:text-gray-400">Teacher Earnings (70%)</span>
            <span className="text-blue-600">
              -${summary.total_teacher_earnings?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </span>
          </div>
          <div className="flex justify-between border-b pb-2 pl-4">
            <span className="text-gray-600 dark:text-gray-400">Gateway Fees</span>
            <span className="text-red-600">
              -${summary.total_gateway_fees?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </span>
          </div>
          <div className="flex justify-between bg-green-50 p-2 dark:bg-green-900/20">
            <span className="font-semibold text-gray-900 dark:text-white">Net Platform Profit</span>
            <span className="font-bold text-green-600">
              ${summary.total_net_profit?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
