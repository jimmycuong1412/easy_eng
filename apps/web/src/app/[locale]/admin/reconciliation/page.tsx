'use client';

export const dynamic = 'force-dynamic';

/**
 * Admin Reconciliation Page
 *
 * Booking-payment reconciliation and data integrity monitoring
 *
 * Related Tasks: T111B [P] [US5] [ADMIN] Create booking-payment reconciliation report
 */

import React, { useState } from 'react';
import ReconciliationReport from '@/components/admin/ReconciliationReport';
import { Shield, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export default function ReconciliationPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold text-text-primary">
                <Shield className="h-8 w-8 text-blue-600" />
                Data Reconciliation
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Verify data integrity across bookings, payments, and Gem transactions
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Run Reconciliation
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Automated Checks
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Daily reconciliation scans
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Warning Threshold
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  &gt; 10 discrepancies triggers alert
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Data Integrity
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Critical for financial accuracy
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reconciliation Report Component */}
        <ReconciliationReport key={refreshKey} />

        {/* Help Section */}
        <div className="mt-8 rounded-lg border border-border-default bg-bg-surface p-6">
          <h3 className="mb-4 font-semibold text-text-primary">
            Understanding Reconciliation
          </h3>

          <div className="space-y-3 text-sm text-text-secondary">
            <div>
              <strong className="text-text-primary">Critical Issues:</strong>
              <ul className="ml-5 mt-1 list-disc">
                <li>Missing payments for confirmed bookings</li>
                <li>Negative Gem balances (should never happen)</li>
                <li>Class bookings exceeding capacity</li>
              </ul>
            </div>

            <div>
              <strong className="text-text-primary">Warnings:</strong>
              <ul className="ml-5 mt-1 list-disc">
                <li>Gem balances exceeding cap (1000 Gems)</li>
                <li>Orphaned payment records</li>
                <li>Potential duplicate transactions</li>
              </ul>
            </div>

            <div>
              <strong className="text-text-primary">Resolution:</strong>
              <p className="mt-1">
                Critical issues require immediate investigation. Contact the development team if
                issues persist after manual verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
