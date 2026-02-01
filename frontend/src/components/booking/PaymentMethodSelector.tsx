'use client';

/**
 * Payment Method Selector Component
 *
 * Allows students to choose their preferred payment method:
 * - VNPay (Vietnam domestic cards)
 * - MoMo (Vietnam mobile wallet)
 * - ZaloPay (Vietnam mobile wallet)
 * - Stripe (International cards)
 *
 * Related Tasks: T196 [P] Create payment method selector component
 */

import React, { useState } from 'react';
import { CreditCard, Wallet, QrCode, Globe } from 'lucide-react';

export type PaymentMethod = 'vnpay' | 'momo' | 'zalopay' | 'stripe';

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  popular?: boolean;
  fees?: string;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onMethodChange: (method: PaymentMethod) => void;
  amount: number;
  currency: string;
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'vnpay',
    name: 'VNPay',
    description: 'Thẻ ATM nội địa / Internet Banking',
    icon: <CreditCard className="w-6 h-6" />,
    popular: true,
    fees: 'Miễn phí',
  },
  {
    id: 'momo',
    name: 'MoMo',
    description: 'Ví điện tử MoMo',
    icon: <Wallet className="w-6 h-6" />,
    popular: true,
    fees: 'Miễn phí',
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    description: 'Ví điện tử ZaloPay',
    icon: <QrCode className="w-6 h-6" />,
    fees: 'Miễn phí',
  },
  {
    id: 'stripe',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, Amex (International)',
    icon: <Globe className="w-6 h-6" />,
    fees: '2.9% + $0.30',
  },
];

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  amount,
  currency,
}: PaymentMethodSelectorProps) {
  const [hoveredMethod, setHoveredMethod] = useState<PaymentMethod | null>(null);

  const formatAmount = (amount: number, currency: string): string => {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Select Payment Method
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Amount: <span className="font-semibold text-gray-900 dark:text-white">
            {formatAmount(amount, currency)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onMethodChange(method.id)}
            onMouseEnter={() => setHoveredMethod(method.id)}
            onMouseLeave={() => setHoveredMethod(null)}
            className={`
              relative flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all
              ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
              }
              ${hoveredMethod === method.id ? 'shadow-md' : 'shadow-sm'}
            `}
          >
            {/* Popular badge */}
            {method.popular && (
              <div className="absolute -top-2 right-4 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                Popular
              </div>
            )}

            {/* Icon */}
            <div
              className={`
                flex h-12 w-12 items-center justify-center rounded-lg
                ${
                  selectedMethod === method.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }
              `}
            >
              {method.icon}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {method.name}
                </h4>
                {selectedMethod === method.id && (
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {method.description}
              </p>
              {method.fees && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Phí: {method.fees}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Payment method details */}
      {selectedMethod && (
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <h4 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
            Payment Details
          </h4>
          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            {selectedMethod === 'vnpay' && (
              <>
                <p>• Hỗ trợ tất cả các ngân hàng tại Việt Nam</p>
                <p>• Thanh toán qua Internet Banking hoặc quẹt thẻ ATM</p>
                <p>• An toàn, bảo mật với mã hóa SSL</p>
              </>
            )}
            {selectedMethod === 'momo' && (
              <>
                <p>• Thanh toán nhanh chóng bằng ví MoMo</p>
                <p>• Quét mã QR hoặc nhập số điện thoại</p>
                <p>• Nhận ưu đãi và hoàn tiền từ MoMo</p>
              </>
            )}
            {selectedMethod === 'zalopay' && (
              <>
                <p>• Thanh toán tiện lợi với ví ZaloPay</p>
                <p>• Liên kết thẻ ngân hàng hoặc nạp tiền vào ví</p>
                <p>• Bảo mật cao với công nghệ mã hóa</p>
              </>
            )}
            {selectedMethod === 'stripe' && (
              <>
                <p>• Accepts international credit/debit cards</p>
                <p>• Secure payment processing with 3D Secure</p>
                <p>• Processing fee: 2.9% + $0.30 per transaction</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
        <svg
          className="h-5 w-5 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          All payments are encrypted and secure. Your financial information is protected.
        </p>
      </div>
    </div>
  );
}
