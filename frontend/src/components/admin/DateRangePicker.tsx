'use client';

/**
 * Date Range Picker Component
 *
 * Allows admins to select date ranges for analytics filtering
 *
 * Related Tasks: T110 [US5] Create date range picker component
 */

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  onDateChange: (startDate: string, endDate: string) => void;
  defaultRange?: 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

export default function DateRangePicker({
  onDateChange,
  defaultRange = 'month',
}: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] = useState(defaultRange);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const calculateDateRange = (range: string) => {
    const today = new Date();
    let startDate: Date;
    let endDate = today;

    switch (range) {
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return null;
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    };
  };

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);

    if (range === 'custom') {
      // Wait for custom dates to be set
      return;
    }

    const dates = calculateDateRange(range);
    if (dates) {
      onDateChange(dates.start, dates.end);
    }
  };

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      onDateChange(customStart, customEnd);
    }
  };

  React.useEffect(() => {
    // Initialize with default range
    const dates = calculateDateRange(defaultRange);
    if (dates) {
      onDateChange(dates.start, dates.end);
    }
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Date Range</h3>
      </div>

      {/* Quick Range Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: 'week', label: 'Last 7 Days' },
          { value: 'month', label: 'Last 30 Days' },
          { value: 'quarter', label: 'Last 90 Days' },
          { value: 'year', label: 'Last Year' },
          { value: 'custom', label: 'Custom' },
        ].map((range) => (
          <button
            key={range.value}
            onClick={() => handleRangeChange(range.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedRange === range.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      {selectedRange === 'custom' && (
        <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <button
            onClick={handleCustomDateChange}
            disabled={!customStart || !customEnd}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply Custom Range
          </button>
        </div>
      )}

      {/* Selected Range Display */}
      {selectedRange !== 'custom' && (
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {(() => {
            const dates = calculateDateRange(selectedRange);
            if (!dates) return null;
            return (
              <p>
                {new Date(dates.start).toLocaleDateString()} -{' '}
                {new Date(dates.end).toLocaleDateString()}
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
}
