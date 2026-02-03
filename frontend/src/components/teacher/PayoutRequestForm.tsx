/**
 * Payout Request Form Component
 *
 * Form for teachers to request payout of earned revenue
 * Task: T207 - Create payout request form
 */

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface PayoutRequestFormProps {
  teacherId: string;
  availableBalance: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PaymentMethod = 'bank_transfer' | 'paypal' | 'stripe' | 'wise' | 'cash';

interface PaymentDetails {
  bank_transfer?: {
    account_holder: string;
    account_number: string;
    routing_number: string;
    bank_name: string;
  };
  paypal?: {
    email: string;
  };
  stripe?: {
    account_id: string;
  };
  wise?: {
    email: string;
  };
}

// ============================================================================
// Component
// ============================================================================

export default function PayoutRequestForm({
  teacherId,
  availableBalance,
  onSuccess,
  onCancel,
}: PayoutRequestFormProps) {
  const supabase = createClient();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const MIN_PAYOUT = 10.00;
  const maxPayout = availableBalance;

  // Initialize payment details structure
  useEffect(() => {
    switch (paymentMethod) {
      case 'bank_transfer':
        setPaymentDetails({
          bank_transfer: {
            account_holder: '',
            account_number: '',
            routing_number: '',
            bank_name: '',
          },
        });
        break;
      case 'paypal':
      case 'wise':
        setPaymentDetails({
          [paymentMethod]: {
            email: '',
          },
        });
        break;
      case 'stripe':
        setPaymentDetails({
          stripe: {
            account_id: '',
          },
        });
        break;
      default:
        setPaymentDetails({});
    }
  }, [paymentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum < MIN_PAYOUT) {
      setError(`Minimum payout amount is $${MIN_PAYOUT.toFixed(2)}`);
      return;
    }

    if (amountNum > maxPayout) {
      setError(`Amount exceeds available balance ($${maxPayout.toFixed(2)})`);
      return;
    }

    // Validate payment details
    if (!validatePaymentDetails()) {
      setError('Please fill in all payment details');
      return;
    }

    try {
      setLoading(true);

      // Create payout request
      const { data, error: rpcError } = await supabase.rpc('create_payout_request', {
        p_teacher_id: teacherId,
        p_amount: amountNum,
        p_payment_method: paymentMethod,
        p_payment_details: paymentDetails[paymentMethod],
      });

      if (rpcError) {
        throw rpcError;
      }

      setSuccess(true);

      // Call success callback after short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      console.error('Error creating payout request:', err);
      setError(err instanceof Error ? err.message : 'Failed to create payout request');
    } finally {
      setLoading(false);
    }
  };

  const validatePaymentDetails = (): boolean => {
    const details = paymentDetails[paymentMethod];
    if (!details) return false;

    switch (paymentMethod) {
      case 'bank_transfer':
        return !!(
          details.account_holder &&
          details.account_number &&
          details.routing_number &&
          details.bank_name
        );
      case 'paypal':
      case 'wise':
        return !!details.email;
      case 'stripe':
        return !!details.account_id;
      default:
        return false;
    }
  };

  const updatePaymentDetail = (field: string, value: string) => {
    setPaymentDetails((prev) => ({
      ...prev,
      [paymentMethod]: {
        ...prev[paymentMethod],
        [field]: value,
      },
    }));
  };

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
        <h3 className="mt-4 text-xl font-semibold text-green-900">Payout Request Submitted!</h3>
        <p className="mt-2 text-green-700">
          Your payout request for ${parseFloat(amount).toFixed(2)} has been submitted successfully.
        </p>
        <p className="mt-1 text-sm text-green-600">
          We'll review your request and process it within 3-5 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Available Balance */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Available Balance</span>
          <span className="text-2xl font-bold text-blue-600">
            ${availableBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Payout Amount *
        </label>
        <div className="mt-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="number"
            id="amount"
            step="0.01"
            min={MIN_PAYOUT}
            max={maxPayout}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="0.00"
            required
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Minimum: ${MIN_PAYOUT.toFixed(2)} | Maximum: ${maxPayout.toFixed(2)}
        </p>
      </div>

      {/* Payment Method */}
      <div>
        <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
          Payment Method *
        </label>
        <select
          id="payment_method"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="bank_transfer">Bank Transfer</option>
          <option value="paypal">PayPal</option>
          <option value="stripe">Stripe</option>
          <option value="wise">Wise (TransferWise)</option>
        </select>
      </div>

      {/* Payment Details */}
      <div className="space-y-4 rounded-lg bg-gray-50 p-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <h4 className="font-medium text-gray-900">Payment Details</h4>
        </div>

        {paymentMethod === 'bank_transfer' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Account Holder Name *
              </label>
              <input
                type="text"
                value={paymentDetails.bank_transfer?.account_holder || ''}
                onChange={(e) => updatePaymentDetail('account_holder', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Account Number *
              </label>
              <input
                type="text"
                value={paymentDetails.bank_transfer?.account_number || ''}
                onChange={(e) => updatePaymentDetail('account_number', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Routing Number *
              </label>
              <input
                type="text"
                value={paymentDetails.bank_transfer?.routing_number || ''}
                onChange={(e) => updatePaymentDetail('routing_number', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bank Name *
              </label>
              <input
                type="text"
                value={paymentDetails.bank_transfer?.bank_name || ''}
                onChange={(e) => updatePaymentDetail('bank_name', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
          </>
        )}

        {(paymentMethod === 'paypal' || paymentMethod === 'wise') && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <input
              type="email"
              value={paymentDetails[paymentMethod]?.email || ''}
              onChange={(e) => updatePaymentDetail('email', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder={`Your ${paymentMethod} email`}
              required
            />
          </div>
        )}

        {paymentMethod === 'stripe' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Stripe Account ID *
            </label>
            <input
              type="text"
              value={paymentDetails.stripe?.account_id || ''}
              onChange={(e) => updatePaymentDetail('account_id', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="acct_..."
              required
            />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Important Info */}
      <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">Important Information</h4>
        <ul className="list-disc list-inside space-y-1 text-xs text-yellow-800">
          <li>Payouts are processed within 3-5 business days</li>
          <li>Your earnings will be locked during processing</li>
          <li>A confirmation email will be sent once processed</li>
          <li>Payment fees may apply depending on your method</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !amount || parseFloat(amount) < MIN_PAYOUT}
        >
          {loading ? 'Submitting...' : 'Request Payout'}
        </button>
      </div>
    </form>
  );
}
