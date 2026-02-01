'use client';

/**
 * Reconciliation Report Component
 *
 * Displays data integrity check results and discrepancies
 *
 * Related Tasks: T111E [US5] [ADMIN] Create reconciliation report viewer
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Gem,
  DollarSign,
  Users,
} from 'lucide-react';

interface Discrepancy {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  entity_type: string;
  entity_id: string;
  description: string;
  expected_value: any;
  actual_value: any;
  detected_at: string;
}

export default function ReconciliationReport() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gemReconciliation, setGemReconciliation] = useState<any>(null);
  const [discrepancyDetection, setDiscrepancyDetection] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'gems' | 'discrepancies'>('gems');

  useEffect(() => {
    runReconciliation();
  }, []);

  const runReconciliation = async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Run Gem balance reconciliation
      const { data: gemData, error: gemError } = await supabase.functions.invoke(
        'reconcile-gem-balances',
        {}
      );

      if (gemError) {
        console.error('Gem reconciliation error:', gemError);
      } else if (gemData.success) {
        setGemReconciliation(gemData);
      }

      // Run discrepancy detection
      const { data: discData, error: discError } = await supabase.functions.invoke(
        'detect-discrepancies',
        {}
      );

      if (discError) {
        console.error('Discrepancy detection error:', discError);
      } else if (discData.success) {
        setDiscrepancyDetection(discData);
      }

      if (gemError && discError) {
        throw new Error('Failed to run reconciliation checks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliation data');
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
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  const gemSummary = gemReconciliation?.summary || {};
  const discSummary = discrepancyDetection?.summary || {};
  const totalIssues = (gemSummary.total_discrepancies || 0) + (discSummary.total_discrepancies || 0);

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-900';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div
        className={`rounded-lg border p-6 ${
          totalIssues === 0
            ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20'
            : totalIssues > 10
            ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20'
            : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {totalIssues === 0 ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalIssues === 0 ? 'All Systems Healthy' : `${totalIssues} Issues Detected`}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last scanned: {new Date(gemSummary.reconciliation_date || Date.now()).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-red-600">{discSummary.critical || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-yellow-600">{discSummary.warnings || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
              <Gem className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Gems</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {gemSummary.total_gems_in_circulation?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Students with Gems</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {gemSummary.students_with_transactions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(gemSummary.avg_balance || 0)} Gems
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('gems')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'gems'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Gem Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('discrepancies')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'discrepancies'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Discrepancies ({discSummary.total_discrepancies || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'gems' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Issues Breakdown</h3>

            <div className="space-y-3">
              {Object.entries(gemSummary.issues || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      value === 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    }`}
                  >
                    {value as number}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {gemReconciliation?.discrepancies?.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                Student Discrepancies
              </h3>

              <div className="space-y-2">
                {gemReconciliation.discrepancies.slice(0, 10).map((student: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {student.student_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {student.student_email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        Balance: {student.calculated_balance}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {student.transaction_count} transactions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discrepancies' && (
        <div className="space-y-4">
          {discrepancyDetection?.discrepancies?.length === 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-900/20">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              <h3 className="mt-2 font-semibold text-green-900 dark:text-green-100">
                No Discrepancies Found
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                All data integrity checks passed successfully
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {discrepancyDetection?.discrepancies?.map((disc: Discrepancy, index: number) => (
                <div
                  key={index}
                  className={`rounded-lg border p-4 ${severityColor(disc.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    {severityIcon(disc.severity)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {disc.description}
                        </h4>
                        <span className="rounded-full bg-white/50 px-2 py-1 text-xs font-medium uppercase dark:bg-black/20">
                          {disc.severity}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Expected:</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {disc.expected_value}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Actual:</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {disc.actual_value}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {disc.entity_type} ID: {disc.entity_id} • Type: {disc.type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
