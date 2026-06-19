'use client'

// Component: Marketplace Item Card
// Description: Displays marketplace item with price, preview, and compatibility tags
// Related to: Phase 10 - Character & Gamification System (T158)

import { motion } from 'framer-motion'
import Image from 'next/image'

interface MarketplaceItem {
  id: string
  name: string
  description: string
  category: 'hat' | 'outfit' | 'background' | 'emote' | 'pet'
  price_gold: number
  sprite_url: string
  preview_url?: string
  career_compatibility: {
    type: 'all' | 'specific'
    careers?: string[]
  }
  rarity: string
  is_owned: boolean
  is_equipped: boolean
}

interface ItemCardProps {
  item: MarketplaceItem
  studentCareer: string
  studentGold: number
  onPurchase: (itemId: string) => void
  onEquip?: (itemId: string) => void
  onUnequip?: (itemId: string) => void
  isProcessing?: boolean
}

export default function ItemCard({
  item,
  studentCareer,
  studentGold,
  onPurchase,
  onEquip,
  onUnequip,
  isProcessing = false,
}: ItemCardProps) {
  const canAfford = studentGold >= item.price_gold
  const isCompatible =
    item.career_compatibility.type === 'all' ||
    (item.career_compatibility.careers && item.career_compatibility.careers.includes(studentCareer))

  const getCategoryIcon = () => {
    const icons = {
      hat: '🎩',
      outfit: '👔',
      background: '🖼️',
      emote: '😊',
      pet: '🐾',
    }
    return icons[item.category] || '📦'
  }

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

  const getRarityBorder = () => {
    const borders = {
      common: 'border-gray-500',
      uncommon: 'border-green-500',
      rare: 'border-blue-500',
      epic: 'border-purple-500',
      legendary: 'border-yellow-500',
    }
    return borders[item.rarity as keyof typeof borders] || borders.common
  }

  return (
    <motion.div
      whileHover={!item.is_owned && isCompatible ? { scale: 1.05 } : {}}
      whileTap={!item.is_owned && isCompatible ? { scale: 0.98 } : {}}
      className="relative"
    >
      <div
        className={`
          bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border-2 transition-all duration-200
          ${item.is_owned ? 'border-green-500' : getRarityBorder()}
          ${!isCompatible ? 'opacity-60' : ''}
        `}
      >
        {/* Rarity Badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getRarityColor()}`}
        >
          {item.rarity.toUpperCase()}
        </div>

        {/* Category Icon */}
        <div className="text-3xl mb-2">{getCategoryIcon()}</div>

        {/* Item Preview */}
        <div className="relative w-full aspect-square mb-3 bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
          <Image
            src={item.sprite_url}
            alt={item.name}
            width={64}
            height={64}
            style={{
              imageRendering: 'pixelated',
              transform: 'scale(2)',
            }}
            className="object-contain"
            unoptimized
          />

          {/* Owned Badge */}
          {item.is_owned && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
              OWNED
            </div>
          )}

          {/* Equipped Badge */}
          {item.is_equipped && (
            <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
              EQUIPPED
            </div>
          )}
        </div>

        {/* Item Name */}
        <h3 className="text-white font-semibold text-sm mb-1 truncate">{item.name}</h3>

        {/* Item Description */}
        {item.description && (
          <p className="text-gray-400 text-xs mb-3 line-clamp-2">{item.description}</p>
        )}

        {/* Compatibility Tag */}
        <div className="mb-3">
          {item.career_compatibility.type === 'all' ? (
            <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
              ✨ All Careers
            </span>
          ) : isCompatible ? (
            <span className="inline-block px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
              ✓ Compatible
            </span>
          ) : (
            <span className="inline-block px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
              ✗ Not Compatible
            </span>
          )}
        </div>

        {/* Price and Actions */}
        <div className="space-y-2">
          {!item.is_owned ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-lg">🪙</span>
                  <span className="text-white font-bold">{item.price_gold}</span>
                  <span className="text-gray-400 text-xs">Gold</span>
                </div>
                {!canAfford && (
                  <span className="text-red-400 text-xs">Not enough Gold</span>
                )}
              </div>

              <button
                onClick={() => onPurchase(item.id)}
                disabled={!isCompatible || !canAfford || isProcessing}
                className={`
                  w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200
                  ${
                    !isCompatible || !canAfford
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {isProcessing ? 'Processing...' : 'Purchase'}
              </button>
            </>
          ) : (
            <div className="space-y-2">
              {!item.is_equipped && onEquip && (
                <button
                  onClick={() => onEquip(item.id)}
                  disabled={isProcessing}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  {isProcessing ? 'Equipping...' : 'Equip'}
                </button>
              )}

              {item.is_equipped && onUnequip && (
                <button
                  onClick={() => onUnequip(item.id)}
                  disabled={isProcessing}
                  className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white font-semibold text-sm rounded-lg transition-colors"
                >
                  {isProcessing ? 'Unequipping...' : 'Unequip'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
