'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Cookie, Minus, Plus, Info } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface CookieDiscountCalculatorProps {
  originalPrice: number; // In VND
  cookieBalance: number;
  maxDiscountPercent?: number; // Default 50%
  minPrice?: number; // In VND, default 125000 ($5)
  onCookiesChange?: (cookies: number, finalPrice: number, discount: number) => void;
}

/**
 * Cookie Discount Calculator Component
 * 
 * Rules:
 * - 1 Cookie = 1,000 VND discount
 * - Maximum 50% discount on any class
 * - Minimum final price: 125,000 VND ($5)
 * - Cannot use more cookies than balance
 */
export function CookieDiscountCalculator({
  originalPrice,
  cookieBalance,
  maxDiscountPercent = 50,
  minPrice = 125000,
  onCookiesChange,
}: CookieDiscountCalculatorProps) {
  const COOKIE_VALUE = 1000; // 1 Cookie = 1,000 VND

  // Calculate maximum cookies that can be used
  const maxDiscountByPercent = Math.floor((originalPrice * maxDiscountPercent) / 100);
  const maxDiscountByMinPrice = originalPrice - minPrice;
  const maxDiscountPossible = Math.min(maxDiscountByPercent, maxDiscountByMinPrice);
  const maxCookiesUsable = Math.min(
    Math.floor(maxDiscountPossible / COOKIE_VALUE),
    cookieBalance
  );

  const [cookiesToUse, setCookiesToUse] = React.useState(0);

  // Calculate derived values
  const discountAmount = cookiesToUse * COOKIE_VALUE;
  const finalPrice = originalPrice - discountAmount;
  const discountPercent = ((discountAmount / originalPrice) * 100).toFixed(1);
  const remainingCookies = cookieBalance - cookiesToUse;

  // Notify parent of changes
  React.useEffect(() => {
    onCookiesChange?.(cookiesToUse, finalPrice, discountAmount);
  }, [cookiesToUse, finalPrice, discountAmount, onCookiesChange]);

  const handleSliderChange = (value: number[]) => {
    setCookiesToUse(value[0]);
  };

  const handleIncrement = () => {
    if (cookiesToUse < maxCookiesUsable) {
      setCookiesToUse((prev) => Math.min(prev + 10, maxCookiesUsable));
    }
  };

  const handleDecrement = () => {
    if (cookiesToUse > 0) {
      setCookiesToUse((prev) => Math.max(prev - 10, 0));
    }
  };

  const handleMaxCookies = () => {
    setCookiesToUse(maxCookiesUsable);
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Cookie className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Sử dụng Cookies</h3>
              <p className="text-xs text-slate-400">1 Cookie = 1,000đ giảm giá</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Số dư</p>
            <p className="text-lg font-bold text-amber-400">{cookieBalance} 🍪</p>
          </div>
        </div>

        {/* Cookie Slider */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Số Cookies sử dụng</span>
            <span className="text-xl font-bold text-white">{cookiesToUse}</span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrement}
              disabled={cookiesToUse === 0}
              className="border-white/20 text-white hover:bg-white/10 h-10 w-10"
            >
              <Minus className="w-4 h-4" />
            </Button>

            <div className="flex-1">
              <Slider
                value={[cookiesToUse]}
                onValueChange={handleSliderChange}
                max={maxCookiesUsable}
                step={1}
                className="cursor-pointer"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrement}
              disabled={cookiesToUse >= maxCookiesUsable}
              className="border-white/20 text-white hover:bg-white/10 h-10 w-10"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-500">0</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaxCookies}
              className="text-amber-400 hover:text-amber-300 h-auto p-0"
            >
              Dùng tối đa ({maxCookiesUsable})
            </Button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-3 p-4 bg-black/20 rounded-xl mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Giá gốc</span>
            <span className="text-white">{formatVND(originalPrice)}</span>
          </div>

          {cookiesToUse > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between"
            >
              <span className="text-amber-400">
                Giảm giá ({discountPercent}%)
              </span>
              <span className="text-amber-400">-{formatVND(discountAmount)}</span>
            </motion.div>
          )}

          <div className="border-t border-white/10 pt-3 flex justify-between">
            <span className="font-semibold text-white">Thành tiền</span>
            <motion.span
              key={finalPrice}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-xl font-bold text-emerald-400"
            >
              {formatVND(finalPrice)}
            </motion.span>
          </div>
        </div>

        {/* Remaining Cookies */}
        {cookiesToUse > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
          >
            <span className="text-sm text-slate-400">Cookies còn lại sau khi đặt</span>
            <span className="font-medium text-white">{remainingCookies} 🍪</span>
          </motion.div>
        )}

        {/* Info Notes */}
        <div className="mt-4 space-y-2">
          {maxCookiesUsable < cookieBalance && (
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Bạn chỉ có thể sử dụng tối đa {maxCookiesUsable} Cookies cho lớp học này 
                (giảm tối đa {maxDiscountPercent}%, giá tối thiểu {formatVND(minPrice)})
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
