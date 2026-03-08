'use client'

// Component: Character Viewer
// Description: Displays student's 64x64px 8-bit character with equipped items and animations
// Related to: Phase 10 - Character & Gamification System (T153)

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface EquippedItem {
  item_id: string
  name: string
  category: 'hat' | 'outfit' | 'background' | 'emote' | 'pet'
  sprite_url: string
}

interface CharacterData {
  sprite_url: string
  color_palette: {
    primary: string
    secondary: string
    accent?: string
  }
  current_level: number
  animation_data?: {
    idle?: { frames: number; duration: number }
    [key: string]: any
  }
}

interface CharacterViewerProps {
  characterData: CharacterData
  equippedItems?: EquippedItem[]
  showLevel?: boolean
  size?: 'small' | 'medium' | 'large'
  animate?: boolean
  className?: string
}

export default function CharacterViewer({
  characterData,
  equippedItems = [],
  showLevel = true,
  size = 'medium',
  animate = true,
  className = '',
}: CharacterViewerProps) {
  const [_isAnimating, _setIsAnimating] = useState(false)
  const [_currentFrame, setCurrentFrame] = useState(0)

  // Size configurations (maintaining 64x64 base with scaling)
  const sizeConfig = {
    small: { scale: 2, containerSize: 128 }, // 64 * 2 = 128px
    medium: { scale: 3, containerSize: 192 }, // 64 * 3 = 192px
    large: { scale: 4, containerSize: 256 }, // 64 * 4 = 256px
  }

  const { scale, containerSize } = sizeConfig[size]

  // Idle animation loop
  useEffect(() => {
    if (!animate || !characterData.animation_data?.idle) return

    const { frames = 4, duration = 800 } = characterData.animation_data.idle
    const frameInterval = duration / frames

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames)
    }, frameInterval)

    return () => clearInterval(interval)
  }, [animate, characterData.animation_data])

  // Get background item (if equipped)
  const backgroundItem = equippedItems.find((item) => item.category === 'background')

  // Get layer order for rendering
  const getLayerOrder = () => {
    const layers: { type: string; url: string; zIndex: number }[] = []

    // Background (z-index: 0)
    if (backgroundItem) {
      layers.push({ type: 'background', url: backgroundItem.sprite_url, zIndex: 0 })
    }

    // Base character sprite (z-index: 10)
    layers.push({ type: 'character', url: characterData.sprite_url, zIndex: 10 })

    // Outfit (z-index: 20)
    const outfit = equippedItems.find((item) => item.category === 'outfit')
    if (outfit) {
      layers.push({ type: 'outfit', url: outfit.sprite_url, zIndex: 20 })
    }

    // Hat (z-index: 30)
    const hat = equippedItems.find((item) => item.category === 'hat')
    if (hat) {
      layers.push({ type: 'hat', url: hat.sprite_url, zIndex: 30 })
    }

    // Pet (z-index: 5 - behind character)
    const pet = equippedItems.find((item) => item.category === 'pet')
    if (pet) {
      layers.push({ type: 'pet', url: pet.sprite_url, zIndex: 5 })
    }

    return layers.sort((a, b) => a.zIndex - b.zIndex)
  }

  const layers = getLayerOrder()

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="relative mx-auto"
        style={{
          width: containerSize,
          height: containerSize,
        }}
        initial={animate ? { scale: 0.9, opacity: 0 } : false}
        animate={animate ? { scale: 1, opacity: 1 } : false}
        transition={{ duration: 0.3 }}
      >
        {/* Character Container with Pixel Art Rendering */}
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            width: containerSize,
            height: containerSize,
            imageRendering: 'pixelated', // Critical for crisp 8-bit sprites
          }}
        >
          {/* Render all layers in order */}
          {layers.map((layer, index) => (
            <div
              key={`${layer.type}-${index}`}
              className="absolute inset-0 flex items-center justify-center"
              style={{ zIndex: layer.zIndex }}
            >
              <motion.div
                animate={
                  animate && layer.type === 'character'
                    ? {
                        y: [0, -4, 0], // Subtle idle bounce
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Image
                  src={layer.url}
                  alt={layer.type}
                  width={64}
                  height={64}
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    imageRendering: 'pixelated',
                  }}
                  className="pointer-events-none"
                  unoptimized // Prevent Next.js optimization for pixel art
                />
              </motion.div>
            </div>
          ))}

          {/* Color overlay for character palette */}
          <div
            className="absolute inset-0 mix-blend-overlay opacity-20 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${characterData.color_palette.primary}, ${characterData.color_palette.secondary})`,
            }}
          />
        </div>

        {/* Level Badge */}
        {showLevel && (
          <motion.div
            className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold rounded-full w-12 h-12 flex items-center justify-center shadow-lg border-2 border-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
          >
            <div className="text-center">
              <div className="text-xs leading-none">Lv</div>
              <div className="text-lg leading-none">{characterData.current_level}</div>
            </div>
          </motion.div>
        )}

        {/* Glow effect based on career color */}
        <div
          className="absolute inset-0 rounded-lg blur-xl opacity-30 -z-10"
          style={{
            background: `radial-gradient(circle, ${characterData.color_palette.primary}, transparent)`,
          }}
        />
      </motion.div>

      {/* Equipped Items Preview (optional) */}
      {equippedItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 justify-center">
          {equippedItems.map((item) => (
            <div
              key={item.item_id}
              className="group relative"
              title={item.name}
            >
              <div className="w-8 h-8 bg-gray-800 rounded border border-gray-700 flex items-center justify-center overflow-hidden">
                <Image
                  src={item.sprite_url}
                  alt={item.name}
                  width={16}
                  height={16}
                  style={{ imageRendering: 'pixelated' }}
                  className="object-contain"
                  unoptimized
                />
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {item.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
