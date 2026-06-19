'use client'

// Component: Purchase Confirmation Modal
// Description: Shows purchase confirmation with Gold balance check and item preview
// Related to: Phase 10 - Character & Gamification System (T159)

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface MarketplaceItem {
  id: string
  name: string
  description: string
  category: 'hat' | 'outfit' | 'background' | 'emote' | 'pet'
  price_gold: number
  sprite_url: string
  rarity: string
}

interface PurchaseModalProps {
  isOpen: boolean
  item: MarketplaceItem | null
  currentGold: number
  onConfirm: () => void
  onCancel: () => void
  isProcessing?: boolean
}

export default function PurchaseModal({
  isOpen,
  item,
  currentGold,
  onConfirm,
  onCancel,
  isProcessing = false,
}: PurchaseModalProps) {
  if (!item) return null

  const canAfford = currentGold >= item.price_gold
  const remainingGold = currentGold - item.price_gold

  const getRarityColor = () => {
    const colors = {
      common: 'from-gray-600 to-gray-700',
      uncommon: 'from-green-600 to-green-700',
      rare: 'from-blue-600 to-blue-700',
      epic: 'from-purple-600 to-purple-700',
      legendary: 'from-yellow-600 to-orange-600',
    }
    return colors[item.rarity as keyof typeof colors] || colors.common
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={!isProcessing ? onCancel : undefined}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`bg-gradient-to-r ${getRarityColor()} p-6 text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Confirm Purchase</h2>
                    <p className="text-sm opacity-90">Review your purchase details</p>
                  </div>
                  {!isProcessing && (
                    <button
                      onClick={onCancel}
                      className="text-white/80 hover:text-white transition-colors"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Item Preview */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                    <Image
                      src={item.sprite_url}
                      alt={item.name}
                      width={64}
                      height={64}
                      style={{
                        imageRendering: 'pixelated',
                        transform: 'scale(1.5)',
                      }}
                      className="object-contain"
                      unoptimized
                    />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r ${getRarityColor()}`}
                      >
                        {item.rarity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium text-gray-300 bg-gray-700 capitalize">
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700" />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Item Price</span>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-lg">🪙</span>
                      <span className="text-white font-bold">{item.price_gold}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Balance</span>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-lg">🪙</span>
                      <span className="text-white font-bold">{currentGold}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 font-medium">Remaining Balance</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 text-lg">🪙</span>
                        <span
                          className={`font-bold ${
                            remainingGold >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {remainingGold}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warning if insufficient Gold */}
                {!canAfford && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 text-xl">⚠️</span>
                      <div>
                        <p className="text-red-400 font-semibold text-sm">Insufficient Gold</p>
                        <p className="text-red-300 text-xs mt-1">
                          You need {item.price_gold - currentGold} more Gold to purchase this item.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success message if can afford */}
                {canAfford && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 text-xl">✓</span>
                      <div>
                        <p className="text-green-400 font-semibold text-sm">Ready to purchase</p>
                        <p className="text-green-300 text-xs mt-1">
                          This item will be added to your inventory immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-gray-800 px-6 py-4 flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!canAfford || isProcessing}
                  className={`
                    flex-1 py-3 px-4 font-semibold rounded-lg transition-all duration-200
                    ${
                      canAfford && !isProcessing
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Purchase'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
