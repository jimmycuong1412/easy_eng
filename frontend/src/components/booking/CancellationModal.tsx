/**
 * Cancellation Modal Component
 * Task: T213 - Create cancellation modal
 */

'use client';

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface CancellationModalProps {
  booking: {
    id: string;
    class_title: string;
    scheduled_at: string;
    gems_used: number;
    final_price: number;
  };
  refundPercentage: number;
  gemsRefund: number;
  cashRefund: number;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export default function CancellationModal({
  booking,
  refundPercentage,
  gemsRefund,
  cashRefund,
  onConfirm,
  onClose,
}: CancellationModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Cancellation Policy</span>
          </div>
          <p className="mt-2 text-sm text-yellow-700">
            You will receive a {refundPercentage}% refund:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-yellow-700">
            {gemsRefund > 0 && <li>• {gemsRefund} Gems refunded</li>}
            {cashRefund > 0 && <li>• ${cashRefund.toFixed(2)} cash refunded</li>}
          </ul>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for cancellation (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={3}
            placeholder="Let us know why you're cancelling..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Keep Booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}
