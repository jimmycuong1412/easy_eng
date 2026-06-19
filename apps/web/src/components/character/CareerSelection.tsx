'use client'

// Component: Career Selection
// Description: Allows students to select their career path with preview of color palettes
// Related to: Phase 10 - Character & Gamification System (T143)

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface CareerPath {
  id: string
  name: string
  slug: string
  description: string
  primary_color: string
  secondary_color: string
  base_health: number
  base_mana: number
  base_strength: number
  base_intelligence: number
  base_creativity: number
  base_charisma: number
}

interface CareerSelectionProps {
  careers: CareerPath[]
  selectedCareer?: string
  onSelect: (careerId: string) => void
  isLoading?: boolean
}

export default function CareerSelection({
  careers,
  selectedCareer,
  onSelect,
  isLoading = false,
}: CareerSelectionProps) {
  const [hoveredCareer, setHoveredCareer] = useState<string | null>(null)
  const [localSelection, setLocalSelection] = useState<string | undefined>(selectedCareer)

  useEffect(() => {
    setLocalSelection(selectedCareer)
  }, [selectedCareer])

  const handleSelect = (careerId: string) => {
    setLocalSelection(careerId)
    onSelect(careerId)
  }

  const getStatIcon = (stat: string) => {
    const icons: Record<string, string> = {
      health: '❤️',
      mana: '💧',
      strength: '💪',
      intelligence: '🧠',
      creativity: '🎨',
      charisma: '✨',
    }
    return icons[stat] || '📊'
  }

  const renderStats = (career: CareerPath) => {
    const stats = [
      { name: 'health', value: career.base_health },
      { name: 'mana', value: career.base_mana },
      { name: 'strength', value: career.base_strength },
      { name: 'intelligence', value: career.base_intelligence },
      { name: 'creativity', value: career.base_creativity },
      { name: 'charisma', value: career.base_charisma },
    ]

    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {stats.map((stat) => (
          <div key={stat.name} className="flex items-center gap-2 text-sm">
            <span className="text-lg">{getStatIcon(stat.name)}</span>
            <span className="capitalize text-gray-300">{stat.name}</span>
            <span className="ml-auto font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>
    )
  }

  if (careers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading career paths...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Choose Your Career Path</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Select a career that represents your future dreams. Your character will evolve based on your chosen path!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {careers.map((career) => {
          const isSelected = localSelection === career.id
          const isHovered = hoveredCareer === career.id

          return (
            <motion.div
              key={career.id}
              onHoverStart={() => setHoveredCareer(career.id)}
              onHoverEnd={() => setHoveredCareer(null)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="relative"
            >
              <button
                onClick={() => handleSelect(career.id)}
                disabled={isLoading}
                className={`
                  w-full p-6 rounded-xl border-2 transition-all duration-300
                  ${
                    isSelected
                      ? 'border-white shadow-lg shadow-white/20'
                      : 'border-gray-700 hover:border-gray-500'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  bg-gray-800/50 backdrop-blur-sm
                `}
                style={{
                  background: isSelected || isHovered
                    ? `linear-gradient(135deg, ${career.primary_color}20, ${career.secondary_color}20)`
                    : undefined,
                }}
              >
                {/* Career Icon/Preview */}
                <div
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-4xl"
                  style={{
                    backgroundColor: career.primary_color,
                    boxShadow: `0 4px 20px ${career.primary_color}40`,
                  }}
                >
                  {/* Career emoji icons */}
                  {career.slug === 'doctor' && '🩺'}
                  {career.slug === 'engineer' && '⚙️'}
                  {career.slug === 'warrior' && '⚔️'}
                  {career.slug === 'business' && '💼'}
                  {career.slug === 'artist' && '🎨'}
                  {career.slug === 'scientist' && '🔬'}
                </div>

                {/* Career Name */}
                <h3 className="text-xl font-bold text-white mb-2">{career.name}</h3>

                {/* Career Description */}
                <p className="text-sm text-gray-400 mb-4">{career.description}</p>

                {/* Color Palette Preview */}
                <div className="flex gap-2 justify-center mb-4">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/30"
                    style={{ backgroundColor: career.primary_color }}
                    title="Primary Color"
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/30"
                    style={{ backgroundColor: career.secondary_color }}
                    title="Secondary Color"
                  />
                </div>

                {/* Stats Preview (shown on hover or selection) */}
                <AnimatePresence>
                  {(isSelected || isHovered) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderStats(career)}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selection Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <span className="text-white text-lg">✓</span>
                  </motion.div>
                )}
              </button>
            </motion.div>
          )
        })}
      </div>

      {localSelection && (
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400">
            Selected: <span className="text-white font-bold">
              {careers.find((c) => c.id === localSelection)?.name}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
