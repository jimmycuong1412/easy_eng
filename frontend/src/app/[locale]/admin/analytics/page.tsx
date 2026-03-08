'use client';

/**
 * Admin Analytics Dashboard Page
 *
 * Comprehensive analytics dashboard for platform admins
 *
 * Related Tasks: T109 [US5] Create comprehensive analytics page
 */

import React, { useState } from 'react';
import { GemImage } from '@/components/common/GemImage';
import { useAnalyticsFilters } from '@/hooks/useAnalyticsFilters';
import DateRangePicker from '@/components/admin/DateRangePicker';
import UserGrowthChart from '@/components/admin/UserGrowthChart';
import BookingTrendsChart from '@/components/admin/BookingTrendsChart';
import GemCirculationChart from '@/components/admin/GemCirculationChart';
import RevenueChart from '@/components/admin/RevenueChart';
import { BarChart3, RefreshCw } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { filters, setDateRange, setInterval } = useAnalyticsFilters();
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'gems' | 'revenue'>('users');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const tabs: { id: 'users' | 'bookings' | 'gems' | 'revenue'; label: string; icon: React.ReactNode }[] = [
    { id: 'users', label: 'User Growth', icon: '👥' },
    { id: 'bookings', label: 'Bookings', icon: '📅' },
    { id: 'gems', label: 'Gem Circulation', icon: <GemImage size={16} /> },
    { id: 'revenue', label: 'Revenue', icon: '💰' },
  ];

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                Platform Analytics
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Comprehensive insights and metrics for platform performance
              </p>
            </div>

            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <DateRangePicker
              onDateChange={(start, end) => setDateRange(start, end)}
              defaultRange="month"
            />
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-lg border border-border-default bg-bg-surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-text-primary">View Options</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <div>
                  <label className="block text-xs text-text-muted mb-1">
                    Interval
                  </label>
                  <select
                    value={filters.interval}
                    onChange={(e) => setInterval(e.target.value as any)}
                    className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-sm text-text-primary"
                  >
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-text-muted mb-1">
                    Selected Period
                  </label>
                  <div className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-sm text-text-secondary">
                    {new Date(filters.startDate).toLocaleDateString()} -{' '}
                    {new Date(filters.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-border-default">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-accent-primary text-accent-primary'
                      : 'border-transparent text-text-muted hover:border-border-default hover:text-text-secondary'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div key={refreshKey}>
          {activeTab === 'users' && (
            <UserGrowthChart
              startDate={filters.startDate}
              endDate={filters.endDate}
              interval={filters.interval}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingTrendsChart startDate={filters.startDate} endDate={filters.endDate} />
          )}

          {activeTab === 'gems' && (
            <GemCirculationChart startDate={filters.startDate} endDate={filters.endDate} />
          )}

          {activeTab === 'revenue' && (
            <RevenueChart startDate={filters.startDate} endDate={filters.endDate} />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-600 p-2 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                About Analytics Data
              </h4>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                Analytics data is computed in real-time from database views. All financial figures
                are in USD. Gem values are estimated at $0.01 per Gem (100 Gems = $1). Teacher earnings reflect the
                70/30 revenue split. Gateway fees are estimated based on payment processor rates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
