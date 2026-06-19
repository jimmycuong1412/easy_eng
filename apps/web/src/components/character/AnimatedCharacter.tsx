'use client'

// Component: Animated Character
// Description: Character with idle animation and level-up celebration animation
// Related to: Phase 10 - Character & Gamification System (T163)

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AnimationType,
  getCurrentFrame,
  getFramePosition,
  generateLevelUpParticles,
  updateParticles,
  easeOutBounce,
  type Particle,
} from '@/utils/spriteAnimation'

interface AnimatedCharacterProps {
  spriteSheetUrl: string
  currentLevel: number
  showLevelUp?: boolean
  onLevelUpComplete?: () => void
  size?: number // Size in pixels (default 64)
  scale?: number // Additional scale multiplier
  className?: string
}

export default function AnimatedCharacter({
  spriteSheetUrl,
  currentLevel,
  showLevelUp = false,
  onLevelUpComplete,
  size = 64,
  scale = 3,
  className = '',
}: AnimatedCharacterProps) {
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('idle')
  const [frameIndex, setFrameIndex] = useState(0)
  const [particles, setParticles] = useState<Particle[]>([])
  const [levelUpScale, setLevelUpScale] = useState(1)

  const animationStartTime = useRef<number>(Date.now())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particleAnimationRef = useRef<number>()

  // Handle level-up animation trigger
  useEffect(() => {
    if (showLevelUp) {
      triggerLevelUpAnimation()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLevelUp])

  // Main animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - animationStartTime.current
      const newFrameIndex = getCurrentFrame(currentAnimation, elapsed)
      setFrameIndex(newFrameIndex)
    }, 50) // Update every 50ms for smooth animation

    return () => clearInterval(interval)
  }, [currentAnimation])

  // Particle animation loop
  const animateParticles = useCallback(() => {
    if (particles.length > 0) {
      setParticles((prev) => updateParticles(prev, 16)) // ~60fps
      particleAnimationRef.current = requestAnimationFrame(animateParticles)
    }
  }, [particles])

  useEffect(() => {
    if (particles.length > 0) {
      particleAnimationRef.current = requestAnimationFrame(animateParticles)
    }

    return () => {
      if (particleAnimationRef.current) {
        cancelAnimationFrame(particleAnimationRef.current)
      }
    }
  }, [particles, animateParticles])

  // Draw particles on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || particles.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((particle) => {
      ctx.save()
      ctx.globalAlpha = particle.life
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }, [particles])

  const triggerLevelUpAnimation = () => {
    // Switch to level-up animation
    setCurrentAnimation('levelUp')
    animationStartTime.current = Date.now()

    // Generate celebration particles
    const centerX = (size * scale) / 2
    const centerY = (size * scale) / 2
    setParticles(generateLevelUpParticles(centerX, centerY, 30))

    // Bounce scale animation
    const start = Date.now()
    const animateScale = () => {
      const elapsed = Date.now() - start
      const duration = 800 // Match level-up animation duration

      if (elapsed < duration) {
        const progress = elapsed / duration
        const bounceValue = easeOutBounce(progress)
        setLevelUpScale(1 + bounceValue * 0.3) // Scale up to 1.3x
        requestAnimationFrame(animateScale)
      } else {
        setLevelUpScale(1)
        // Return to idle animation
        setTimeout(() => {
          setCurrentAnimation('idle')
          animationStartTime.current = Date.now()
          onLevelUpComplete?.()
        }, 500)
      }
    }

    animateScale()
  }

  const framePosition = getFramePosition(currentAnimation, frameIndex)

  return (
    <div className={`relative ${className}`}>
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        width={size * scale}
        height={size * scale}
        className="absolute inset-0 pointer-events-none z-10"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Character Sprite */}
      <motion.div
        className="relative"
        style={{
          width: size * scale,
          height: size * scale,
        }}
        animate={{
          scale: levelUpScale,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url(${spriteSheetUrl})`,
            backgroundPosition: `-${framePosition.x * scale}px -${framePosition.y * scale}px`,
            backgroundSize: `${512 * scale}px ${512 * scale}px`, // Assuming 8x8 sprite sheet
            imageRendering: 'pixelated',
          }}
        />
      </motion.div>

      {/* Level-up Text Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: -30, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 1.5 }}
            transition={{ duration: 0.8 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap z-20"
          >
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-4 py-2 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="text-2xl">⬆️</div>
                <div className="text-lg">Level {currentLevel}!</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sparkle Effect on Level Up */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.5, 1.8, 2],
              rotate: [0, 180, 360],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, times: [0, 0.3, 0.7, 1] }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-8xl">✨</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glow effect during level up */}
      {showLevelUp && (
        <div
          className="absolute inset-0 rounded-full blur-2xl -z-10 animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.5), transparent)',
          }}
        />
      )}
    </div>
  )
}
