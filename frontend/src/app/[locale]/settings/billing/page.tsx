'use client';

export const dynamic = 'force-dynamic';

import * as React from 'react';
import { CreditCard, Banknote, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const PAYMENT_METHODS = [
  { name: 'VNPay', icon: Banknote, description: 'Vietnam\'s leading payment gateway' },
  { name: 'MoMo', icon: Wallet, description: 'MoMo e-wallet' },
  { name: 'ZaloPay', icon: Wallet, description: 'ZaloPay e-wallet' },
  { name: 'Stripe', icon: CreditCard, description: 'International cards (Visa, Mastercard)' },
];

export default function SettingsBillingPage() {
  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#3B82F6]" />
            Billing & Payments
          </CardTitle>
          <CardDescription className="text-slate-400">
            Payment methods and billing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <div className="p-4 bg-[#3B82F6]/10 rounded-full">
              <CreditCard className="w-10 h-10 text-[#3B82F6]" />
            </div>
            <h3 className="text-white font-semibold text-lg">Coming Soon</h3>
            <p className="text-slate-400 text-sm max-w-sm">
              Billing management will be available soon. We support the following payment methods:
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2 w-full max-w-sm">
              {PAYMENT_METHODS.map((method) => (
                <div
                  key={method.name}
                  className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <method.icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-white text-sm font-medium">{method.name}</p>
                    <p className="text-slate-500 text-xs">{method.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
