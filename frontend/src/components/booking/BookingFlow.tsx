/**
 * BookingFlow Component
 * 
 * Complete booking flow with Gems discount
 */

'use client';

import React, { useState } from 'react';
import { ClassData } from './ClassCard';
import { GemDiscountSlider } from './GemDiscountSlider';
import { useGemsBalance } from '@/hooks/useGemsBalance';

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
  const [gemsToUse, setGemsToUse] = useState(0);
  const [finalPrice, setFinalPrice] = useState(selectedClass.price);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethodId] = useState('pm_test_123'); // Mock payment method

  const handleGemsChange = (gems: number, price: number) => {
    setGemsToUse(gems);
    setFinalPrice(price);
  };

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
          gemsToUse,
          paymentMethodId: finalPrice > 0 ? paymentMethodId : undefined,
          idempotencyKey: `booking-${selectedClass.id}-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Booking failed');
      }

      const data = await response.json();
      
      // Refresh Gems balance
      refreshBalance();
      
      // Call success callback
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
          <p className="text-indigo-100 mt-1">Complete your booking with Gems discount</p>
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

          {/* Gems Discount Slider */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Apply Gems Discount</h3>
            <GemDiscountSlider
              classPrice={selectedClass.price}
              userGemsBalance={gemsBalance}
              onGemsChange={handleGemsChange}
            />
          </div>

          {/* Payment Info */}
          {finalPrice > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Payment Required</p>
                  <p className="mt-1">
                    You'll be charged ${finalPrice.toFixed(2)} after applying your Gems discount.
                  </p>
                </div>
              </div>
            </div>
          )}

          {finalPrice === 0 && gemsToUse > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-green-800">
                  <p className="font-medium">Free Booking!</p>
                  <p className="mt-1">
                    Your Gems cover the full cost of this class. No payment required!
                  </p>
                </div>
              </div>
            </div>
          )}

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
              disabled={isProcessing}
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
                <span>Confirm Booking - ${finalPrice.toFixed(2)}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
