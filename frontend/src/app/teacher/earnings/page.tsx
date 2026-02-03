/**
 * Teacher Earnings Page
 *
 * Dashboard for teachers to view earnings and request payouts
 * Task: T209 - Create teacher earnings page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import PayoutRequestForm from '@/components/teacher/PayoutRequestForm';
import { DollarSign, TrendingUp, Clock, CheckCircle, Download, Plus } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface EarningsSummary {
  total_earned: number;
  total_paid: number;
  total_pending: number;
  total_processing: number;
  classes_completed: number;
  average_earning: number;
}

interface PayoutRequest {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  processed_at?: string;
}

interface Earning {
  id: string;
  class_id: string;
  booking_id: string;
  final_price: number;
  teacher_share: number;
  platform_fee: number;
  status: string;
  earned_at?: string;
  created_at: string;
}

// ============================================================================
// Component
// ============================================================================

export default function TeacherEarningsPage() {
  const supabase = createClient();

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      setTeacherId(user.id);

      // Get earnings summary
      const { data: summaryData, error: summaryError } = await supabase.rpc(
        'get_teacher_earnings_summary',
        { p_teacher_id: user.id }
      );

      if (summaryError) throw summaryError;

      if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }

      // Get recent earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('teacher_earnings')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (earningsError) throw earningsError;
      setEarnings(earningsData || []);

      // Get payout requests
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayoutRequests(payoutsData || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      setLoading(false);
    }
  };

  const handlePayoutSuccess = () => {
    setShowPayoutForm(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const availableBalance = summary?.total_earned || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="mt-2 text-gray-600">Track your earnings and request payouts</p>
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Available Balance */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available Balance</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  ${availableBalance.toFixed(2)}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            {availableBalance >= 10 && (
              <button
                onClick={() => setShowPayoutForm(true)}
                className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plus className="inline h-4 w-4 mr-1" />
                Request Payout
              </button>
            )}
          </div>

          {/* Total Earned */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  ${(summary?.total_earned || 0) + (summary?.total_paid || 0)}
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {summary?.classes_completed || 0} classes completed
            </p>
          </div>

          {/* Total Paid Out */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid Out</p>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  ${(summary?.total_paid || 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Processing */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  ${(summary?.total_processing || 0).toFixed(2)}
                </p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Payout Request Form Modal */}
        {showPayoutForm && teacherId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">Request Payout</h2>
              <PayoutRequestForm
                teacherId={teacherId}
                availableBalance={availableBalance}
                onSuccess={handlePayoutSuccess}
                onCancel={() => setShowPayoutForm(false)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recent Earnings */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Earnings</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {earnings.length === 0 ? (
                <p className="p-6 text-center text-gray-500">No earnings yet</p>
              ) : (
                earnings.map((earning) => (
                  <div key={earning.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          ${earning.teacher_share.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Class price: ${earning.final_price.toFixed(2)} (70%)
                        </p>
                        <p className="text-xs text-gray-400">
                          {earning.earned_at
                            ? new Date(earning.earned_at).toLocaleDateString()
                            : 'Pending'}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          earning.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : earning.status === 'earned'
                            ? 'bg-blue-100 text-blue-800'
                            : earning.status === 'processing'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {earning.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payout Requests */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">Payout Requests</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {payoutRequests.length === 0 ? (
                <p className="p-6 text-center text-gray-500">No payout requests yet</p>
              ) : (
                payoutRequests.map((payout) => (
                  <div key={payout.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          ${payout.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payout.payment_method}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          payout.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : payout.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : payout.status === 'processing'
                            ? 'bg-orange-100 text-orange-800'
                            : payout.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
