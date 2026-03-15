export const dynamic = 'force-dynamic';
/**
 * Book Classes Page
 * 
 * Browse and book classes with Gems discount
 */

'use client';

import React, { useState } from 'react';
import { ClassCatalog } from '@/components/booking/ClassCatalog';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { ClassData } from '@/components/booking/ClassCard';

export default function BookClassesPage() {
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleSelectClass = (classData: ClassData) => {
    setSelectedClass(classData);
    setBookingSuccess(false);
  };

  const handleCancelBooking = () => {
    setSelectedClass(null);
  };

  const handleBookingSuccess = () => {
    setBookingSuccess(true);
    setTimeout(() => {
      setSelectedClass(null);
      setBookingSuccess(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Success Message */}
        {bookingSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-green-900">Booking Successful!</p>
              <p className="text-sm text-green-700">Your class has been booked. Check your email for confirmation.</p>
            </div>
          </div>
        )}

        {/* Show booking flow if class selected, otherwise show catalog */}
        {selectedClass ? (
          <BookingFlow
            selectedClass={selectedClass}
            onCancel={handleCancelBooking}
            onSuccess={handleBookingSuccess}
          />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Book a Class</h1>
              <p className="text-gray-600">
                Choose from our available classes and use your Gems to get discounts!
              </p>
            </div>
            <ClassCatalog onSelectClass={handleSelectClass} />
          </>
        )}
      </div>
    </div>
  );
}
