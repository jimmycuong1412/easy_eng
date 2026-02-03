'use client';

/**
 * Admin Rollback Monitoring Dashboard
 * Task: T139E [P] [CURRENCY] [ADMIN]
 *
 * Purpose: Real-time monitoring dashboard for transaction rollbacks:
 * - View recent rollbacks with details
 * - Track rollback rates and trends
 * - Identify suspicious patterns
 * - Alert on high rollback rates
 * - Export audit logs
 *
 * Constitution Principle VI: Currency system integrity
 */

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RollbackEvent {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  transaction_type: string;
  reason: string;
  created_at: string;
  original_transaction_id?: string;
  metadata?: Record<string, any>;
}

interface RollbackStats {
  total_rollbacks: number;
  rollbacks_today: number;
  rollback_rate: number; // Percentage of transactions that get rolled back
  total_gems_rolled_back: number;
  affected_users: number;
}

interface RollbackTrend {
  date: string;
  count: number;
  gems_amount: number;
}

const COLORS = {
  payment_failure: '#ef4444',
  capacity_conflict: '#f59e0b',
  timeout: '#eab308',
  user_cancelled: '#3b82f6',
  fraud_detected: '#dc2626',
  other: '#6b7280',
};

export default function RollbackMonitoringPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RollbackStats | null>(null);
  const [recentRollbacks, setRecentRollbacks] = useState<RollbackEvent[]>([]);
  const [trends, setTrends] = useState<RollbackTrend[]>([]);
  const [reasonBreakdown, setReasonBreakdown] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [alertThreshold, setAlertThreshold] = useState(10); // Alert if rollback rate > 10%

  useEffect(() => {
    loadDashboardData();

    // Subscribe to real-time rollback events
    const subscription = supabase
      .channel('rollback-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gem_transaction_audit_log',
          filter: 'action=in.(booking_refund,purchase_refund)',
        },
        payload => {
          console.log('New rollback detected:', payload);
          loadDashboardData(); // Refresh data
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [timeRange]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecentRollbacks(),
        loadTrends(),
        loadReasonBreakdown(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const cutoffDate = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();

    // Get rollback stats
    const { data: rollbackData, error: rollbackError } = await supabase
      .from('gem_transaction_audit_log')
      .select('amount, user_id, created_at')
      .in('action', ['booking_refund', 'purchase_refund'])
      .gte('created_at', cutoffDate);

    if (rollbackError) {
      console.error('Error loading rollback stats:', rollbackError);
      return;
    }

    // Get total transaction count for rate calculation
    const { count: totalTransactions } = await supabase
      .from('gem_transaction_audit_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', cutoffDate);

    const totalRollbacks = rollbackData?.length || 0;
    const uniqueUsers = new Set(rollbackData?.map(r => r.user_id) || []).size;
    const totalGemsRolledBack = rollbackData?.reduce((sum, r) => sum + Math.abs(r.amount), 0) || 0;

    const today = new Date().toISOString().split('T')[0];
    const rollbacksToday =
      rollbackData?.filter(r => r.created_at.startsWith(today)).length || 0;

    const rollbackRate = totalTransactions
      ? ((totalRollbacks / totalTransactions) * 100).toFixed(2)
      : 0;

    setStats({
      total_rollbacks: totalRollbacks,
      rollbacks_today: rollbacksToday,
      rollback_rate: Number(rollbackRate),
      total_gems_rolled_back: totalGemsRolledBack,
      affected_users: uniqueUsers,
    });
  }

  async function loadRecentRollbacks() {
    const { data, error } = await supabase
      .from('gem_transaction_audit_log')
      .select(
        `
        id,
        user_id,
        amount,
        action,
        description,
        created_at,
        metadata
      `
      )
      .in('action', ['booking_refund', 'purchase_refund'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading recent rollbacks:', error);
      return;
    }

    // Enrich with user emails
    const userIds = [...new Set(data?.map(r => r.user_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

    const enrichedRollbacks: RollbackEvent[] = (data || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      user_email: profileMap.get(r.user_id) || 'Unknown',
      amount: r.amount,
      transaction_type: r.action,
      reason: r.description || 'No reason specified',
      created_at: r.created_at,
      metadata: r.metadata,
    }));

    setRecentRollbacks(enrichedRollbacks);
  }

  async function loadTrends() {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    const trends: RollbackTrend[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDateStr = new Date(date.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const { data } = await supabase
        .from('gem_transaction_audit_log')
        .select('amount')
        .in('action', ['booking_refund', 'purchase_refund'])
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${nextDateStr}T00:00:00`);

      trends.push({
        date: dateStr,
        count: data?.length || 0,
        gems_amount: data?.reduce((sum, r) => sum + Math.abs(r.amount), 0) || 0,
      });
    }

    setTrends(trends);
  }

  async function loadReasonBreakdown() {
    const timeRangeHours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const cutoffDate = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('gem_transaction_audit_log')
      .select('description, amount')
      .in('action', ['booking_refund', 'purchase_refund'])
      .gte('created_at', cutoffDate);

    // Categorize by reason
    const reasonCounts: Record<string, number> = {};

    data?.forEach(r => {
      const desc = r.description.toLowerCase();
      let category = 'other';

      if (desc.includes('payment') || desc.includes('gateway')) {
        category = 'payment_failure';
      } else if (desc.includes('capacity') || desc.includes('full')) {
        category = 'capacity_conflict';
      } else if (desc.includes('timeout') || desc.includes('timed out')) {
        category = 'timeout';
      } else if (desc.includes('cancel') || desc.includes('user')) {
        category = 'user_cancelled';
      } else if (desc.includes('fraud') || desc.includes('suspicious')) {
        category = 'fraud_detected';
      }

      reasonCounts[category] = (reasonCounts[category] || 0) + 1;
    });

    const breakdown = Object.entries(reasonCounts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      color: COLORS[name as keyof typeof COLORS] || COLORS.other,
    }));

    setReasonBreakdown(breakdown);
  }

  async function exportAuditLog() {
    const { data } = await supabase
      .from('gem_transaction_audit_log')
      .select('*')
      .in('action', ['booking_refund', 'purchase_refund'])
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!data) return;

    // Convert to CSV
    const headers = ['ID', 'User ID', 'Amount', 'Action', 'Description', 'Created At'];
    const rows = data.map(r => [
      r.id,
      r.user_id,
      r.amount,
      r.action,
      r.description,
      r.created_at,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rollback-audit-${new Date().toISOString()}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rollback monitoring data...</p>
        </div>
      </div>
    );
  }

  const isHighRollbackRate = stats && stats.rollback_rate > alertThreshold;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rollback Monitoring Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Real-time monitoring of transaction rollbacks and refunds
          </p>
        </div>

        {/* Alert Banner */}
        {isHighRollbackRate && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-red-600 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-red-800 font-semibold">High Rollback Rate Alert</h3>
                <p className="text-red-700">
                  Current rollback rate ({stats?.rollback_rate}%) exceeds threshold (
                  {alertThreshold}%). Investigate immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-4 py-2 rounded ${
                timeRange === '24h'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border'
              }`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 rounded ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-4 py-2 rounded ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={exportAuditLog}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export Audit Log
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Rollbacks</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {stats?.total_rollbacks || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Today</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {stats?.rollbacks_today || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Rollback Rate</h3>
            <p
              className={`mt-2 text-3xl font-bold ${
                isHighRollbackRate ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {stats?.rollback_rate || 0}%
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Gems Rolled Back</h3>
            <p className="mt-2 text-3xl font-bold text-purple-600">
              {stats?.total_gems_rolled_back || 0}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Affected Users</h3>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {stats?.affected_users || 0}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Rollback Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Count" />
                <Line
                  type="monotone"
                  dataKey="gems_amount"
                  stroke="#8b5cf6"
                  name="Gems Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Reason Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Rollback Reasons</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reasonBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reasonBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Rollbacks Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Recent Rollbacks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentRollbacks.map(rollback => (
                  <tr key={rollback.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(rollback.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rollback.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      +{Math.abs(rollback.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rollback.transaction_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{rollback.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
