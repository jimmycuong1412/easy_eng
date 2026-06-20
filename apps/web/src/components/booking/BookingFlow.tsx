'use client';

import React, { useState } from 'react';
import { ClassData } from './ClassCard';
import { useGemsBalance } from '@easyeng/core';

const CLASS_GEM_PRICE = 100;

interface BookingFlowProps {
  selectedClass: ClassData;
  onCancel: () => void;
  onSuccess?: (bookingId: string) => void;
}

export function BookingFlow({
  selectedClass,
  onCancel,
  onSuccess
}: BookingFlowProps) {
  const { balance: gemsBalance, refreshBalance } = useGemsBalance();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEnoughGems = gemsBalance >= CLASS_GEM_PRICE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/bookings/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          classId: selectedClass.id,
          gemsToUse: CLASS_GEM_PRICE,
          idempotencyKey: `booking-${selectedClass.id}-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Booking failed');
      }

      const data = await response.json();
      refreshBalance();
      if (onSuccess) {
        onSuccess(data.data.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const startDate = new Date(selectedClass.start_time);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-6">
          <h2 className="text-2xl font-bold">Book Your Class</h2>
          <p className="text-indigo-100 mt-1">100 Gems per class</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Class Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-2">{selectedClass.title}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{selectedClass.duration_minutes} minutes</span>
              </div>
              {selectedClass.teacher && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Teacher: {selectedClass.teacher.full_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Gem Cost Summary */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">Class Price</span>
              <span className="text-xl font-bold text-amber-600">💎 {CLASS_GEM_PRICE} Gems</span>
            </div>
            <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
              <span>Your balance</span>
              <span className={hasEnoughGems ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {gemsBalance} Gems
              </span>
            </div>
            {!hasEnoughGems && (
              <p className="text-xs text-red-600 mt-2">
                You need {CLASS_GEM_PRICE - gemsBalance} more Gems to book this class.
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-medium">Booking Error</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !hasEnoughGems}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Confirm Booking — 💎 {CLASS_GEM_PRICE} Gems</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
