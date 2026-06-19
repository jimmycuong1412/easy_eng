/**
 * GemDiscountSlider Component
 * 
 * Interactive slider for selecting Gems to use for class discount
 * Shows real-time price updates and constraint enforcement
 */

'use client';

import React, { useState, useEffect } from 'react';
import { calculateGemsDiscount, calculateMaxGemsUsable } from '@/utils/gemCalculator';
import { GemImage } from '@/components/common/GemImage';
import { GEMS_TO_USD_RATE } from '@/constants/gems';

interface GemDiscountSliderProps {
  classPrice: number;
  userGemsBalance: number;
  onGemsChange: (gems: number, finalPrice: number) => void;
  className?: string;
}

export function GemDiscountSlider({
  classPrice,
  userGemsBalance,
  onGemsChange,
  className = '',
}: GemDiscountSliderProps) {
  const [gemsToUse, setGemsToUse] = useState(0);
  const [finalPrice, setFinalPrice] = useState(classPrice);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Calculate max Gems usable
  const maxGemsUsable = Math.min(
    calculateMaxGemsUsable(classPrice),
    userGemsBalance
  );

  // Update calculations when Gems change
  useEffect(() => {
    const { discountAmount: discount } = calculateGemsDiscount(gemsToUse, classPrice);
    const newFinalPrice = classPrice - discount;
    
    setDiscountAmount(discount);
    setFinalPrice(newFinalPrice);
    onGemsChange(gemsToUse, newFinalPrice);
  }, [gemsToUse, classPrice, onGemsChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setGemsToUse(value);
  };

  const handleQuickSelect = (percentage: number) => {
    const gems = Math.floor(maxGemsUsable * percentage);
    setGemsToUse(gems);
  };

  const discountPercentage = classPrice > 0 ? (discountAmount / classPrice) * 100 : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Gems Balance Info */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Your Gems Balance:</span>
        <span className="font-semibold text-indigo-600">{userGemsBalance.toLocaleString()} Gems</span>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <label htmlFor="gems-slider" className="block text-sm font-medium text-gray-700">
          Gems to Use: {gemsToUse.toLocaleString()}
        </label>
        <input
          id="gems-slider"
          type="range"
          min="0"
          max={maxGemsUsable}
          step="100"
          value={gemsToUse}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          disabled={maxGemsUsable === 0}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>{maxGemsUsable.toLocaleString()}</span>
        </div>
      </div>

      {/* Quick Select Buttons */}
      {maxGemsUsable > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickSelect(0.25)}
            className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            25%
          </button>
          <button
            onClick={() => handleQuickSelect(0.5)}
            className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            50%
          </button>
          <button
            onClick={() => handleQuickSelect(0.75)}
            className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            75%
          </button>
          <button
            onClick={() => handleQuickSelect(1)}
            className="flex-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
          >
            Max
          </button>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Original Price:</span>
          <span className="font-medium">${classPrice.toFixed(2)}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Gems Discount:</span>
            <span className="font-medium text-green-600">
              -${discountAmount.toFixed(2)} ({discountPercentage.toFixed(0)}%)
            </span>
          </div>
        )}
        
        <div className="border-t pt-2 flex justify-between">
          <span className="font-semibold">Final Price:</span>
          <span className="font-bold text-lg text-indigo-600">
            ${finalPrice.toFixed(2)}
          </span>
        </div>

        {/* Conversion Info */}
        {gemsToUse > 0 && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            {gemsToUse.toLocaleString()} Gems = ${discountAmount.toFixed(2)} (1 Gem = ${(1/GEMS_TO_USD_RATE).toFixed(2)})
          </div>
        )}
      </div>

      {/* Constraint Messages */}
      {maxGemsUsable === 0 && classPrice > 0 && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          ⚠️ This class is at minimum price ($5). No Gems discount available.
        </div>
      )}

      {userGemsBalance === 0 && (
        <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
          <GemImage size={16} className="inline-block align-middle mr-1" /> You don't have any Gems yet. Complete classes to earn Gems!
        </div>
      )}

      {discountPercentage >= 50 && discountAmount > 0 && (
        <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          ℹ️ You've reached the maximum discount (50% of class price)
        </div>
      )}
    </div>
  );
}
